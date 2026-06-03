"""
Gera CSV com todos os partidos e federações que aparecem nos dados do simulador.
"""

import json
import re
import csv
from collections import defaultdict

# ── Configurações canônicas extraídas do simulador.js ──────────────────────────

PARTY_COLORS = {
    "PT": "#ff3859", "PL": "#304091", "PP": "#6391d4", "MDB": "#16a250",
    "PSD": "#eb8100", "PSDB": "#0097fd", "PSOL": "#e95dd2", "PSL": "#5dca53",
    "PPB": "#6391d4", "REPUBLICANOS": "#1f646b", "UNIAO": "#2eccff",
    "PDT": "#ffad99", "PSB": "#edd355", "NOVO": "#ff6600", "PC DO B": "#b4251d",
    "PV": "#1f9439", "CIDADANIA": "#ec5fa6", "REDE": "#7dd1d9",
    "AVANTE": "#36aeba", "PATRIOTA": "#5fa72f", "SOLIDARIEDADE": "#ff633d",
    "PROS": "#e6661e", "PTB": "#71def4", "PODE": "#23a840", "PSC": "#2f8e4f",
    "DC": "#809eff", "PMN": "#ff3333", "MOBILIZA": "#DD3333", "AGIR": "#254d88",
    "UP": "#5e5e5e", "PCO": "#8e3d10", "PSTU": "#620411", "PRTB": "#1a7e2f",
    "PMB": "#384ba8", "DEM": "#6dbf36", "PFL": "#6dbf36", "PPS": "#ec5fa6",
    "PR": "#304091", "PRB": "#45bdc9", "PT DO B": "#2eacb2", "PAN": "#ffff00",
    "PASART": "#0000FF", "PCB": "#c40823", "PDS": "#6391d4", "PEN": "#4AA561",
    "PGT": "#006600", "PH": "#FF8511", "PHS": "#e25850", "PJ": "#01369E",
    "PN": "#008000", "PPL": "#c6a815", "PST": "#9370DB", "PTC": "#37c884",
    "PTN": "#23a840", "PTR": "#1a7e2f", "ARENA": "#4034B2", "PMDB": "#16a250",
    "PSDC": "#809eff", "PRD": "#007c3c", "PRONA": "#0f6c36", "PRP": "#ffe099",
    "FE BRASIL": "#ff3859", "PSDB/CIDADANIA": "#0097fd", "PSOL/REDE": "#e95dd2",
    "SD": "#ff633d",
}

# Mapa canônico sigla → cor (usando "UNIAO" internamente)
CANONICAL_COLOR = {
    "PT": "#ff3859", "PL": "#304091", "PP": "#6391d4", "MDB": "#16a250",
    "PSD": "#eb8100", "PSDB": "#0097fd", "PSOL": "#e95dd2", "PSL": "#5dca53",
    "PPB": "#6391d4", "REPUBLICANOS": "#1f646b", "UNIAO": "#2eccff",
    "PDT": "#ffad99", "PSB": "#edd355", "NOVO": "#ff6600", "PC DO B": "#b4251d",
    "PV": "#1f9439", "CIDADANIA": "#ec5fa6", "REDE": "#7dd1d9",
    "AVANTE": "#36aeba", "PATRIOTA": "#5fa72f", "SOLIDARIEDADE": "#ff633d",
    "PROS": "#e6661e", "PTB": "#71def4", "PODE": "#23a840", "PSC": "#2f8e4f",
    "DC": "#809eff", "PMN": "#ff3333", "MOBILIZA": "#DD3333", "AGIR": "#254d88",
    "UP": "#5e5e5e", "PCO": "#8e3d10", "PSTU": "#620411", "PRTB": "#1a7e2f",
    "PMB": "#384ba8", "DEM": "#6dbf36", "PFL": "#6dbf36", "PPS": "#ec5fa6",
    "PR": "#304091", "PRB": "#45bdc9", "PT DO B": "#2eacb2", "PAN": "#ffff00",
    "PASART": "#0000FF", "PCB": "#c40823", "PDS": "#6391d4", "PEN": "#4AA561",
    "PGT": "#006600", "PH": "#FF8511", "PHS": "#e25850", "PJ": "#01369E",
    "PN": "#008000", "PPL": "#c6a815", "PST": "#9370DB", "PTC": "#37c884",
    "PTN": "#23a840", "PTR": "#1a7e2f", "ARENA": "#4034B2", "PMDB": "#16a250",
    "PSDC": "#809eff", "PRD": "#007c3c", "PRONA": "#0f6c36", "PRP": "#ffe099",
    "FE BRASIL": "#ff3859", "PSDB/CIDADANIA": "#0097fd", "PSOL/REDE": "#e95dd2",
    "SD": "#ff633d",
}

