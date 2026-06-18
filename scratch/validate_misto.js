// Standalone validation of the mixed-member seat math against real data files.
// Replicates runMistoSimulation's per-state allocation using the actual
// CENSUS_POPULATIONS / getProportionalSeats logic pulled from simulador.js.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'simulador.js'), 'utf8');

// --- Pull CENSUS_POPULATIONS literal from the source and eval it ---
function extractConst(name) {
  const start = SRC.indexOf(`${name} = {`);
  if (start < 0) throw new Error(`not found: ${name}`);
  let i = SRC.indexOf('{', start), depth = 0, end = -1;
  for (let j = i; j < SRC.length; j++) {
    if (SRC[j] === '{') depth++;
    else if (SRC[j] === '}') { depth--; if (depth === 0) { end = j + 1; break; } }
  }
  return eval('(' + SRC.slice(i, end) + ')');
}
const CENSUS_POPULATIONS = extractConst('CENSUS_POPULATIONS');

const UF_CODE_TO_SIGLA = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
  "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR",
  "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF"
};

// getProportionalSeats(total) — Hare quota on 2022 populations
function getProportionalSeats(totalSeatsCount) {
  const activePop = CENSUS_POPULATIONS[2022];
  const totalPop = Object.values(activePop).reduce((s, v) => s + v, 0);
  const qp = totalPop / totalSeatsCount;
  const seats = {}; let allocated = 0; const rem = [];
  for (const [uf, pop] of Object.entries(activePop)) {
    const init = Math.floor(pop / qp); seats[uf] = init; allocated += init;
    rem.push({ uf, rem: pop % qp });
  }
  rem.sort((a, b) => b.rem - a.rem);
  let i = 0;
  while (allocated < totalSeatsCount) { seats[rem[i].uf]++; allocated++; i++; }
  return seats;
}
function getSeatsAllocationByState(type) {
  if (type === 'cubicroot') {
    const base = getProportionalSeats(588); const s = {};
    for (const [uf, v] of Object.entries(base)) s[uf] = Math.max(3, v);
    return s;
  }
  return getProportionalSeats(513);
}

function getStandardFederationKey(name) {
  const n = String(name || '').toUpperCase().trim();
  const clean = n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "");
  let k = clean;
  if (clean === 'PMDB' || clean === 'MDB') k = 'MDB';
  else if (clean === 'PR' || clean === 'PL') k = 'PL';
  else if (clean === 'PRB' || clean === 'REPUBLICANOS') k = 'REPUBLICANOS';
  else if (clean === 'PPS' || clean === 'CIDADANIA') k = 'CIDADANIA';
  else if (clean === 'PTN' || clean === 'PODEMOS' || clean === 'PODE') k = 'PODE';
  else if (clean === 'PTDOB' || clean === 'AVANTE') k = 'AVANTE';
  else if (clean === 'PEN' || clean === 'PATRI' || clean === 'PATRIOTA') k = 'PATRIOTA';
  else if (clean === 'PTC' || clean === 'AGIR') k = 'AGIR';
  else if (clean === 'PMN' || clean === 'MOBILIZA') k = 'MOBILIZA';
  else if (clean === 'PFL' || clean === 'DEM') k = 'DEM';
  else if (clean === 'PCDOB') k = 'PCDOB';
  else if (clean === 'UNIAO') k = 'UNIÃO';
  if (k === 'PT' || k === 'PV' || k === 'PCDOB') return 'FE_BRASIL';
  if (k === 'PSDB' || k === 'CIDADANIA') return 'PSDB_CIDADANIA';
  if (k === 'PSOL' || k === 'REDE') return 'PSOL_REDE';
  return k;
}

function allocateSeats(votesByParty, totalSeats, method) {
  const result = {};
  const parties = Object.entries(votesByParty).filter(([, v]) => v > 0).map(([party, votes]) => ({ party, votes }));
  parties.forEach(p => { result[p.party] = 0; });
  if (totalSeats <= 0 || parties.length === 0) return result;
  if (method === 'hare') {
    const tv = parties.reduce((s, p) => s + p.votes, 0); const q = tv / totalSeats;
    let alloc = 0; const rem = [];
    parties.forEach(p => { const init = Math.floor(p.votes / q); result[p.party] = init; alloc += init; rem.push({ party: p.party, rem: p.votes % q, votes: p.votes }); });
    rem.sort((a, b) => (Math.abs(b.rem - a.rem) > 1e-9 ? b.rem - a.rem : b.votes - a.votes));
    let i = 0; while (alloc < totalSeats && rem[i]) { result[rem[i].party]++; alloc++; i++; }
  } else {
    for (let r = 0; r < totalSeats; r++) {
      let mq = -1, ch = null;
      for (const p of parties) { const s = result[p.party]; const q = method === 'dhondt' ? p.votes / (s + 1) : p.votes / (2 * s + 1); if (q > mq + 1e-9) { mq = q; ch = p.party; } }
      if (ch) result[ch]++;
    }
  }
  return result;
}

