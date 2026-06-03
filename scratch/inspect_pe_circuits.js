const fs = require('fs');
const path = require('path');

const geojsonPath = path.resolve('resultados_geo', 'semilocal_circuitos.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const peFeatures = data.features.filter(f => f.properties && f.properties.estado === 'Pernambuco');

console.log(`Found ${peFeatures.length} features for Pernambuco:`);
peFeatures.forEach((f, idx) => {
  console.log(`\nFeature ${idx + 1}:`);
  console.log(`  sub_name: ${f.properties.sub_name}`);
  console.log(`  nome_distrito: ${f.properties.nome_distrito}`);
  
  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  function processCoords(coords) {
    if (Array.isArray(coords[0]) && typeof coords[0][0] !== 'number') {
      coords.forEach(processCoords);
    } else {
      coords.forEach(([x, y]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
    }
  }
  
  processCoords(f.geometry.coordinates);
  console.log(`  Bounding Box: Longitude [${minX}, ${maxX}], Latitude [${minY}, ${maxY}]`);
  console.log(`  Center: Latitude ${(minY + maxY) / 2}, Longitude ${(minX + maxX) / 2}`);
});
