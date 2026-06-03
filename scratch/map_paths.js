const fs = require('fs');

// Read GeoJSON
const geojsonPath = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/resultados_geo/estados_brasil.geojson';
const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

// Read SVG
const svgPath = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/Senado Regionalizado.svg';
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Parse SVG paths under <g id="Estados">
const estadosGroupStart = svgContent.indexOf('id="Estados"');
console.log('estadosGroupStart:', estadosGroupStart);
const estadosGroupEnd = svgContent.indexOf('</g>', estadosGroupStart);
const estadosGroupContent = svgContent.substring(estadosGroupStart, estadosGroupEnd);

// Parse SVG paths under <g id="Estados-8">
const regionsGroupStart = svgContent.indexOf('id="Estados-8"');
console.log('regionsGroupStart:', regionsGroupStart);
const regionsGroupEnd = svgContent.indexOf('</g>', regionsGroupStart);
const regionsGroupContent = svgContent.substring(regionsGroupStart, regionsGroupEnd);

// Helper to parse path 'd' commands and find true centroid by reconstructing absolute points
function getPathCentroid(d) {
  const tokenRegex = /([a-zA-Z])|(-?\d+(?:\.\d+)?)/g;
  const tokens = [];
  let match;
  while ((match = tokenRegex.exec(d)) !== null) {
    tokens.push(match[0]);
  }
  
  const points = [];
  let currX = 0;
  let currY = 0;
  let cmd = '';
  
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (/[a-zA-Z]/.test(token)) {
      cmd = token;
      i++;
      continue;
    }
    
    try {
      if (cmd === 'm' || cmd === 'l') {
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        if (!isNaN(x) && !isNaN(y)) {
          currX += x;
          currY += y;
          points.push({ x: currX, y: currY });
        }
      } else if (cmd === 'M' || cmd === 'L') {
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        if (!isNaN(x) && !isNaN(y)) {
          currX = x;
          currY = y;
          points.push({ x: currX, y: currY });
        }
      } else if (cmd === 'h') {
        const x = parseFloat(tokens[i++]);
        if (!isNaN(x)) {
          currX += x;
          points.push({ x: currX, y: currY });
        }
      } else if (cmd === 'H') {
        const x = parseFloat(tokens[i++]);
        if (!isNaN(x)) {
          currX = x;
          points.push({ x: currX, y: currY });
        }
      } else if (cmd === 'v') {
        const y = parseFloat(tokens[i++]);
        if (!isNaN(y)) {
          currY += y;
          points.push({ x: currX, y: currY });
        }
      } else if (cmd === 'V') {
        const y = parseFloat(tokens[i++]);
        if (!isNaN(y)) {
          currY = y;
          points.push({ x: currX, y: currY });
        }
      } else if (cmd === 'c') {
        const x1 = parseFloat(tokens[i++]);
        const y1 = parseFloat(tokens[i++]);
        const x2 = parseFloat(tokens[i++]);
        const y2 = parseFloat(tokens[i++]);
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        if (!isNaN(x) && !isNaN(y)) {
          currX += x;
          currY += y;
          points.push({ x: currX, y: currY });
        }
      } else if (cmd === 'C') {
        const x1 = parseFloat(tokens[i++]);
        const y1 = parseFloat(tokens[i++]);
        const x2 = parseFloat(tokens[i++]);
        const y2 = parseFloat(tokens[i++]);
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        if (!isNaN(x) && !isNaN(y)) {
          currX = x;
          currY = y;
          points.push({ x: currX, y: currY });
        }
      } else if (cmd === 's') {
        const x2 = parseFloat(tokens[i++]);
        const y2 = parseFloat(tokens[i++]);
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        if (!isNaN(x) && !isNaN(y)) {
          currX += x;
          currY += y;
          points.push({ x: currX, y: currY });
        }
      } else if (cmd === 'S') {
        const x2 = parseFloat(tokens[i++]);
        const y2 = parseFloat(tokens[i++]);
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        if (!isNaN(x) && !isNaN(y)) {
          currX = x;
          currY = y;
          points.push({ x: currX, y: currY });
        }
      } else if (cmd === 'z' || cmd === 'Z') {
        cmd = '';
        i++;
      } else {
        i++;
      }
    } catch (e) {
      i++;
    }
  }
  
  if (points.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  points.forEach(p => {
    sumX += p.x;
    sumY += p.y;
  });
  return { x: sumX / points.length, y: sumY / points.length };
}

