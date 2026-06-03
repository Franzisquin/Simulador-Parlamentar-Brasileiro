const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

const target = 'id="g34"';
const targetIdx = content.indexOf(target);
if (targetIdx === -1) {
  console.log('Target not found');
  return;
}

const start = Math.max(0, targetIdx - 100);
const end = Math.min(content.length, targetIdx + 300);
console.log('--- Raw text around g34 definition ---');
console.log(content.substring(start, end));
