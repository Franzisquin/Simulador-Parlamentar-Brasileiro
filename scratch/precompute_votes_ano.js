// Agrega os resultados de um ano de eleição geral (por padrão 2026) nas circunscrições
// do simulador, a partir dos pontos dos locais de votação, e ACRESCENTA as chaves desse
// ano aos arquivos pré-calculados que já existem — os anos anteriores não são recalculados
// nem alterados.
//
// Entradas
//   locais_votacao_<ano>/locais_votacao_<ano>_<UF>.geojson   (via zip_index.json)
//   Majoritarias <ano>/presidente_<ano>_t1_<UF>.zip, governador_<ano>_t1_<UF>.zip
//   Legislativas <ano>/deputados_federal_<ano>_<UF>.zip, deputados_estadual_<ano>_<UF>.zip
//     (cada eleição é opcional: o que não existir é simplesmente pulado)
//
// Geometrias (point-in-polygon com a geometria completa, buracos incluídos; um local
// fora de todos os polígonos da UF vai para o polígono mais próximo)
//   distritos/distritos_simulados_<UF>.geojson   chave: fid
//   distritos_misto/distritos_misto_<UF>.geojson  chave: fid ("<CD_UF>_<DISTRICT>")
//   semilocal_circuitos_hires.geojson             chave: sub_name ("<Estado>-<id_local>")
//
// Saídas (atualizadas no lugar)
//   distritos/*.geojson           propriedades <PARTIDO>_<ano>_1T, Total_Votos_Validos_<ano>_1T,
//                                 Votos_Brancos/Nulos, Abstenções, Eleitores_Aptos, MARGEM, VENCEDOR
//   distritos_detalhe_munis.json  presidente_<ano> por município (nome IBGE, sem acento)
//   distritos_votos.json          deputado_<ano>
//   distritos_misto_votos.json    deputado_<ano>, presidente_<ano>
//   semilocal_votos.json          deputado_<ano>, presidente_<ano>, estadual_<ano>, governador_<ano>
//
// Uso
//   node scratch/precompute_votes_ano.js [ano]               atualiza os arquivos
//   node scratch/precompute_votes_ano.js [ano] --check DIR   só grava os agregados em DIR
//                                                            (para comparar com o que já existe)

const path = require('node:path');
const fs = require('node:fs');
const unzipit = require('unzipit');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'resultados_geo');

const args = process.argv.slice(2);
const checkIdx = args.indexOf('--check');
const CHECK_DIR = checkIdx >= 0 ? path.resolve(args[checkIdx + 1]) : null;
const YEAR = parseInt(args.find((a, i) => /^\d{4}$/.test(a) && (checkIdx < 0 || i !== checkIdx + 1)) || '2026', 10);

const UF_TO_CODE = {
  "RO": "11", "AC": "12", "AM": "13", "RR": "14", "PA": "15", "AP": "16", "TO": "17",
  "MA": "21", "PI": "22", "CE": "23", "RN": "24", "PB": "25", "PE": "26", "AL": "27",
  "SE": "28", "BA": "29", "MG": "31", "ES": "32", "RJ": "33", "SP": "35", "PR": "41",
  "SC": "42", "RS": "43", "MS": "50", "MT": "51", "GO": "52", "DF": "53"
};

const UF_NAMES = {
  "AC": "Acre", "AL": "Alagoas", "AM": "Amazonas", "AP": "Amapá", "BA": "Bahia",
  "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo", "GO": "Goiás",
  "MA": "Maranhão", "MG": "Minas Gerais", "MS": "Mato Grosso do Sul", "MT": "Mato Grosso",
  "PA": "Pará", "PB": "Paraíba", "PE": "Pernambuco", "PI": "Piauí", "PR": "Paraná",
  "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte", "RO": "Rondônia", "RR": "Roraima",
  "RS": "Rio Grande do Sul", "SC": "Santa Catarina", "SP": "São Paulo", "SE": "Sergipe",
  "TO": "Tocantins"
};

