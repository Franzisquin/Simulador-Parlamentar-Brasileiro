// Export Circulos NW Populacao.gpkg → semilocal_circuitos.geojson
// Uses the same WKB parser as gen_full_geojson.js
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');

const GPKG_PATH = 'C:\\Users\\lixov\\OneDrive\\Ambiente de Trabalho\\PR Regional\\Circulos NW Populacao.gpkg';
const OUTPUT_PATH = 'resultados_geo/semilocal_circuitos.geojson';

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
    const val = le ? wkb.readDoubleLE(offset) : wkb.readDoubleLE(offset);
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
console.log('Reading Circulos NW Populacao GeoPackage...');
const db = new DatabaseSync(GPKG_PATH);
const rows = db.prepare("SELECT fid, geom, estado, id_local, populacao FROM 'Circulos NW Populacao';").all();
console.log(`Processing ${rows.length} subregions...`);

const features = [];
for (const row of rows) {
  const geom = parseGpkgGeom(row.geom);
  if (!geom) {
    console.warn(`Skipping fid ${row.fid} (${row.estado}-${row.id_local}): invalid geometry`);
    continue;
  }
  features.push({
    type: 'Feature',
    geometry: geom,
    properties: {
      fid: row.fid,
      estado: row.estado,
      id_local: row.id_local,
      populacao: row.populacao,
      // Canonical key used throughout the simulator
      sub_name: `${row.estado}-${row.id_local}`
    }
  });
}

const geojson = { type: 'FeatureCollection', features };
const jsonStr = JSON.stringify(geojson);
fs.writeFileSync(OUTPUT_PATH, jsonStr);
const sizeMB = (Buffer.byteLength(jsonStr) / (1024 * 1024)).toFixed(2);
console.log(`Done! ${features.length} features → ${OUTPUT_PATH} (${sizeMB} MB)`);
features.slice(0, 5).forEach(f => console.log(` ${f.properties.sub_name} (pop ${f.properties.populacao})`));
