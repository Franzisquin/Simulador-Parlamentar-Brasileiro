const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

const targets = [
  'Pernambuco-6', 'Pernambuco-6-2', 'Pernambuco-6-6',
  'Rio de Janeiro-1', 'Rio de Janeiro-1-2', 'Rio de Janeiro-1-2-3',
  'Minas Gerais-10', 'Minas Gerais-10-2'
];

targets.forEach(id => {
  const startIdx = content.indexOf(`id="${id}"`);
  if (startIdx === -1) {
    console.log(`ID ${id}: not found`);
    return;
  }
  const tagStart = content.lastIndexOf('<path', startIdx);
  const tagEnd = content.indexOf('>', startIdx);
  const tag = content.substring(tagStart, tagEnd + 1);
  const cleanTag = tag.replace(/ d="[^"]+"/, ' d="..."').replace(/\s+/g, ' ');
  console.log(`ID ${id}: ${cleanTag}`);
});
