const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const unzipit = require('unzipit');

const DATA_BASE_URL = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/resultados_geo/';

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

const ESTADO_TO_UF = {
  "Rondônia": "RO", "Acre": "AC", "Amazonas": "AM", "Roraima": "RR", "Pará": "PA",
  "Amapá": "AP", "Tocantins": "TO", "Maranhão": "MA", "Piauí": "PI", "Ceará": "CE",
  "Rio Grande do Norte": "RN", "Paraíba": "PB", "Pernambuco": "PE", "Alagoas": "AL",
  "Sergipe": "SE", "Bahia": "BA", "Minas Gerais": "MG", "Espírito Santo": "ES",
  "Rio de Janeiro": "RJ", "São Paulo": "SP", "Paraná": "PR", "Santa Catarina": "SC",
  "Rio Grande do Sul": "RS", "Mato Grosso do Sul": "MS", "Mato Grosso": "MT",
  "Goiás": "GO", "Distrito Federal": "DF"
};

// Point in polygon helpers
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

// Bounding box helpers
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

// Douglas-Peucker Simplification
function getSqSegDist(p, p1, p2) {
  let x = p1[0];
  let y = p1[1];
  let dx = p2[0] - x;
  let dy = p2[1] - y;
  if (dx !== 0 || dy !== 0) {
    let t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2[0];
      y = p2[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

function simplifyDPStep(points, first, last, sqTolerance, simplified) {
  let maxSqDist = sqTolerance;
  let index = -1;
  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDist(points[i], points[first], points[last]);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
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
    const rings = geom.coordinates.map(ring => simplifyDouglasPeucker(ring, tolerance));
    return { type: 'Polygon', coordinates: rings };
  } else if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates.map(poly => {
      return poly.map(ring => simplifyDouglasPeucker(ring, tolerance));
    });
    return { type: 'MultiPolygon', coordinates: polys };
  }
  return geom;
}

// GPKG geometry reader
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
  const wkb = nodeBuf.subarray(headerSize);
  return parseWKB(wkb);
}

function parseWKB(wkb) {
  let offset = 0;
  function readUInt32(le) {
    const val = le ? wkb.readUInt32LE(offset) : wkb.readUInt32BE(offset);
    offset += 4;
    return val;
  }
  function readDouble(le) {
    const val = le ? wkb.readDoubleLE(offset) : wkb.readDoubleBE(offset);
    offset += 8;
    return val;
  }
  function parseGeometry() {
    const le = wkb[offset] === 1;
    offset += 1;
    const type = readUInt32(le);
    if (type === 3) {
      const numRings = readUInt32(le);
      const rings = [];
      for (let r = 0; r < numRings; r++) {
        const numPoints = readUInt32(le);
        const ring = [];
        for (let p = 0; p < numPoints; p++) {
          const x = readDouble(le);
          const y = readDouble(le);
          ring.push([x, y]);
        }
        rings.push(ring);
      }
      return { type: 'Polygon', coordinates: rings };
    } else if (type === 6) {
      const numPolys = readUInt32(le);
      const polys = [];
      for (let p = 0; p < numPolys; p++) {
        const polyGeom = parseGeometry();
        polys.push(polyGeom.coordinates);
      }
      return { type: 'MultiPolygon', coordinates: polys };
    }
    return null;
  }
  return parseGeometry();
}

function getStandardFederationKey(name, year) {
  const n = String(name || '').toUpperCase().trim();
  const clean = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
  let partyKey = clean;
  if (clean === 'PMDB' || clean === 'MDB') partyKey = 'MDB';
  else if (clean === 'PR' || clean === 'PL') partyKey = 'PL';
  else if (clean === 'PRB' || clean === 'REPUBLICANOS') partyKey = 'REPUBLICANOS';
  else if (clean === 'PPS' || clean === 'CIDADANIA') partyKey = 'CIDADANIA';
  else if (clean === 'PTN' || clean === 'PODEMOS' || clean === 'PODE') partyKey = 'PODE';
  else if (clean === 'PTDOB' || clean === 'PT_DO_B' || clean === 'AVANTE') partyKey = 'AVANTE';
  else if (clean === 'PEN' || clean === 'PATRI' || clean === 'PATRIOTA') partyKey = 'PATRIOTA';
  else if (clean === 'PTC' || clean === 'AGIR') partyKey = 'AGIR';
  else if (clean === 'PMN' || clean === 'MOBILIZA') partyKey = 'MOBILIZA';
  else if (clean === 'PFL' || clean === 'DEM') partyKey = 'DEM';
  else if (clean === 'PCDOB' || clean === 'PC_DO_B') partyKey = 'PCDOB';
  
  if (year >= 2022) {
    if (partyKey === 'PT' || partyKey === 'PV' || partyKey === 'PCDOB' || clean.includes('FEBRASIL') || clean.includes('BRASILESPERANCA')) {
      return 'FE_BRASIL';
    }
    if (partyKey === 'PSDB' || partyKey === 'CIDADANIA' || (clean.includes('PSDB') && clean.includes('CIDADANIA'))) {
      return 'PSDB_CIDADANIA';
    }
    if (partyKey === 'PSOL' || partyKey === 'REDE' || (clean.includes('PSOL') && clean.includes('REDE'))) {
      return 'PSOL_REDE';
    }
  }
  return partyKey;
}

