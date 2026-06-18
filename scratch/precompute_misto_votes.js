// Pre-compute Federal Deputy AND President (1st round) votes per "Tamanho Americano"
// mixed-member district, for years 2006-2022.
//
// Geometries come from resultados_geo/distritos_misto/distritos_misto_<UF>.geojson
// (generated from the shapefile, unsimplified). Votes are aggregated by mapping each
// polling location (locais_votacao_<year>_<UF>.geojson points) to its containing
// district via point-in-polygon, then summing both the deputy and presidential
// results keyed by zone_tse_locvot.
//
// Output: resultados_geo/distritos_misto_votos.json
//   { "<CD_UF>_<DISTRICT>": { "deputado_2022": {PARTY:votes,...,TOTAL_VOTOS_VALIDOS},
//                             "presidente_2022": {...}, ... } }

const path = require('node:path');
const fs = require('node:fs');
const unzipit = require('unzipit');

const ROOT = path.resolve(__dirname, '..');
const DATA_BASE_URL = path.join(ROOT, 'resultados_geo') + path.sep;
const MISTO_DIR = path.join(DATA_BASE_URL, 'distritos_misto');

const PARTY_NUMBERS = {
  "10": "REPUBLICANOS", "11": "PP", "12": "PDT", "13": "PT", "14": "PTB",
  "15": "MDB", "16": "PSTU", "17": "PSL", "18": "REDE", "19": "PODE",
  "20": "PSC", "21": "PCB", "22": "PL", "23": "CIDADANIA", "25": "DEM",
  "27": "DC", "28": "PRTB", "29": "PCO", "30": "NOVO", "31": "PHS",
  "33": "PMN", "35": "PMB", "36": "AGIR", "40": "PSB", "43": "PV",
  "44": "UNIÃO", "45": "PSDB", "50": "PSOL", "51": "PATRIOTA", "55": "PSD",
  "65": "PC DO B", "70": "AVANTE", "77": "SOLIDARIEDADE", "80": "UP",
  "90": "PROS"
};

const UF_TO_CODE = {
  "RO": "11", "AC": "12", "AM": "13", "RR": "14", "PA": "15", "AP": "16", "TO": "17",
  "MA": "21", "PI": "22", "CE": "23", "RN": "24", "PB": "25", "PE": "26", "AL": "27",
  "SE": "28", "BA": "29", "MG": "31", "ES": "32", "RJ": "33", "SP": "35", "PR": "41",
  "SC": "42", "RS": "43", "MS": "50", "MT": "51", "GO": "52", "DF": "53"
};

// ---- Point in Polygon ----
function isPointInPolygon(point, vs) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInMultiPolygon(point, coords) {
  for (const poly of coords) {
    if (isPointInPolygon(point, poly[0])) return true;
  }
  return false;
}

function getBoundingBox(ring) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of ring) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  return { minX, maxX, minY, maxY };
}

function getMultiPolygonBoundingBox(polys) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const poly of polys) {
    const box = getBoundingBox(poly[0]);
    if (box.minX < minX) minX = box.minX;
    if (box.maxX > maxX) maxX = box.maxX;
    if (box.minY < minY) minY = box.minY;
    if (box.maxY > maxY) maxY = box.maxY;
  }
  return { minX, maxX, minY, maxY };
}

// ---- Simplification (ONLY to speed up point-in-polygon, never written out) ----
function getSqSegDist(p, p1, p2) {
  let x = p1[0], y = p1[1], dx = p2[0] - x, dy = p2[1] - y;
  if (dx !== 0 || dy !== 0) {
    let t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) { x = p2[0]; y = p2[1]; }
    else if (t > 0) { x += dx * t; y += dy * t; }
  }
  dx = p[0] - x; dy = p[1] - y;
  return dx * dx + dy * dy;
}

function simplifyDPStep(points, first, last, sqTolerance, simplified) {
  let maxSqDist = sqTolerance, index = -1;
  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDist(points[i], points[first], points[last]);
    if (sqDist > maxSqDist) { index = i; maxSqDist = sqDist; }
  }
  if (maxSqDist > sqTolerance) {
    if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
}

function simplifyDouglasPeucker(points, tolerance) {
  if (points.length <= 2) return points;
  const sqTolerance = tolerance * tolerance;
  const simplified = [points[0]];
  simplifyDPStep(points, 0, points.length - 1, sqTolerance, simplified);
  simplified.push(points[points.length - 1]);
  return simplified;
}

function simplifyGeometry(geom, tolerance) {
  if (geom.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geom.coordinates.map(r => simplifyDouglasPeucker(r, tolerance)) };
  } else if (geom.type === 'MultiPolygon') {
    return { type: 'MultiPolygon', coordinates: geom.coordinates.map(poly => poly.map(r => simplifyDouglasPeucker(r, tolerance))) };
  }
  return geom;
}

