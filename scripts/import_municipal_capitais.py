# -*- coding: utf-8 -*-
"""
Importa eleições municipais (prefeito 1º turno + vereador) das 26 capitais a partir
do projeto Observatório e gera os artefatos consumidos pelo Simulador:

  resultados_geo/municipal_capitais_votos.json      (votos por partido, cidade inteira + por região DIST03)
  resultados_geo/municipal_capitais_circuitos.geojson (polígonos DIST03, NÃO generalizados, EPSG:4326)
  resultados_geo/municipal_capitais_seats.json      (cadeiras realistas por ano + alternativa do print)

Convenções (espelham semilocal_votos.json):
  - Votos agregados por PARTIDO usando o nº do candidato (legenda) ou cand_names (candidato).
  - Sigla normalizada igual ao getStandardFederationKey do site (aliases), SEM agrupar federação
    (o agrupamento de federação 2022+ é feito em runtime no JS, por ano).
  - Chaves de votos: "<Capital>" (cidade) e "<Capital>-<DIST03>" (região);
    cada uma -> { "vereador_<ano>": {PARTIDO: votos, ..., TOTAL_VOTOS_VALIDOS}, "prefeito_<ano>": {...} }

Rodar:  py -3 scripts/import_municipal_capitais.py            (todas as capitais)
        py -3 scripts/import_municipal_capitais.py Natal      (apenas uma, p/ teste)
"""
import os, re, sys, json, zipfile, unicodedata, glob
import geopandas as gpd
import pandas as pd
from shapely.geometry import mapping

# ----------------------------------------------------------------------------- paths
OBS = r"C:\Users\lixov\OneDrive\Documentos\Observatorio\resultados_geo"
POP_DIR = r"C:\Users\lixov\OneDrive\Ambiente de Trabalho\PR Regional\Circunscrições Capitais Populacao"
SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "resultados_geo")
YEARS = [2008, 2012, 2016, 2020, 2024]
PROJ_EPSG = 5880  # SIRGAS 2000 / Brazil Polyconic (metros) p/ join espacial

# CD_MUN(IBGE) -> (cidade, UF, cadeiras_alternativas[print])
CITIES = {
    "2800308": ("Aracaju", "SE", 27), "3106200": ("Belo Horizonte", "MG", 41),
    "1501402": ("Belém", "PA", 35),   "1400100": ("Boa Vista", "RR", 25),
    "5002704": ("Campo Grande", "MS", 29), "5103403": ("Cuiabá", "MT", 27),
    "4106902": ("Curitiba", "PR", 39), "4205407": ("Florianópolis", "SC", 25),
    "2304400": ("Fortaleza", "CE", 41), "5208707": ("Goiânia", "GO", 35),
    "2507507": ("João Pessoa", "PB", 29), "1600303": ("Macapá", "AP", 25),
    "2704302": ("Maceió", "AL", 31),  "1302603": ("Manaus", "AM", 41),
    "2408102": ("Natal", "RN", 29),   "1721000": ("Palmas", "TO", 25),
    "4314902": ("Porto Alegre", "RS", 35), "1100205": ("Porto Velho", "RO", 25),
    "2611606": ("Recife", "PE", 35),  "1200401": ("Rio Branco", "AC", 25),
    "3304557": ("Rio de Janeiro", "RJ", 55), "2927408": ("Salvador", "BA", 41),
    "2111300": ("São Luís", "MA", 31), "3550308": ("São Paulo", "SP", 75),
    "2211001": ("Teresina", "PI", 29), "3205309": ("Vitória", "ES", 25),
}

