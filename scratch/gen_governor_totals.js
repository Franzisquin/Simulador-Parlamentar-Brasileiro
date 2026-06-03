const fs = require('fs');
const path = require('path');
const unzipit = require('unzipit');

const OBS_BASE_URL = 'C:/Users/lixov/OneDrive/Documentos/Observatorio/resultados_geo/';
const DEST_BASE_URL = 'c:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/resultados_geo/';

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
];

const YEARS = [2006, 2010, 2014, 2018, 2022];

async function generateForYear(year) {
  const output = {};

  for (const uf of UFS) {
    let zipPath = '';
    let resumoName = '';

    if (year === 2022 || year === 2018) {
      zipPath = path.join(OBS_BASE_URL, `Majoritarias ${year}`, `governador_${year}_t1_${uf}.zip`);
      resumoName = `governador_${year}_t1_${uf}_resumo.json`;
    } else {
      zipPath = path.join(OBS_BASE_URL, `Majoritarias ${year}`, `governador_${year}_ord_t1_${uf}.zip`);
      resumoName = `governador_${year}_ord_t1_${uf}_resumo.json`;
    }

    if (!fs.existsSync(zipPath)) {
      console.warn(`Warning: ZIP not found for ${year} ${uf} at ${zipPath}`);
      continue;
    }

    try {
      const zipBuffer = fs.readFileSync(zipPath);
      const { entries } = await unzipit.unzip(zipBuffer);
      const entry = entries[resumoName];
      if (!entry) {
        console.warn(`Warning: Entry ${resumoName} not found in ZIP for ${year} ${uf}`);
        continue;
      }

      const json = JSON.parse(await entry.text());
      const metadata = json.METADATA || {};
      const candNames = metadata.cand_names || {};
      const totals = json.TOTALS || {};

      const partyVotes = {};
      let totalValidVotes = 0;

      for (const [candId, votesVal] of Object.entries(totals)) {
        const votes = parseInt(votesVal) || 0;
        // Skip blank/null
        if (candId === '95' || candId === '96') continue;

        // Get party name from metadata
        let partyName = 'OUTROS';
        const candMeta = candNames[candId];
        if (candMeta && candMeta[1]) {
          partyName = candMeta[1].toUpperCase().trim();
        }

        partyVotes[partyName] = (partyVotes[partyName] || 0) + votes;
        totalValidVotes += votes;
      }

      const coalitions = Object.entries(partyVotes).map(([party, votes]) => ({
        id: party,
        raw_comp: party,
        votes: votes
      }));

      // Store under key 'g' for governor
      output[uf] = {
        g: {
          stats: {
            qt_votos_validos: totalValidVotes
          },
          coalitions: coalitions
        }
      };
    } catch (e) {
      console.error(`Error processing ${year} ${uf}:`, e);
    }
  }

  const outputPath = path.join(DEST_BASE_URL, `official_totals_${year}_governador.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Successfully generated ${outputPath}`);
}

async function run() {
  for (const year of YEARS) {
    await generateForYear(year);
  }
}

run().catch(console.error);
