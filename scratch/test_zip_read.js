const fs = require('fs');
const path = require('path');
const unzipit = require('unzipit');

async function test() {
  const zipPath = 'C:/Users/lixov/OneDrive/Documentos/Observatorio/resultados_geo/Majoritarias 2022/governador_2022_t1_SP.zip';
  const zipBuffer = fs.readFileSync(zipPath);
  const { entries } = await unzipit.unzip(zipBuffer);
  const entry = entries['governador_2022_t1_SP_resumo.json'];
  if (entry) {
    const text = await entry.text();
    console.log(text.substring(0, 500));
  } else {
    console.log('Entry not found');
  }
}

test().catch(console.error);
