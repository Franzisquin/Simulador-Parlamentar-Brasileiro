const fs = require('fs');

const path = 'resultados_geo/distritos/distritos_simulados_ES.geojson';
if (!fs.existsSync(path)) {
  console.log("File not found:", path);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(path, 'utf8'));
data.features.forEach((f, fIdx) => {
  const cdMun = f.properties && (f.properties.CD_MUN || f.properties.cd_mun);
  if (String(cdMun) === '3205309') {
    console.log(`Vitória feature ${fIdx}: properties:`, JSON.stringify(f.properties));
    const coords = f.geometry.coordinates;
    if (f.geometry.type === 'Polygon') {
      let isRemote = coords[0].some(pt => pt[0] > -35);
      console.log(`  Polygon: has remote coords: ${isRemote}`);
    } else if (f.geometry.type === 'MultiPolygon') {
      coords.forEach((poly, pIdx) => {
        let isRemote = poly[0].some(pt => pt[0] > -35);
        console.log(`    Polygon ${pIdx}: has remote coords: ${isRemote}`);
      });
    }
  }
});
