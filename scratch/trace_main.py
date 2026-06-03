"""Trace script - minimal version of main script to find source of UNI?O"""
import json, re
from collections import defaultdict

ALIASES = {
    "UNIAO": "UNIAO",
    "UNIO": "UNIAO",
    "PCDOB": "PC DO B", "PC_DO_B": "PC DO B",
    "PT_DO_B": "PT DO B", "PODEMOS": "PODE", "SD": "SOLIDARIEDADE",
    "PATRI": "PATRIOTA", "PMDB": "MDB", "PPB": "PP", "PFL": "DEM",
    "FE_BRASIL": "FE BRASIL", "PSOL_REDE": "PSOL/REDE",
    "PSDB_CIDADANIA": "PSDB/CIDADANIA",
}

def normalize(sigla):
    s = sigla.strip().upper()
    s_clean = re.sub(r"[^\x00-\x7F]", "", s)
    return ALIASES.get(s, ALIASES.get(s_clean, s_clean if s_clean != s else s))

anos_data = defaultdict(set)
sources = defaultdict(list)  # track where each key comes from

def add(sigla, ano, src=""):
    s = normalize(sigla)
    if not s:
        return
    anos_data[s].add(ano)
    if "UNI" in repr(s):
        sources[s].append(f"src={src}, raw={repr(sigla)}")

# Step 1: official_totals
for fpath, yr in [
    ("../resultados_geo/Legislativas 2022/official_totals_2022.json", 2022),
]:
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
                    continue
                if "/" in cid:
                    for p in cid.split("/"):
                        add(p.strip(), yr, f"official_totals/{uf}/{etype}/cid_split")
                else:
                    add(cid, yr, f"official_totals/{uf}/{etype}/cid")
                if raw:
                    for p in re.split(r"[/,]", raw):
                        add(p.strip(), yr, f"official_totals/{uf}/{etype}/raw")

# Step 3: distritos_votos
with open("../resultados_geo/distritos_votos.json", "r", encoding="utf-8", errors="replace") as f:
    dv = json.load(f)
year_map = {"deputado_2022": 2022}
for dist_data in dv.values():
    for yr_key, yr in year_map.items():
        if yr_key in dist_data and isinstance(dist_data[yr_key], dict):
            for p in dist_data[yr_key]:
                add(p, yr, "distritos_votos")

# Step 4: semilocal_votos
with open("../resultados_geo/semilocal_votos.json", "r", encoding="utf-8", errors="replace") as f:
    sv = json.load(f)
for subr_data in sv.values():
    for yr_key, yr in year_map.items():
        if yr_key in subr_data and isinstance(subr_data[yr_key], dict):
            for p in subr_data[yr_key]:
                add(p, yr, "semilocal_votos")

out = open("trace_main_out.txt", "w", encoding="utf-8")
for k, src_list in sorted(sources.items()):
    out.write(f"Key: {repr(k)}\n")
    for s in src_list[:5]:
        out.write(f"  {s}\n")
    if len(src_list) > 5:
        out.write(f"  ... and {len(src_list)-5} more\n")
out.close()
print("Done")