# nº do partido -> sigla (igual PARTY_NUMBERS do simulador.js, p/ votos de legenda)
PARTY_NUMBERS = {
    "10": "REPUBLICANOS", "11": "PP", "12": "PDT", "13": "PT", "14": "PTB",
    "15": "MDB", "16": "PSTU", "17": "PSL", "18": "REDE", "19": "PODE",
    "20": "PSC", "21": "PCB", "22": "PL", "23": "CIDADANIA", "25": "DEM",
    "27": "DC", "28": "PRTB", "29": "PCO", "30": "NOVO", "31": "PHS",
    "33": "PMN", "35": "PMB", "36": "AGIR", "40": "PSB", "43": "PV",
    "44": "UNIÃO", "45": "PSDB", "50": "PSOL", "51": "PATRIOTA", "55": "PSD",
    "65": "PC DO B", "70": "AVANTE", "77": "SOLIDARIEDADE", "80": "UP",
    "90": "PROS",
}

# aliases históricos -> chave interna (igual getStandardFederationKey, sem federação)
ALIAS = {
    "PMDB": "MDB", "MDB": "MDB", "PR": "PL", "PL": "PL",
    "PRB": "REPUBLICANOS", "REPUBLICANOS": "REPUBLICANOS",
    "PPS": "CIDADANIA", "CIDADANIA": "CIDADANIA",
    "PTN": "PODE", "PODEMOS": "PODE", "PODE": "PODE",
    "PTDOB": "AVANTE", "AVANTE": "AVANTE",
    "PEN": "PATRIOTA", "PATRI": "PATRIOTA", "PATRIOTA": "PATRIOTA",
    "PTC": "AGIR", "AGIR": "AGIR", "PMN": "MOBILIZA", "MOBILIZA": "MOBILIZA",
    "PFL": "DEM", "DEM": "DEM", "PCDOB": "PCDOB",
}


def strip_accents(s):
    return unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode()


def norm_name(s):
    return strip_accents(s).upper().replace(" ", "_")


def norm_party(sigla):
    clean = re.sub(r"[^A-Z0-9]", "", strip_accents(sigla).upper())
    return ALIAS.get(clean, clean)


def to_i(x):
    try:
        return int(float(x))
    except (TypeError, ValueError):
        return None


def party_for_cand(cand_id, cand_names, year):
    """Replica a resolução do site: nº curto = legenda (PARTY_NUMBERS); senão cand_names[1]."""
    cid = str(cand_id).strip()
    if cid in ("95", "96", "VOTOS_BRANCOS", "VOTOS_NULOS"):
        return None
    if len(cid) <= 2:
        if cid == "44":
            return "PRP" if year < 2022 else "UNIÃO"
        sig = PARTY_NUMBERS.get(cid)
        return norm_party(sig) if sig else None
    meta = cand_names.get(cid)
    if meta and meta[1]:
        return norm_party(meta[1])
    return None


def aggregate_station(vote_map, cand_names, year, acc):
    """Soma os votos de uma seção em acc[party]; devolve total de votos válidos somados."""
    valid = 0
    for cid, v in (vote_map or {}).items():
        votes = to_i(v) or 0
        if votes <= 0:
            continue
        party = party_for_cand(cid, cand_names, year)
        if not party:
            continue
        acc[party] = acc.get(party, 0) + votes
        valid += votes
    return valid


# ----------------------------------------------------------------------------- zip helpers
def open_zip(path):
    return zipfile.ZipFile(path) if os.path.exists(path) else None


def read_json_entry(zf, predicate):
    for n in zf.namelist():
        if predicate(n):
            return json.loads(zf.read(n).decode("utf-8"))
    return None


