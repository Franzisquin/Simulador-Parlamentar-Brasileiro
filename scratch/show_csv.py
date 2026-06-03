import csv
with open("../partidos_e_federacoes.csv", "r", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))
for r in rows:
    print(f"{r['sigla']:20s} {r['tipo']:10s} {r['numero_eleitoral']:5s} {r['cor_hex']:10s} {r['anos_eleicoes']}")
print()
print("Total:", len(rows))
feds = [r for r in rows if r['tipo'] != 'PARTIDO']
print("Federacoes:", len(feds))
for r in feds:
    print(f"  {r['sigla']:20s} {r['composicao_federacao']}")
