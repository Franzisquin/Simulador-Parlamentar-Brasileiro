const fs = require('fs');

// Read GeoJSON
const geojsonPath = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/resultados_geo/estados_brasil.geojson';
const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

// Read SVG
const svgPath = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/Senado Regionalizado.svg';
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Parse SVG paths under <g id="Estados">
const estadosGroupStart = svgContent.indexOf('id="Estados"');
const estadosGroupEnd = svgContent.indexOf('</g>', estadosGroupStart);
const estadosGroupContent = svgContent.substring(estadosGroupStart, estadosGroupEnd);

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

const rawSvgStates = parsePathsFromGroup(estadosGroupContent);
// Apply transform matrix of Estados group
const estMatrix = [0.95261131, 0, 0, 0.95261131, 31341.849, 4276.3439];
const svgStates = rawSvgStates.map(s => ({
  id: s.id,
  centroid: {
    x: estMatrix[0] * s.centroid.x + estMatrix[2] * s.centroid.y + estMatrix[4],
    y: estMatrix[1] * s.centroid.x + estMatrix[3] * s.centroid.y + estMatrix[5]
  }
}));

// State mapping
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
const normSvg = normalize(svgStates, p => p.centroid.x, p => -p.centroid.y);

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

// Now parse all circle groups from the SVG
const gParts = svgContent.split('<g');
const circleGroups = [];

for (let i = 1; i < gParts.length; i++) {
  const gPart = gParts[i];
  const idMatch = /\bid="([^"]+)"/.exec(gPart) || /\bid='([^']+)'/.exec(gPart);
  if (!idMatch) continue;
  const gId = idMatch[1];
  
  // Find all circles directly inside this group before the next </g>
  const gEnd = gPart.indexOf('</g>');
  const gContent = gEnd === -1 ? gPart : gPart.substring(0, gEnd);
  
  const cParts = gContent.split('<circle');
  if (cParts.length <= 1) continue;
  
  // Extract transform matrix
  let matrix = [1, 0, 0, 1, 0, 0];
  const transformMatch = /transform="matrix\(([^)]+)\)"/.exec(gPart) || /transform='matrix\(([^)]+)\)'/.exec(gPart);
  if (transformMatch) {
    matrix = transformMatch[1].split(/[\s,]+/).map(parseFloat);
  }
  
  const circles = [];
  for (let j = 1; j < cParts.length; j++) {
    const cPart = cParts[j];
    const cxMatch = /\bcx="([^"]+)"/.exec(cPart) || /\bcx='([^']+)'/.exec(cPart);
    const cyMatch = /\bcy="([^"]+)"/.exec(cPart) || /\bcy='([^']+)'/.exec(cPart);
    const rMatch = /\br="([^"]+)"/.exec(cPart) || /\br='([^']+)'/.exec(cPart);
    const idMatchC = /\bid="([^"]+)"/.exec(cPart) || /\bid='([^']+)'/.exec(cPart);
    
    if (cxMatch && cyMatch) {
      const rawCx = parseFloat(cxMatch[1]);
      const rawCy = parseFloat(cyMatch[1]);
      // Apply matrix transform
      const cx = matrix[0] * rawCx + matrix[2] * rawCy + matrix[4];
      const cy = matrix[1] * rawCx + matrix[3] * rawCy + matrix[5];
      
      circles.push({
        id: idMatchC ? idMatchC[1] : `c-${gId}-${j}`,
        cx: cx,
        cy: cy,
        r: rMatch ? parseFloat(rMatch[1]) : 0
      });
    }
  }
  
  if (circles.length > 0) {
    // Calculate group centroid
    let sumX = 0, sumY = 0;
    circles.forEach(c => {
      sumX += c.cx;
      sumY += c.cy;
    });
    circleGroups.push({
      id: gId,
      circles: circles,
      centroid: { x: sumX / circles.length, y: sumY / circles.length }
    });
  }
}

console.log('Found circle groups:', circleGroups.length);

const stateCircleGroups = circleGroups.filter(g => g.circles.length === 2);
const regionalCircleGroups = circleGroups.filter(g => g.circles.length > 2);

// Map each of the 27 states to a unique circle group using a greedy match
console.log('\n--- State to Circle Group Mapping (Unique) ---');
const stateToGroup = {};
const unmatchedStates = [...svgStates];
const unmatchedGroups = [...stateCircleGroups];

