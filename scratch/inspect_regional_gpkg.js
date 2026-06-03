const { DatabaseSync } = require('node:sqlite');
const gpkgPath = 'C:\\Users\\lixov\\OneDrive\\Ambiente de Trabalho\\PR Regional\\Circulos NW Populacao.gpkg';
const db = new DatabaseSync(gpkgPath);

const rows = db.prepare("SELECT fid, estado, id_local, populacao FROM 'Circulos NW Populacao';").all();
console.log(`Total rows: ${rows.length}`);
console.log('Sample rows:');
console.log(rows.slice(0, 15));

const distinctStates = [...new Set(rows.map(r => r.estado))];
console.log('\nDistinct states in GPKG:', distinctStates);
