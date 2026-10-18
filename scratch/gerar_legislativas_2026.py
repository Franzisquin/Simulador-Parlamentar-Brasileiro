"""Gera os resultados de Deputado Federal e Estadual/Distrital de 2026 no mesmo formato
de resultados_geo/Legislativas <ano>/ dos anos anteriores, a partir dos dados abertos do
TSE (https://dadosabertos.tse.jus.br/dataset/resultados-2026):

  votacao_candidato_munzona_2026.zip   candidatos: nome, partido, federação, situação
  votacao_partido_munzona_2026.zip     votos de legenda válidos por partido
  votacao_secao_2026_<UF>.zip          votos por seção (agregados por local de votação)

Saída em resultados_geo/Legislativas 2026/:
  deputados_federal_2026_<UF>.zip   (deputados_federal_2026_<UF>.json + _resumo.json)
  deputados_estadual_2026_<UF>.zip  (idem; no DF, Deputado Distrital)
  official_totals_2026.json         vagas, quociente eleitoral, votos e eleitos por agremiação

RESULTS usa a chave zona_municipioTSE_local, a mesma dos pontos em locais_votacao_2026.

Uso: python3 scratch/gerar_legislativas_2026.py /pasta/com/os/zips/do/TSE
     (os votacao_secao_2026_<UF>.zip podem estar nessa pasta ou em <pasta>/secao)
"""

import csv
import io
import json
import os
import sys
import zipfile
from collections import defaultdict

YEAR = 2026
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT_DIR = os.path.join(ROOT, 'resultados_geo', f'Legislativas {YEAR}')

ALL_UFS = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
    'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
]

# CD_CARGO -> tipo (no DF o cargo 8, Deputado Distrital, entra como estadual)
CARGO_DEF = {'6': 'federal', '7': 'estadual', '8': 'estadual'}

csv.field_size_limit(1 << 30)


def read_csv(zf, name):
    with zf.open(name) as fh:
        reader = csv.reader(io.TextIOWrapper(fh, encoding='latin1', newline=''), delimiter=';')
        header = next(reader)
        idx = {c: i for i, c in enumerate(header)}
        for row in reader:
            yield idx, row


def clean(value):
    value = (value or '').strip()
    return '' if value in ('#NULO', '#NULO#', '#NE') else value


def agremiacao_of(tp, sg_partido, nm_federacao, comp_federacao):
    """(tipo, composição) no padrão de 2022: federação -> 'NOME(PARTIDO/PARTIDO)'."""
    if tp.upper().startswith('FEDERA') and nm_federacao:
        comp = '/'.join(p.strip() for p in comp_federacao.split('/') if p.strip())
        return 'FEDERAÇÃO', f'{nm_federacao}({comp})'
    return 'PARTIDO ISOLADO', sg_partido


def normalize_comp(comp):
    # mesma regra de gerar_legislativas_2002.py (id das agremiações em official_totals)
    return '/'.join(sorted(p.strip().upper() for p in comp.split('/'))) if comp else ''


def quociente_eleitoral(validos, vagas):
    # Código Eleitoral, art. 106: fração até meio desprezada, acima de meio vale um
    q, r = divmod(validos, vagas)
    return q + (2 * r > vagas)


def load_candidates(cand_zip, uf):
    """cargo -> NR -> dados do candidato, e cargo -> agremiação -> eleitos."""
    cands = {'federal': {}, 'estadual': {}}
    for idx, row in read_csv(cand_zip, f'votacao_candidato_munzona_{YEAR}_{uf}.csv'):
        tipo = CARGO_DEF.get(row[idx['CD_CARGO']])
        if not tipo or row[idx['NR_TURNO']] != '1':
            continue
        nr = str(int(row[idx['NR_CANDIDATO']]))
        if nr in cands[tipo]:
            continue
        sg = clean(row[idx['SG_PARTIDO']])
        tp, comp = agremiacao_of(clean(row[idx['TP_AGREMIACAO']]), sg,
                                 clean(row[idx['NM_FEDERACAO']]), clean(row[idx['DS_COMPOSICAO_FEDERACAO']]))
        status = clean(row[idx['DS_SIT_TOT_TURNO']]) or 'N/D'
        if 'ANULADO' in row[idx['NM_TIPO_DESTINACAO_VOTOS']].upper():
            status = 'INAPTO'  # votos anulados (sub judice / indeferido): não entram como válidos
        nome = clean(row[idx['NM_URNA_CANDIDATO']]) or clean(row[idx['NM_CANDIDATO']])
        cands[tipo][nr] = {'meta': [nome, sg, status, tp, comp], 'comp': comp, 'sit': status}
    return cands


