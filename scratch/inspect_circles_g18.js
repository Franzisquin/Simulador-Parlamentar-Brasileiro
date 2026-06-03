const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\lixov\\OneDrive\\Ambiente de Trabalho\\PR Regional\\Deputados.svg', 'utf-8');

// Find all circles in group g18
const startIdx = content.indexOf('id="g18"');
const endIdx = content.indexOf('</g>', startIdx);
const g18Content = content.substring(startIdx, endIdx);

const circleRegex = /<circle\s+([^>]+)>/g;
let match;
let count = 0;
while ((match = circleRegex.exec(g18Content)) !== null) {
  count++;
  if (count <= 25) {
    console.log(`Circle ${count}: ${match[1].trim()}`);
  }
}
console.log(`Total circles in g18: ${count}`);
