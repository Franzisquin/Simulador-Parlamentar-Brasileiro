// Gera official_totals_2026_presidente.json ('f') e official_totals_2026_governador.json ('g')
// a partir dos *_resumo.json de resultados_geo/Majoritarias 2026 (copiados do Observatório).
// Mesmo formato de gen_governor_totals.js: votos agrupados pelo partido do candidato.
//
// Uso: node scratch/gen_official_totals_2026.js

const fs = require('fs');
const path = require('path');
const unzipit = require('unzipit');

const DATA_BASE_URL = path.resolve(__dirname, '..', 'resultados_geo');
const YEAR = 2026;

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
];

async function generate(cargo, outKey) {
  const output = {};

  for (const uf of UFS) {
    const zipPath = path.join(DATA_BASE_URL, `Majoritarias ${YEAR}`, `${cargo}_${YEAR}_t1_${uf}.zip`);
    const resumoName = `${cargo}_${YEAR}_t1_${uf}_resumo.json`;
    if (!fs.existsSync(zipPath)) {
      console.warn(`Warning: ZIP not found for ${cargo} ${uf} at ${zipPath}`);
      continue;
    }

    const { entries } = await unzipit.unzip(new Uint8Array(fs.readFileSync(zipPath)));
    const entry = entries[resumoName];
    if (!entry) {
      console.warn(`Warning: Entry ${resumoName} not found in ZIP for ${uf}`);
      continue;
    }

    const json = JSON.parse(await entry.text());
    const candNames = (json.METADATA || {}).cand_names || {};
    const totals = json.TOTALS || {};

    const partyVotes = {};
    let totalValidVotes = 0;

    for (const [candId, votesVal] of Object.entries(totals)) {
      const votes = parseInt(votesVal) || 0;
      if (candId === '95' || candId === '96') continue;

      let partyName = 'OUTROS';
      const candMeta = candNames[candId];
      if (candMeta && candMeta[1]) partyName = candMeta[1].toUpperCase().trim();

      partyVotes[partyName] = (partyVotes[partyName] || 0) + votes;
      totalValidVotes += votes;
    }

    const coalitions = Object.entries(partyVotes).map(([party, votes]) => ({
      id: party,
      raw_comp: party,
      votes: votes
    }));

    output[uf] = {
      [outKey]: {
        stats: { qt_votos_validos: totalValidVotes },
        coalitions: coalitions
      }
    };
  }

  const outputPath = path.join(DATA_BASE_URL, `official_totals_${YEAR}_${cargo}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Successfully generated ${outputPath}`);
}

async function run() {
  await generate('presidente', 'f');
  await generate('governador', 'g');
}

run().catch(console.error);
