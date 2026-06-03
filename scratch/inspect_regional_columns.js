const { DatabaseSync } = require('node:sqlite');
const gpkgPath = 'C:\\Users\\lixov\\OneDrive\\Ambiente de Trabalho\\PR Regional\\Circulos NW Populacao.gpkg';
const db = new DatabaseSync(gpkgPath);

const colInfo = db.prepare("PRAGMA table_info('Circulos NW Populacao');").all();
console.log('Columns in Circulos NW Populacao:');
console.log(colInfo);
