const fs = require('fs');

const content = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');

const regex = /<path\b([^>]*?)>/g;
let match;
const items = [];
while ((match = regex.exec(content)) !== null) {
  const attrs = match[1];
  const idMatch = attrs.match(/id="([^"]+)"/);
  const classMatch = attrs.match(/class="([^"]+)"/);
  
  // Extract stroke-width from style attribute or direct attribute
  let sw = 0;
  const swAttr = attrs.match(/stroke-width="([^"]+)"/);
  if (swAttr) {
    sw = parseFloat(swAttr[1]);
  } else {
    const swStyle = attrs.match(/stroke-width:\s*([^;"]+)/);
    if (swStyle) {
      sw = parseFloat(swStyle[1]);
    }
  }
  
  const strokeAttr = attrs.match(/stroke="([^"]+)"/);
  let stroke = strokeAttr ? strokeAttr[1] : 'none';
  if (stroke === 'none') {
    const strokeStyle = attrs.match(/stroke:\s*([^;"]+)/);
    if (strokeStyle) stroke = strokeStyle[1];
  }

  items.push({
    id: idMatch ? idMatch[1] : 'none',
    cls: classMatch ? classMatch[1] : 'none',
    sw: sw,
    stroke: stroke,
    tag: 'path',
    raw: match[0].substring(0, 150)
  });
}

// Do the same for group tags, circle tags, rect tags, etc.
const otherTags = ['g', 'rect', 'circle'];
otherTags.forEach(t => {
  const r = new RegExp(`<${t}\\b([^>]*?)>`, 'g');
  while ((match = r.exec(content)) !== null) {
    const attrs = match[1];
    const idMatch = attrs.match(/id="([^"]+)"/);
    let sw = 0;
    const swAttr = attrs.match(/stroke-width="([^"]+)"/);
    if (swAttr) {
      sw = parseFloat(swAttr[1]);
    } else {
      const swStyle = attrs.match(/stroke-width:\s*([^;"]+)/);
      if (swStyle) sw = parseFloat(swStyle[1]);
    }
    
    let stroke = 'none';
    const strokeAttr = attrs.match(/stroke="([^"]+)"/);
    if (strokeAttr) stroke = strokeAttr[1];
    else {
      const strokeStyle = attrs.match(/stroke:\s*([^;"]+)/);
      if (strokeStyle) stroke = strokeStyle[1];
    }

    items.push({
      id: idMatch ? idMatch[1] : 'none',
      cls: 'none',
      sw: sw,
      stroke: stroke,
      tag: t,
      raw: match[0].substring(0, 150)
    });
  }
});

items.sort((a, b) => b.sw - a.sw);

console.log('Top 30 thickest elements:');
items.slice(0, 30).forEach(item => {
  console.log(`Tag: ${item.tag}, ID: "${item.id}", Class: "${item.cls}", stroke-width: ${item.sw}, stroke: "${item.stroke}", raw: ${item.raw}`);
});
