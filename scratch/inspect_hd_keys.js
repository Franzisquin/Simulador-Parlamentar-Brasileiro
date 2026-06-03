const fs = require('fs');

const path = 'C:/Users/lixov/OneDrive/Documentos/Observatorio/resultados_geo/municipios_hd/municipios_AC.geojson';
const geo = JSON.parse(fs.readFileSync(path, 'utf8'));

if (geo && geo.features && geo.features.length > 0) {
  console.log('Total features:', geo.features.length);
  console.log('Properties keys:', Object.keys(geo.features[0].properties));
  console.log('Sample properties:', geo.features[0].properties);
} else {
  console.log('GeoJSON features empty or not found');
}
