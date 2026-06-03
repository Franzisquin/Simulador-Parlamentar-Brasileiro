const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const gpkgPath = 'C:\\Users\\lixov\\OneDrive\\Ambiente de Trabalho\\PR Regional\\Circulos NW Populacao.gpkg';
const db = new DatabaseSync(gpkgPath);

const gpkgRows = db.prepare("SELECT estado, id_local FROM 'Circulos NW Populacao';").all();
const gpkgKeys = gpkgRows.map(r => `${r.estado}-${r.id_local}`);
console.log(`GPKG keys count: ${gpkgKeys.length}`);

function analyzeSvg(filename) {
  const content = fs.readFileSync(filename, 'utf-8');
  const pathRegex = /<path\s+([^>]+)>/g;
  let match;
  const svgKeys = [];
  while ((match = pathRegex.exec(content)) !== null) {
    const attrs = match[1];
    const classMatch = attrs.match(/class="([^"]+)"/);
    const nameMatch = attrs.match(/data-name="([^"]+)"/);
    if (classMatch && classMatch[1] === 'subdivision' && nameMatch) {
      svgKeys.push(nameMatch[1]);
    }
  }
  console.log(`\nSVG ${filename} subdivision paths count: ${svgKeys.length}`);
  
  // Unmatched GPKG keys
  const missingInSvg = gpkgKeys.filter(k => !svgKeys.includes(k));
  console.log(`Missing in SVG:`, missingInSvg);

  // Unmatched SVG keys
  const missingInGpkg = svgKeys.filter(k => !gpkgKeys.includes(k));
  console.log(`Missing in GPKG:`, missingInGpkg);
}

analyzeSvg('Deputados Semilocal.svg');
analyzeSvg('C:\\Users\\lixov\\OneDrive\\Ambiente de Trabalho\\PR Regional\\Deputados.svg');
