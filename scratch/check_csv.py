import csv
with open("../partidos_e_federacoes.csv", "r", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))

# Find UNIAO variants
for r in rows:
    sig = r['sigla']
    if 'UNI' in sig or 'FEDERA' in sig or '�' in sig:
        print(repr(sig), r['tipo'])
