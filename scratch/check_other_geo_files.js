const fs = require('fs');

const files = [
  'resultados_geo/semilocal_insets.geojson',
  'resultados_geo/semilocal_insets_main_map_outlines.geojson',
  'resultados_geo/semilocal_insets_unions.geojson'
];

files.forEach(path => {
  if (!fs.existsSync(path)) return;
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  let foundRemote = false;

  data.features.forEach((f, idx) => {
    // Check if properties has 3205309 or if feature geometry has points with lon > -35
    const match = JSON.stringify(f.properties).includes('3205309') || JSON.stringify(f.properties).toLowerCase().includes('vitória') || JSON.stringify(f.properties).toLowerCase().includes('vitoria');
    if (match) {
      const coords = f.geometry.coordinates;
      if (f.geometry.type === 'Polygon') {
        if (coords[0].some(pt => pt[0] > -35)) foundRemote = true;
      } else if (f.geometry.type === 'MultiPolygon') {
        coords.forEach(poly => {
          if (poly[0].some(pt => pt[0] > -35)) foundRemote = true;
        });
      }
    }
  });

  console.log(`File ${path}: contains remote Vitória coordinates:`, foundRemote);
});
