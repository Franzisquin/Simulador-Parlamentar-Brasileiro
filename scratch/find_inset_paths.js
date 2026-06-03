const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

const regex = /<path\b([^>]*?)>/g;
let match;
let count = 0;
while ((match = regex.exec(content)) !== null) {
  const attrs = match[1];
  const dMatch = attrs.match(/d="m\s*([\d\.-]+)\s*,\s*([\d\.-]+)/i);
  if (dMatch) {
    const x = parseFloat(dMatch[1]);
    const y = parseFloat(dMatch[2]);
    // check if it is near the inset coordinates (x near 1112, y near 545)
    if (Math.abs(x - 1112) < 50 && Math.abs(y - 545) < 50) {
      count++;
      const idMatch = attrs.match(/id="([^"]+)"/);
      const styleMatch = attrs.match(/style="([^"]+)"/);
      const strokeMatch = attrs.match(/stroke="([^"]+)"/);
      const swMatch = attrs.match(/stroke-width="([^"]+)"/);
      console.log(`Path ${count}: id="${idMatch ? idMatch[1] : 'none'}" x=${x} y=${y} stroke="${strokeMatch ? strokeMatch[1] : 'none'}" stroke-width="${swMatch ? swMatch[1] : 'none'}" style="${styleMatch ? styleMatch[1] : 'none'}"`);
    }
  }
}
