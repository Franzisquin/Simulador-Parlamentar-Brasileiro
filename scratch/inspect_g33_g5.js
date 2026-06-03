const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

function inspectGroup(id) {
  console.log(`\n=== Group: ${id} ===`);
  const startIdx = content.indexOf(`id="${id}"`);
  if (startIdx === -1) {
    console.log('Not found');
    return;
  }
  const endIdx = content.indexOf('</g>', startIdx);
  const groupContent = content.substring(startIdx, endIdx + 4);
  console.log(groupContent.substring(0, 1000));
  if (groupContent.length > 1000) {
    console.log('... truncated ...');
    console.log(groupContent.substring(groupContent.length - 500));
  }
}

inspectGroup('g33');
inspectGroup('g5');
inspectGroup('g2');
inspectGroup('g34');
