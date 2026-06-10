const fs = require('fs');

const lines = fs.readFileSync('simulador.js', 'utf8').split('\n');

const lineRanges = [
  [7240, 7270],
  [7570, 7640],
  [8050, 8090],
  [8240, 8280],
  [8570, 8610],
  [8830, 8870],
  [9430, 9470],
  [9570, 9610]
];

lineRanges.forEach(([start, end]) => {
  console.log(`=== LINES ${start} TO ${end} ===`);
  for (let l = start; l <= end; l++) {
    if (lines[l - 1] !== undefined) {
      console.log(`${l}: ${lines[l - 1]}`);
    }
  }
});