const PARTY_NUMBERS = {
  "10": "REPUBLICANOS", "11": "PP", "12": "PDT", "13": "PT", "14": "PTB",
  "15": "MDB", "16": "PSTU", "17": "PSL", "18": "REDE", "19": "PODE",
  "20": "PSC", "21": "PCB", "22": "PL", "23": "CIDADANIA", "25": "DEM",
  "27": "DC", "28": "PRTB", "29": "PCO", "30": "NOVO", "31": "PHS",
  "33": "PMN", "35": "PMB", "36": "AGIR", "40": "PSB", "43": "PV",
  "44": "UNIÃO", "45": "PSDB", "50": "PSOL", "51": "PATRIOTA", "55": "PSD",
  "65": "PC DO B", "70": "AVANTE", "77": "SOLIDARIEDADE", "80": "UP",
  "90": "PROS"
};

// Partido dono de um número de legenda no ano (os números mudaram de dono ao longo do tempo)
function partyByNumber(num, year) {
  const n = String(num);
  if (n === '44') return year < 2022 ? 'PRP' : 'UNIÃO';
  if (year >= 2024) {
    if (n === '20') return 'PODE';      // PSC incorporado ao PODE (2023)
    if (n === '25') return 'PRD';       // ex-PFL/DEM; PRD (PTB + Patriota) a partir de 2024
  }
  if (year >= 2026) {
    if (n === '14') return 'MISSÃO';
    if (n === '33') return 'MOBILIZA';
    if (n === '35') return 'DEMOCRATA'; // ex-PMB
  }
  return PARTY_NUMBERS[n] || null;
}

// Partido -> chave padronizada (mesma regra de getStandardFederationKey do simulador)
function getStandardFederationKey(name, year) {
  const n = String(name || '').toUpperCase().trim();
  const clean = n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '');
  let partyKey = clean;
  if (clean === 'PMDB' || clean === 'MDB') partyKey = 'MDB';
  else if (clean === 'PR' || clean === 'PL') partyKey = 'PL';
  else if (clean === 'PRB' || clean === 'REPUBLICANOS') partyKey = 'REPUBLICANOS';
  else if (clean === 'PPS' || clean === 'CIDADANIA') partyKey = 'CIDADANIA';
  else if (clean === 'PTN' || clean === 'PODEMOS' || clean === 'PODE' || (clean === 'PSC' && year >= 2024)) partyKey = 'PODE';
  else if (clean === 'PTDOB' || clean === 'AVANTE') partyKey = 'AVANTE';
  else if (clean === 'PEN' || clean === 'PATRI' || clean === 'PATRIOTA') partyKey = 'PATRIOTA';
  else if (clean === 'PTC' || clean === 'AGIR') partyKey = 'AGIR';
  else if (clean === 'PMN' || clean === 'MOBILIZA') partyKey = 'MOBILIZA';
  else if (clean === 'PFL' || clean === 'DEM') partyKey = year >= 2024 ? 'PRD' : 'DEM';
  else if (clean === 'PCDOB') partyKey = 'PCDOB';

  if (year >= 2022) {
    if (partyKey === 'PT' || partyKey === 'PV' || partyKey === 'PCDOB') return 'FE_BRASIL';
    if (partyKey === 'PSDB' || partyKey === 'CIDADANIA') return 'PSDB_CIDADANIA';
    if (partyKey === 'PSOL' || partyKey === 'REDE') return 'PSOL_REDE';
  }
  if (year >= 2026) {
    if (partyKey === 'UNIAO' || partyKey === 'PP') return 'UNIAO_PROGRESSISTA';
    if (partyKey === 'PRD' || partyKey === 'SOLIDARIEDADE') return 'RENOVACAO_SOLIDARIA';
  }
  return partyKey;
}

