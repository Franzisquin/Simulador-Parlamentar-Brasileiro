const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'resultados_geo', 'estados_brasil.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

// We want to find the centroid of polygons for RR, RO, and AP
function getPolygonCentroid(pts) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    
    const factor = (p1[0] * p2[1] - p2[0] * p1[1]);
    area += factor;
    cx += (p1[0] + p2[0]) * factor;
    cy += (p1[1] + p2[1]) * factor;
  }
  
  area = area / 2;
  if (area === 0) return pts[0];
  cx = cx / (6 * area);
  cy = cy / (6 * area);
  
  return [cx, cy];
}

function getFeatureCentroid(feature) {
  const geom = feature.geometry;
  if (geom.type === 'Polygon') {
    return getPolygonCentroid(geom.coordinates[0]);
  } else if (geom.type === 'MultiPolygon') {
    // Find the polygon with largest area/bbox or just average centroids
    let maxLen = 0;
    let bestPoly = null;
    for (const poly of geom.coordinates) {
      if (poly[0].length > maxLen) {
        maxLen = poly[0].length;
        bestPoly = poly[0];
      }
    }
    return getPolygonCentroid(bestPoly);
  }
  return null;
}

const targetUfs = ['RR', 'RO', 'AP'];
for (const f of data.features) {
  const uf = f.properties.SIGLA_UF || f.properties.sigla;
  if (targetUfs.includes(uf)) {
    // Also calculate bbox center
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const coords = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of coords) {
      for (const ring of poly) {
        for (const pt of ring) {
          if (pt[0] < minX) minX = pt[0];
          if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] < minY) minY = pt[1];
          if (pt[1] > maxY) maxY = pt[1];
        }
      }
    }
    const bboxCenter = [(minX + maxX) / 2, (minY + maxY) / 2];
    const centroid = getFeatureCentroid(f);
    console.log(`UF: ${uf}`);
    console.log(`  BBox: minX=${minX.toFixed(4)}, maxX=${maxX.toFixed(4)}, minY=${minY.toFixed(4)}, maxY=${maxY.toFixed(4)}`);
    console.log(`  BBox Center [lng, lat]: [${bboxCenter[0].toFixed(4)}, ${bboxCenter[1].toFixed(4)}]`);
    console.log(`  BBox Center [lat, lng]: [${bboxCenter[1].toFixed(4)}, ${bboxCenter[0].toFixed(4)}]`);
    console.log(`  Centroid [lng, lat]: [${centroid[0].toFixed(4)}, ${centroid[1].toFixed(4)}]`);
    console.log(`  Centroid [lat, lng]: [${centroid[1].toFixed(4)}, ${centroid[0].toFixed(4)}]`);
  }
}