const semilocalVotos = {};

async function run() {
  const subregionsGpkgPath = 'C:\\Users\\lixov\\OneDrive\\Ambiente de Trabalho\\PR Regional\\Circulos NW Populacao.gpkg';
  const sdb = new DatabaseSync(subregionsGpkgPath);
  const rows = sdb.prepare("SELECT fid, estado, id_local, geom FROM 'Circulos NW Populacao';").all();

  console.log(`Loaded ${rows.length} subregions.`);

  const circuits = rows.map(r => {
    const geom = parseGpkgGeom(r.geom);
    if (!geom) return null;
    
    const simplified = simplifyGeometry(geom, 0.005);
    const box = simplified.type === 'Polygon' 
      ? getBoundingBox(simplified.coordinates[0]) 
      : getMultiPolygonBoundingBox(simplified.coordinates);

    const uf = ESTADO_TO_UF[r.estado];

    return {
      fid: r.fid,
      estado: r.estado,
      uf: uf,
      id_local: r.id_local,
      key: `${r.estado}-${r.id_local}`,
      geom: simplified,
      box: box
    };
  }).filter(c => c !== null);

  console.log(`Parsed and simplified ${circuits.length} subregions.`);

  // Initialize data structures
  for (const c of circuits) {
    semilocalVotos[c.key] = {};
  }

  const zipIndex = JSON.parse(fs.readFileSync(DATA_BASE_URL + 'zip_index.json', 'utf8'));
  const years = [2006, 2010, 2014, 2018, 2022];
  const states = Object.values(ESTADO_TO_UF);

  for (const year of years) {
    console.log(`\n=================== PROCESSING YEAR ${year} ===================`);
    
    for (const uf of states) {
      process.stdout.write(`Processing ${uf} [`);
      
      const geojsonKey = `locais_votacao_${year}/locais_votacao_${year}_${uf}.geojson`;
      const zipMapping = zipIndex[geojsonKey];
      if (!zipMapping) {
        console.log(`NO GEOLOC DATA]`);
        continue;
      }

      // Load locations geojson
      const zipPath = path.resolve(DATA_BASE_URL, zipMapping.zip);
      const zipBuffer = fs.readFileSync(zipPath);
      const zipReader = await unzipit.unzip(zipBuffer);
      const entry = zipReader.entries[zipMapping.file];
      if (!entry) {
        console.log(`FILE NOT FOUND IN ZIP]`);
        continue;
      }
      const locGeo = JSON.parse(await entry.text());
      const stateCircuits = circuits.filter(c => c.uf === uf);

      if (stateCircuits.length === 0) {
        console.log(`NO CIRCUITS DEFINED]`);
        continue;
      }

      // Map each voting location key to circuit key in O(1)
      const locationToCircuit = {};
      for (const feat of locGeo.features) {
        const props = feat.properties;
        const tse = props.cd_localidade_tse || props.CD_MUNICIPIO;
        const zone = props.NR_ZONA || props.nr_zona;
        const locvot = props.nr_locvot;
        if (!tse || !zone || !locvot) continue;

        const key = `${parseInt(zone)}_${parseInt(tse)}_${parseInt(locvot)}`;
        const pt = feat.geometry.coordinates;

        // Bounding box + Point in polygon
        const container = stateCircuits.find(c => {
          if (pt[0] < c.box.minX || pt[0] > c.box.maxX || pt[1] < c.box.minY || pt[1] > c.box.maxY) {
            return false;
          }
          if (c.geom.type === 'Polygon') {
            return isPointInPolygon(pt, c.geom.coordinates[0]);
          } else {
            return isPointInMultiPolygon(pt, c.geom.coordinates);
          }
        });

        if (container) {
          locationToCircuit[key] = container.key;
        }
      }

      const defaultCircuitKey = stateCircuits[0].key;

      // 1. Process Congressional (Deputado) Votes
      const depZipPath = path.resolve(DATA_BASE_URL, `Legislativas ${year}/deputados_federal_${year}_${uf}.zip`);
      if (fs.existsSync(depZipPath)) {
        process.stdout.write(` Dep`);
        const resZipBuffer = fs.readFileSync(depZipPath);
        const resZipReader = await unzipit.unzip(resZipBuffer);
        const resJsonName = `deputados_federal_${year}_${uf}.json`;
        const resEntry = resZipReader.entries[resJsonName];
        if (resEntry) {
          const deputyJson = JSON.parse(await resEntry.text());
          const candNames = deputyJson.METADATA.cand_names || {};
          const results = deputyJson.RESULTS || {};
          const electionKey = `deputado_${year}`;

          for (const [locKey, voteMap] of Object.entries(results)) {
            const parts = locKey.split('_');
            let zone, tse, locvot;
            if (parts.length === 3) {
              zone = parts[0]; tse = parts[1]; locvot = parts[2];
            } else if (parts.length === 4) {
              zone = parts[1]; tse = parts[2]; locvot = parts[3];
            } else {
              continue;
            }

            const matchKey = `${parseInt(zone)}_${parseInt(tse)}_${parseInt(locvot)}`;
            const cKey = locationToCircuit[matchKey] || defaultCircuitKey;

            if (!semilocalVotos[cKey][electionKey]) {
              semilocalVotos[cKey][electionKey] = {};
            }
            const distMap = semilocalVotos[cKey][electionKey];

            for (const [candId, votesVal] of Object.entries(voteMap)) {
              const votes = parseInt(votesVal) || 0;
              if (candId === '95' || candId === '96') {
                const label = candId === '95' ? 'VOTOS_BRANCOS' : 'VOTOS_NULOS';
                distMap[label] = (distMap[label] || 0) + votes;
                continue;
              }

              let stdParty = candId;
              if (candId.length <= 2) {
                const pName = PARTY_NUMBERS[candId];
                stdParty = pName ? getStandardFederationKey(pName, year) : candId;
              } else {
                const meta = candNames[candId];
                if (meta) {
                  const pName = meta[1];
                  stdParty = getStandardFederationKey(pName, year);
                }
              }

              distMap[stdParty] = (distMap[stdParty] || 0) + votes;
              distMap['TOTAL_VOTOS_VALIDOS'] = (distMap['TOTAL_VOTOS_VALIDOS'] || 0) + votes;
            }
          }
        }
      }

      // 2. Process Presidential (Presidente) Votes
      const presZipPath = path.resolve(DATA_BASE_URL, `Majoritarias ${year}/presidente_${year}_t1_${uf}.zip`);
      if (fs.existsSync(presZipPath)) {
        process.stdout.write(` Pres`);
        const resZipBuffer = fs.readFileSync(presZipPath);
        const resZipReader = await unzipit.unzip(resZipBuffer);
        const resJsonName = `presidente_${year}_t1_${uf}.json`;
        const resEntry = resZipReader.entries[resJsonName];
        if (resEntry) {
          const presJson = JSON.parse(await resEntry.text());
          const candNames = presJson.METADATA.cand_names || {};
          const results = presJson.RESULTS || {};
          const electionKey = `presidente_${year}`;

          for (const [locKey, voteMap] of Object.entries(results)) {
            const parts = locKey.split('_');
            let zone, tse, locvot;
            if (parts.length === 3) {
              zone = parts[0]; tse = parts[1]; locvot = parts[2];
            } else if (parts.length === 4) {
              zone = parts[1]; tse = parts[2]; locvot = parts[3];
            } else {
              continue;
            }

            const matchKey = `${parseInt(zone)}_${parseInt(tse)}_${parseInt(locvot)}`;
            const cKey = locationToCircuit[matchKey] || defaultCircuitKey;

            if (!semilocalVotos[cKey][electionKey]) {
              semilocalVotos[cKey][electionKey] = {};
            }
            const distMap = semilocalVotos[cKey][electionKey];

            for (const [candId, votesVal] of Object.entries(voteMap)) {
              const votes = parseInt(votesVal) || 0;
              if (candId === '95' || candId === '96') {
                const label = candId === '95' ? 'VOTOS_BRANCOS' : 'VOTOS_NULOS';
                distMap[label] = (distMap[label] || 0) + votes;
                continue;
              }

              let stdParty = candId;
              if (candId.length <= 2) {
                const pName = PARTY_NUMBERS[candId] || (candNames[candId] ? candNames[candId][1] : null);
                stdParty = pName ? getStandardFederationKey(pName, year) : candId;
              } else {
                const meta = candNames[candId];
                if (meta) {
                  const pName = meta[1];
                  stdParty = getStandardFederationKey(pName, year);
                }
              }

              distMap[stdParty] = (distMap[stdParty] || 0) + votes;
              distMap['TOTAL_VOTOS_VALIDOS'] = (distMap['TOTAL_VOTOS_VALIDOS'] || 0) + votes;
            }
          }
        }
      }

      process.stdout.write(` ]\n`);
    }
  }

  const outputPath = path.resolve(DATA_BASE_URL, 'semilocal_votos.json');
  fs.writeFileSync(outputPath, JSON.stringify(semilocalVotos));
  console.log(`\nSuccessfully exported pre-calculated semilocal votes to ${outputPath}`);
}

run().catch(console.error);