PARTY_NUMBERS = {
    "10": "REPUBLICANOS", "11": "PP", "12": "PDT", "13": "PT", "14": "PTB",
    "15": "MDB", "16": "PSTU", "17": "PSL", "18": "REDE", "19": "PODE",
    "20": "PSC", "21": "PCB", "22": "PL", "23": "CIDADANIA", "25": "DEM",
    "27": "DC", "28": "PRTB", "29": "PCO", "30": "NOVO", "31": "PHS",
    "33": "PMN", "35": "PMB", "36": "AGIR", "40": "PSB", "43": "PV",
    "44": "UNIAO", "45": "PSDB", "50": "PSOL", "51": "PATRIOTA", "55": "PSD",
    "65": "PC DO B", "70": "AVANTE", "77": "SOLIDARIEDADE", "80": "UP",
    "90": "PROS",
}

# Federações de 2022
FEDERACOES = {
    "FE BRASIL": {
        "nome_completo": "Federação Brasil da Esperança",
        "composicao": "PT / PC DO B / PV",
        "ano": 2022,
    },
    "PSOL/REDE": {
        "nome_completo": "Federação PSOL-Rede",
        "composicao": "PSOL / REDE",
        "ano": 2022,
    },
    "PSDB/CIDADANIA": {
        "nome_completo": "Federação PSDB-Cidadania",
        "composicao": "PSDB / CIDADANIA",
        "ano": 2022,
    },
}

# Aliases: normalizar variantes para a sigla canônica (tudo ASCII para simplicidade)
ALIASES = {
    "UNIAO": "UNIAO",  # mantém como UNIAO internamente; será exibido como UNIÃO no CSV
    "UNIO": "UNIAO",   # versão sem Ã quando encoding falha
    "PCDOB": "PC DO B", "PC_DO_B": "PC DO B",
    "PT_DO_B": "PT DO B", "PODEMOS": "PODE", "SD": "SOLIDARIEDADE",
    "PATRI": "PATRIOTA", "PMDB": "MDB", "PPB": "PP", "PFL": "DEM",
    "FE_BRASIL": "FE BRASIL", "PSOL_REDE": "PSOL/REDE",
    "PSDB_CIDADANIA": "PSDB/CIDADANIA",
}

SKIP = {
    "OUTROS", "TOSSUP", "#NULO#", "TOTAL_VOTOS_VALIDOS", "",
    "MISSAO", "VOTOS_BRANCOS", "VOTOS_NULOS",
    "BRASIL_ESPERANCA", "BRASIL_PARA_TODOS", "PELO_BEM_BRASIL",
    "POR_UM_BRASIL_DECENTE", "FRENTE_DE_ESQUERDA", "A_FORCA_DO_POVO",
    "PARA_O_BRASIL_SEGUIR_MUDANDO", "O_BRASIL_PODE_MAIS", "MUDA_BRASIL",
    "COM_A_FORCA_DO_POVO", "UNIDOS_PELO_BRASIL", "MUDANCA_DE_VERDADE",
    "BRASIL_SOBERANO", "O_POVO_FELIZ_DE_NOVO", "PARA_UNIR_O_BRASIL",
    "VAMOS_SEM_MEDO_DE_MUDAR_O_BRASIL", "ESSA_E_A_SOLUCAO",
    "BRASIL_ACIMA_DE_TUDO_DEUS_ACIMA_DE_TODOS", "UNIDOS_PARA_TRANSFORMAR_O_BRASIL",
    "PSP46",
}

# ── Coleta de anos de aparição ─────────────────────────────────────────────────