// ---- Federation key normalization (parties + federations, NO coalitions) ----
function getStandardFederationKey(name, year) {
  const n = String(name || '').toUpperCase().trim();
  const clean = n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "");
  let partyKey = clean;

  if (clean === 'PMDB' || clean === 'MDB') partyKey = 'MDB';
  else if (clean === 'PR' || clean === 'PL') partyKey = 'PL';
  else if (clean === 'PRB' || clean === 'REPUBLICANOS') partyKey = 'REPUBLICANOS';
  else if (clean === 'PPS' || clean === 'CIDADANIA') partyKey = 'CIDADANIA';
  else if (clean === 'PTN' || clean === 'PODEMOS' || clean === 'PODE') partyKey = 'PODE';
  else if (clean === 'PTDOB' || clean === 'AVANTE') partyKey = 'AVANTE';
  else if (clean === 'PEN' || clean === 'PATRI' || clean === 'PATRIOTA') partyKey = 'PATRIOTA';
  else if (clean === 'PTC' || clean === 'AGIR') partyKey = 'AGIR';
  else if (clean === 'PMN' || clean === 'MOBILIZA') partyKey = 'MOBILIZA';
  else if (clean === 'PFL' || clean === 'DEM') partyKey = 'DEM';
  else if (clean === 'PCDOB') partyKey = 'PCDOB';
  else if (clean === 'SOLIDARIEDADE') partyKey = 'SOLIDARIEDADE';
  else if (clean === 'PSOL') partyKey = 'PSOL';
  else if (clean === 'REDE') partyKey = 'REDE';
  else if (clean === 'UNIAO') partyKey = 'UNIÃO';

  // Group into federations ONLY for 2022
  if (year >= 2022) {
    if (partyKey === 'PT' || partyKey === 'PV' || partyKey === 'PCDOB') return 'FE_BRASIL';
    if (partyKey === 'PSDB' || partyKey === 'CIDADANIA') return 'PSDB_CIDADANIA';
    if (partyKey === 'PSOL' || partyKey === 'REDE') return 'PSOL_REDE';
  }
  return partyKey;
}

// ---- Load district geometries from the generated GeoJSON files ----
function loadDistricts() {
  const districts = [];
  for (const uf of Object.keys(UF_TO_CODE)) {
    const file = path.join(MISTO_DIR, `distritos_misto_${uf}.geojson`);
    if (!fs.existsSync(file)) { console.warn(`(missing ${file})`); continue; }
    const fc = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const feat of fc.features) {
      const props = feat.properties;
      const geom = simplifyGeometry(feat.geometry, 0.003); // PIP speed only
      const box = geom.type === 'Polygon'
        ? getBoundingBox(geom.coordinates[0])
        : getMultiPolygonBoundingBox(geom.coordinates);
      districts.push({ fid: props.fid, uf: props.CD_UF, district: props.DISTRICT, geom, box });
    }
  }
  return districts;
}

// ---- Aggregate one election's RESULTS into the per-district vote store ----
function aggregateResults(results, candNames, normLocToFid, fallbackFid, isPresident, year, distVotos, electionKey) {
  for (const [locKey, voteMap] of Object.entries(results)) {
    const parts = locKey.split('_');
    let zone, tse, locvot;
    if (parts.length === 3) { zone = parts[0]; tse = parts[1]; locvot = parts[2]; }
    else if (parts.length === 4) { zone = parts[1]; tse = parts[2]; locvot = parts[3]; }
    else continue;

    const normKey = `${parseInt(zone)}_${parseInt(tse)}_${parseInt(locvot)}`;
    let fid = normLocToFid[normKey];
    if (fid === undefined) fid = fallbackFid;
    if (fid === undefined || fid === null) continue;

    if (!distVotos[fid][electionKey]) distVotos[fid][electionKey] = {};
    const distMap = distVotos[fid][electionKey];

    for (const [candId, votesVal] of Object.entries(voteMap)) {
      const votes = parseInt(votesVal) || 0;
      if (votes <= 0) continue;

      // Blank / null
      if (candId === '95' || candId === '96') {
        const label = candId === '95' ? 'VOTOS_BRANCOS' : 'VOTOS_NULOS';
        distMap[label] = (distMap[label] || 0) + votes;
        continue;
      }

      let stdParty;
      if (isPresident) {
        // Presidential voteMap is keyed by party number (each party = one candidate)
        const pName = PARTY_NUMBERS[candId];
        stdParty = pName ? getStandardFederationKey(pName, year) : candId;
      } else if (candId.length <= 2) {
        // Deputy legend vote (party number)
        const pName = PARTY_NUMBERS[candId];
        stdParty = pName ? getStandardFederationKey(pName, year) : candId;
      } else {
        // Deputy individual candidate — use their PARTY (meta[1]), NOT coalition
        const meta = candNames[candId];
        stdParty = meta ? getStandardFederationKey(meta[1], year) : candId;
      }

      distMap[stdParty] = (distMap[stdParty] || 0) + votes;
      distMap['TOTAL_VOTOS_VALIDOS'] = (distMap['TOTAL_VOTOS_VALIDOS'] || 0) + votes;
    }
  }
}

