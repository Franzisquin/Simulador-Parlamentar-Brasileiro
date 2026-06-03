// Splits resultados_geo/distritos_simulados.geojson into one file per state (UF)
// so each file stays well under GitHub's 100MB limit.
// Output: resultados_geo/distritos/distritos_simulados_<UF>.geojson
const fs = require('fs');
const path = require('path');

const ROOT = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil';
const SRC = path.join(ROOT, 'resultados_geo', 'distritos_simulados.geojson');
const OUT_DIR = path.join(ROOT, 'resultados_geo', 'distritos');

const UF_CODE_TO_SIGLA = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
  "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR",
  "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF"
};

console.log('Lendo', SRC, '...');
const raw = fs.readFileSync(SRC, 'utf8');
const fc = JSON.parse(raw);
console.log('Total de features:', fc.features.length);

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const groups = {}; // uf -> features[]
let unknown = 0;
for (const feat of fc.features) {
  const code = feat.properties && feat.properties.CD_UF != null ? String(feat.properties.CD_UF) : null;
  const uf = (code && UF_CODE_TO_SIGLA[code]) || code || 'UNKNOWN';
  if (uf === 'UNKNOWN') unknown++;
  (groups[uf] = groups[uf] || []).push(feat);
}

const summary = [];
for (const uf of Object.keys(groups).sort()) {
  const out = {
    type: 'FeatureCollection',
    features: groups[uf]
  };
  // preserve top-level crs if present
  if (fc.crs) out.crs = fc.crs;
  const outPath = path.join(OUT_DIR, `distritos_simulados_${uf}.geojson`);
  fs.writeFileSync(outPath, JSON.stringify(out));
  const sizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  summary.push({ uf, features: groups[uf].length, sizeMB });
}

console.table(summary);
const totalFeat = summary.reduce((a, s) => a + s.features, 0);
console.log('Soma das features escritas:', totalFeat, '| esperado:', fc.features.length);
console.log('Features sem CD_UF reconhecido:', unknown);
const maxMB = Math.max(...summary.map(s => parseFloat(s.sizeMB)));
console.log('Maior arquivo (MB):', maxMB.toFixed(2));
