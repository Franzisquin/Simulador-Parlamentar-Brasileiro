const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const gpkgPath = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/Brasil com Dados.gpkg';
const db = new DatabaseSync(gpkgPath);

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();
console.log('--- TABLES ---');
tables.forEach(t => console.log(t.name));

// List columns in 'Brasil com Dados'
console.log("\n--- COLUMNS IN 'Brasil com Dados' ---");
const columns = db.prepare("PRAGMA table_info('Brasil com Dados');").all();
columns.forEach(c => {
  if (!c.name.endsWith('_1T') && !c.name.endsWith('_2T')) {
    console.log(`${c.name} (${c.type})`);
  }
});