anos_data = defaultdict(set)  # sigla_canonica -> set of years


def normalize(sigla):
    s = sigla.strip().upper()
    # Remove todos os caracteres não-ASCII (inclui replacement char U+FFFD e outros)
    s_clean = re.sub(r"[^\x00-\x7F]", "", s)
    # Lookup: primeiro com valor original (pode ser ASCII puro), depois limpo
    result = ALIASES.get(s, ALIASES.get(s_clean, s_clean if s_clean != s else s))
    return result


def add(sigla, ano):
    s = normalize(sigla)
    if not s or s in SKIP:
        return
    if re.match(r"^\d+$", s):
        return
    anos_data[s].add(ano)


# ── 1. official_totals (Federal + Senado) ─────────────────────────────────────
files_years = [
    ("../resultados_geo/Legislativas 2006/official_totals_2006.json", 2006),
    ("../resultados_geo/Legislativas 2010/official_totals_2010.json", 2010),
    ("../resultados_geo/Legislativas 2014/official_totals_2014.json", 2014),
    ("../resultados_geo/Legislativas 2018/official_totals_2018.json", 2018),
    ("../resultados_geo/Legislativas 2022/official_totals_2022.json", 2022),
]
for fpath, yr in files_years:
    with open(fpath, "r", encoding="utf-8", errors="replace") as f:
        d = json.load(f)
    for uf, uf_data in d.items():
        for etype in ["e", "f"]:
            if etype not in uf_data:
                continue
            for coal in uf_data[etype].get("coalitions", []):
                cid = coal.get("id", "")
                raw = coal.get("raw_comp", "")

                cid_clean = re.sub(r"[^\x00-\x7F]", "", cid)

                if "FEDERA" in cid_clean.upper():
                    # Extrair partidos da composição "(PT/PC DO B/PV)"
                    m = re.search(r"\(([^)]+)\)", cid_clean)
                    if m:
                        for p in m.group(1).split("/"):
                            add(p.strip(), yr)
                    # Identificar a federação
                    if "FE BRASIL" in cid_clean.upper() or "ESPERAN" in cid_clean.upper():
                        add("FE BRASIL", yr)
                    elif "PSOL" in cid_clean.upper() and "REDE" in cid_clean.upper():
                        add("PSOL/REDE", yr)
                    elif "PSDB" in cid_clean.upper() and "CIDADANIA" in cid_clean.upper():
                        add("PSDB/CIDADANIA", yr)
                    continue

                if "/" in cid:
                    for p in cid.split("/"):
                        add(p.strip(), yr)
                else:
                    add(cid, yr)

                if raw:
                    for p in re.split(r"[/,]", raw):
                        add(p.strip(), yr)

# ── 2. detalhes_candidatos ────────────────────────────────────────────────────
det_files = [
    ("../resultados_geo/Legislativas 2006/detalhes_candidatos_2006.json", 2006),
    ("../resultados_geo/Legislativas 2010/detalhes_candidatos_2010.json", 2010),
    ("../resultados_geo/Legislativas 2014/detalhes_candidatos_2014.json", 2014),
    ("../resultados_geo/Legislativas 2018/detalhes_candidatos_2018.json", 2018),
]
for fpath, yr in det_files:
    with open(fpath, "r", encoding="utf-8", errors="replace") as f:
        d = json.load(f)
    for cand in d.values():
        if isinstance(cand, dict):
            add(cand.get("partido", ""), yr)
            for p in re.split(r"[/,]", cand.get("composicao", "")):
                add(p.strip(), yr)

# ── 3. distritos_votos ────────────────────────────────────────────────────────
with open("../resultados_geo/distritos_votos.json", "r", encoding="utf-8", errors="replace") as f:
    dv = json.load(f)
year_map = {
    "deputado_2006": 2006, "deputado_2010": 2010,
    "deputado_2014": 2014, "deputado_2018": 2018, "deputado_2022": 2022,
}
for dist_data in dv.values():
    for yr_key, yr in year_map.items():
        if yr_key in dist_data and isinstance(dist_data[yr_key], dict):
            for p in dist_data[yr_key]:
                add(p, yr)

