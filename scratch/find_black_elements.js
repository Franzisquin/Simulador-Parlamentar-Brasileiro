const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

// Find all elements with stroke="#000000" or style containing stroke:#000000
const regex = /<([a-z0-9]+)\b([^>]*?(?:stroke=["']#000000["']|stroke:\s*#000000|stroke-width:\s*[^0\s]|stroke-width=["'][^0.5]["'])[^>]*?)>/gi;
let match;
let count = 0;
while ((match = regex.exec(content)) !== null) {
  count++;
  const tag = match[1];
  const attrs = match[2];
  if (attrs.includes('subdivision') || attrs.includes('circle')) continue; // skip subdivisions/circles we already know
  console.log(`Match ${count}: <${tag} ${attrs.substring(0, 300)}...`);
}
