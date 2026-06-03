const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');

const GPKG_PATH = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/Brasil com Dados.gpkg';
const OUTPUT_PATH = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/resultados_geo/distritos_simulados.geojson';

// ---- GeoPackage binary geometry parser ----
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
    if (type === 3) { // Polygon
      const numRings = readUInt32(le);
      const rings = [];
      for (let r = 0; r < numRings; r++) {
        const numPoints = readUInt32(le);
        const ring = [];
        for (let p = 0; p < numPoints; p++) {
          const x = Math.round(readDouble(le) * 1e6) / 1e6;
          const y = Math.round(readDouble(le) * 1e6) / 1e6;
          ring.push([x, y]);
        }
        rings.push(ring);
      }
      return { type: 'Polygon', coordinates: rings };
    } else if (type === 6) { // MultiPolygon
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

// ---- Main ----
console.log('Reading GeoPackage...');
const db = new DatabaseSync(GPKG_PATH);
const colInfo = db.prepare("PRAGMA table_info('Brasil com Dados');").all();
const colNames = colInfo.map(c => c.name).filter(n => n !== 'geom');

const rows = db.prepare("SELECT * FROM 'Brasil com Dados';").all();
console.log(`Processing ${rows.length} districts (${colNames.length} properties, NO simplification)...`);

const features = [];
let totalPoints = 0;

for (const row of rows) {
  const geom = parseGpkgGeom(row.geom);
  if (!geom) {
    console.warn(`Skipping fid ${row.fid}: invalid geometry`);
    continue;
  }

  // Count points for stats
  if (geom.type === 'Polygon') {
    geom.coordinates.forEach(ring => totalPoints += ring.length);
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach(poly => poly.forEach(ring => totalPoints += ring.length));
  }

  const properties = {};
  for (const col of colNames) {
    properties[col] = row[col];
  }

  features.push({ type: 'Feature', geometry: geom, properties });
}

const geojson = { type: 'FeatureCollection', features };
const jsonStr = JSON.stringify(geojson);
fs.writeFileSync(OUTPUT_PATH, jsonStr);

const sizeMB = (Buffer.byteLength(jsonStr) / (1024 * 1024)).toFixed(1);
console.log(`Done! ${features.length} features, ${totalPoints.toLocaleString()} total coordinate points`);
console.log(`Output: ${OUTPUT_PATH} (${sizeMB} MB)`);
