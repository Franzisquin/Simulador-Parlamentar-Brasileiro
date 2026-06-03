import json, re

ALIASES = {
    "UNIAO": "UNIÃO", "UNIO": "UNIÃO",
    "PCDOB": "PC DO B", "PC_DO_B": "PC DO B",
}

def normalize(sigla):
    s = sigla.strip().upper()
    s_clean = s.replace("�", "")
    return ALIASES.get(s, ALIASES.get(s_clean, s_clean if s_clean != s else s))

# Read distritos_votos.json to find UNIAO
with open("../resultados_geo/distritos_votos.json", "r", encoding="utf-8", errors="replace") as f:
    dv = json.load(f)

uniao_variants = set()
for dist_id, dist_data in dv.items():
    for yr_key in ["deputado_2006", "deputado_2010", "deputado_2014", "deputado_2018", "deputado_2022"]:
        if yr_key in dist_data and isinstance(dist_data[yr_key], dict):
            for p in dist_data[yr_key]:
                if "UNI" in p.upper() or "�" in p:
                    uniao_variants.add(p)

print("UNIAO variants in distritos_votos:", uniao_variants)
for v in uniao_variants:
    print(f"  repr={repr(v)}, normalized={normalize(v)}")

print()

# Check official_totals_2022
with open("../resultados_geo/Legislativas 2022/official_totals_2022.json", "r", encoding="utf-8", errors="replace") as f:
    d = json.load(f)

uniao_ids = set()
for uf, uf_data in d.items():
    for etype in ["e", "f"]:
        if etype not in uf_data:
            continue
        for coal in uf_data[etype].get("coalitions", []):
            cid = coal.get("id", "")
            if "UNI" in cid.upper() or "�" in cid:
                uniao_ids.add(cid)

print("UNIAO in 2022 official_totals:", uniao_ids)
for v in uniao_ids:
    print(f"  repr={repr(v)}, normalized={normalize(v)}")
