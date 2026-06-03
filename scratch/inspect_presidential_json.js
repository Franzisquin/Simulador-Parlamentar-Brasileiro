const fs = require('fs');
const path = require('path');
const unzipit = require('unzipit');

async function run() {
  const zipPath = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/resultados_geo/Majoritarias 2022/presidente_2022_t1_AC.zip';
  const zipBuffer = fs.readFileSync(zipPath);
  const zipReader = await unzipit.unzip(zipBuffer);
  
  console.log('Entries in zip:', Object.keys(zipReader.entries));
  const entryName = 'presidente_2022_t1_AC.json';
  const entry = zipReader.entries[entryName];
  if (entry) {
    const data = JSON.parse(await entry.text());
    console.log('Keys in JSON:', Object.keys(data));
    console.log('METADATA:', data.METADATA);
    const resultKeys = Object.keys(data.RESULTS || {});
    console.log('Sample result key:', resultKeys[0]);
    console.log('Sample result value:', data.RESULTS[resultKeys[0]]);
  } else {
    console.log('Entry not found:', entryName);
  }
}

run().catch(console.error);