def load_party_votes(party_zip, uf):
    """cargo -> NR_PARTIDO -> {sigla, comp, tp, legenda_validos, nominais_validos}."""
    parties = {'federal': {}, 'estadual': {}}
    for idx, row in read_csv(party_zip, f'votacao_partido_munzona_{YEAR}_{uf}.csv'):
        tipo = CARGO_DEF.get(row[idx['CD_CARGO']])
        if not tipo or row[idx['NR_TURNO']] != '1':
            continue
        nr = str(int(row[idx['NR_PARTIDO']]))
        sg = clean(row[idx['SG_PARTIDO']])
        tp, comp = agremiacao_of(clean(row[idx['TP_AGREMIACAO']]), sg,
                                 clean(row[idx['NM_FEDERACAO']]), clean(row[idx['DS_COMPOSICAO_FEDERACAO']]))
        p = parties[tipo].setdefault(nr, {'sigla': sg, 'tp': tp, 'comp': comp, 'legenda': 0, 'nominais': 0})
        p['legenda'] += int(row[idx['QT_TOTAL_VOTOS_LEG_VALIDOS']] or 0)
        p['nominais'] += int(row[idx['QT_VOTOS_NOMINAIS_VALIDOS']] or 0)
    return parties


def load_section_votes(secao_zip_path, uf):
    """cargo -> local -> NR_VOTAVEL -> votos (1º turno), e nomes vistos na urna."""
    results = {'federal': defaultdict(lambda: defaultdict(int)), 'estadual': defaultdict(lambda: defaultdict(int))}
    names = {'federal': {}, 'estadual': {}}
    with zipfile.ZipFile(secao_zip_path) as zf:
        csv_name = next(n for n in zf.namelist() if n.lower().endswith('.csv'))
        for idx, row in read_csv(zf, csv_name):
            tipo = CARGO_DEF.get(row[idx['CD_CARGO']])
            if not tipo or row[idx['NR_TURNO']] != '1':
                continue
            key = f"{int(row[idx['NR_ZONA']])}_{int(row[idx['CD_MUNICIPIO']])}_{int(row[idx['NR_LOCAL_VOTACAO']])}"
            nr = str(int(row[idx['NR_VOTAVEL']]))
            results[tipo][key][nr] += int(row[idx['QT_VOTOS']] or 0)
            if nr not in names[tipo]:
                names[tipo][nr] = row[idx['NM_VOTAVEL']].strip()
    return results, names


def build_cand_names(tipo_cands, tipo_parties, results, seen_names):
    cand_names = {}
    voted = {nr for votes in results.values() for nr in votes}
    for nr, c in tipo_cands.items():
        cand_names[nr] = c['meta']
    for nr in voted:
        if nr in cand_names or nr in ('95', '96'):
            continue
        if len(nr) <= 2:
            p = tipo_parties.get(nr)
            cand_names[nr] = ['VOTO DE LEGENDA', p['sigla'] if p else f'PARTIDO {nr}', 'LEGENDA', '', '']
        else:
            # na urna, mas fora da votação nominal oficial (candidatura cancelada; o TSE anula
            # esses votos): nome da urna, partido pelo prefixo
            p = tipo_parties.get(nr[:2])
            cand_names[nr] = [seen_names.get(nr, nr), p['sigla'] if p else '', 'INAPTO',
                              p['tp'] if p else '', p['comp'] if p else '']
    cand_names['95'] = ['VOTO BRANCO', '', 'BRANCO', '', '']
    cand_names['96'] = ['VOTO NULO', '', 'NULO', '', '']
    return cand_names


