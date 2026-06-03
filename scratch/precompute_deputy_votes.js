const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const unzipit = require('unzipit');

const DATA_BASE_URL = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/resultados_geo/';
const GPKG_PATH = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/Brasil com Dados.gpkg';

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

// ---- Bounding Box ----
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

// ---- Simplification (only for PIP speed, NOT for output) ----
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

// ---- GPKG geometry reader ----
function parseGpkgGeom(buf) {
  if (!buf) return null;
  const nodeBuf = Buffer.from(buf);
  if (nodeBuf[0] !== 0x47 || nodeBuf[1] !== 0x50) return null;
  const flags = nodeBuf[3];
  const envelopeType = (flags >> 1) & 0x07;
  let headerSize = 8;
  if (envelopeType === 1) headerSize += 32;
  else if (envelopeType === 2 || envelopeType === 3) headerSize += 48;
  else if (envelopeType === 4) headerSize += 64;
  return parseWKB(nodeBuf.subarray(headerSize));
}

function parseWKB(wkb) {
  let offset = 0;
  function readUInt32(le) { const v = le ? wkb.readUInt32LE(offset) : wkb.readUInt32BE(offset); offset += 4; return v; }
  function readDouble(le) { const v = le ? wkb.readDoubleLE(offset) : wkb.readDoubleBE(offset); offset += 8; return v; }
  function parseGeometry() {
    const le = wkb[offset] === 1; offset += 1;
    const type = readUInt32(le);
    if (type === 3) {
      const numRings = readUInt32(le);
      const rings = [];
      for (let r = 0; r < numRings; r++) {
        const numPoints = readUInt32(le);
        const ring = [];
        for (let p = 0; p < numPoints; p++) { ring.push([readDouble(le), readDouble(le)]); }
        rings.push(ring);
      }
      return { type: 'Polygon', coordinates: rings };
    } else if (type === 6) {
      const numPolys = readUInt32(le);
      const polys = [];
      for (let p = 0; p < numPolys; p++) { polys.push(parseGeometry().coordinates); }
      return { type: 'MultiPolygon', coordinates: polys };
    }
    return null;
  }
  return parseGeometry();
}

// ---- Federation key normalization (parties + federations, NO coalitions) ----
function getStandardFederationKey(name, year) {
  const n = String(name || '').toUpperCase().trim();
  const clean = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
  let partyKey = clean;
  
  if (clean === 'PMDB' || clean === 'MDB') partyKey = 'MDB';
  else if (clean === 'PR' || clean === 'PL') partyKey = 'PL';
  else if (clean === 'PRB' || clean === 'REPUBLICANOS') partyKey = 'REPUBLICANOS';
  else if (clean === 'PPS' || clean === 'CIDADANIA') partyKey = 'CIDADANIA';
  else if (clean === 'PTN' || clean === 'PODEMOS' || clean === 'PODE') partyKey = 'PODE';
  else if (clean === 'PTDOB' || clean === 'PTDOB' || clean === 'AVANTE') partyKey = 'AVANTE';
  else if (clean === 'PEN' || clean === 'PATRI' || clean === 'PATRIOTA') partyKey = 'PATRIOTA';
  else if (clean === 'PTC' || clean === 'AGIR') partyKey = 'AGIR';
  else if (clean === 'PMN' || clean === 'MOBILIZA') partyKey = 'MOBILIZA';
  else if (clean === 'PFL' || clean === 'DEM') partyKey = 'DEM';
  else if (clean === 'PCDOB' || clean === 'PCDOB') partyKey = 'PCDOB';
  else if (clean === 'SOLIDARIEDADE') partyKey = 'SOLIDARIEDADE';
  else if (clean === 'PSOL') partyKey = 'PSOL';
  else if (clean === 'REDE') partyKey = 'REDE';
  else if (clean === 'UNIAO') partyKey = 'UNIÃO';

  // Group into federations ONLY for 2022
  if (year >= 2022) {
    if (partyKey === 'PT' || partyKey === 'PV' || partyKey === 'PCDOB') {
      return 'FE_BRASIL';
    }
    if (partyKey === 'PSDB' || partyKey === 'CIDADANIA') {
      return 'PSDB_CIDADANIA';
    }
    if (partyKey === 'PSOL' || partyKey === 'REDE') {
      return 'PSOL_REDE';
    }
  }
  return partyKey;
}

