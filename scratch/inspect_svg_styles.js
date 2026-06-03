const fs = require('fs');

const svg1 = fs.readFileSync('Deputados Semilocal.svg', 'utf-8');
const svg2 = fs.readFileSync('C:\\Users\\lixov\\OneDrive\\Ambiente de Trabalho\\PR Regional\\Deputados.svg', 'utf-8');

function inspectStyle(name, content) {
  console.log(`=== Inspecting styles for ${name} ===`);
  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (styleMatch) {
    console.log('Style block found (first 500 chars):');
    console.log(styleMatch[1].substring(0, 500));
  } else {
    console.log('No style block found.');
  }

  // Look for viewbox, width, height
  const svgTag = content.match(/<svg[^>]*>/);
  if (svgTag) {
    console.log('SVG tag attributes:', svgTag[0]);
  }
}

inspectStyle('Deputados Semilocal.svg', svg1);
inspectStyle('Deputados.svg', svg2);
