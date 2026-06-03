const fs = require('fs');
const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

const startIdx = content.indexOf('id="g33"');
if (startIdx !== -1) {
  const endIdx = content.indexOf('</g>', startIdx);
  const groupContent = content.substring(startIdx, endIdx);
  
  const pathRegex = /<path\b([^>]*?)>/g;
  let match;
  let count = 0;
  while ((match = pathRegex.exec(groupContent)) !== null) {
    count++;
    const attrs = match[1];
    const idMatch = attrs.match(/id="([^"]+)"/);
    const transMatch = attrs.match(/transform="([^"]+)"/);
    const id = idMatch ? idMatch[1] : 'no-id';
    const trans = transMatch ? transMatch[1] : 'no-transform';
    console.log(`Path ${count}: id="${id}", transform="${trans}"`);
  }
} else {
  console.log('g33 not found');
}
