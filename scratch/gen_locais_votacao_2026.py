"""Gera resultados_geo/locais_votacao_2026_<N>.zip (um GeoJSON de pontos por UF) a partir
do cadastro de locais de votação de 2026 do Observatório (ElectoMaps), no mesmo formato
dos anos anteriores (locais_votacao_2022_*.zip), e registra os arquivos em zip_index.json.

As chaves usadas para casar com os resultados (zona_municipioTSE_local) são
NR_ZONA, cd_localidade_tse e nr_locvot.

Uso: python3 scratch/gen_locais_votacao_2026.py /caminho/para/Observatorio
"""

import json
import os
import sys
import zipfile

YEAR = 2026
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'resultados_geo')

# Mesmo agrupamento de UFs por zip usado em 2022
ZIP_GROUPS = [
    ['AC', 'AL', 'AM', 'AP', 'BA'],
    ['CE', 'DF', 'ES', 'GO', 'MA'],
    ['MG', 'MS', 'MT'],
    ['PA', 'PB', 'PE', 'PI'],
    ['PR', 'RJ', 'RN', 'RO', 'RR'],
    ['RS', 'SC', 'SE'],
    ['SP', 'TO'],
]


def build_uf(obs_geo, uf, tse_to_ibge):
    with open(os.path.join(obs_geo, 'locais_votacao', f'{uf.lower()}-{YEAR}.json'), encoding='utf-8') as fh:
        src = json.load(fh)

    features = []
    for loc in src['locais']:
        if loc.get('lat') is None or loc.get('lon') is None:
            continue
        tse = int(loc['mun'])
        ibge = tse_to_ibge.get(str(tse))
        props = {
            'local_id': loc['id'],
            'ano': YEAR,
            'sg_uf': uf,
            'cd_localidade_tse': tse,
            'cod_localidade_ibge': int(ibge) if ibge else None,
            'NR_ZONA': int(loc['z']),
            'nr_locvot': int(loc['n']),
            'nm_localidade': str(loc.get('nmun') or '').upper(),
            'nm_locvot': loc.get('nm'),
            'ds_endereco': loc.get('end'),
            'ds_bairro': loc.get('bairro'),
            'qt_eleitores': loc.get('el'),
            'qt_secoes': len(loc.get('sec') or []),
            'long': loc['lon'],
            'lat': loc['lat'],
        }
        features.append({
            'type': 'Feature',
            'properties': props,
            'geometry': {'type': 'Point', 'coordinates': [loc['lon'], loc['lat']]},
        })

    return {
        'type': 'FeatureCollection',
        'name': f'locais_votacao_{YEAR}_{uf}',
        'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:EPSG::4674'}},
        'features': features,
    }


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    obs_geo = os.path.join(sys.argv[1], 'resultados_geo')
    with open(os.path.join(obs_geo, 'tse_para_ibge.json'), encoding='utf-8') as fh:
        tse_to_ibge = json.load(fh)

    index_path = os.path.join(DATA, 'zip_index.json')
    with open(index_path, encoding='utf-8') as fh:
        zip_index = json.load(fh)

    for i, ufs in enumerate(ZIP_GROUPS, start=1):
        zip_name = f'locais_votacao_{YEAR}_{i}.zip'
        with zipfile.ZipFile(os.path.join(DATA, zip_name), 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
            for uf in ufs:
                geo = build_uf(obs_geo, uf, tse_to_ibge)
                file_name = f'locais_votacao_{YEAR}_{uf}.geojson'
                zf.writestr(file_name, json.dumps(geo, ensure_ascii=False))
                zip_index[f'locais_votacao_{YEAR}/{file_name}'] = {'zip': zip_name, 'file': file_name}
                print(f'{uf}: {len(geo["features"])} locais -> {zip_name}')

    with open(index_path, 'w', encoding='utf-8') as fh:
        fh.write(json.dumps(zip_index, indent=2))


if __name__ == '__main__':
    main()
