const fs = require('fs');

function cleanFile(path, isMuni) {
  if (!fs.existsSync(path)) {
    console.log("File not found, skipping:", path);
    return;
  }
  console.log("Processing file:", path);
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  let modified = false;

  data.features.forEach((f) => {
    const cdMun = f.properties && (f.properties.CD_MUN || f.properties.cd_mun);
    if (String(cdMun) === '3205309') {
      if (f.geometry && f.geometry.type === 'MultiPolygon') {
        const originalCount = f.geometry.coordinates.length;
        f.geometry.coordinates = f.geometry.coordinates.filter(poly => {
          const firstPoint = poly[0][0];
          const lon = firstPoint[0];
          // Keep only continental/coastal part (longitude <= -35)
          return lon <= -35;
        });
        const newCount = f.geometry.coordinates.length;
        console.log(`  Vitória feature: removed ${originalCount - newCount} remote polygons. Retained ${newCount} polygons.`);
        modified = true;
      }
    }
  });

  if (modified) {
    fs.writeFileSync(path, JSON.stringify(data), 'utf8');
    console.log("  Successfully saved modified file.");
  } else {
    console.log("  No modifications made.");
  }
}

cleanFile('resultados_geo/municipios/municipios_ES.geojson', true);
cleanFile('resultados_geo/distritos/distritos_simulados_ES.geojson', false);