async function loadZipJson(zipPath, jsonName) {
  if (!fs.existsSync(zipPath)) return null;
  const reader = await unzipit.unzip(new Uint8Array(fs.readFileSync(zipPath)));
  let entry = reader.entries[jsonName];
  if (!entry) {
    const lower = jsonName.toLowerCase();
    for (const k in reader.entries) { if (k.toLowerCase() === lower) { entry = reader.entries[k]; break; } }
  }
  if (!entry) return null;
  return JSON.parse(await entry.text());
}

async function run() {
  console.log('=== Pre-computing Deputy + President votes per mixed-member district ===\n');

  const districts = loadDistricts();
  console.log(`Loaded ${districts.length} district geometries.\n`);

  const distVotos = {};
  for (const d of districts) distVotos[d.fid] = {};

  const zipIndex = JSON.parse(fs.readFileSync(DATA_BASE_URL + 'zip_index.json', 'utf8'));
  const years = [2006, 2010, 2014, 2018, 2022];
  const states = Object.keys(UF_TO_CODE);

  for (const year of years) {
    console.log(`\n==== Year ${year} ====`);
    for (const uf of states) {
      const t0 = Date.now();
      process.stdout.write(` ${uf}.. `);
      const stateCode = UF_TO_CODE[uf];

      const stateDistricts = districts.filter(d => d.uf === stateCode);
      if (stateDistricts.length === 0) { console.log('(no districts)'); continue; }
      const fallbackFid = stateDistricts[0].fid;

      // 1. Polling locations -> district (point in polygon)
      const geojsonKey = `locais_votacao_${year}/locais_votacao_${year}_${uf}.geojson`;
      const zipMapping = zipIndex[geojsonKey];
      if (!zipMapping) { console.log('(no loc geojson)'); continue; }
      const locGeo = await loadZipJson(path.resolve(DATA_BASE_URL, zipMapping.zip), zipMapping.file);
      if (!locGeo) { console.log('(loc geojson not found)'); continue; }

      const normLocToFid = {};
      let matched = 0, unmatched = 0;
      for (const feat of locGeo.features) {
        const props = feat.properties;
        const tse = props.cd_localidade_tse || props.CD_MUNICIPIO;
        const zone = props.NR_ZONA || props.nr_zona;
        const locvot = props.nr_locvot;
        if (!tse || !zone || !locvot) continue;
        const pt = feat.geometry.coordinates;
        const container = stateDistricts.find(d => {
          if (pt[0] < d.box.minX || pt[0] > d.box.maxX || pt[1] < d.box.minY || pt[1] > d.box.maxY) return false;
          if (d.geom.type === 'Polygon') return isPointInPolygon(pt, d.geom.coordinates[0]);
          return isPointInMultiPolygon(pt, d.geom.coordinates);
        });
        if (container) {
          normLocToFid[`${parseInt(zone)}_${parseInt(tse)}_${parseInt(locvot)}`] = container.fid;
          matched++;
        } else { unmatched++; }
      }

      // 2. Deputy results
      const depJson = await loadZipJson(
        path.resolve(DATA_BASE_URL, `Legislativas ${year}/deputados_federal_${year}_${uf}.zip`),
        `deputados_federal_${year}_${uf}.json`);
      if (depJson) {
        aggregateResults(depJson.RESULTS || {}, depJson.METADATA?.cand_names || {},
          normLocToFid, fallbackFid, false, year, distVotos, `deputado_${year}`);
      }

      // 3. President results (1st round)
      const presJson = await loadZipJson(
        path.resolve(DATA_BASE_URL, `Majoritarias ${year}/presidente_${year}_t1_${uf}.zip`),
        `presidente_${year}_t1_${uf}.json`);
      if (presJson) {
        aggregateResults(presJson.RESULTS || {}, presJson.METADATA?.cand_names || {},
          normLocToFid, fallbackFid, true, year, distVotos, `presidente_${year}`);
      }

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(`${matched} locs (${unmatched} unmatched)${depJson ? ' +dep' : ''}${presJson ? ' +pres' : ''} (${elapsed}s)\n`);
    }
  }

  const outputPath = path.resolve(DATA_BASE_URL, 'distritos_misto_votos.json');
  fs.writeFileSync(outputPath, JSON.stringify(distVotos));
  const sizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(1);
  console.log(`\nWrote ${outputPath} (${sizeMB} MB)`);

  let withData = 0;
  for (const fid of Object.keys(distVotos)) if (Object.keys(distVotos[fid]).length > 0) withData++;
  console.log(`Districts with data: ${withData}/${Object.keys(distVotos).length}`);
}

run().catch(console.error);
