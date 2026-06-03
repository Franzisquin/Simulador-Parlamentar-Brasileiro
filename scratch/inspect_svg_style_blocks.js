const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

// Print all style blocks
const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/g;
let match;
while ((match = styleRegex.exec(content)) !== null) {
  console.log('--- Style Block ---');
  console.log(match[1]);
}

// Print groups that have style or stroke attributes
const gRegex = /<g\b[^>]*>/g;
while ((match = gRegex.exec(content)) !== null) {
  const tag = match[0];
  if (tag.includes('stroke') || tag.includes('style') || tag.includes('id=')) {
    console.log(`Group: ${tag}`);
  }
}
