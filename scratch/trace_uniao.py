import json, re
from collections import defaultdict

# Copy of ALIASES from main script
ALIASES = {
    "UNIAO": "UNIAO",
    "UNIO": "UNIAO",
}

def normalize(sigla):
    s = sigla.strip().upper()
    s_clean = re.sub(r"[^\x00-\x7F]", "", s)
    result = ALIASES.get(s, ALIASES.get(s_clean, s_clean if s_clean != s else s))
    return result

anos_data = defaultdict(set)

def add(sigla, ano):
    s = normalize(sigla)
    if not s:
        return
    anos_data[s].add(ano)

# Read distritos_votos
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

out = open("trace_out.txt", "w", encoding="utf-8")
for k in sorted(anos_data.keys()):
    if "UNI" in k.upper() or "NI" in k.upper()[:5]:
        out.write(f"Key: {repr(k)}, anos: {sorted(anos_data[k])}\n")
out.write(f"\nAll keys with UNIAO/UNIAO patterns:\n")
for k in sorted(anos_data.keys()):
    out.write(f"  {repr(k)}\n")
out.close()
print("Done, check trace_out.txt")
