"""Find exactly where UNI?O gets added to anos_data"""
import json, re, traceback
from collections import defaultdict

ALIASES = {
    "UNIAO": "UNIAO", "UNIO": "UNIAO",
    "PCDOB": "PC DO B", "PC_DO_B": "PC DO B",
    "PT_DO_B": "PT DO B", "PODEMOS": "PODE", "SD": "SOLIDARIEDADE",
    "PATRI": "PATRIOTA", "PMDB": "MDB", "PPB": "PP", "PFL": "DEM",
    "FE_BRASIL": "FE BRASIL", "PSOL_REDE": "PSOL/REDE",
    "PSDB_CIDADANIA": "PSDB/CIDADANIA",
}
SKIP = {"OUTROS", "TOSSUP", "#NULO#", "TOTAL_VOTOS_VALIDOS", "", "MISSAO",
        "VOTOS_BRANCOS", "VOTOS_NULOS", "BRASIL_ESPERANCA", "BRASIL_PARA_TODOS"}

class TracingDict(defaultdict):
    def __setitem__(self, key, value):
        if "UNI" in repr(key) and "�" in key:
            print(f"CAUGHT: Setting key {repr(key)}")
            traceback.print_stack(limit=5)
        super().__setitem__(key, value)

def normalize(sigla):
    s = sigla.strip().upper()
    s_clean = re.sub(r"[^\x00-\x7F]", "", s)
    return ALIASES.get(s, ALIASES.get(s_clean, s_clean if s_clean != s else s))

anos_data = TracingDict(set)

def add(sigla, ano):
    s = normalize(sigla)
    if not s or s in SKIP:
        return
    if re.match(r"^\d+$", s):
        return
    anos_data[s].add(ano)

# Run all steps from main script
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
                    continue
                if "/" in cid:
                    for p in cid.split("/"):
                        add(p.strip(), yr)
                else:
                    add(cid, yr)
                if raw:
                    for p in re.split(r"[/,]", raw):
                        add(p.strip(), yr)

for fpath, yr in [
    ("../resultados_geo/Legislativas 2006/detalhes_candidatos_2006.json", 2006),
    ("../resultados_geo/Legislativas 2010/detalhes_candidatos_2010.json", 2010),
    ("../resultados_geo/Legislativas 2014/detalhes_candidatos_2014.json", 2014),
    ("../resultados_geo/Legislativas 2018/detalhes_candidatos_2018.json", 2018),
]:
    with open(fpath, "r", encoding="utf-8", errors="replace") as f:
        d = json.load(f)
    for cand in d.values():
        if isinstance(cand, dict):
            add(cand.get("partido", ""), yr)
            for p in re.split(r"[/,]", cand.get("composicao", "")):
                add(p.strip(), yr)

with open("../resultados_geo/distritos_votos.json", "r", encoding="utf-8", errors="replace") as f:
    dv = json.load(f)
year_map = {"deputado_2006": 2006, "deputado_2010": 2010, "deputado_2014": 2014,
            "deputado_2018": 2018, "deputado_2022": 2022}
for dist_data in dv.values():
    for yr_key, yr in year_map.items():
        if yr_key in dist_data and isinstance(dist_data[yr_key], dict):
            for p in dist_data[yr_key]:
                add(p, yr)

with open("../resultados_geo/semilocal_votos.json", "r", encoding="utf-8", errors="replace") as f:
    sv = json.load(f)
for subr_data in sv.values():
    for yr_key, yr in year_map.items():
        if yr_key in subr_data and isinstance(subr_data[yr_key], dict):
            for p in subr_data[yr_key]:
                add(p, yr)

# Check CANONICAL_COLOR
CANONICAL_COLOR_KEYS = [
    "PT", "PL", "PP", "MDB", "PSD", "PSDB", "PSOL", "PSL", "PPB",
    "REPUBLICANOS", "UNIAO", "PDT", "PSB", "NOVO", "PC DO B", "PV",
    "CIDADANIA", "REDE", "AVANTE", "PATRIOTA", "SOLIDARIEDADE", "PROS",
    "PTB", "PODE", "PSC", "DC", "PMN", "MOBILIZA", "AGIR", "UP", "PCO",
    "PSTU", "PRTB", "PMB", "DEM", "PFL", "PPS", "PR", "PRB", "PT DO B",
    "PAN", "PASART", "PCB", "PDS", "PEN", "PGT", "PH", "PHS", "PJ",
    "PN", "PPL", "PST", "PTC", "PTN", "PTR", "ARENA", "PMDB", "PSDC",
    "PRD", "PRONA", "PRP", "FE BRASIL", "PSDB/CIDADANIA", "PSOL/REDE", "SD",
]
for sigla in CANONICAL_COLOR_KEYS:
    s = normalize(sigla)
    if s and s not in SKIP:
        if s not in anos_data:
            anos_data[s]

print("Done. Checking keys with UNI:")
for k in sorted(anos_data.keys()):
    if "UNI" in repr(k):
        import sys
        sys.stdout.buffer.write(f"  key={repr(k)}\n".encode("utf-8"))
