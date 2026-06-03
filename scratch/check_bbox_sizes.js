const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

function getMinMax(d) {
  const points = d.split(/[a-df-z]/i).filter(p => p.trim() !== '');
  let cx = 0, cy = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  // Very rough parser to get absolute coordinates
  let isFirst = true;
  points.forEach(p => {
    const coords = p.trim().split(/[\s,]+/);
    if (coords.length >= 2) {
      const x = parseFloat(coords[0]);
      const y = parseFloat(coords[1]);
      if (!isNaN(x) && !isNaN(y)) {
        if (isFirst) {
          cx = x;
          cy = y;
          isFirst = false;
        } else {
          cx += x;
          cy += y;
        }
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
      }
    }
  });
  return { width: maxX - minX, height: maxY - minY };
}

function checkPath(id) {
  const startIdx = content.indexOf(`id="${id}"`);
  if (startIdx === -1) {
    console.log(`${id} not found`);
    return;
  }
  const tagStart = content.lastIndexOf('<path', startIdx);
  const tagEnd = content.indexOf('>', startIdx);
  const tag = content.substring(tagStart, tagEnd + 1);
  const dMatch = tag.match(/d="([^"]+)"/);
  if (dMatch) {
    const bbox = getMinMax(dMatch[1]);
    console.log(`Path ID: ${id}, BBox size: ${bbox.width.toFixed(2)}x${bbox.height.toFixed(2)}`);
  }
}

checkPath('Minas Gerais-10-2');
checkPath('Rio de Janeiro-1');
checkPath('Pernambuco-6-6');
