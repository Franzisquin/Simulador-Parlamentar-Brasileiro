const fs = require('fs');
const path = require('path');
const unzipit = require('unzipit');

const DATA_BASE_URL = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/resultados_geo/';
const states = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];
const years = [2006, 2010, 2014, 2018, 2022];

async function verify() {
  for (const year of years) {
    console.log(`Year ${year}:`);
    let missingCount = 0;
    for (const uf of states) {
      const zipPath = path.resolve(DATA_BASE_URL, `Majoritarias ${year}/presidente_${year}_t1_${uf}.zip`);
      if (!fs.existsSync(zipPath)) {
        console.log(`  Missing ZIP: ${zipPath}`);
        missingCount++;
        continue;
      }
      
      // Check entry inside zip
      try {
        const zipBuffer = fs.readFileSync(zipPath);
        const zipReader = await unzipit.unzip(zipBuffer);
        const entryName = `presidente_${year}_t1_${uf}.json`;
        if (!zipReader.entries[entryName]) {
          console.log(`  Missing JSON entry "${entryName}" in ${zipPath}`);
          missingCount++;
        }
      } catch (err) {
        console.log(`  Error reading ZIP ${zipPath}:`, err.message);
        missingCount++;
      }
    }
    if (missingCount === 0) {
      console.log(`  All files verified successfully!`);
    } else {
      console.log(`  ${missingCount} issues found for year ${year}`);
    }
  }
}

verify().catch(console.error);
