// Simplify semilocal_circuitos.geojson using Douglas-Peucker tolerance
// Output: resultados_geo/semilocal_circuitos.geojson (overwrite with simplified)
const fs = require('node:fs');

const INPUT = 'resultados_geo/semilocal_circuitos.geojson';
const TOLERANCE = 0.003; // degrees (~300m at equator) – good balance for state-level map

// Simple Douglas-Peucker on flat coordinates
function perpendicularDist(pt, lineStart, lineEnd) {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return Math.hypot(pt[0] - lineStart[0], pt[1] - lineStart[1]);
  return Math.abs(dx * (lineStart[1] - pt[1]) - (lineStart[0] - pt[0]) * dy) / mag;
}

function douglasPeucker(points, tolerance) {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDist(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIdx), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

function simplifyRing(ring, tol) {
  const simplified = douglasPeucker(ring, tol);
  // Ensure ring is closed and has at least 4 points
  if (simplified.length < 4) return ring; // keep original if too small
  // Re-close
  const last = simplified[simplified.length - 1];
  const first = simplified[0];
  if (last[0] !== first[0] || last[1] !== first[1]) simplified.push(simplified[0]);
  return simplified;
}

function simplifyGeom(geom, tol) {
  if (geom.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geom.coordinates.map(r => simplifyRing(r, tol)) };
  } else if (geom.type === 'MultiPolygon') {
    return { type: 'MultiPolygon', coordinates: geom.coordinates.map(poly => poly.map(r => simplifyRing(r, tol))) };
  }
  return geom;
}

console.log('Loading GeoJSON...');
const raw = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
let beforePts = 0, afterPts = 0;

raw.features = raw.features.map(f => {
  const g = f.geometry;
  if (g.type === 'Polygon') {
    g.coordinates.forEach(r => beforePts += r.length);
  } else if (g.type === 'MultiPolygon') {
    g.coordinates.forEach(p => p.forEach(r => beforePts += r.length));
  }
  f.geometry = simplifyGeom(g, TOLERANCE);
  if (f.geometry.type === 'Polygon') {
    f.geometry.coordinates.forEach(r => afterPts += r.length);
  } else if (f.geometry.type === 'MultiPolygon') {
    f.geometry.coordinates.forEach(p => p.forEach(r => afterPts += r.length));
  }
  return f;
});

const out = JSON.stringify(raw);
fs.writeFileSync(INPUT, out);
const sizeMB = (Buffer.byteLength(out) / (1024 * 1024)).toFixed(2);
console.log(`Done! ${beforePts.toLocaleString()} pts → ${afterPts.toLocaleString()} pts (${((1-afterPts/beforePts)*100).toFixed(1)}% reduction)`);
console.log(`Output: ${INPUT} (${sizeMB} MB)`);
