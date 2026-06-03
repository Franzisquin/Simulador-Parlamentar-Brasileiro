const fs = require('fs');
const path = require('path');

const years = [2006, 2010, 2014, 2018, 2022];
const states = [
  "RO", "AC", "AM", "RR", "PA", "AP", "TO",
  "MA", "PI", "CE", "RN", "PB", "PE", "AL",
  "SE", "BA", "MG", "ES", "RJ", "SP", "PR",
  "SC", "RS", "MS", "MT", "GO", "DF"
];

for (const year of years) {
  let missing = 0;
  for (const uf of states) {
    const p = path.resolve(`resultados_geo/Majoritarias ${year}/presidente_${year}_t1_${uf}.zip`);
    if (!fs.existsSync(p)) {
      missing++;
    }
  }
  console.log(`Year ${year}: missing ${missing} out of ${states.length} UFs`);
}