while (unmatchedStates.length > 0) {
  let minPairDist = Infinity;
  let bestStateIdx = -1;
  let bestGroupIdx = -1;
  
  for (let sIdx = 0; sIdx < unmatchedStates.length; sIdx++) {
    const s = unmatchedStates[sIdx];
    for (let gIdx = 0; gIdx < unmatchedGroups.length; gIdx++) {
      const g = unmatchedGroups[gIdx];
      const dist = Math.sqrt(Math.pow(s.centroid.x - g.centroid.x, 2) + Math.pow(s.centroid.y - g.centroid.y, 2));
      if (dist < minPairDist) {
        minPairDist = dist;
        bestStateIdx = sIdx;
        bestGroupIdx = gIdx;
      }
    }
  }
  
  const matchedState = unmatchedStates.splice(bestStateIdx, 1)[0];
  const matchedGroup = unmatchedGroups.splice(bestGroupIdx, 1)[0];
  const uf = stateMapping[matchedState.id];
  
  stateToGroup[uf] = { groupId: matchedGroup.id, dist: minPairDist };
}

// Print results in alphabetical order of UF
Object.keys(stateToGroup).sort().forEach(uf => {
  console.log(`State: ${uf} -> Group ID: ${stateToGroup[uf].groupId}, distance: ${stateToGroup[uf].dist.toFixed(1)}`);
});

// Let's count how many times each group is used
const groupCounts = {};
Object.values(stateToGroup).forEach(v => {
  groupCounts[v.groupId] = (groupCounts[v.groupId] || 0) + 1;
});
console.log('\nGroup usage counts:', groupCounts);
console.log('Unused groups:', stateCircleGroups.map(g => g.id).filter(id => !groupCounts[id]));

// Regional circle groups mapping
console.log('\n--- Regional Circle Groups ---');
const regionsGroupStart = svgContent.indexOf('id="Estados-8"');
const regionsGroupEnd = svgContent.indexOf('</g>', regionsGroupStart);
const regionsGroupContent = svgContent.substring(regionsGroupStart, regionsGroupEnd);
const svgRegions = parsePathsFromGroup(regionsGroupContent);

const regionNames = {
  "path44-6": "Norte",
  "path56-0": "Centro-Oeste",
  "path62-8": "Sudeste",
  "path64-6": "Sul",
  "path68-0": "Nordeste"
};

// Apply transform matrix of Estados-8 to region centroids
const regMatrix = [0.46071575, 0, 0, 0.46071575, 2137.8922, 99299.268];
const transformedSvgRegions = svgRegions.map(r => ({
  id: r.id,
  name: regionNames[r.id] || r.id,
  centroid: {
    x: regMatrix[0] * r.centroid.x + regMatrix[2] * r.centroid.y + regMatrix[4],
    y: regMatrix[1] * r.centroid.x + regMatrix[3] * r.centroid.y + regMatrix[5]
  }
}));

regionalCircleGroups.forEach(g => {
  let minDist = Infinity;
  let bestRegion = null;
  transformedSvgRegions.forEach(r => {
    const dist = Math.pow(g.centroid.x - r.centroid.x, 2) + Math.pow(g.centroid.y - r.centroid.y, 2);
    if (dist < minDist) {
      minDist = dist;
      bestRegion = r.name;
    }
  });
  console.log(`Regional Group ID: ${g.id} (circles: ${g.circles.length}) -> Region: ${bestRegion}, distance: ${Math.sqrt(minDist).toFixed(1)}`);
  
  if (g.id === 'g4') {
    console.log('Individual circles in g4:');
    g.circles.forEach(c => {
      // Find closest region for this specific circle
      let minCircleDist = Infinity;
      let circleRegion = null;
      transformedSvgRegions.forEach(r => {
        const dist = Math.pow(c.cx - r.centroid.x, 2) + Math.pow(c.cy - r.centroid.y, 2);
        if (dist < minCircleDist) {
          minCircleDist = dist;
          circleRegion = r.name;
        }
      });
      console.log(`  Circle ID: ${c.id} (${c.cx.toFixed(1)}, ${c.cy.toFixed(1)}) -> Closest Region: ${circleRegion}, distance: ${Math.sqrt(minCircleDist).toFixed(1)}`);
    });
  }
});
