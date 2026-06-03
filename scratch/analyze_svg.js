const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\lixov\\OneDrive\\Ambiente de Trabalho\\PR Regional\\Deputados.svg', 'utf-8');

// Simple regex parser for SVG groups and paths
const gRegex = /<g\s+([^>]+)>/g;
const pathRegex = /<path\s+([^>]+)>/g;

let match;
console.log('--- GROUPS ---');
const groups = [];
while ((match = gRegex.exec(content)) !== null) {
  const attrs = match[1];
  const idMatch = attrs.match(/id="([^"]+)"/);
  const labelMatch = attrs.match(/inkscape:label="([^"]+)"/);
  if (idMatch) {
    groups.push({ id: idMatch[1], label: labelMatch ? labelMatch[1] : null });
    console.log(`Group: id="${idMatch[1]}" label="${labelMatch ? labelMatch[1] : ''}"`);
  }
}

console.log('\n--- PATHS (Sample) ---');
let pathCount = 0;
const paths = [];
const pathRegex2 = /<path\s+([^>]+)>/g;
while ((match = pathRegex2.exec(content)) !== null) {
  pathCount++;
  const attrs = match[1];
  const idMatch = attrs.match(/id="([^"]+)"/);
  const classMatch = attrs.match(/class="([^"]+)"/);
  const nameMatch = attrs.match(/data-name="([^"]+)"/);
  const popMatch = attrs.match(/data-population="([^"]+)"/);
  if (idMatch && pathCount <= 20) {
    console.log(`Path: id="${idMatch[1]}" class="${classMatch ? classMatch[1] : ''}" name="${nameMatch ? nameMatch[1] : ''}" pop="${popMatch ? popMatch[1] : ''}"`);
  }
  if (idMatch) {
    paths.push({
      id: idMatch[1],
      name: nameMatch ? nameMatch[1] : null,
      pop: popMatch ? parseFloat(popMatch[1]) : null
    });
  }
}
console.log(`Total paths: ${pathCount}`);

// Aggregate paths by state (derived from data-name)
const states = {};
paths.forEach(p => {
  if (p.name) {
    const stateName = p.name.split('-')[0];
    if (!states[stateName]) states[stateName] = [];
    states[stateName].push(p);
  }
});

console.log('\n--- STATES AND THEIR CIRCUITS ---');
for (const [state, list] of Object.entries(states)) {
  console.log(`${state}: ${list.length} circuits`);
}