// --- Load data ---
const votos = JSON.parse(fs.readFileSync(path.join(ROOT, 'resultados_geo', 'distritos_misto_votos.json'), 'utf8'));
const totals = JSON.parse(fs.readFileSync(path.join(ROOT, 'resultados_geo', 'Legislativas 2022', 'official_totals_2022.json'), 'utf8'));

// District winners per UF (deputado_2022)
const stateDistrictWins = {}, stateDistrictCount = {}, stateDistrictMargins = {};
for (const [fid, data] of Object.entries(votos)) {
  const uf = UF_CODE_TO_SIGLA[fid.split('_')[0]];
  const dep = data['deputado_2022'] || {};
  let winner = null, w = 0, second = 0, total = 0;
  for (const [p, v] of Object.entries(dep)) {
    if (p === 'VOTOS_BRANCOS' || p === 'VOTOS_NULOS' || p === 'TOTAL_VOTOS_VALIDOS') continue;
    total += v; if (v > w) { second = w; w = v; winner = p; } else if (v > second) second = v;
  }
  stateDistrictCount[uf] = (stateDistrictCount[uf] || 0) + 1;
  if (winner) (stateDistrictWins[uf] = stateDistrictWins[uf] || {})[winner] = (stateDistrictWins[uf]?.[winner] || 0) + 1;
}

// List votes per UF
const partyStateVotes = {};
for (const [uf, ud] of Object.entries(totals)) {
  if (!ud.f) continue; partyStateVotes[uf] = {};
  ud.f.coalitions.forEach(c => { const k = getStandardFederationKey(c.id); partyStateVotes[uf][k] = (partyStateVotes[uf][k] || 0) + c.votes; });
}

function runMode(seatDist, method, mode) {
  const T = getSeatsAllocationByState(seatDist);
  let total = 0, nominal = 0, overhangExtra = 0, strippedCount = 0;
  const nat = {};
  for (const uf of Object.keys(stateDistrictCount)) {
    const Tuf = T[uf] || 0, D = stateDistrictCount[uf]; nominal += Tuf;
    const dw = stateDistrictWins[uf] || {}, lv = partyStateVotes[uf] || {};
    const seats = {};
    if (mode === 'paralelo') {
      const L = Math.max(0, Tuf - D); const la = allocateSeats(lv, L, method);
      new Set([...Object.keys(dw), ...Object.keys(la)]).forEach(p => seats[p] = (dw[p] || 0) + (la[p] || 0));
    } else {
      const ent = allocateSeats(lv, Tuf, method);
      new Set([...Object.keys(dw), ...Object.keys(ent)]).forEach(p => {
        const e = ent[p] || 0, d = dw[p] || 0;
        seats[p] = mode === 'comp_overhang' ? Math.max(e, d) : e;
        if (mode === 'comp_sem_overhang' && d > e) strippedCount += (d - e);
        if (mode === 'comp_overhang' && d > e) overhangExtra += (d - e);
      });
    }
    for (const [p, s] of Object.entries(seats)) { if (s > 0) { nat[p] = (nat[p] || 0) + s; total += s; } }
  }
  return { total, nominal, overhangExtra, strippedCount, nat };
}

for (const seatDist of ['fair', 'cubicroot']) {
  console.log(`\n##### Seat distribution: ${seatDist} (nominal ${seatDist === 'fair' ? 513 : 588}) #####`);
  for (const mode of ['paralelo', 'comp_overhang', 'comp_sem_overhang']) {
    const r = runMode(seatDist, 'dhondt', mode);
    const top = Object.entries(r.nat).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, s]) => `${p}:${s}`).join(' ');
    console.log(`  ${mode.padEnd(18)} total=${r.total} nominal=${r.nominal} overhangExtra=${r.overhangExtra} stripped=${r.strippedCount}`);
    console.log(`     top6: ${top}`);
  }
}
// Check any state where D > T(fair)
const Tfair = getSeatsAllocationByState('fair');
const probs = Object.keys(stateDistrictCount).filter(uf => stateDistrictCount[uf] > (Tfair[uf] || 0));
console.log('\nStates where districts > fair seats:', probs.length ? probs.map(uf => `${uf}(D=${stateDistrictCount[uf]},T=${Tfair[uf]})`).join(', ') : 'none');
