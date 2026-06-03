const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

const tags = ['path', 'circle', 'rect', 'text', 'style', 'g'];
tags.forEach(tag => {
  const regex = new RegExp(`<${tag}\\b`, 'g');
  const matches = content.match(regex);
  console.log(`<${tag}> count: ${matches ? matches.length : 0}`);
});
