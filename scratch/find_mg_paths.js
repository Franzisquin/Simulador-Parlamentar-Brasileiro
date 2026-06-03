const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

const regex = /<path\b[^>]*?Minas Gerais[^>]*?>/gi;
let match;
let count = 0;
while ((match = regex.exec(content)) !== null) {
  count++;
  console.log(`Path ${count}: ${match[0].substring(0, 300)}...`);
}
