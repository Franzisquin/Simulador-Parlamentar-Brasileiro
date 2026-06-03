const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

const startIdx = content.indexOf('id="Minas Gerais-10-2"');
if (startIdx !== -1) {
  const tagStart = content.lastIndexOf('<path', startIdx);
  const tagEnd = content.indexOf('>', startIdx);
  const tag = content.substring(tagStart, tagEnd + 1);
  const cleanTag = tag.replace(/ d="[^"]+"/, ' d="..."');
  console.log('Cleaned Path tag:', cleanTag);
}
