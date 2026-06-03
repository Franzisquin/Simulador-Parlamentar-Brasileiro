const fs = require('fs');
const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

const pathRegex = /<path\b([^>]*?)>/g;
let match;
let transCount = 0;
while ((match = pathRegex.exec(content)) !== null) {
  const attrs = match[1];
  if (attrs.includes('transform=')) {
    transCount++;
    const idMatch = attrs.match(/id="([^"]+)"/);
    const transMatch = attrs.match(/transform="([^"]+)"/);
    const id = idMatch ? idMatch[1] : 'no-id';
    const trans = transMatch ? transMatch[1] : 'no-transform';
    console.log(`Path ${transCount}: id="${id}", transform="${trans}"`);
  }
}
console.log(`Total paths with transform: ${transCount}`);
