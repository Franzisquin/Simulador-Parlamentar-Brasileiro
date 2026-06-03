const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

function cleanPrint(id) {
  const startIdx = content.indexOf(`id="${id}"`);
  if (startIdx === -1) {
    console.log(`ID ${id} not found`);
    return;
  }
  const tagStart = content.lastIndexOf('<path', startIdx);
  const tagEnd = content.indexOf('>', startIdx);
  const tag = content.substring(tagStart, tagEnd + 1);
  console.log(`\nPath ID: ${id}`);
  console.log(tag.replace(/\s+/g, ' ').substring(0, 500));
}

cleanPrint('Minas Gerais-10');
cleanPrint('Minas Gerais-10-2');
