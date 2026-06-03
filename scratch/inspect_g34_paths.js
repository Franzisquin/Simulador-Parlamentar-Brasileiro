const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

const startIdx = content.indexOf('id="g34"');
const endIdx = content.indexOf('</g>', startIdx);
const g34Content = content.substring(startIdx, endIdx);

const pathRegex = /<path\s+([^>]+)>/g;
let match;
let count = 0;
while ((match = pathRegex.exec(g34Content)) !== null) {
  count++;
  const attrs = match[1];
  const idMatch = attrs.match(/id="([^"]+)"/);
  const classMatch = attrs.match(/class="([^"]+)"/);
  const strokeMatch = attrs.match(/stroke="([^"]+)"/) || attrs.match(/stroke:\s*([^;"]+)/);
  const swMatch = attrs.match(/stroke-width="([^"]+)"/) || attrs.match(/stroke-width:\s*([^;"]+)/);
  const styleMatch = attrs.match(/style="([^"]+)"/);
  const nameMatch = attrs.match(/data-name="([^"]+)"/);
  
  console.log(`Path ${count}: id="${idMatch ? idMatch[1] : 'none'}" name="${nameMatch ? nameMatch[1] : 'none'}" class="${classMatch ? classMatch[1] : 'none'}" stroke="${strokeMatch ? strokeMatch[1] : 'none'}" stroke-width="${swMatch ? swMatch[1] : 'none'}" style="${styleMatch ? styleMatch[1] : 'none'}"`);
}
