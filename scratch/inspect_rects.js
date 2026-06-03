const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

const rectRegex = /<rect\s+([^>]+)>/g;
let match;
let count = 0;
while ((match = rectRegex.exec(content)) !== null) {
  count++;
  console.log(`Rect ${count}: ${match[1].trim()}`);
}
