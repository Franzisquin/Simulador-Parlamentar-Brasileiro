const fs = require('fs');
const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

const pos = content.indexOf('id="g18"');
if (pos !== -1) {
  console.log('g18 found at pos', pos);
  const end = content.indexOf('</g>', pos);
  console.log('g18 snippet:', content.substring(pos, end + 4).replace(/\s+/g, ' ').substring(0, 500));
} else {
  console.log('g18 not found');
}
