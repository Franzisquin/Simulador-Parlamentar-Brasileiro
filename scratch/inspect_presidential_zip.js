const fs = require('fs');
const path = require('path');
const unzipit = require('unzipit');

async function run() {
  const zipPath = path.resolve('resultados_geo/Majoritarias 2022/presidente_2022_t1_AC.zip');
  const zipBuffer = fs.readFileSync(zipPath);
  const zipReader = await unzipit.unzip(zipBuffer);
  
  console.log('Files inside zip:', Object.keys(zipReader.entries));
  
  const entry = zipReader.entries['presidente_2022_t1_AC.json'];
  if (entry) {
    const json = JSON.parse(await entry.text());
    console.log('\nKeys in JSON:', Object.keys(json));
    console.log('\nMetadata:', json.METADATA);
    console.log('\nSample results (first 3 keys):');
    const resKeys = Object.keys(json.RESULTS);
    for (let i = 0; i < Math.min(3, resKeys.length); i++) {
      console.log(`${resKeys[i]}:`, json.RESULTS[resKeys[i]]);
    }
  }
}

run().catch(console.error);