// ---- Main ----
const distritosVotos = {}; // fid -> { "deputado_2006": { party: votes }, ... }

async function run() {
  console.log('=== Pre-computing Federal Deputy votes per district ===\n');

  // 1. Load district geometries from GPKG (simplified for PIP, full geom in GeoJSON)
  console.log('Loading district geometries from GPKG...');
  const ddb = new DatabaseSync(GPKG_PATH);
  const districtRows = ddb.prepare("SELECT fid, CD_UF, DISTRICT, geom FROM 'Brasil com Dados';").all();

  const districts = districtRows.map(r => {
    const geom = parseGpkgGeom(r.geom);
    if (!geom) return null;
    // Simplify ONLY for PIP speed (output uses full geometry from GeoJSON)
    const simplified = simplifyGeometry(geom, 0.003);
    const box = simplified.type === 'Polygon'
      ? getBoundingBox(simplified.coordinates[0])
      : getMultiPolygonBoundingBox(simplified.coordinates);
    return { fid: r.fid, uf: r.CD_UF, district: r.DISTRICT, geom: simplified, box };
  }).filter(d => d !== null);

  console.log(`Loaded ${districts.length} district geometries.\n`);

  // Initialize
  for (const d of districts) {
    distritosVotos[d.fid] = {};
  }

  // 2. Load zip index
  const zipIndex = JSON.parse(fs.readFileSync(DATA_BASE_URL + 'zip_index.json', 'utf8'));

  const years = [2006, 2010, 2014, 2018, 2022];
  const states = Object.keys(UF_TO_CODE);

  for (const year of years) {
    console.log(`\n==== Year ${year} ====`);
    const electionKey = `deputado_${year}`;

    for (const uf of states) {
      const t0 = Date.now();
      process.stdout.write(` ${uf}.. `);
      const stateCode = UF_TO_CODE[uf];

      // Load location GeoJSON from zip
      const geojsonKey = `locais_votacao_${year}/locais_votacao_${year}_${uf}.geojson`;
      const zipMapping = zipIndex[geojsonKey];
      if (!zipMapping) {
        console.log(`(no loc geojson)`);
        continue;
      }

      const zipPath = path.resolve(DATA_BASE_URL, zipMapping.zip);
      if (!fs.existsSync(zipPath)) {
        console.log(`(zip not found: ${zipMapping.zip})`);
        continue;
      }
      const zipBuffer = fs.readFileSync(zipPath);
      const zipReader = await unzipit.unzip(zipBuffer);
      const entry = zipReader.entries[zipMapping.file];
      if (!entry) {
        console.log(`(geojson entry not found in zip)`);
        continue;
      }
      const locGeo = JSON.parse(await entry.text());

      // Filter districts for this state
      const stateDistricts = districts.filter(d => d.uf === stateCode);
      if (stateDistricts.length === 0) {
        console.log(`(no districts for state code ${stateCode})`);
        continue;
      }

      // Map locations to districts via point-in-polygon
      const locationToDistrict = {};
      let matched = 0, unmatched = 0;

      for (const feat of locGeo.features) {
        const props = feat.properties;
        const tse = props.cd_localidade_tse || props.CD_MUNICIPIO;
        const zone = props.NR_ZONA || props.nr_zona;
        const locvot = props.nr_locvot;
        if (!tse || !zone || !locvot) continue;

        const key = `${zone}_${tse}_${locvot}`;
        const pt = feat.geometry.coordinates;

        // Find containing district
        const container = stateDistricts.find(d => {
          if (pt[0] < d.box.minX || pt[0] > d.box.maxX || pt[1] < d.box.minY || pt[1] > d.box.maxY) return false;
          if (d.geom.type === 'Polygon') return isPointInPolygon(pt, d.geom.coordinates[0]);
          return isPointInMultiPolygon(pt, d.geom.coordinates);
        });

        if (container) {
          locationToDistrict[key] = container.fid;
          matched++;
        } else {
          unmatched++;
        }
      }

      // Load deputy results
      const resultsZipPath = path.resolve(DATA_BASE_URL, `Legislativas ${year}/deputados_federal_${year}_${uf}.zip`);
      if (!fs.existsSync(resultsZipPath)) {
        console.log(`(results zip not found)`);
        continue;
      }

      const resZipBuffer = fs.readFileSync(resultsZipPath);
      const resZipReader = await unzipit.unzip(resZipBuffer);
      const resJsonName = `deputados_federal_${year}_${uf}.json`;
      const resEntry = resZipReader.entries[resJsonName];
      if (!resEntry) {
        console.log(`(results json not found in zip)`);
        continue;
      }
      const deputyJson = JSON.parse(await resEntry.text());
      const candNames = deputyJson.METADATA.cand_names || {};
      const results = deputyJson.RESULTS || {};

      // Aggregate votes by district using PARTY (not coalition)
      let votesAssigned = 0;
      for (const [locKey, voteMap] of Object.entries(results)) {
        const parts = locKey.split('_');
        let zone, tse, locvot;
        if (parts.length === 3) {
          zone = parts[0]; tse = parts[1]; locvot = parts[2];
        } else if (parts.length === 4) {
          zone = parts[1]; tse = parts[2]; locvot = parts[3];
        } else continue;

        // Find district for this location
        let districtFid = null;
        const matchKey = `${parseInt(zone)}_${parseInt(tse)}_${parseInt(locvot)}`;
        for (const [mapKey, fid] of Object.entries(locationToDistrict)) {
          const mp = mapKey.split('_');
          if (parseInt(mp[0]) === parseInt(zone) &&
              parseInt(mp[1]) === parseInt(tse) &&
              parseInt(mp[2]) === parseInt(locvot)) {
            districtFid = fid;
            break;
          }
        }

        // Fallback: assign to closest/first district in state
        if (districtFid === null && stateDistricts.length > 0) {
          districtFid = stateDistricts[0].fid;
        }

        if (districtFid === null) continue;

        if (!distritosVotos[districtFid][electionKey]) {
          distritosVotos[districtFid][electionKey] = {};
        }
        const distMap = distritosVotos[districtFid][electionKey];

        for (const [candId, votesVal] of Object.entries(voteMap)) {
          const votes = parseInt(votesVal) || 0;
          if (votes <= 0) continue;

          // Skip blank/null votes
          if (candId === '95' || candId === '96') {
            const label = candId === '95' ? 'VOTOS_BRANCOS' : 'VOTOS_NULOS';
            distMap[label] = (distMap[label] || 0) + votes;
            continue;
          }

          // Map candidate to PARTY/FEDERATION key (ignoring coalition composition)
          let stdParty = candId;
          if (candId.length <= 2) {
            // Legend vote (party number)
            const pName = PARTY_NUMBERS[candId];
            stdParty = pName ? getStandardFederationKey(pName, year) : candId;
          } else {
            // Individual candidate — use their PARTY (meta[1]), NOT coalition (meta[4])
            const meta = candNames[candId];
            if (meta) {
              const partyName = meta[1]; // Party name, e.g. "PT", "PSDB"
              stdParty = getStandardFederationKey(partyName, year);
            }
          }

          distMap[stdParty] = (distMap[stdParty] || 0) + votes;
          distMap['TOTAL_VOTOS_VALIDOS'] = (distMap['TOTAL_VOTOS_VALIDOS'] || 0) + votes;
          votesAssigned += votes;
        }
      }

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(`${matched} locs matched, ${unmatched} unmatched, ${votesAssigned.toLocaleString()} votes (${elapsed}s)\n`);
    }
  }

  // Output
  const outputPath = path.resolve(DATA_BASE_URL, 'distritos_votos.json');
  fs.writeFileSync(outputPath, JSON.stringify(distritosVotos));
  const sizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(1);
  console.log(`\nSuccessfully exported deputy votes to ${outputPath} (${sizeMB} MB)`);

  // Summary stats
  let totalDistricts = 0, totalElections = 0;
  for (const fid of Object.keys(distritosVotos)) {
    const elections = Object.keys(distritosVotos[fid]);
    if (elections.length > 0) totalDistricts++;
    totalElections += elections.length;
  }
  console.log(`Districts with data: ${totalDistricts}, total election-district records: ${totalElections}`);
}

run().catch(console.error);
