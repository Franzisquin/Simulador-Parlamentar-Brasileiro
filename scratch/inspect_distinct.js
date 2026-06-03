const { DatabaseSync } = require('node:sqlite');

const gpkgPath = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/Brasil com Dados.gpkg';
const db = new DatabaseSync(gpkgPath);

const cols = ['CD_UF', 'CD_MUN', 'CD_RGINT', 'CD_RGI', 'layer', 'path'];

cols.forEach(col => {
  try {
    const res = db.prepare(`SELECT COUNT(DISTINCT ${col}) as count FROM "Brasil com Dados";`).get();
    console.log(`Distinct ${col}: ${res.count}`);
  } catch (e) {
    console.log(`Error for ${col}: ${e.message}`);
  }
});
