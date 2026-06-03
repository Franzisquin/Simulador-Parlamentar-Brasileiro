const fs = require('fs');
const path = require('path');
const unzipit = require('unzipit');

async function checkYear(year, filename, zipname) {
  const zipPath = `C:/Users/lixov/OneDrive/Documentos/Observatorio/resultados_geo/${zipname}`;
  if (!fs.existsSync(zipPath)) {
    console.log(`Zip not found for ${year}: ${zipPath}`);
    return;
  }
  const zipBuffer = fs.readFileSync(zipPath);
  const { entries } = await unzipit.unzip(zipBuffer);
  const entry = entries[filename];
  if (entry) {
    const json = JSON.parse(await entry.text());
    console.log(`Year ${year}:`);
    console.log('  METADATA:', JSON.stringify(json.METADATA).substring(0, 300));
    console.log('  TOTALS:', JSON.stringify(json.TOTALS).substring(0, 300));
  } else {
    console.log(`Entry ${filename} not found in ${zipname}`);
  }
}

async function run() {
  await checkYear(2022, 'governador_2022_t1_SP_resumo.json', 'Majoritarias 2022/governador_2022_t1_SP.zip');
  await checkYear(2018, 'governador_2018_t1_SP_resumo.json', 'Majoritarias 2018/governador_2018_t1_SP.zip');
  await checkYear(2014, 'governador_2014_ord_t1_SP_resumo.json', 'Majoritarias 2014/governador_2014_ord_t1_SP.zip');
  await checkYear(2010, 'governador_2010_ord_t1_SP_resumo.json', 'Majoritarias 2010/governador_2010_ord_t1_SP.zip');
  await checkYear(2006, 'governador_2006_ord_t1_SP_resumo.json', 'Majoritarias 2006/governador_2006_ord_t1_SP.zip');
}

run().catch(console.error);
