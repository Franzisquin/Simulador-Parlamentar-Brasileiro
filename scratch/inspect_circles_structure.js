const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\lixov\\OneDrive\\Ambiente de Trabalho\\PR Regional\\Deputados.svg', 'utf-8');

// Let's find groups that contain circle tags
const parser = /<g\b[^>]*>([\s\S]*?)<\/g>/g;
let gMatch;
let gCount = 0;
while ((gMatch = parser.exec(content)) !== null) {
  const gTag = content.substring(gMatch.index, content.indexOf('>', gMatch.index) + 1);
  const body = gMatch[1];
  const circlesInG = (body.match(/<circle\b/g) || []).length;
  const pathsInG = (body.match(/<path\b/g) || []).length;
  if (circlesInG > 0 || pathsInG > 0) {
    gCount++;
    console.log(`Group ${gCount}: tag=${gTag.trim().substring(0, 120)}...`);
    console.log(`  Circles: ${circlesInG}, Paths: ${pathsInG}`);
    
    // Check if there are nested groups or ids
    const idMatch = gTag.match(/id="([^"]+)"/);
    const labelMatch = gTag.match(/inkscape:label="([^"]+)"/);
    console.log(`  ID: ${idMatch ? idMatch[1] : 'none'}, Label: ${labelMatch ? labelMatch[1] : 'none'}`);
  }
}