# ── 4. semilocal_votos ────────────────────────────────────────────────────────
with open("../resultados_geo/semilocal_votos.json", "r", encoding="utf-8", errors="replace") as f:
    sv = json.load(f)
for subr_data in sv.values():
    for yr_key, yr in year_map.items():
        if yr_key in subr_data and isinstance(subr_data[yr_key], dict):
            for p in subr_data[yr_key]:
                add(p, yr)

# ── 5. Garantir componentes de federações aparecem com o ano da federação ──────
for fed_sigla, fed_info in FEDERACOES.items():
    for comp in fed_info["composicao"].split("/"):
        comp = comp.strip()
        s = normalize(comp)
        if s and s not in SKIP:
            anos_data[s].add(fed_info["ano"])

# ── 6. Garantir que todos os partidos canônicos estejam na lista ───────────────
for sigla in CANONICAL_COLOR:
    s = normalize(sigla)
    if s and s not in SKIP:
        if s not in anos_data:
            anos_data[s]  # cria entrada vazia

# ── Inverso do PARTY_NUMBERS: sigla -> número ──────────────────────────────────
sigla_to_number = {}
for num, sig in PARTY_NUMBERS.items():
    s = normalize(sig)
    if s not in sigla_to_number:
        sigla_to_number[s] = num


# ── Determinar tipo ────────────────────────────────────────────────────────────
def get_tipo(sigla):
    return "FEDERAÇÃO" if sigla in FEDERACOES else "PARTIDO"


def is_valid_entry(sigla):
    if sigla in SKIP:
        return False
    if re.match(r"^\d+$", sigla):
        return False
    if re.match(r"^PARTIDO\d+$", sigla):
        return False
    if sigla.count("/") > 1:
        return False
    if "_" in sigla and len(sigla) > 20:
        return False
    return True


# Mapa de sigla interna -> sigla de exibição (para UNIAO → UNIÃO)
DISPLAY = {
    "UNIAO": "UNIÃO",
}

# ── Construir linhas do CSV ────────────────────────────────────────────────────
rows = []
seen = set()

for sigla, anos_set in sorted(anos_data.items()):
    if not is_valid_entry(sigla):
        continue
    if sigla in seen:
        continue
    seen.add(sigla)

    sigla_display = DISPLAY.get(sigla, sigla)
    cor = CANONICAL_COLOR.get(sigla, CANONICAL_COLOR.get(sigla_display, ""))
    numero = sigla_to_number.get(sigla, "")
    tipo = get_tipo(sigla)
    composicao = FEDERACOES[sigla]["composicao"] if sigla in FEDERACOES else ""
    nome_fed = FEDERACOES[sigla]["nome_completo"] if sigla in FEDERACOES else ""
    anos_str = ";".join(str(a) for a in sorted(anos_set)) if anos_set else ""

    rows.append({
        "sigla": sigla_display,
        "tipo": tipo,
        "numero_eleitoral": numero,
        "cor_hex": cor,
        "anos_eleicoes": anos_str,
        "composicao_federacao": composicao,
        "nome_federacao": nome_fed,
    })

rows.sort(key=lambda r: (0 if r["tipo"] == "PARTIDO" else 1, r["sigla"]))

# ── Exportar CSV ───────────────────────────────────────────────────────────────
output_path = "../partidos_e_federacoes.csv"
with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "sigla", "tipo", "numero_eleitoral", "cor_hex",
        "anos_eleicoes", "composicao_federacao", "nome_federacao",
    ])
    writer.writeheader()
    writer.writerows(rows)

with open("gen_log.txt", "w", encoding="utf-8") as log:
    log.write(f"Total: {len(rows)}\n")
    log.write(f"  PARTIDO:   {sum(1 for r in rows if r['tipo'] == 'PARTIDO')}\n")
    log.write(f"  FEDERAÇÃO: {sum(1 for r in rows if r['tipo'] == 'FEDERAÇÃO')}\n\n")
    for r in rows:
        log.write(f"{r['sigla']:20s} {r['tipo']:10s} {r['numero_eleitoral']:5s} {r['cor_hex']:10s} {r['anos_eleicoes']}\n")

print(f"Exportado: {output_path} ({len(rows)} entradas)")