def build_official(tipo_cands, tipo_parties):
    """Bloco de official_totals: votos válidos por agremiação (nominais + legenda) e eleitos."""
    groups = {}
    for p in tipo_parties.values():
        g = groups.setdefault(p['comp'], {'votes': 0, 'qp': 0, 'avg': 0})
        g['votes'] += p['legenda'] + p['nominais']
    for c in tipo_cands.values():
        g = groups.setdefault(c['comp'], {'votes': 0, 'qp': 0, 'avg': 0})
        if c['sit'] == 'ELEITO POR QP':
            g['qp'] += 1
        elif c['sit'] in ('ELEITO POR MÉDIA', 'ELEITO POR MEDIA'):
            g['avg'] += 1
    vagas = sum(g['qp'] + g['avg'] for g in groups.values())
    validos = sum(g['votes'] for g in groups.values())
    qe = quociente_eleitoral(validos, vagas) if vagas else 0
    coalitions = [{
        'id': normalize_comp(comp),
        'raw_comp': comp,
        'votes': g['votes'],
        'elected': g['qp'] + g['avg'],
        'elected_qp': g['qp'],
        'elected_avg': g['avg'],
        'vagas_qp': g['votes'] // qe if qe else 0,
    } for comp, g in groups.items() if g['votes'] > 0 or g['qp'] + g['avg'] > 0]
    coalitions.sort(key=lambda c: c['votes'], reverse=True)
    return {'stats': {'qt_vagas': vagas, 'vr_qe': qe, 'qt_votos_validos': validos}, 'coalitions': coalitions}


def write_zip(tipo, uf, cand_names, results):
    base = f'deputados_{tipo}_{YEAR}_{uf}'
    results_out = {key: dict(votes) for key, votes in results.items()}
    totals = defaultdict(int)
    for votes in results_out.values():
        for nr, v in votes.items():
            totals[nr] += v
    metadata = {'cand_names': cand_names, 'coalition_adjustments': {}}
    with zipfile.ZipFile(os.path.join(OUT_DIR, f'{base}.zip'), 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        zf.writestr(f'{base}.json', json.dumps({'METADATA': metadata, 'RESULTS': results_out}, ensure_ascii=False, separators=(',', ':')))
        zf.writestr(f'{base}_resumo.json', json.dumps({'METADATA': metadata, 'TOTALS': dict(totals)}, ensure_ascii=False, separators=(',', ':')))
    return totals


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    tse_dir = sys.argv[1]
    only = [u.upper() for u in sys.argv[2:]] or ALL_UFS
    os.makedirs(OUT_DIR, exist_ok=True)
    cand_zip = zipfile.ZipFile(os.path.join(tse_dir, f'votacao_candidato_munzona_{YEAR}.zip'))
    party_zip = zipfile.ZipFile(os.path.join(tse_dir, f'votacao_partido_munzona_{YEAR}.zip'))

    totals_path = os.path.join(OUT_DIR, f'official_totals_{YEAR}.json')
    official = {}
    if os.path.exists(totals_path):
        with open(totals_path, encoding='utf-8') as fh:
            official = json.load(fh)

    for uf in only:
        secao = next((p for p in (os.path.join(tse_dir, 'secao', f'votacao_secao_{YEAR}_{uf}.zip'),
                                  os.path.join(tse_dir, f'votacao_secao_{YEAR}_{uf}.zip')) if os.path.exists(p)), None)
        if not secao:
            print(f'{uf}: votacao_secao ausente, pulando')
            continue
        cands = load_candidates(cand_zip, uf)
        parties = load_party_votes(party_zip, uf)
        results, names = load_section_votes(secao, uf)
        official[uf] = {}
        for tipo, key in (('federal', 'f'), ('estadual', 'e')):
            cand_names = build_cand_names(cands[tipo], parties[tipo], results[tipo], names[tipo])
            totals = write_zip(tipo, uf, cand_names, results[tipo])
            official[uf][key] = build_official(cands[tipo], parties[tipo])
            st = official[uf][key]['stats']
            print(f'{uf} {tipo}: {len(results[tipo])} locais, {len(cand_names)} votáveis, '
                  f'{st["qt_vagas"]} vagas, QE {st["vr_qe"]}, {st["qt_votos_validos"]} válidos, '
                  f'{sum(totals.values())} votos nas seções', flush=True)

    official = {uf: official[uf] for uf in ALL_UFS if uf in official}
    with open(totals_path, 'w', encoding='utf-8') as fh:
        json.dump(official, fh, ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    main()