// Nome do partido (sem padronizar) de uma chave de voto: número de legenda / candidato
// majoritário (até 2 dígitos) ou candidato proporcional (4 a 5 dígitos)
function rawPartyOf(candId, candNames, year, isMajoritarian) {
  const meta = candNames[candId];
  if (String(candId).length <= 2) {
    if (isMajoritarian && meta && meta[1]) return meta[1];
    return partyByNumber(candId, year);
  }
  if (meta && meta[1]) return meta[1];
  return partyByNumber(String(candId).slice(0, 2), year);
}

function normalizeMuniName(name) {
  return String(name || 'UNKNOWN').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ---------- Geometria ----------

function ringContains(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function ringBox(ring) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of ring) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  return { minX, maxX, minY, maxY };
}

// Cada área vira uma lista de partes { rings, box } para o teste rápido por caixa
function prepareArea(key, geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  const parts = polys.filter(p => p && p[0] && p[0].length >= 3).map(rings => ({ rings, box: ringBox(rings[0]) }));
  return { key, parts };
}

function areaContains(area, x, y) {
  for (const part of area.parts) {
    const b = part.box;
    if (x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) continue;
    if (!ringContains(part.rings[0], x, y)) continue;
    let inHole = false;
    for (let h = 1; h < part.rings.length; h++) {
      if (ringContains(part.rings[h], x, y)) { inHole = true; break; }
    }
    if (!inHole) return true;
  }
  return false;
}

// Distância (ao quadrado, em graus com correção de longitude) do ponto à borda da área
function areaDistance(area, x, y) {
  const k = Math.cos(y * Math.PI / 180);
  let best = Infinity;
  for (const part of area.parts) {
    for (const ring of part.rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const ax = ring[j][0] * k, ay = ring[j][1], bx = ring[i][0] * k, by = ring[i][1];
        const px = x * k, py = y;
        const dx = bx - ax, dy = by - ay;
        let t = (dx || dy) ? ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy) : 0;
        t = Math.max(0, Math.min(1, t));
        const ex = ax + t * dx - px, ey = ay + t * dy - py;
        const d = ex * ex + ey * ey;
        if (d < best) best = d;
      }
    }
  }
  return best;
}

function locate(areas, x, y, stats) {
  const hits = areas.filter(a => areaContains(a, x, y));
  if (hits.length >= 1) {
    if (hits.length > 1) stats.overlap++;
    stats.inside++;
    return hits[0].key;
  }
  let best = null, bestD = Infinity;
  for (const a of areas) {
    const d = areaDistance(a, x, y);
    if (d < bestD) { bestD = d; best = a.key; }
  }
  stats.nearest++;
  return best;
}

// ---------- Leitura de arquivos ----------