// Find state centroids in GeoJSON
const stateCentroids = geojsonData.features.map(f => {
  const sigla = f.properties.SIGLA_UF;
  const coords = f.geometry.coordinates;
  let sumLon = 0;
  let sumLat = 0;
  let count = 0;
  
  function processPolygon(poly) {
    poly[0].forEach(pt => {
      sumLon += pt[0];
      sumLat += pt[1];
      count++;
    });
  }
  
  if (f.geometry.type === 'Polygon') {
    processPolygon(coords);
  } else if (f.geometry.type === 'MultiPolygon') {
    coords.forEach(processPolygon);
  }
  
  return { sigla, lon: sumLon / count, lat: sumLat / count };
});

// Robust parser function
function parsePathsFromGroup(groupContent) {
  const paths = [];
  const parts = groupContent.split('<path');
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const endTag = part.indexOf('/>');
    if (endTag === -1) continue;
    const body = part.substring(0, endTag);
    
    const idMatch = /\bid="([^"]+)"/.exec(body) || /\bid='([^']+)'/.exec(body);
    const dMatch = /\bd="([^"]+)"/.exec(body) || /\bd='([^']+)'/.exec(body);
    
    if (idMatch && dMatch) {
      const id = idMatch[1];
      const d = dMatch[1];
      const centroid = getPathCentroid(d);
      paths.push({ id, centroid });
    }
  }
  return paths;
}

const svgStates = parsePathsFromGroup(estadosGroupContent);
console.log('Parsed SVG States Count:', svgStates.length);
svgStates.forEach(s => {
  console.log(`Path ID: ${s.id}, Centroid: (${s.centroid.x.toFixed(1)}, ${s.centroid.y.toFixed(1)})`);
});

// Normalize and find closest matches for States
function normalize(points, getX, getY) {
  let sumX = 0, sumY = 0;
  points.forEach(p => {
    sumX += getX(p);
    sumY += getY(p);
  });
  const meanX = sumX / points.length;
  const meanY = sumY / points.length;
  
  let varX = 0, varY = 0;
  points.forEach(p => {
    varX += Math.pow(getX(p) - meanX, 2);
    varY += Math.pow(getY(p) - meanY, 2);
  });
  const stdX = Math.sqrt(varX / points.length);
  const stdY = Math.sqrt(varY / points.length);
  
  return points.map(p => ({
    orig: p,
    x: (getX(p) - meanX) / stdX,
    y: (getY(p) - meanY) / stdY
  }));
}

const normGeo = normalize(stateCentroids, p => p.lon, p => p.lat);
const normSvg = normalize(svgStates, p => p.centroid.x, p => -p.centroid.y); // Invert Y for SVG

const stateMapping = {};
normSvg.forEach(s => {
  let minDist = Infinity;
  let bestMatch = null;
  normGeo.forEach(g => {
    const dist = Math.pow(s.x - g.x, 2) + Math.pow(s.y - g.y, 2);
    if (dist < minDist) {
      minDist = dist;
      bestMatch = g.orig.sigla;
    }
  });
  stateMapping[s.orig.id] = bestMatch;
});

// Now extract paths from Estados-8 group (Regions)
console.log('regionsGroupContent:', regionsGroupContent);
const svgRegions = parsePathsFromGroup(regionsGroupContent);
console.log('svgRegions:', svgRegions);

// We know the five regions centroids approximately in geo coordinate space:
const regionCentroids = [
  { region: "Norte", lon: -60, lat: -3 },
  { region: "Nordeste", lon: -40, lat: -7 },
  { region: "Centro-Oeste", lon: -53, lat: -15 },
  { region: "Sudeste", lon: -45, lat: -20 },
  { region: "Sul", lon: -52, lat: -27 }
];

const normRegGeo = normalize(regionCentroids, p => p.lon, p => p.lat);
const normRegSvg = normalize(svgRegions, p => p.centroid.x, p => -p.centroid.y);

const regionMapping = {};
normRegSvg.forEach(s => {
  let minDist = Infinity;
  let bestMatch = null;
  normRegGeo.forEach(g => {
    const dist = Math.pow(s.x - g.x, 2) + Math.pow(s.y - g.y, 2);
    if (dist < minDist) {
      minDist = dist;
      bestMatch = g.orig.region;
    }
  });
  regionMapping[s.orig.id] = bestMatch;
});

console.log('SVG_STATE_MAPPING =', JSON.stringify(stateMapping, null, 2));
console.log('SVG_REGION_MAPPING =', JSON.stringify(regionMapping, null, 2));