def load_points(year, uf, city, cd_mun):
    """Geojson de pontos (coords + zona/locvot). Retorna (tse_id, {(zona,locvot):(lon,lat)})."""
    zf = open_zip(os.path.join(OBS, f"{year} Municipais", f"{uf}.zip"))
    if not zf:
        return None, {}
    target = norm_name(city)
    entry = None
    for n in zf.namelist():
        base = os.path.basename(n)
        if not base.lower().endswith(".geojson"):
            continue
        nm = norm_name(base.split("_Ordinaria")[0].split("_ordinaria")[0])
        if nm == target:
            entry = n
            break
    if not entry:
        return None, {}
    gj = json.loads(zf.read(entry).decode("utf-8"))
    feats = gj.get("features", [])
    if not feats:
        return None, {}
    f0 = feats[0]["properties"]
    zf_name = "nr_zona" if "nr_zona" in f0 else ("NR_ZONA" if "NR_ZONA" in f0 else None)
    lf_name = "nr_locvot" if "nr_locvot" in f0 else ("NR_LOCAL_VOTACAO" if "NR_LOCAL_VOTACAO" in f0 else None)
    tse = to_i(f0.get("cd_localidade_tse"))
    pts = {}
    for f in feats:
        pr = f["properties"]
        # confere município (alguns zips podem misturar)
        ibge = to_i(pr.get("cod_localidade_ibge"))
        if ibge is not None and ibge != int(cd_mun):
            continue
        z, l = to_i(pr.get(zf_name)), to_i(pr.get(lf_name))
        lon, lat = pr.get("long"), pr.get("lat")
        if z is not None and l is not None and lon is not None and lat is not None:
            pts[(z, l)] = (float(lon), float(lat))
    return tse, pts


def load_results(kind, year, uf, tse):
    """Carrega RESULTS (por seção) + cand_names do JSON completo de prefeito/vereador."""
    if kind == "prefeito":
        zf = open_zip(os.path.join(OBS, f"Municipais {year}", f"prefeito_{year}_ord_t1_{uf}.zip"))
        pred = lambda n: ("resumo" not in n) and n.endswith(".json") and re.search(rf"(^|[_/]){tse}_", os.path.basename(n))
    else:
        zf = open_zip(os.path.join(OBS, f"Municipais_Legislativas {year}", f"vereadores_{year}_{uf}.zip"))
        pred = lambda n: ("resumo" not in n) and n.endswith(".json") and re.search(rf"_{tse}\.json$", os.path.basename(n))
    if not zf:
        return None, None
    d = read_json_entry(zf, pred)
    if not d:
        return None, None
    return d.get("RESULTS", {}), d.get("METADATA", {}).get("cand_names", {})


def station_coord(key, pts):
    """Mapeia a chave de RESULTS (zona_..._locvot) para coordenadas via (zona,locvot)."""
    ps = key.split("_")
    z, l = to_i(ps[0]), to_i(ps[-1])
    return pts.get((z, l))


# ----------------------------------------------------------------------------- realista seats
_OFFICIAL_CACHE = {}


def realista_seats(year, uf, city):
    if year not in _OFFICIAL_CACHE:
        fn = os.path.join(OBS, f"Municipais_Legislativas {year}", f"official_totals_vereadores_{year}.json")
        _OFFICIAL_CACHE[year] = json.load(open(fn, encoding="utf-8")) if os.path.exists(fn) else {}
    muni = _OFFICIAL_CACHE[year].get(uf, {})
    key = norm_name(city)
    if key in muni:
        return int(muni[key]["stats"]["qt_vagas"])
    for k in muni:
        if norm_name(k) == key:
            return int(muni[k]["stats"]["qt_vagas"])
    return None