async function readZipJson(zipPath, jsonName) {
  if (!fs.existsSync(zipPath)) return null;
  const reader = await unzipit.unzip(new Uint8Array(fs.readFileSync(zipPath)));
  let entry = reader.entries[jsonName];
  if (!entry) {
    const lower = jsonName.toLowerCase();
    for (const k in reader.entries) if (k.toLowerCase() === lower) { entry = reader.entries[k]; break; }
  }
  return entry ? JSON.parse(await entry.text()) : null;
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function locKeyFromResult(locKey) {
  const parts = locKey.split('_');
  if (parts.length < 3) return null;
  const [zone, tse, locvot] = parts.slice(-3);
  return `${parseInt(zone)}_${parseInt(tse)}_${parseInt(locvot)}`;
}

// Soma um voteMap (candidato -> votos) no mapa da área, com chaves padronizadas
function addVotes(target, voteMap, candNames, isMajoritarian) {
  for (const [candId, val] of Object.entries(voteMap)) {
    const votes = parseInt(val) || 0;
    if (votes <= 0) continue;
    if (candId === '95' || candId === '96') {
      const label = candId === '95' ? 'VOTOS_BRANCOS' : 'VOTOS_NULOS';
      target[label] = (target[label] || 0) + votes;
      continue;
    }
    const raw = rawPartyOf(candId, candNames, YEAR, isMajoritarian);
    const std = raw ? getStandardFederationKey(raw, YEAR) : candId;
    target[std] = (target[std] || 0) + votes;
    target.TOTAL_VOTOS_VALIDOS = (target.TOTAL_VOTOS_VALIDOS || 0) + votes;
  }
}

// ---------- Execução ----------

async function run() {
  const zipIndex = readJson(path.join(DATA, 'zip_index.json'));

  // Circuitos semilocais (uma vez só)
  const semilocalAreas = {};
  for (const f of readJson(path.join(DATA, 'semilocal_circuitos_hires.geojson')).features) {
    const est = f.properties.estado;
    (semilocalAreas[est] = semilocalAreas[est] || []).push(prepareArea(f.properties.sub_name, f.geometry));
  }

  const elections = [
    { key: `deputado_${YEAR}`, zip: `Legislativas ${YEAR}/deputados_federal_${YEAR}_UF.zip`, json: `deputados_federal_${YEAR}_UF.json`, maj: false, targets: ['distritos', 'misto', 'semilocal'] },
    { key: `presidente_${YEAR}`, zip: `Majoritarias ${YEAR}/presidente_${YEAR}_t1_UF.zip`, json: `presidente_${YEAR}_t1_UF.json`, maj: true, targets: ['distritosProps', 'munis', 'misto', 'semilocal'] },
    { key: `estadual_${YEAR}`, zip: `Legislativas ${YEAR}/deputados_estadual_${YEAR}_UF.zip`, json: `deputados_estadual_${YEAR}_UF.json`, maj: false, targets: ['semilocal'] },
    { key: `governador_${YEAR}`, zip: `Majoritarias ${YEAR}/governador_${YEAR}_t1_UF.zip`, json: `governador_${YEAR}_t1_UF.json`, maj: true, targets: ['semilocal'] },
  ];

  // Agregados novos: área -> eleição -> partido -> votos
  const out = { distritos: {}, misto: {}, semilocal: {}, munis: {}, distritosProps: {} };
  const found = new Set();

  for (const uf of Object.keys(UF_TO_CODE)) {
    const t0 = Date.now();
    const geoKey = `locais_votacao_${YEAR}/locais_votacao_${YEAR}_${uf}.geojson`;
    const mapping = zipIndex[geoKey];
    if (!mapping) { console.log(`${uf}: sem locais de votação ${YEAR}`); continue; }
    const locGeo = await readZipJson(path.join(DATA, mapping.zip), mapping.file);

    const distAreas = readJson(path.join(DATA, 'distritos', `distritos_simulados_${uf}.geojson`)).features
      .map(f => prepareArea(String(f.properties.fid), f.geometry));
    const mistoAreas = readJson(path.join(DATA, 'distritos_misto', `distritos_misto_${uf}.geojson`)).features
      .map(f => prepareArea(String(f.properties.fid), f.geometry));
    const semiAreas = semilocalAreas[UF_NAMES[uf]] || [];

    // IBGE -> nome do município (o detalhe municipal casa com NM_MUN no simulador)
    const ibgeToName = {};
    for (const f of readJson(path.join(DATA, 'municipios', `municipios_${uf}.geojson`)).features) {
      ibgeToName[String(f.properties.CD_MUN)] = f.properties.NM_MUN;
    }

    // Local de votação -> área de cada sistema
    const stats = { distritos: { inside: 0, nearest: 0, overlap: 0 }, misto: { inside: 0, nearest: 0, overlap: 0 }, semilocal: { inside: 0, nearest: 0, overlap: 0 } };
    const locMap = {};
    for (const feat of locGeo.features) {
      const p = feat.properties;
      const tse = p.cd_localidade_tse || p.CD_MUNICIPIO;
      const zone = p.NR_ZONA || p.nr_zona;
      const locvot = p.nr_locvot;
      if (!tse || !zone || !locvot) continue;
      const [x, y] = feat.geometry.coordinates;
      const ibge = p.cod_localidade_ibge ? String(p.cod_localidade_ibge) : null;
      locMap[`${parseInt(zone)}_${parseInt(tse)}_${parseInt(locvot)}`] = {
        distritos: distAreas.length ? locate(distAreas, x, y, stats.distritos) : null,
        misto: mistoAreas.length ? locate(mistoAreas, x, y, stats.misto) : null,
        semilocal: semiAreas.length ? locate(semiAreas, x, y, stats.semilocal) : null,
        muni: normalizeMuniName((ibge && ibgeToName[ibge]) || p.nm_localidade),
        eleitores: parseInt(p.qt_eleitores) || 0,
      };
    }

    // Eleitores aptos por distrito uninominal (para Abstenções/Eleitores_Aptos)
    const aptosPorDistrito = {};
    for (const loc of Object.values(locMap)) {
      if (loc.distritos !== null) aptosPorDistrito[loc.distritos] = (aptosPorDistrito[loc.distritos] || 0) + loc.eleitores;
    }

    const loaded = [];
    let unmatchedVotes = 0;
    for (const el of elections) {
      const res = await readZipJson(path.join(DATA, el.zip.replace('UF', uf)), el.json.replace('UF', uf));
      if (!res) continue;
      found.add(el.key);
      loaded.push(el.key.split('_')[0]);
      const candNames = (res.METADATA && res.METADATA.cand_names) || {};

      for (const [rawKey, voteMap] of Object.entries(res.RESULTS || {})) {
        const lk = locKeyFromResult(rawKey);
        const loc = lk ? locMap[lk] : null;
        if (!loc) {
          unmatchedVotes += Object.values(voteMap).reduce((s, v) => s + (parseInt(v) || 0), 0);
          continue;
        }
        for (const target of el.targets) {
          if (target === 'munis') {
            if (loc.distritos === null) continue;
            const byFid = out.munis[loc.distritos] = out.munis[loc.distritos] || {};
            const byEl = byFid[el.key] = byFid[el.key] || {};
            addVotes(byEl[loc.muni] = byEl[loc.muni] || {}, voteMap, candNames, el.maj);
          } else if (target === 'distritosProps') {
            if (loc.distritos === null) continue;
            const acc = out.distritosProps[loc.distritos] = out.distritosProps[loc.distritos] || { parties: {}, brancos: 0, nulos: 0 };
            for (const [candId, val] of Object.entries(voteMap)) {
              const votes = parseInt(val) || 0;
              if (votes <= 0) continue;
              if (candId === '95') acc.brancos += votes;
              else if (candId === '96') acc.nulos += votes;
              else {
                // Nome do partido como na urna (PT, PL, MISSÃO...), igual às colunas dos anos anteriores
                const raw = String(rawPartyOf(candId, candNames, YEAR, true) || candId).toUpperCase().trim();
                acc.parties[raw] = (acc.parties[raw] || 0) + votes;
              }
            }
          } else {
            const areaKey = loc[target];
            if (areaKey === null) continue;
            const byArea = out[target][areaKey] = out[target][areaKey] || {};
            addVotes(byArea[el.key] = byArea[el.key] || {}, voteMap, candNames, el.maj);
          }
        }
      }
    }

    for (const fid of Object.keys(out.distritosProps)) {
      if (aptosPorDistrito[fid] !== undefined) out.distritosProps[fid].aptos = aptosPorDistrito[fid];
    }

    const s = stats;
    console.log(`${uf}: ${Object.keys(locMap).length} locais | dist ${s.distritos.inside}+${s.distritos.nearest}prox | misto ${s.misto.inside}+${s.misto.nearest}prox | semi ${s.semilocal.inside}+${s.semilocal.nearest}prox | ${loaded.join(',') || 'sem resultados'}${unmatchedVotes ? ` | ${unmatchedVotes} votos sem local` : ''} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }

  console.log(`\nEleições ${YEAR} encontradas: ${[...found].join(', ') || 'nenhuma'}`);

  // Propriedades presidenciais por distrito, no formato das colunas dos anos anteriores
  const suffix = `_${YEAR}_1T`;
  const propsByFid = {};
  for (const [fid, acc] of Object.entries(out.distritosProps)) {
    const props = {};
    const sorted = Object.entries(acc.parties).sort((a, b) => b[1] - a[1]);
    let valid = 0;
    for (const [party, votes] of Object.entries(acc.parties)) { props[`${party}${suffix}`] = votes; valid += votes; }
    const comparecimento = valid + acc.brancos + acc.nulos;
    const aptos = Math.max(acc.aptos || 0, comparecimento);
    props[`Total_Votos_Validos${suffix}`] = valid;
    props[`Votos_Brancos${suffix}`] = acc.brancos;
    props[`Votos_Nulos${suffix}`] = acc.nulos;
    props[`Abstenções${suffix}`] = aptos - comparecimento;
    props[`Eleitores_Aptos${suffix}`] = aptos;
    props[`MARGEM${suffix}`] = valid > 0 ? ((sorted[0] ? sorted[0][1] : 0) - (sorted[1] ? sorted[1][1] : 0)) / valid * 100 : 0;
    props[`VENCEDOR${suffix}`] = sorted[0] ? sorted[0][0] : null;
    propsByFid[fid] = props;
  }

  if (CHECK_DIR) {
    fs.mkdirSync(CHECK_DIR, { recursive: true });
    const dump = { distritos_votos: out.distritos, distritos_misto_votos: out.misto, semilocal_votos: out.semilocal, distritos_detalhe_munis: out.munis, distritos_props: propsByFid };
    for (const [name, data] of Object.entries(dump)) fs.writeFileSync(path.join(CHECK_DIR, `${name}_${YEAR}.json`), JSON.stringify(data));
    console.log(`Agregados gravados em ${CHECK_DIR} (nenhum arquivo do simulador foi alterado)`);
    return;
  }

  // Acrescenta as chaves do ano aos arquivos existentes (mantendo a ordem e o formato)
  const merge = (file, agg) => {
    const full = path.join(DATA, file);
    const data = readJson(full);
    let touched = 0;
    for (const areaKey of Object.keys(data)) {
      const add = agg[areaKey];
      if (!add) continue;
      for (const [elKey, votes] of Object.entries(add)) { data[areaKey][elKey] = votes; touched++; }
    }
    const missing = Object.keys(agg).filter(k => !(k in data));
    if (missing.length) console.warn(`  ${file}: áreas sem correspondência ignoradas: ${missing.join(', ')}`);
    fs.writeFileSync(full, JSON.stringify(data));
    console.log(`  ${file}: ${touched} entradas de ${YEAR} gravadas`);
  };

  if (found.has(`deputado_${YEAR}`)) merge('distritos_votos.json', out.distritos);
  merge('distritos_misto_votos.json', out.misto);
  merge('semilocal_votos.json', out.semilocal);
  if (found.has(`presidente_${YEAR}`)) merge('distritos_detalhe_munis.json', out.munis);

  if (found.has(`presidente_${YEAR}`)) {
    let written = 0;
    for (const uf of Object.keys(UF_TO_CODE)) {
      const file = path.join(DATA, 'distritos', `distritos_simulados_${uf}.geojson`);
      const fc = readJson(file);
      for (const f of fc.features) {
        const p = f.properties;
        for (const k of Object.keys(p)) if (k.endsWith(suffix)) delete p[k]; // reexecução idempotente
        const add = propsByFid[String(p.fid)];
        if (add) { Object.assign(p, add); written++; }
      }
      fs.writeFileSync(file, JSON.stringify(fc));
    }
    console.log(`  distritos/*.geojson: propriedades${suffix} gravadas em ${written} distritos`);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
