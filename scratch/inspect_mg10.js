const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

function findAndPrint(id) {
  console.log(`\n=== Searching for ID: ${id} ===`);
  const regex = new RegExp(`<path\\b[^>]*?id="${id}"[^>]*?>`, 'g');
  let match;
  while ((match = regex.exec(content)) !== null) {
    console.log(match[0]);
  }
}

findAndPrint('Minas Gerais-10');
findAndPrint('Minas Gerais-10-2');