# ----------------------------------------------------------------------------- main
def process_capital(cd_mun, city, uf, alt_seats, votos, seats, features):
    regions = gpd.read_file(os.path.join(POP_DIR, f"{city}.gpkg"))[["DIST03", "populacao", "geometry"]].copy()
    regions["DIST03"] = pd.to_numeric(regions["DIST03"], errors="coerce").astype("Int64")
    regions = regions.dropna(subset=["DIST03"]).reset_index(drop=True)
    regions_proj = regions.to_crs(epsg=PROJ_EPSG)

    # circuitos.geojson (EPSG:4326, sem simplificar) + populações no votos
    regions_4326 = regions.to_crs(epsg=4326)
    for _, r in regions_4326.iterrows():
        d = int(r["DIST03"])
        features.append({
            "type": "Feature",
            "properties": {"capital": city, "uf": uf, "cd_mun": cd_mun,
                           "dist03": d, "populacao": int(r["populacao"])},
            "geometry": mapping(r["geometry"]),
        })
    region_pop = {int(r["DIST03"]): int(r["populacao"]) for _, r in regions_4326.iterrows()}
    seats[city] = {"alt": alt_seats, "real": {}, "uf": uf, "cd_mun": cd_mun,
                   "regioes": {str(d): region_pop[d] for d in sorted(region_pop)}}

    for year in YEARS:
        rseats = realista_seats(year, uf, city)
        if rseats:
            seats[city]["real"][str(year)] = rseats

        tse, pts = load_points(year, uf, city, cd_mun)
        if tse is None:
            print(f"   ! {city} {year}: sem geojson de pontos")
            continue

        for kind in ("vereador", "prefeito"):
            results, cand_names = load_results(kind, year, uf, tse)
            if not results:
                print(f"   ! {city} {year} {kind}: sem RESULTS")
                continue
            ek = f"{kind}_{year}"

            # cidade inteira (todas as seções)
            whole = {}
            whole_valid = 0
            # regional (apenas seções com coordenadas)
            region_acc = {int(d): {} for d in region_pop}
            region_valid = {int(d): 0 for d in region_pop}

            # spatial join: monta pontos com coords e resolve região
            coords, keys = [], []
            for k in results:
                c = station_coord(k, pts)
                if c:
                    coords.append(c)
                    keys.append(k)
            key_region = {}
            if coords:
                pts_gdf = gpd.GeoDataFrame(
                    {"k": keys}, geometry=gpd.points_from_xy([c[0] for c in coords], [c[1] for c in coords]),
                    crs="EPSG:4326").to_crs(epsg=PROJ_EPSG)
                joined = gpd.sjoin_nearest(pts_gdf, regions_proj[["DIST03", "geometry"]], how="left")
                joined = joined.drop_duplicates(subset=["k"])
                for _, row in joined.iterrows():
                    if pd.notna(row["DIST03"]):
                        key_region[row["k"]] = int(row["DIST03"])

            for k, vmap in results.items():
                v = aggregate_station(vmap, cand_names, year, whole)
                whole_valid += v
                d = key_region.get(k)
                if d is not None:
                    rv = aggregate_station(vmap, cand_names, year, region_acc[d])
                    region_valid[d] += rv

            whole["TOTAL_VOTOS_VALIDOS"] = whole_valid
            votos.setdefault(city, {})[ek] = whole
            for d in region_pop:
                acc = region_acc[int(d)]
                acc["TOTAL_VOTOS_VALIDOS"] = region_valid[int(d)]
                votos.setdefault(f"{city}-{d}", {})[ek] = acc

        print(f"   {city} {year}: ok (real={seats[city]['real'].get(str(year))})")


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    votos, seats, features = {}, {}, []
    items = [(cd, c, uf, a) for cd, (c, uf, a) in CITIES.items()
             if (only is None or norm_name(c) == norm_name(only))]
    print(f"Processando {len(items)} capital(is)...")
    for cd_mun, city, uf, alt in items:
        print(f"== {city} ({uf}) ==")
        process_capital(cd_mun, city, uf, alt, votos, seats, features)

    os.makedirs(SITE, exist_ok=True)
    suffix = "" if only is None else "_" + norm_name(only).lower()
    with open(os.path.join(SITE, f"municipal_capitais_votos{suffix}.json"), "w", encoding="utf-8") as f:
        json.dump(votos, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(SITE, f"municipal_capitais_seats{suffix}.json"), "w", encoding="utf-8") as f:
        json.dump(seats, f, ensure_ascii=False, indent=1)
    fc = {"type": "FeatureCollection",
          "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
          "features": features}
    with open(os.path.join(SITE, f"municipal_capitais_circuitos{suffix}.geojson"), "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))

    print(f"\nOK. votos={len(votos)} chaves, circuitos={len(features)} regiões, seats={len(seats)} capitais.")
    print(f"Saída em {SITE}")


if __name__ == "__main__":
    main()
