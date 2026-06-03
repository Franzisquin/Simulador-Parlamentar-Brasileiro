const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

const target = 'id="Minas Gerais-10-2"';
const targetIdx = content.indexOf(target);
if (targetIdx === -1) {
  console.log('Target not found');
  return;
}

// Let's find all opening <g> tags before the target that are not closed
const lines = content.substring(0, targetIdx).split('\n');
const openGroups = [];
const gOpenRegex = /<g\s+([^>]+)>/i;
const gCloseRegex = /<\/g>/i;

lines.forEach(line => {
  if (gOpenRegex.test(line)) {
    const match = line.match(gOpenRegex);
    openGroups.push(match[0]);
  }
  if (gCloseRegex.test(line)) {
    openGroups.pop();
  }
});

console.log('--- Parent Groups of Minas Gerais-10-2 ---');
openGroups.forEach((g, idx) => {
  console.log(`Level ${idx + 1}: ${g}`);
});
