// =========================================================
// SIMULADOR PARLAMENTAR BRASIL 2022 — Standalone
// =========================================================

const DATA_BASE_URL = 'resultados_geo/';

// Populations Censo 2000, 2010, 2022 (IBGE)
const CENSUS_POPULATIONS = {
  2000: {
    "AC": 557526, "AL": 2822621, "AM": 2812557, "AP": 477032, "BA": 13070250,
    "CE": 7430661, "DF": 2051999, "ES": 3097232, "GO": 5003228, "MA": 5651475,
    "MG": 17891494, "MS": 2078001, "MT": 2504353, "PA": 6192307, "PB": 3443825,
    "PE": 7918808, "PI": 2843428, "PR": 9563458, "RJ": 14391282, "RN": 2777509,
    "RS": 10187798, "RO": 1379787, "RR": 324397, "SC": 5357242, "SP": 37032403,
    "SE": 1784474, "TO": 1157098
  },
  2010: {
    "AC": 733559, "AL": 3120494, "AM": 3483985, "AP": 669526, "BA": 14016906,
    "CE": 8452381, "DF": 2570160, "ES": 3514952, "GO": 6003788, "MA": 6574789,
    "MG": 19597330, "MS": 2449024, "MT": 3035122, "PA": 7581051, "PB": 3766524,
    "PE": 8796448, "PI": 3118360, "PR": 10444526, "RJ": 15989929, "RN": 3168027,
    "RS": 10693929, "RO": 1562409, "RR": 450479, "SC": 6248436, "SP": 41262199,
    "SE": 2068017, "TO": 1383445
  },
  2022: {
    "AC": 830018, "AL": 3127683, "AM": 3941613, "AP": 733759, "BA": 14141626,
    "CE": 8794957, "DF": 2817381, "ES": 3833712, "GO": 7056495, "MA": 6775561,
    "MG": 20539989, "MS": 2757013, "MT": 3658649, "PA": 8120131, "PB": 3974687,
    "PE": 9058931, "PI": 3273227, "PR": 11444380, "RJ": 16055174, "RN": 3302729,
    "RS": 10882965, "RO": 1581196, "RR": 636707, "SC": 7610361, "SP": 44411238,
    "SE": 2211868, "TO": 1511460
  }
};

let currentYear = 2022;
let circuitosPopData = [];
let currentElectionLevel = 'nacional'; // 'nacional' or 'estadual'
let currentElectionState = 'SP'; // UF for state-level election
let estadualTotals = null; // Holds deputado estadual data for state-level elections

// Assembly seats — current real distribution
const ASSEMBLY_SEATS_REAL = {
  "SP": 94, "MG": 77, "RJ": 70, "BA": 63, "PR": 54, "RS": 55,
  "PE": 49, "CE": 46, "PA": 41, "SC": 40, "GO": 41, "MA": 42,
  "PB": 36, "AM": 24, "ES": 30, "MT": 24, "RN": 24, "PI": 30,
  "AL": 27, "DF": 24, "MS": 24, "SE": 24, "RO": 24, "TO": 24,
  "AC": 24, "AP": 24, "RR": 24
};

// Assembly seats — Alternative 1 (from user images)
const ASSEMBLY_SEATS_ALT1 = {
  "SP": 165, "MG": 95, "RJ": 81, "BA": 77, "PR": 69, "RS": 67,
  "PE": 63, "CE": 61, "PA": 59, "SC": 57, "GO": 55, "MA": 55,
  "PB": 47, "AM": 43, "ES": 43, "MT": 41, "RN": 39, "PI": 35,
  "AL": 35, "DF": 33, "MS": 31, "SE": 29, "RO": 28, "TO": 27,
  "AC": 25, "AP": 25, "RR": 25
};

// Assembly seats — Alternative 2 (from user images)
const ASSEMBLY_SEATS_ALT2 = {
  "SP": 315, "MG": 177, "RJ": 147, "BA": 129, "PR": 111, "RS": 105,
  "PE": 93, "CE": 87, "PA": 87, "SC": 81, "GO": 75, "MA": 75,
  "PB": 51, "AM": 51, "ES": 51, "MT": 51, "RN": 45, "PI": 45,
  "AL": 45, "DF": 45, "MS": 45, "SE": 39, "RO": 33, "TO": 33,
  "AC": 33, "AP": 33, "RR": 33
};

// Pactômetro globals
let pactChamberTotalSeats = 0;
let pactChamberAllocations = {};

function getActivePopulations() {
  if (currentYear === 2006 || currentYear === 2010) {
    return CENSUS_POPULATIONS[2000];
  }
  if (currentYear === 2014 || currentYear === 2018) {
    return CENSUS_POPULATIONS[2010];
  }
  return CENSUS_POPULATIONS[2022];
}

// Real/Current Seats Allocation (floor 8, ceiling 70, total 513)
const REAL_SEATS = {
  "AC": 8, "AL": 9, "AP": 8, "AM": 8, "BA": 39, "CE": 22, "DF": 8, "ES": 10,
  "GO": 17, "MA": 18, "MT": 8, "MS": 8, "MG": 53, "PA": 17, "PB": 12, "PR": 30,
  "PE": 25, "PI": 10, "RJ": 46, "RN": 8, "RS": 31, "RO": 8, "RR": 8, "SC": 16,
  "SP": 70, "SE": 8, "TO": 8
};

// State names mapping
const UF_NAMES = {
  "AC": "Acre", "AL": "Alagoas", "AM": "Amazonas", "AP": "Amapá", "BA": "Bahia",
  "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo", "GO": "Goiás",
  "MA": "Maranhão", "MG": "Minas Gerais", "MS": "Mato Grosso do Sul", "MT": "Mato Grosso",
  "PA": "Pará", "PB": "Paraíba", "PE": "Pernambuco", "PI": "Piauí", "PR": "Paraná",
  "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte", "RO": "Rondônia", "RR": "Roraima",
  "RS": "Rio Grande do Sul", "SC": "Santa Catarina", "SP": "São Paulo", "SE": "Sergipe",
  "TO": "Tocantins"
};

// Brazilian regions mapping (Norte, Nordeste, Centro-Oeste, Sudeste, Sul)
const REGION_STATES = {
  "Norte": ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
  "Nordeste": ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
  "Centro-Oeste": ["DF", "GO", "MT", "MS"],
  "Sudeste": ["ES", "MG", "RJ", "SP"],
  "Sul": ["PR", "RS", "SC"]
};

// Degressive Senate seats mapping
const DEGRESSIVE_SEATS = {
  "SP": 17, "MG": 12, "RJ": 10, "BA": 9, "PR": 7, "RS": 7,
  "PE": 6, "CE": 6, "PA": 6, "SC": 5, "GO": 5, "MA": 5,
  "PB": 3, "AM": 3, "ES": 3, "MT": 3, "RN": 3, "PI": 3,
  "AL": 3, "DF": 3, "MS": 3, "SE": 3, "RO": 2, "TO": 2,
  "AC": 2, "AP": 2, "RR": 2
};

const SENADO_SVG_STATE_MAPPING = {
  "path44": "RO", "path46": "AC", "path48": "AM", "path50": "RR", "path52": "AP",
  "path54": "TO", "path56": "MT", "path58": "GO", "path60": "MS", "path62": "MG",
  "path64": "PR", "path66": "RS", "path68": "BA", "path70": "PI", "path72": "CE",
  "path74": "RN", "path76": "AL", "path78": "SE", "path80": "DF", "path82": "PE",
  "path84": "MA", "path86": "PA", "path88": "SP", "path90": "RJ", "path92": "ES",
  "path94": "SC", "path96": "PB"
};

const SENADO_SVG_REGION_MAPPING = {
  "path44-6": "Norte",
  "path56-0": "Centro-Oeste",
  "path62-8": "Sudeste",
  "path64-6": "Sul",
  "path68-0": "Nordeste"
};

const SENADO_SVG_STATE_CIRCLES = {
  "AC": "g1-8", "AL": "g1-12", "AM": "g1-1", "AP": "g1-0", "BA": "g1-43",
  "CE": "g1-33", "DF": "g1-08", "ES": "g1-37", "GO": "g1-01", "MA": "g1-00",
  "MG": "g1-96", "MS": "g1-9", "MT": "g1-61", "PA": "g1-3", "PB": "g1-80",
  "PE": "g1-4", "PI": "g1-7", "PR": "g1-74", "RJ": "g1-68", "RN": "g1-2",
  "RO": "g1-6", "RR": "g1", "RS": "g1-22", "SC": "g1-068", "SE": "g1-06",
  "SP": "g1-92", "TO": "g1-5"
};

const SENADO_SVG_REGION_CIRCLES = {
  "Norte": "g4",
  "Nordeste": "g1-61-8",
  "Centro-Oeste": "g3",
  "Sudeste": "g2",
  "Sul": "g5"
};

const STATE_CIRCLE_CONFIGS = {
  "AC": { center: [-9.0, -70.0] },
  "AL": { center: [-9.6, -36.5], label: [-9.6, -33.5] },
  "AP": { center: [1.4, -51.5] },
  "AM": { center: [-4.0, -64.0] },
  "BA": { center: [-12.2, -41.5] },
  "CE": { center: [-5.2, -39.5] },
  "DF": { center: [-15.78, -47.88], label: [-14.5, -45.5] },
  "ES": { center: [-19.5, -40.3], label: [-19.5, -37.5] },
  "GO": { center: [-15.8, -49.6] },
  "MA": { center: [-5.5, -45.2] },
  "MT": { center: [-12.6, -55.8] },
  "MS": { center: [-20.5, -54.8] },
  "MG": { center: [-18.5, -44.3] },
  "PA": { center: [-4.0, -53.0] },
  "PB": { center: [-7.2, -36.0], label: [-6.0, -32.5] },
  "PR": { center: [-24.8, -51.5] },
  "PE": { center: [-8.3, -37.8], label: [-8.0, -32.2] },
  "PI": { center: [-7.5, -42.5] },
  "RJ": { center: [-22.3, -42.8], label: [-22.8, -39.0] },
  "RN": { center: [-5.8, -36.5], label: [-4.0, -33.5] },
  "RS": { center: [-30.0, -53.5] },
  "RO": { center: [-11.2, -62.5] },
  "RR": { center: [2.0, -61.3] },
  "SC": { center: [-27.2, -50.5], label: [-28.5, -47.0] },
  "SP": { center: [-22.3, -49.0] },
  "SE": { center: [-10.6, -37.0], label: [-11.2, -34.5] },
  "TO": { center: [-10.2, -48.3] }
};

const SUBREGION_CENTER_OVERRIDES = {
  "Rondônia-1": [-10.91285, -62.8417],
  "Acre-1": [-9.21282, -70.47332],
  "Amazonas-1": [-3.89612, -66.64051],
  "Amazonas-2": [-4.82288, -59.91845],
  "Amazonas-3": [-2.62606, -60.25952],
  "Roraima-1": [2.08245, -61.39181],
  "Pará-1": [-3.59576, -55.12711],
  "Pará-2": [-1.70094, -50.05507],
  "Pará-3": [-6.64069, -50.75721],
  "Pará-4": [-2.41541, -47.49095],
  "Pará-5": [-1.30058, -48.40228],
  "Amapá-1": [1.4609, -51.97726],
  "Tocantins-1": [-10.14795, -48.33141],
  "Maranhão-1": [-6.62087, -46.21729],
  "Maranhão-2": [-5.08921, -44.10154],
  "Maranhão-3": [-2.90747, -44.03407],
  "Maranhão-4": [-3.03437, -44.88016],
  "Piauí-1": [-4.11017, -42.06064],
  "Piauí-2": [-7.87845, -43.10535],
  "Ceará-1": [-5.00792, -38.86915],
  "Ceará-2": [-6.26187, -39.87468],
  "Ceará-3": [-3.71572, -40.38354],
  "Ceará-4": [-4.00417, -38.59303],
  "Ceará-5": [-3.78562, -38.52792],
  "Rio Grande do Norte-1": [-5.79711, -37.06741],
  "Rio Grande do Norte-2": [-5.95283, -35.62897],
  "Paraíba-1": [-6.95412, -35.87416],
  "Paraíba-2": [-7.18947, -37.43586],
  "Paraíba-3": [-7.05571, -35.1275],
  "Pernambuco-1": [-8.1577, -35.89542],
  "Pernambuco-2": [-7.68541, -35.1506],
  "Pernambuco-3": [-8.30007, -39.49477],
  "Pernambuco-4": [-8.48906, -37.0934],
  "Pernambuco-5": [-8.51722, -35.34378],
  "Pernambuco-6": [-8.05, -34.90],
  "Alagoas-1": [-9.37273, -35.75982],
  "Alagoas-2": [-9.55834, -36.90172],
  "Sergipe-1": [-10.58331, -37.44425],
  "Bahia-1": [-12.2589, -43.99006],
  "Bahia-2": [-14.41784, -41.76167],
  "Bahia-3": [-10.06407, -40.41188],
  "Bahia-4": [-16.26676, -39.60414],
  "Bahia-5": [-13.1922, -40.0745],
  "Bahia-6": [-11.7925, -39.51433],
  "Bahia-7": [-11.97956, -38.19884],
  "Bahia-8": [-12.90631, -38.44304],
  "Minas Gerais-1": [-17.36912, -46.17372],
  "Minas Gerais-2": [-19.33915, -48.96892],
  "Minas Gerais-3": [-19.46285, -42.09769],
  "Minas Gerais-4": [-21.46844, -45.86437],
  "Minas Gerais-5": [-19.64787, -43.98566],
  "Minas Gerais-6": [-21.0969, -43.40922],
  "Minas Gerais-7": [-19.8189, -45.24495],
  "Minas Gerais-8": [-20.07175, -44.14304],
  "Minas Gerais-9": [-16.17961, -42.35216],
  "Minas Gerais-10": [-19.90263, -43.96001],
  "Minas Gerais-11": [-17.64981, -43.64311],
  "Espírito Santo-1": [-19.5065, -40.68188],
  "Espírito Santo-2": [-20.42055, -40.53626],
  "Rio de Janeiro-1": [-22.679, -43.42778],
  "Rio de Janeiro-2": [-22.6819, -42.83371],
  "Rio de Janeiro-3": [-22.85348, -43.3198],
  "Rio de Janeiro-4": [-22.58377, -44.05213],
  "Rio de Janeiro-5": [-21.80033, -42.40969],
  "Rio de Janeiro-6": [-22.02192, -41.72731],
  "Rio de Janeiro-7": [-22.94258, -43.52947],
  "Rio de Janeiro-8": [-22.94446, -43.22789],
  "São Paulo-1": [-23.55483, -46.47393],
  "São Paulo-2": [-23.06997, -45.30936],
  "São Paulo-3": [-24.45387, -47.68332],
  "São Paulo-4": [-23.53133, -47.55762],
  "São Paulo-5": [-23.82738, -46.71075],
  "São Paulo-6": [-23.75608, -46.49184],
  "São Paulo-7": [-23.81894, -46.95028],
  "São Paulo-8": [-23.39166, -46.78278],
  "São Paulo-9": [-20.67074, -48.98927],
  "São Paulo-10": [-23.45402, -46.67416],
  "São Paulo-11": [-21.4498, -51.10638],
  "São Paulo-12": [-23.58575, -46.67532],
  "São Paulo-13": [-22.94463, -47.06788],
  "São Paulo-14": [-22.32737, -49.73226],
  "São Paulo-15": [-21.92437, -48.25252],
  "São Paulo-16": [-21.02188, -47.68051],
  "São Paulo-17": [-23.58366, -48.74683],
  "São Paulo-18": [-22.22565, -46.79714],
  "São Paulo-19": [-22.55981, -47.61679],
  "São Paulo-20": [-23.50217, -46.16227],
  "Paraná-1": [-23.60957, -52.76818],
  "Paraná-2": [-25.57795, -52.23788],
  "Paraná-3": [-24.99741, -50.52589],
  "Paraná-4": [-23.41834, -50.7536],
  "Paraná-5": [-24.90728, -53.6779],
  "Paraná-6": [-25.47771, -49.28811],
  "Paraná-7": [-25.34956, -48.99969],
  "Santa Catarina-1": [-27.25134, -51.4023],
  "Santa Catarina-2": [-28.27488, -49.20194],
  "Santa Catarina-3": [-26.7174, -49.59371],
  "Rio Grande do Sul-1": [-29.67425, -52.66387],
  "Rio Grande do Sul-2": [-28.08888, -53.4114],
  "Rio Grande do Sul-3": [-29.05292, -50.94499],
  "Rio Grande do Sul-4": [-30.54245, -54.30602],
  "Rio Grande do Sul-5": [-30.14543, -50.94346],
  "Rio Grande do Sul-6": [-29.76083, -51.16194],
  "Mato Grosso do Sul-1": [-20.5915, -56.12203],
  "Mato Grosso do Sul-2": [-20.03922, -53.51633],
  "Mato Grosso-1": [-12.9885, -53.24875],
  "Mato Grosso-2": [-12.31066, -58.11866],
  "Mato Grosso-3": [-16.51435, -56.79216],
  "Goiás-1": [-17.55446, -51.04001],
  "Goiás-2": [-16.99859, -48.13773],
  "Goiás-3": [-14.57076, -48.86865],
  "Goiás-4": [-16.68951, -49.27091],
  "Distrito Federal-1": [-15.7811, -47.79632],
};

// ── Inset map groups ──────────────────────────────────────────────────────────
// Each group: districts[] = sub_names shown; contains[] = nested sub-group IDs;
// nestedIn = parent group ID or null; pos = CSS position within #map or parent;
// size = { w, h } in pixels.
// tgtLat/tgtLng: target centre in geographic space (in the ocean/empty area)
// targetWidthDeg: width of the inset in degrees longitude (controls zoom level)
// contains: child group IDs whose districts appear as dark/dashed areas inside this inset
const INSET_GROUPS = {
  'belem': {
    label: 'Belém',
    districts: ['Pará-5'],
    contains: [],
    tgtLat: 2.3285, tgtLng: -45.791, scale: 8
  },
  'brasilia': {
    label: 'Brasília',
    districts: ['Distrito Federal-1'],
    contains: [],
    tgtLat: -16.5941, tgtLng: -64.5557, scale: 5.1
  },
  'goiania': {
    label: 'Goiânia',
    districts: ['Goiás-4'],
    contains: [],
    tgtLat: -19.7667, tgtLng: -60.2271, scale: 6
  },
  'fortaleza': {
    label: 'Fortaleza',
    districts: ['Ceará-5'],
    contains: [],
    tgtLat: 0, tgtLng: -39.8145, scale: 10.4
  },
  'rm-recife': {
    label: 'RM Recife',
    districts: ['Pernambuco-5', 'Pernambuco-6', 'Pernambuco-2'],
    contains: ['recife'],
    tgtLat: -9.3624, tgtLng: -33.0469, scale: 3.6
  },
  'recife': {
    label: 'Recife',
    districts: ['Pernambuco-6'],
    contains: [],
    tgtLat: -2.8992, tgtLng: -34.1895, scale: 11.6
  },
  'salvador': {
    label: 'Salvador',
    districts: ['Bahia-8'],
    contains: [],
    tgtLat: -14.5623, tgtLng: -35.6396, scale: 10.8
  },
  'rmbh': {
    label: 'RM Belo Horizonte',
    districts: ['Minas Gerais-5', 'Minas Gerais-8', 'Minas Gerais-10'],
    contains: ['belo-horizonte'],
    tgtLat: -21.1255, tgtLng: -33.2666, scale: 3.5
  },
  'belo-horizonte': {
    label: 'Belo Horizonte',
    districts: ['Minas Gerais-10'],
    contains: [],
    tgtLat: -19.3941, tgtLng: -37.3975, scale: 8.8
  },
  'megalopole': {
    label: 'Megalópole Rio–SP',
    districts: [
      'São Paulo-10', 'São Paulo-1', 'São Paulo-12', 'São Paulo-5',
      'São Paulo-7', 'São Paulo-8', 'São Paulo-6', 'São Paulo-20',
      'São Paulo-3', 'São Paulo-4', 'São Paulo-13', 'São Paulo-18', 'São Paulo-19', 'São Paulo-2',
      'Rio de Janeiro-1', 'Rio de Janeiro-2', 'Rio de Janeiro-3',
      'Rio de Janeiro-4', 'Rio de Janeiro-5', 'Rio de Janeiro-6',
      'Rio de Janeiro-7', 'Rio de Janeiro-8'
    ],
    contains: ['rmsp', 'rmrj'],
    tgtLat: -28.3431, tgtLng: -38.9795, scale: 2.3
  },
  'rmsp': {
    label: 'RM São Paulo',
    districts: ['São Paulo-10', 'São Paulo-1', 'São Paulo-12', 'São Paulo-5',
                 'São Paulo-8', 'São Paulo-7', 'São Paulo-6', 'São Paulo-20'],
    contains: ['cidade-sp'],
    tgtLat: -24.4471, tgtLng: -38.4082, scale: 5.1
  },
  'cidade-sp': {
    label: 'Cidade de SP',
    districts: ['São Paulo-10', 'São Paulo-1', 'São Paulo-12', 'São Paulo-5'],
    contains: [],
    tgtLat: -33.8339, tgtLng: -39.5068, scale: 11.3
  },
  'rmrj': {
    label: 'RM Rio de Janeiro',
    districts: ['Rio de Janeiro-1', 'Rio de Janeiro-2', 'Rio de Janeiro-3',
                 'Rio de Janeiro-7', 'Rio de Janeiro-8'],
    contains: [],
    tgtLat: -30.5623, tgtLng: -30.6738, scale: 7
  },
  'curitiba': {
    label: 'Curitiba',
    districts: ['Paraná-6'],
    contains: [],
    tgtLat: -25.3242, tgtLng: -57.5244, scale: 8
  },
  'grande-porto-alegre': {
    label: 'Grande Porto Alegre',
    districts: ['Rio Grande do Sul-5', 'Rio Grande do Sul-6'],
    contains: [],
    tgtLat: -29.6881, tgtLng: -61.4795, scale: 4.3
  }
};

// Set of all group IDs whose districts appear as nested inside a parent group
const _INSET_CHILD_IDS = new Set(
  Object.values(INSET_GROUPS).flatMap(g => g.contains)
);

let insetsGeoJSONCache = null;
let insetOutlineLayers = [];
let insetMapLayers = [];

// Static geometry caches for performance optimization
let semilocalInsetsMainMapOutlinesGeoJSON = null;
let semilocalInsetsUnionsGeoJSON = null;
const cachedTransformedFeatures = {};
const cachedTransformFns = {};
const cachedInsetOuterUnions = {};
const cachedInsetChildUnions = {};

function populateUnionCaches() {
  if (!semilocalInsetsUnionsGeoJSON) return;
  semilocalInsetsUnionsGeoJSON.features.forEach(f => {
    const props = f.properties;
    if (props.type === 'outer') {
      cachedInsetOuterUnions[props.groupId] = f;
    } else if (props.type === 'child') {
      const key = props.parentGroupId + '_' + props.childGroupId;
      cachedInsetChildUnions[key] = f;
    }
  });
}

// Color palettes for parties
const PARTY_COLORS = {
  "PT": "#ff3859",
  "PL": "#304091",
  "PP": "#6391d4",
  "MDB": "#16a250",
  "PSD": "#eb8100",
  "PSDB": "#0097fd",
  "PSOL": "#e95dd2",
  "PSL": "#5dca53",
  "PPB": "#6391d4",
  "REPUBLICANOS": "#1f646b",
  "UNIÃO": "#2eccff",
  "UNIAO": "#2eccff",
  "PDT": "#ffad99",
  "PSB": "#edd355",
  "NOVO": "#ff6600",
  "PC DO B": "#b4251d",
  "PC_DO_B": "#b4251d",
  "PCDOB": "#b4251d",
  "PV": "#1f9439",
  "CIDADANIA": "#ec5fa6",
  "REDE": "#7dd1d9",
  "AVANTE": "#36aeba",
  "PATRIOTA": "#5fa72f",
  "PATRI": "#5fa72f",
  "SOLIDARIEDADE": "#ff633d",
  "SD": "#ff633d",
  "PROS": "#e6661e",
  "PTB": "#71def4",
  "PODE": "#23a840",
  "PODEMOS": "#23a840",
  "PSC": "#2f8e4f",
  "DC": "#809eff",
  "PMN": "#ff3333",
  "MOBILIZA": "#DD3333",
  "AGIR": "#254d88",
  "UP": "#5e5e5e",
  "PCO": "#8e3d10",
  "PSTU": "#620411",
  "PRTB": "#1a7e2f",
  "PMB": "#384ba8",
  "DEM": "#6dbf36",
  "PFL": "#6dbf36",
  "PPS": "#ec5fa6",
  "PR": "#304091",
  "PRB": "#45bdc9",
  "PT DO B": "#2eacb2",
  "PAN": "#ffff00",
  "PASART": "#0000FF",
  "PCB": "#c40823",
  "PDS": "#6391d4",
  "PEN": "#4AA561",
  "PGT": "#006600",
  "PH": "#FF8511",
  "PHS": "#e25850",
  "PJ": "#01369E",
  "PN": "#008000",
  "PPL": "#c6a815",
  "PST": "#9370DB",
  "PTC": "#37c884",
  "PTN": "#23a840",
  "PTR": "#1a7e2f",
  "ARENA": "#4034B2",
  "PMDB": "#16a250",
  "PSP46": "#533e40",
  "MISSÃO": "#FCBD27",
  "MISSAO": "#fdbe21",
  "TOSSUP": "#cbd5e1",
  "PSDC": "#809eff",
  "PRD": "#007c3c",
  "PRONA": "#0f6c36",
  "PRP": "#ffe099",
  "OUTROS": "#7a8699",
  "FE BRASIL": "#ff3859",
  "FE_BRASIL": "#ff3859",
  "PSDB/CIDADANIA": "#0097fd",
  "PSDB_CIDADANIA": "#0097fd",
  "PSOL/REDE": "#e95dd2",
  "PSOL_REDE": "#e95dd2",
  "BRASIL_ESPERANCA": "#ff3859",
  "BRASIL_PARA_TODOS": "#16a250",
  "PELO_BEM_BRASIL": "#304091",
  "POR_UM_BRASIL_DECENTE": "#0097fd",
  "FRENTE_DE_ESQUERDA": "#e95dd2",
  "A_FORCA_DO_POVO": "#ff3859",
  "PARA_O_BRASIL_SEGUIR_MUDANDO": "#ff3859",
  "O_BRASIL_PODE_MAIS": "#0097fd",
  "MUDA_BRASIL": "#0097fd",
  "COM_A_FORCA_DO_POVO": "#ff3859",
  "UNIDOS_PELO_BRASIL": "#edd355",
  "MUDANCA_DE_VERDADE": "#23a840",
  "BRASIL_SOBERANO": "#ffad99",
  "O_POVO_FELIZ_DE_NOVO": "#ff3859",
  "PARA_UNIR_O_BRASIL": "#0097fd",
  "VAMOS_SEM_MEDO_DE_MUDAR_O_BRASIL": "#e95dd2",
  "ESSA_E_A_SOLUCAO": "#16a250",
  "BRASIL_ACIMA_DE_TUDO_DEUS_ACIMA_DE_TODOS": "#5dca53",
  "UNIDOS_PARA_TRANSFORMAR_O_BRASIL": "#7dd1d9"
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

function getPresCoalitionMap() {
  const year = currentYear;
  if (year === 2022) {
    return {
      "FE_BRASIL": "BRASIL_ESPERANCA",
      "PSOL_REDE": "BRASIL_ESPERANCA",
      "PSB": "BRASIL_ESPERANCA",
      "SOLIDARIEDADE": "BRASIL_ESPERANCA",
      "AVANTE": "BRASIL_ESPERANCA",
      "AGIR": "BRASIL_ESPERANCA",
      "PROS": "BRASIL_ESPERANCA",
      "MDB": "BRASIL_PARA_TODOS",
      "PSDB_CIDADANIA": "BRASIL_PARA_TODOS",
      "PODE": "BRASIL_PARA_TODOS",
      "PL": "PELO_BEM_BRASIL",
      "REPUBLICANOS": "PELO_BEM_BRASIL",
      "PP": "PELO_BEM_BRASIL"
    };
  }
  if (year === 2018) {
    return {
      "PODE": "MUDANCA_DE_VERDADE", "PRP": "MUDANCA_DE_VERDADE", "PSC": "MUDANCA_DE_VERDADE", "AGIR": "MUDANCA_DE_VERDADE",
      "PDT": "BRASIL_SOBERANO", "AVANTE": "BRASIL_SOBERANO",
      "PT": "O_POVO_FELIZ_DE_NOVO", "PCDOB": "O_POVO_FELIZ_DE_NOVO", "PROS": "O_POVO_FELIZ_DE_NOVO",
      "PSDB": "PARA_UNIR_O_BRASIL", "PP": "PARA_UNIR_O_BRASIL", "PTB": "PARA_UNIR_O_BRASIL", "PSD": "PARA_UNIR_O_BRASIL", "REPUBLICANOS": "PARA_UNIR_O_BRASIL", "PL": "PARA_UNIR_O_BRASIL", "DEM": "PARA_UNIR_O_BRASIL", "SOLIDARIEDADE": "PARA_UNIR_O_BRASIL", "CIDADANIA": "PARA_UNIR_O_BRASIL",
      "PSOL": "VAMOS_SEM_MEDO_DE_MUDAR_O_BRASIL", "PCB": "VAMOS_SEM_MEDO_DE_MUDAR_O_BRASIL",
      "MDB": "ESSA_E_A_SOLUCAO", "PHS": "ESSA_E_A_SOLUCAO",
      "PSL": "BRASIL_ACIMA_DE_TUDO_DEUS_ACIMA_DE_TODOS", "PRTB": "BRASIL_ACIMA_DE_TUDO_DEUS_ACIMA_DE_TODOS",
      "REDE": "UNIDOS_PARA_TRANSFORMAR_O_BRASIL", "PV": "UNIDOS_PARA_TRANSFORMAR_O_BRASIL"
    };
  }
  if (year === 2014) {
    return {
      "PSDB": "MUDA_BRASIL", "SOLIDARIEDADE": "MUDA_BRASIL", "MOBILIZA": "MUDA_BRASIL", "PATRIOTA": "MUDA_BRASIL", "PODE": "MUDA_BRASIL", "AGIR": "MUDA_BRASIL", "DEM": "MUDA_BRASIL", "AVANTE": "MUDA_BRASIL", "PTB": "MUDA_BRASIL",
      "PT": "COM_A_FORCA_DO_POVO", "MDB": "COM_A_FORCA_DO_POVO", "PSD": "COM_A_FORCA_DO_POVO", "PP": "COM_A_FORCA_DO_POVO", "PL": "COM_A_FORCA_DO_POVO", "PDT": "COM_A_FORCA_DO_POVO", "REPUBLICANOS": "COM_A_FORCA_DO_POVO", "PROS": "COM_A_FORCA_DO_POVO", "PCDOB": "COM_A_FORCA_DO_POVO",
      "PSB": "UNIDOS_PELO_BRASIL", "CIDADANIA": "UNIDOS_PELO_BRASIL", "PSL": "UNIDOS_PELO_BRASIL", "PHS": "UNIDOS_PELO_BRASIL", "PPL": "UNIDOS_PELO_BRASIL", "PRP": "UNIDOS_PELO_BRASIL"
    };
  }
  if (year === 2010) {
    return {
      "PT": "PARA_O_BRASIL_SEGUIR_MUDANDO", "MDB": "PARA_O_BRASIL_SEGUIR_MUDANDO", "PDT": "PARA_O_BRASIL_SEGUIR_MUDANDO", "PCDOB": "PARA_O_BRASIL_SEGUIR_MUDANDO", "PSB": "PARA_O_BRASIL_SEGUIR_MUDANDO", "PL": "PARA_O_BRASIL_SEGUIR_MUDANDO", "REPUBLICANOS": "PARA_O_BRASIL_SEGUIR_MUDANDO", "PSC": "PARA_O_BRASIL_SEGUIR_MUDANDO", "AGIR": "PARA_O_BRASIL_SEGUIR_MUDANDO", "PODE": "PARA_O_BRASIL_SEGUIR_MUDANDO",
      "PSDB": "O_BRASIL_PODE_MAIS", "DEM": "O_BRASIL_PODE_MAIS", "CIDADANIA": "O_BRASIL_PODE_MAIS", "MOBILIZA": "O_BRASIL_PODE_MAIS", "AVANTE": "O_BRASIL_PODE_MAIS", "PTB": "O_BRASIL_PODE_MAIS"
    };
  }
  if (year === 2006) {
    return {
      "PSDB": "POR_UM_BRASIL_DECENTE", "DEM": "POR_UM_BRASIL_DECENTE",
      "PSOL": "FRENTE_DE_ESQUERDA", "PCB": "FRENTE_DE_ESQUERDA", "PSTU": "FRENTE_DE_ESQUERDA",
      "PT": "A_FORCA_DO_POVO", "REPUBLICANOS": "A_FORCA_DO_POVO", "PCDOB": "A_FORCA_DO_POVO"
    };
  }
  return {};
}

// ════════════════════════════════════════════════════════════════════════════
// MapLibre GL JS bridge — app-specific shim that mimics the exact Leaflet call
// signatures this app used, so the rest of the code stays nearly identical.
// Renders polygons as MapLibre source + fill/line layers (colors baked into
// feature properties) and seat circles as DOM markers. Plain gray background,
// no basemap tiles (per design).
// ════════════════════════════════════════════════════════════════════════════

const GRAY = '#0d0e12'; // = --bg / matches #svgMapContainer background

function buildBaseStyle() {
  return {
    version: 8,
    sources: {},
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': GRAY } }]
  };
}

let __glLayerSeq = 0;
let __glPopup = null;
let __glPopupClass = null;
let __glStyleReady = false; // set true once the initial GL style 'load' fires

// Gate for addSource/addLayer. Uses a one-time flag rather than isStyleLoaded(),
// which briefly returns false while geojson sources are still loading mid-render.
function __glMapReady() { return mapObj && __glStyleReady; }

function __glShowPopup(lngLat, html, className) {
  if (!mapObj) return;
  if (!__glPopup) {
    __glPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
  }
  className = className || 'district-nyt-tooltip';
  if (__glPopupClass && __glPopupClass !== className) __glPopup.removeClassName(__glPopupClass);
  if (__glPopupClass !== className) { __glPopup.addClassName(className); __glPopupClass = className; }
  __glPopup.setLngLat(lngLat).setHTML(html).addTo(mapObj);
}
function __glHidePopup() { if (__glPopup) __glPopup.remove(); }

// Normalize various GeoJSON inputs to an array of Features.
function __glToFeatures(data) {
  if (!data) return [];
  if (data.type === 'FeatureCollection') return data.features || [];
  if (data.type === 'Feature') return [data];
  return [{ type: 'Feature', properties: {}, geometry: data }];
}

// Bounds object compatible with the few Leaflet methods we used.
function __glBounds(bb) { // bb = [w, s, e, n]
  return {
    bbox: [[bb[0], bb[1]], [bb[2], bb[3]]],
    isValid() { return bb.every(Number.isFinite) && bb[0] <= bb[2] && bb[1] <= bb[3]; },
    getCenter() { return { lat: (bb[1] + bb[3]) / 2, lng: (bb[0] + bb[2]) / 2 }; }
  };
}
function __glFeatureBounds(feature) {
  try { return __glBounds(turf.bbox(feature)); }
  catch (e) { return __glBounds([NaN, NaN, NaN, NaN]); }
}
function geoBboxBounds(geojson, filterFn) {
  let feats = __glToFeatures(geojson);
  if (filterFn) feats = feats.filter(filterFn);
  if (!feats.length) return __glBounds([NaN, NaN, NaN, NaN]);
  try { return __glBounds(turf.bbox({ type: 'FeatureCollection', features: feats })); }
  catch (e) { return __glBounds([NaN, NaN, NaN, NaN]); }
}
function glFitBounds(bounds, padding) {
  if (!mapObj || !bounds || !bounds.isValid || !bounds.isValid()) return;
  const pad = Array.isArray(padding) ? Math.max(padding[0], padding[1]) : (padding || 0);
  mapObj.fitBounds(bounds.bbox, { padding: pad, animate: false });
}

function combineGlBounds(b1, b2) {
  if (!b1 || !b1.isValid()) return b2;
  if (!b2 || !b2.isValid()) return b1;
  const bbox1 = b1.bbox;
  const bbox2 = b2.bbox;
  const minLng = Math.min(bbox1[0][0], bbox2[0][0]);
  const minLat = Math.min(bbox1[0][1], bbox2[0][1]);
  const maxLng = Math.max(bbox1[1][0], bbox2[1][0]);
  const maxLat = Math.max(bbox1[1][1], bbox2[1][1]);
  return __glBounds([minLng, minLat, maxLng, maxLat]);
}

function getRegionalNationalBounds() {
  let bounds = null;
  if (semilocalCircuitosGeoJSON) {
    bounds = geoBboxBounds(semilocalCircuitosGeoJSON);
  } else if (estadosGeoJSON) {
    bounds = geoBboxBounds(estadosGeoJSON);
  }
  
  if (bounds && bounds.isValid()) {
    let bbox = [bounds.bbox[0][0], bounds.bbox[0][1], bounds.bbox[1][0], bounds.bbox[1][1]];
    
    for (const group of Object.values(INSET_GROUPS)) {
      const { tgtLat, tgtLng } = group;
      const margin = 3.5;
      
      const minL = tgtLng - margin;
      const maxL = tgtLng + margin;
      const minT = tgtLat - margin;
      const maxT = tgtLat + margin;
      
      if (minL < bbox[0]) bbox[0] = minL;
      if (minT < bbox[1]) bbox[1] = minT;
      if (maxL > bbox[2]) bbox[2] = maxL;
      if (maxT > bbox[3]) bbox[3] = maxT;
    }
    
    bounds = __glBounds(bbox);
  }
  return bounds;
}

function latLng(arr) { return { lat: arr[0], lng: arr[1] }; } // Leaflet [lat,lng] -> {lat,lng}

// Map a Leaflet style object onto our baked feature properties.
function __glBakeStyle(props, s) {
  if (!s) return;
  if (s.fillColor !== undefined) props.__fillColor = s.fillColor;
  if (s.fillOpacity !== undefined) props.__fillOpacity = s.fillOpacity;
  if (s.color !== undefined) props.__color = s.color;
  if (s.weight !== undefined) props.__weight = s.weight;
  if (s.opacity !== undefined) props.__lineOpacity = s.opacity;
  if (s.fill === false && s.stroke === false) props.__hidden = true;
  else if (s.fill !== undefined || s.stroke !== undefined) {
    // partial hide: hide fill or stroke individually
    if (s.fill === false) props.__fillOpacity = 0;
    if (s.stroke === false) { props.__weight = 0; props.__lineOpacity = 0; }
  }
}
function __glDefaultProps() {
  return { __fillColor: '#000000', __fillOpacity: 0, __color: '#000000', __weight: 1, __lineOpacity: 1, __hidden: false };
}
function __glParseDash(d) {
  if (!d) return null;
  return String(d).split(/[ ,]+/).map(Number).filter(n => Number.isFinite(n));
}

// glGeoJSON(data, { filter, style, onEachFeature }) -> handle (Leaflet L.geoJSON analog)
function glGeoJSON(data, opts) {
  opts = opts || {};
  const id = '_gj_' + (++__glLayerSeq);
  const styleFn = typeof opts.style === 'function' ? opts.style : (opts.style ? () => opts.style : null);

  let rawFeats = __glToFeatures(data);
  if (opts.filter) rawFeats = rawFeats.filter(opts.filter);

  const handle = {
    id,
    _fc: null,
    _layers: [],
    _clickFns: [],
    _tooltips: [],
    _tooltipClasses: [],
    _skip: new Set(),
    _styleFn: styleFn,
    _dash: null,
    _setDataQueued: false,
    _added: false
  };

  const baked = rawFeats.map((f, i) => {
    const props = Object.assign({}, f.properties || {}, __glDefaultProps());
    __glBakeStyle(props, styleFn ? styleFn(f) : null);
    props.__i = i;
    if (handle._dash === null) {
      const sdash = styleFn ? (styleFn(f).dashArray) : null;
      if (sdash) handle._dash = __glParseDash(sdash);
    }
    return { type: 'Feature', id: i, properties: props, geometry: f.geometry };
  });
  handle._fc = { type: 'FeatureCollection', features: baked };

  // pseudo-layers (Leaflet sublayer analogs)
  baked.forEach((bf, i) => {
    const origFeature = rawFeats[i];
    const pathProxy = { style: new Proxy({}, { set(t, k, v) {
      if (k === 'pointerEvents') { if (v === 'none') handle._skip.add(i); else handle._skip.delete(i); }
      t[k] = v; return true;
    } }) };
    handle._layers[i] = {
      feature: origFeature,
      _idx: i,
      get _path() { return pathProxy; },
      bindTooltip(html, o) { handle._tooltips[i] = html; handle._tooltipClasses[i] = (o && o.className) || 'district-nyt-tooltip'; },
      openTooltip() {
        if (handle._tooltips[i] == null) return;
        const c = __glFeatureBounds(origFeature).getCenter();
        __glShowPopup([c.lng, c.lat], handle._tooltips[i], handle._tooltipClasses[i]);
      },
      on(ev, fn) { if (ev === 'click') handle._clickFns[i] = fn; return this; },
      setStyle(s) { __glBakeStyle(handle._fc.features[i].properties, s); handle._scheduleSetData(); },
      getBounds() { return __glFeatureBounds(origFeature); },
      bringToFront() { handle.bringToFront(); }
    };
  });

  handle._scheduleSetData = function () {
    if (handle._setDataQueued || !mapObj) return;
    handle._setDataQueued = true;
    Promise.resolve().then(() => {
      handle._setDataQueued = false;
      const src = mapObj.getSource(id);
      if (src) src.setData(handle._fc);
    });
  };

  handle.resetStyle = function (pl) {
    if (!styleFn) return;
    const i = pl._idx;
    const fresh = Object.assign({}, rawFeats[i].properties || {}, __glDefaultProps());
    __glBakeStyle(fresh, styleFn(rawFeats[i]));
    fresh.__i = i;
    handle._fc.features[i].properties = fresh;
    handle._scheduleSetData();
  };

  handle.eachLayer = function (fn) { handle._layers.forEach(fn); };

  handle.getBounds = function () {
    if (!baked.length) return __glBounds([NaN, NaN, NaN, NaN]);
    try { return __glBounds(turf.bbox(handle._fc)); }
    catch (e) { return __glBounds([NaN, NaN, NaN, NaN]); }
  };

  handle.bringToFront = function () {
    ['-fill', '-line', '-line-hi'].forEach(suf => {
      if (mapObj.getLayer(id + suf)) mapObj.moveLayer(id + suf);
    });
  };

  handle._install = function () {
    if (handle._added || !mapObj) return;
    mapObj.addSource(id, { type: 'geojson', data: handle._fc });
    mapObj.addLayer({
      id: id + '-fill', type: 'fill', source: id,
      filter: ['!=', ['get', '__hidden'], true],
      paint: { 'fill-color': ['get', '__fillColor'], 'fill-opacity': ['get', '__fillOpacity'] }
    });
    const linePaint = {
      'line-color': ['get', '__color'],
      'line-width': ['get', '__weight'],
      'line-opacity': ['get', '__lineOpacity']
    };
    if (handle._dash) linePaint['line-dasharray'] = handle._dash;
    mapObj.addLayer({ id: id + '-line', type: 'line', source: id, paint: linePaint });

    handle._added = true;

    // run onEachFeature now that the layer exists (sets tooltips/click handlers)
    if (opts.onEachFeature) handle._layers.forEach((pl, i) => opts.onEachFeature(rawFeats[i], pl));

    // Only wire interactivity for layers that bound tooltips/clicks. Non-interactive
    // layers (inset outlines, dashed child contours, leader lines) skip this so they
    // neither intercept hover nor add per-frame query cost.
    if (opts.onEachFeature) {
      handle._onClick = (e) => {
        const f = e.features && e.features[0]; if (!f) return;
        const i = f.properties.__i;
        if (handle._skip.has(i)) return;
        if (handle._clickFns[i]) handle._clickFns[i]();
      };
      handle._onMove = (e) => {
        const f = e.features && e.features[0]; if (!f) return;
        const i = f.properties.__i;
        if (handle._skip.has(i)) return;
        mapObj.getCanvas().style.cursor = handle._clickFns[i] ? 'pointer' : '';
        if (handle._tooltips[i] != null) __glShowPopup(e.lngLat, handle._tooltips[i], handle._tooltipClasses[i]);
      };
      handle._onLeave = () => { mapObj.getCanvas().style.cursor = ''; __glHidePopup(); };
      mapObj.on('click', id + '-fill', handle._onClick);
      mapObj.on('mousemove', id + '-fill', handle._onMove);
      mapObj.on('mouseleave', id + '-fill', handle._onLeave);
    }
  };

  handle.addTo = function () {
    if (__glMapReady()) handle._install();
    else if (mapObj) mapObj.once('load', handle._install); // safety; normally already loaded
    return handle;
  };

  handle.remove = function () {
    if (mapObj) {
      if (handle._onClick) { mapObj.off('click', id + '-fill', handle._onClick); }
      if (handle._onMove) { mapObj.off('mousemove', id + '-fill', handle._onMove); }
      if (handle._onLeave) { mapObj.off('mouseleave', id + '-fill', handle._onLeave); }
      ['-fill', '-line', '-line-hi'].forEach(suf => { if (mapObj.getLayer(id + suf)) mapObj.removeLayer(id + suf); });
      if (mapObj.getSource(id)) mapObj.removeSource(id);
    }
    handle._added = false;
  };

  // Auto-install if .addTo isn't chained (some call sites store then addTo)
  handle.__glRemove = handle.remove;
  return handle;
}

// glMarker(pos, { className, html }) -> DOM marker handle (L.marker + L.divIcon analog)
function glMarker(pos, opts) {
  opts = opts || {};
  const lngLat = Array.isArray(pos) ? pos : [pos.lng, pos.lat];
  const el = document.createElement('div');
  if (opts.className) el.className = opts.className;
  el.innerHTML = opts.html || '';
  el.style.cursor = 'pointer';
  el.style.lineHeight = '0'; // shrink-wrap the inner SVG so anchor:'center' is exact

  const m = { _el: el, _tooltip: null, _tooltipClass: 'district-nyt-tooltip', _marker: null };

  m.addTo = function () {
    if (!mapObj) return m;
    m._marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(mapObj);
    return m;
  };
  m.on = function (ev, fn) {
    if (ev === 'click') el.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    return m;
  };
  m.setOpacity = function (o) { el.style.opacity = o; return m; };
  m.bindTooltip = function (html, o) {
    m._tooltip = html; m._tooltipClass = (o && o.className) || 'district-nyt-tooltip';
    el.addEventListener('mouseenter', __glMarkerMove);
    el.addEventListener('mousemove', __glMarkerMove);
    el.addEventListener('mouseleave', __glHidePopup);
    function __glMarkerMove(e) {
      if (!mapObj) return;
      const r = mapObj.getContainer().getBoundingClientRect();
      const ll = mapObj.unproject([e.clientX - r.left, e.clientY - r.top]);
      __glShowPopup(ll, m._tooltip, m._tooltipClass);
    }
    return m;
  };
  m.remove = function () { if (m._marker) m._marker.remove(); };
  m.__glRemove = m.remove;
  return m;
}

// glPolyline(latlngs, style): leader line (L.polyline analog). Inputs are Leaflet [lat,lng].
function glPolyline(latlngs, style) {
  const coords = latlngs.map(p => [p[1], p[0]]);
  const feat = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
  const h = glGeoJSON(feat, { style: { color: style.color, weight: style.weight, opacity: style.opacity } });
  h.addTo();
  return h;
}

// glCircleMarker(latlng, style): small anchor dot (L.circleMarker analog). Input is Leaflet [lat,lng].
function glCircleMarker(latlng, style) {
  const r = style.radius || 3;
  const d = r * 2;
  const html = `<div style="width:${d}px;height:${d}px;border-radius:50%;background:${style.fillColor || '#fff'};border:${style.weight || 1}px solid ${style.color || '#000'};box-sizing:border-box;"></div>`;
  const m = glMarker([latlng[1], latlng[0]], { className: '', html });
  m.addTo();
  return m;
}

// glRemove(x): dispatcher replacing per-feature layer removal
function glRemove(x) { if (x && typeof x.__glRemove === 'function') x.__glRemove(); else if (x && typeof x.remove === 'function') x.remove(); }

// Global variables to hold data
let ZIP_INDEX = null;
let ZIP_READERS = new Map();
let officialTotals = null;
let deputyTotals = null;
let presidentTotals = null;
let governorTotals = null;
let currentVoteBase = 'deputado';
let estadosGeoJSON = null;
let regionsGeoJSON = null;
let currentConfig = {};
let nationalSimulationResults = null; // Calculated seats by state and party
let loadedDeputyResults = null; // Holds the federal deputy data for state candidate listings
let stateCircleLayers = []; // Holds Leaflet markers/polylines for state seat circles
let circleViewMode = 'dots'; // 'dots' (one dot per deputy) | 'pizza' (concentric rings)

// District (uninominal) system variables
let distritosGeoJSON = null; // Loaded from distritos_simulados.geojson
let distritosVotosData = null; // Loaded from distritos_votos.json (deputy votes per district)
let semilocalVotosData = null; // Loaded from semilocal_votos.json (deputy & presidential votes per subregion)
let semilocalCircuitosGeoJSON = null; // Loaded from semilocal_circuitos.geojson (subregion geometries from GPKG)
let semilocalLayer = null; // Leaflet GeoJSON layer for semilocal circuits
let distritosDetalheMunisData = null; // Loaded from distritos_detalhe_munis.json (municipal detail per district)
let distritosLayer = null;   // Leaflet GeoJSON layer for districts
let distritosMuniLayer = null; // Leaflet GeoJSON layer for municipalities within a selected district
const cachedMuniGeoJSON = {};  // Cache for state municipality geojson data
let districtSimResults = null; // { nationalSeats, stateSeats, districtWinners[], partyNationalVotes, nationalValidVotes }
let currentSystemType = 'proporcional'; // 'proporcional' or 'distrital'
let selectedDistrict = null; // fid of selected district or null

// UF code -> sigla mapping (numeric IBGE code to 2-letter abbreviation)
const UF_CODE_TO_SIGLA = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
  "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR",
  "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF"
};

// Leaflet elements
let mapObj = null;
let tileLayer = null;
let estadosLayer = null;
let muniLayer = null;
let selectedState = null; // UF abbreviation or null if national view
let selectedRegion = null; // Region name or null if national view
let selectedSubregion = null; // Subregion name or null if national view

// State data cache
let loadedStateMuniGeo = null;
let loadedStateResults = null;
let tseToIbge = {};
let tseToName = {};
let nameToIbge = {};

// Helpers
function fmtInt(n) { return (n || 0).toLocaleString('pt-BR'); }
function fmtPct(p) { return isFinite(p) ? p.toFixed(2).replace('.', ',') + '%' : '0,00%'; }

function getFallbackColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}

function getCurrentElectionKey() {
  return document.getElementById('selectVoteBase')?.value || `${currentVoteBase}_${currentYear}`;
}

function buildOrderedSeatColors(allocations, votesByParty = {}) {
  const orderedParties = Object.entries(allocations)
    .filter(([_, seats]) => seats > 0)
    .map(([party, seats]) => ({
      party,
      seats,
      votes: votesByParty[party] || 0,
      color: getPartyColor(party)
    }))
    .sort((a, b) => b.seats - a.seats || b.votes - a.votes || a.party.localeCompare(b.party));

  const seatColors = [];
  orderedParties.forEach(p => {
    for (let i = 0; i < p.seats; i++) {
      seatColors.push(p.color);
    }
  });

  return { orderedParties, seatColors };
}

function getDotRadiusForSeats(maxSeats) {
  if (maxSeats <= 9) return 6.875;
  if (maxSeats <= 18) return 6.25;
  if (maxSeats <= 31) return 5.625;
  if (maxSeats <= 53) return 5.0;
  return 4.375;
}

function getSubregionVoteMap(subName) {
  if (!semilocalVotosData || !semilocalVotosData[subName]) return {};

  const electionKey = getCurrentElectionKey();
  const subVotesData = semilocalVotosData[subName][electionKey];
  if (!subVotesData) return {};

  const votes = {};
  for (const [party, value] of Object.entries(subVotesData)) {
    if (party === 'VOTOS_BRANCOS' || party === 'VOTOS_NULOS' || party === 'TOTAL_VOTOS_VALIDOS') continue;
    const stdKey = currentYear >= 2022 ? getStandardFederationKey(party) : getStandardFederationKey(party, true);
    votes[stdKey] = (votes[stdKey] || 0) + value;
  }

  return votes;
}

function getStandardFederationKey(name, ignoreFederation = false) {
  const n = String(name || '').toUpperCase().trim();

  // First, normalize to clean alphanumeric characters
  const clean = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");

  // Standardize historical names and overrides to a single internal key
  let partyKey = clean;
  if (clean === 'PMDB' || clean === 'MDB') partyKey = 'MDB';
  else if (clean === 'PR' || clean === 'PL') partyKey = 'PL';
  else if (clean === 'PRB' || clean === 'REPUBLICANOS') partyKey = 'REPUBLICANOS';
  else if (clean === 'PPS' || clean === 'CIDADANIA') partyKey = 'CIDADANIA';
  else if (clean === 'PTN' || clean === 'PODEMOS' || clean === 'PODE') partyKey = 'PODE';
  else if (clean === 'PTDOB' || clean === 'PT_DO_B' || clean === 'AVANTE') partyKey = 'AVANTE';
  else if (clean === 'PEN' || clean === 'PATRI' || clean === 'PATRIOTA') partyKey = 'PATRIOTA';
  else if (clean === 'PTC' || clean === 'AGIR') partyKey = 'AGIR';
  else if (clean === 'PMN' || clean === 'MOBILIZA') partyKey = 'MOBILIZA';
  else if (clean === 'PFL' || clean === 'DEM') partyKey = 'DEM';
  else if (clean === 'PCDOB' || clean === 'PC_DO_B') partyKey = 'PCDOB';

  if (currentYear >= 2022 && !ignoreFederation) {
    if (partyKey === 'PT' || partyKey === 'PV' || partyKey === 'PCDOB' || clean.includes('FEBRASIL') || clean.includes('BRASILESPERANCA') || (clean.includes('PT') && clean.includes('PV') && (clean.includes('PCDOB') || clean.includes('PC')))) {
      return 'FE_BRASIL';
    }
    if (partyKey === 'PSDB' || partyKey === 'CIDADANIA' || (clean.includes('PSDB') && clean.includes('CIDADANIA'))) {
      return 'PSDB_CIDADANIA';
    }
    if (partyKey === 'PSOL' || partyKey === 'REDE' || (clean.includes('PSOL') && clean.includes('REDE'))) {
      return 'PSOL_REDE';
    }
  }

  return partyKey;
}

function getPartyNameByNumber(candId, year = currentYear) {
  const id = String(candId || '').trim();
  if (id === '44') {
    return year < 2022 ? 'PRP' : 'UNIÃƒO';
  }
  return PARTY_NUMBERS[id] || null;
}

function collectPartyVotesFromCandidateResults(resultsData, candNames, opts = {}) {
  const {
    ignoreFederalBarrier = false,
    includeBlankNull = false
  } = opts;

  const partyVotes = {};
  let totalValidVotes = 0;

  if (!resultsData || !candNames) {
    return { partyVotes, totalValidVotes };
  }

  for (const voteMap of Object.values(resultsData)) {
    for (const [candId, votesVal] of Object.entries(voteMap || {})) {
      if (!includeBlankNull && (candId === '95' || candId === '96' || candId === 'VOTOS_BRANCOS' || candId === 'VOTOS_NULOS')) {
        continue;
      }

      const votes = parseInt(votesVal) || 0;
      if (votes <= 0) continue;

      let partyName = null;
      if (String(candId).length <= 2) {
        partyName = getPartyNameByNumber(candId);
      } else {
        const meta = candNames[candId];
        if (meta) {
          partyName = meta[1] || null;
        }
      }

      if (!partyName) continue;

      const stdKey = currentYear >= 2022 && !ignoreFederalBarrier
        ? getStandardFederationKey(partyName)
        : getStandardFederationKey(partyName, true);

      partyVotes[stdKey] = (partyVotes[stdKey] || 0) + votes;
      totalValidVotes += votes;
    }
  }

  return { partyVotes, totalValidVotes };
}

function getNYTBaseColor(hex) {
  const hsl = hexToHSL(hex);

  // Cap saturation to be at most 85% (keeps colors rich but not neon)
  let s = Math.min(hsl.s, 85);
  // Boost desaturated ones slightly to ensure no gray
  if (s < 45) s = 45;

  // Set lightness to be around 50% for rich pastel escura
  let l = 50;

  return hslToHex(hsl.h, s, l);
}

function getPartyColor(partyName, ignoreFederation = false) {
  const norm = String(partyName || '').toUpperCase().trim();
  let baseColor = '#777777';

  if (norm === 'BRASIL_ESPERANCA' || norm === 'BRASIL_PARA_TODOS' || norm === 'PELO_BEM_BRASIL') {
    baseColor = PARTY_COLORS[norm];
  } else {
    const key = getStandardFederationKey(partyName, ignoreFederation);
    if (!ignoreFederation && key === 'FE_BRASIL') baseColor = PARTY_COLORS['PT'];
    else if (!ignoreFederation && key === 'PSDB_CIDADANIA') baseColor = PARTY_COLORS['PSDB'];
    else if (!ignoreFederation && key === 'PSOL_REDE') baseColor = PARTY_COLORS['PSOL'];
    else if (PARTY_COLORS[norm]) baseColor = PARTY_COLORS[norm];
    else if (PARTY_COLORS[key]) baseColor = PARTY_COLORS[key];
    else {
      const cleanNorm = norm.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
      let found = false;
      for (const [k, v] of Object.entries(PARTY_COLORS)) {
        const cleanK = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
        if (cleanK === cleanNorm) {
          baseColor = v;
          found = true;
          break;
        }
      }
      if (!found) baseColor = getFallbackColor(norm);
    }
  }

  return getNYTBaseColor(baseColor);
}

function getCleanGroupName(id, ignoreFederation = false) {
  const norm = String(id || '').toUpperCase().trim();
  if (!ignoreFederation) {
    if (norm === 'BRASIL_ESPERANCA') return 'Brasil da Esperança (FE Brasil / PSOL-REDE / PSB / SD / Avante / Agir / PROS)';
    if (norm === 'BRASIL_PARA_TODOS') return 'Brasil para Todos (MDB / PSDB-Cidadania / PODE)';
    if (norm === 'PELO_BEM_BRASIL') return 'Pelo Bem do Brasil (PL / Republicanos / PP)';

    if (norm === 'POR_UM_BRASIL_DECENTE') return 'Por um Brasil Decente (PSDB / PFL)';
    if (norm === 'FRENTE_DE_ESQUERDA') return 'Frente de Esquerda (PSOL / PCB / PSTU)';
    if (norm === 'A_FORCA_DO_POVO') return 'A Força do Povo (PT / PRB / PCdoB)';
    if (norm === 'PARA_O_BRASIL_SEGUIR_MUDANDO') return 'Para o Brasil seguir mudando (PT / PMDB / PDT / PCdoB / PSB / PR / PRB / PSC / PTC / PTN)';
    if (norm === 'O_BRASIL_PODE_MAIS') return 'O Brasil pode mais (PSDB / DEM / PPS / PMN / PTdoB / PTB)';
    if (norm === 'MUDA_BRASIL') return 'Muda Brasil (PSDB / SD / PMN / PEN / PTN / PTC / DEM / PTdoB / PTB)';
    if (norm === 'COM_A_FORCA_DO_POVO') return 'Com a Força do Povo (PT / PMDB / PSD / PP / PR / PDT / PRB / PROS / PCdoB)';
    if (norm === 'UNIDOS_PELO_BRASIL') return 'Unidos pelo Brasil (PSB / PPS / PSL / PHS / PPL / PRP)';
    if (norm === 'MUDANCA_DE_VERDADE') return 'Mudança de Verdade (PODE / PRP / PSC / PTC)';
    if (norm === 'BRASIL_SOBERANO') return 'Brasil Soberano (PDT / AVANTE)';
    if (norm === 'O_POVO_FELIZ_DE_NOVO') return 'O Povo Feliz de Novo (PT / PCdoB / PROS)';
    if (norm === 'PARA_UNIR_O_BRASIL') return 'Para Unir o Brasil (PSDB / PP / PTB / PSD / PRB / PR / DEM / SD / PPS)';
    if (norm === 'VAMOS_SEM_MEDO_DE_MUDAR_O_BRASIL') return 'Vamos Sem Medo de Mudar o Brasil (PSOL / PCB)';
    if (norm === 'ESSA_E_A_SOLUCAO') return 'Essa é a solução (MDB / PHS)';
    if (norm === 'BRASIL_ACIMA_DE_TUDO_DEUS_ACIMA_DE_TODOS') return 'Brasil Acima de Tudo, Deus Acima de Todos (PSL / PRTB)';
    if (norm === 'UNIDOS_PARA_TRANSFORMAR_O_BRASIL') return 'Unidos para transformar o Brasil (REDE / PV)';
  }

  const key = getStandardFederationKey(id, ignoreFederation);
  if (!ignoreFederation) {
    if (key === 'FE_BRASIL') return 'FE Brasil (PT/PCdoB/PV)';
    if (key === 'PSDB_CIDADANIA') return 'PSDB/Cidadania';
    if (key === 'PSOL_REDE') return 'PSOL/Rede';
  }

  if (key === 'UNIAO') return 'UNIÃO';
  if (key === 'PCDOB') return 'PC do B';

  if (key === 'MDB') {
    return currentYear < 2018 ? 'PMDB' : 'MDB';
  }
  if (key === 'PL') {
    if (currentYear === 2006) return 'PL';
    if (currentYear < 2022) return 'PR';
    return 'PL';
  }
  if (key === 'REPUBLICANOS') {
    return currentYear < 2022 ? 'PRB' : 'REPUBLICANOS';
  }
  if (key === 'CIDADANIA') {
    return currentYear < 2022 ? 'PPS' : 'CIDADANIA';
  }
  if (key === 'PODE') {
    return currentYear < 2018 ? 'PTN' : 'PODE';
  }
  if (key === 'AVANTE') {
    return currentYear < 2018 ? 'PT do B' : 'AVANTE';
  }
  if (key === 'PATRIOTA') {
    return currentYear < 2018 ? 'PEN' : 'PATRIOTA';
  }
  if (key === 'AGIR') {
    return currentYear < 2022 ? 'PTC' : 'AGIR';
  }
  if (key === 'MOBILIZA') {
    return currentYear < 2022 ? 'PMN' : 'MOBILIZA';
  }
  if (key === 'DEM') {
    return currentYear === 2006 ? 'PFL' : 'DEM';
  }

  return id;
}

function normalizeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// HSL color calculation for margins (gradient)
function hexToHSL(H) {
  let r = 0, g = 0, b = 0;
  if (H.length == 4) {
    r = "0x" + H[1] + H[1]; g = "0x" + H[2] + H[2]; b = "0x" + H[3] + H[3];
  } else if (H.length == 7) {
    r = "0x" + H[1] + H[2]; g = "0x" + H[3] + H[4]; b = "0x" + H[5] + H[6];
  }
  r /= 255; g /= 255; b /= 255;
  let cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin, h = 0, s = 0, l = 0;
  if (delta == 0) h = 0;
  else if (cmax == r) h = ((g - b) / delta) % 6;
  else if (cmax == g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  l = (cmax + cmin) / 2;
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);
  return { h, s, l };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  b = Math.round((b + m) * 255).toString(16).padStart(2, '0');
  return '#' + r + g + b;
}

function getUniversalGradientColor(baseColorHex, winnerPct) {
  const hsl = hexToHSL(baseColorHex);
  const pct = Number.isFinite(winnerPct) ? winnerPct : 50;

  if (pct >= 70) {
    // Escura (70% or more)
    // Standard default color of the party
    return baseColorHex;
  } else if (pct >= 60) {
    // Média-Escura (60% to 70%)
    // Rich pastel
    const targetS = Math.max(50, hsl.s * 0.9);
    const targetL = 68;
    return hslToHex(hsl.h, targetS, targetL);
  } else if (pct >= 50) {
    // Nova faixa (50% to 60%)
    // Intermediate pastel
    const targetS = Math.max(45, hsl.s * 0.825);
    const targetL = 76;
    return hslToHex(hsl.h, targetS, targetL);
  } else {
    // Clara (less than 50%)
    // Soft, pale pastel
    const targetS = Math.max(40, hsl.s * 0.75);
    const targetL = 84;
    return hslToHex(hsl.h, targetS, targetL);
  }
}

function getStateTooltipHtml(uf) {
  if (!nationalSimulationResults) {
    return `
      <div class="nyt-tooltip-container" style="font-family: var(--font-main); color: var(--text); min-width: 200px;">
        <div class="district-nyt-title">${UF_NAMES[uf]} (${uf})</div>
        <div style="font-size: 11px; color: var(--muted); margin-top: 6px;">Selecione o estado para simular</div>
      </div>
    `;
  }
  let allocations = nationalSimulationResults.stateAllocations[uf] || {};
  let seatsToAllocate = currentConfig.seatDistribution === 'real' ? REAL_SEATS[uf] : getSeatsAllocationByState(currentConfig.seatDistribution)[uf];

  if (currentConfig.seatDistribution === 'danish') {
    seatsToAllocate = nationalSimulationResults.constituencySeats ? (nationalSimulationResults.constituencySeats[uf] || 0) : seatsToAllocate;
    allocations = nationalSimulationResults.constituencyAllocations ? (nationalSimulationResults.constituencyAllocations[uf] || {}) : allocations;
  }

  const sortedParties = Object.entries(allocations)
    .filter(([_, seats]) => seats > 0)
    .map(([party, seats]) => ({
      party,
      seats,
      color: getPartyColor(party),
      cleanName: getCleanGroupName(party)
    }))
    .sort((a, b) => b.seats - a.seats);

  const top5 = sortedParties.slice(0, 5);
  const winner = getWinningPartyForUF(uf);

  let rowsHtml = '';
  top5.forEach((p, idx) => {
    const isWinner = p.party === winner;
    const pctStr = seatsToAllocate > 0 ? ((p.seats / seatsToAllocate) * 100).toFixed(2) : '0.00';

    if (isWinner) {
      rowsHtml += `
        <tr>
          <td style="padding: 0;">
            <div class="district-nyt-winner-cell" style="background-color: ${p.color};">
              <span>${p.cleanName}</span>
              <span style="font-size: 10px; margin-left: 6px;">✔</span>
            </div>
          </td>
          <td style="color: var(--text);">${p.seats}</td>
          <td style="font-weight: bold; color: var(--text);">${pctStr}%</td>
        </tr>
      `;
    } else {
      rowsHtml += `
        <tr>
          <td style="padding: 0;">
            <div class="district-nyt-loser-cell" style="border-left-color: ${p.color};">
              <span style="margin-left: 6px; color: var(--text);">${p.cleanName}</span>
            </div>
          </td>
          <td style="color: var(--text-sec);">${p.seats}</td>
          <td style="font-weight: bold; color: var(--text);">${pctStr}%</td>
        </tr>
      `;
    }
  });

  if (rowsHtml === '') {
    rowsHtml = `<tr><td colspan="3" style="text-align:center;color:var(--muted);padding: 8px;">Nenhuma vaga conquistada</td></tr>`;
  }

  const labelSuffix = currentConfig.seatDistribution === 'danish' ? 'vagas distritais' : 'vagas';

  return `
    <div class="nyt-tooltip-container" style="font-family: var(--font-main); color: var(--text); min-width: 250px;">
      <div class="district-nyt-title">${UF_NAMES[uf]} (${uf})</div>
      <table class="district-nyt-table">
        <thead>
          <tr>
            <th style="text-align: left;">Partido</th>
            <th>Vagas</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="font-size: 11px; color: var(--muted); margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 6px; text-align: right;">Total: ${seatsToAllocate} ${labelSuffix}</div>
    </div>
  `;
}

function buildSeatTooltipHtml(title, parties, totalSeats, footerLabel) {
  const sortedParties = (parties || [])
    .filter(p => p && p.seats > 0)
    .sort((a, b) => b.seats - a.seats);

  const top5 = sortedParties.slice(0, 5);

  let rowsHtml = '';
  top5.forEach(p => {
    const pctStr = totalSeats > 0 ? ((p.seats / totalSeats) * 100).toFixed(2) : '0.00';
    if (p.isWinner) {
      rowsHtml += `
        <tr>
          <td style="padding: 0;">
            <div class="district-nyt-winner-cell" style="background-color: ${p.color};">
              <span>${p.cleanName}</span>
              <span style="font-size: 10px; margin-left: 6px;">&#10004;</span>
            </div>
          </td>
          <td style="color: var(--text);">${p.seats}</td>
          <td style="font-weight: bold; color: var(--text);">${pctStr}%</td>
        </tr>
      `;
    } else {
      rowsHtml += `
        <tr>
          <td style="padding: 0;">
            <div class="district-nyt-loser-cell" style="border-left-color: ${p.color};">
              <span style="margin-left: 6px; color: var(--text);">${p.cleanName}</span>
            </div>
          </td>
          <td style="color: var(--text-sec);">${p.seats}</td>
          <td style="font-weight: bold; color: var(--text);">${pctStr}%</td>
        </tr>
      `;
    }
  });

  if (rowsHtml === '') {
    rowsHtml = `<tr><td colspan="3" style="text-align:center;color:var(--muted);padding: 8px;">Nenhuma vaga conquistada</td></tr>`;
  }

  return `
    <div class="nyt-tooltip-container" style="font-family: var(--font-main); color: var(--text); min-width: 250px;">
      <div class="district-nyt-title">${title}</div>
      <table class="district-nyt-table">
        <thead>
          <tr>
            <th style="text-align: left;">Partido</th>
            <th>Vagas</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="font-size: 11px; color: var(--muted); margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 6px; text-align: right;">Total: ${totalSeats} ${footerLabel}</div>
    </div>
  `;
}

function getMuniTooltipHtml(codM, name, winner, votesObj) {
  const sumVotes = Object.values(votesObj).reduce((s, v) => s + v, 0);

  const sortedParties = Object.entries(votesObj)
    .filter(([_, votes]) => votes > 0)
    .map(([party, votes]) => ({
      party,
      votes,
      color: getPartyColor(party),
      cleanName: getCleanGroupName(party)
    }))
    .sort((a, b) => b.votes - a.votes);

  const top5 = sortedParties.slice(0, 5);

  let rowsHtml = '';
  top5.forEach((p, idx) => {
    const isWinner = p.party === winner;
    const pctStr = sumVotes > 0 ? ((p.votes / sumVotes) * 100).toFixed(2) : '0.00';

    if (isWinner) {
      rowsHtml += `
        <tr>
          <td style="padding: 0;">
            <div class="district-nyt-winner-cell" style="background-color: ${p.color};">
              <span>${p.cleanName}</span>
              <span style="font-size: 10px; margin-left: 6px;">✔</span>
            </div>
          </td>
          <td style="color: var(--text);">${fmtInt(p.votes)}</td>
          <td style="font-weight: bold; color: var(--text);">${pctStr}%</td>
        </tr>
      `;
    } else {
      rowsHtml += `
        <tr>
          <td style="padding: 0;">
            <div class="district-nyt-loser-cell" style="border-left-color: ${p.color};">
              <span style="margin-left: 6px; color: var(--text);">${p.cleanName}</span>
            </div>
          </td>
          <td style="color: var(--text-sec);">${fmtInt(p.votes)}</td>
          <td style="font-weight: bold; color: var(--text);">${pctStr}%</td>
        </tr>
      `;
    }
  });

  if (rowsHtml === '') {
    rowsHtml = `<tr><td colspan="3" style="text-align:center;color:var(--muted);padding: 8px;">Nenhum voto registrado</td></tr>`;
  }

  return `
    <div class="nyt-tooltip-container" style="font-family: var(--font-main); color: var(--text); min-width: 250px;">
      <div class="district-nyt-title">${name}</div>
      <table class="district-nyt-table">
        <thead>
          <tr>
            <th style="text-align: left;">Partido</th>
            <th>Votos</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="font-size: 11px; color: var(--muted); margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 6px; text-align: right;">Total: ${fmtInt(sumVotes)} votos válidos</div>
    </div>
  `;
}

// ======= DISTRICT (UNINOMINAL) SYSTEM FUNCTIONS =======

// Get the election suffix for the currently selected vote base
// e.g. presidente_2022 -> { year: 2022, turn: '1T', base: 'presidente' }
function getDistrictElectionSuffix() {
  const voteBase = document.getElementById('selectVoteBase').value;
  const parts = voteBase.split('_');
  const base = parts[0]; // 'deputado' or 'presidente'
  const year = parts[1];
  return { year, turn: '1T', base };
}

// Run the district simulation: winner-takes-all in each district
function runDistrictSimulation() {
  updateCurrentConfig();
  if (!distritosGeoJSON || !distritosGeoJSON.features) {
    districtSimResults = null;
    return;
  }

  const { year, turn, base } = getDistrictElectionSuffix();
  const useDeputyData = (base === 'deputado' && distritosVotosData !== null);
  const suffix = `_${year}_${turn}`;
  const deputyKey = `deputado_${year}`;

  const nationalSeats = {};      // party -> total seats nationally
  const stateSeats = {};         // uf -> party -> seats in that state
  const partyNationalVotes = {}; // party -> total votes nationally
  let nationalValidVotes = 0;
  const districtWinners = [];    // array of { fid, uf, district, winner, winnerVotes, totalVotes, margin, allVotes }

  for (const feat of distritosGeoJSON.features) {
    const props = feat.properties;
    const uf = UF_CODE_TO_SIGLA[props.CD_UF] || props.CD_UF;
    const fid = props.fid;
    const districtNum = props.DISTRICT;

    // Collect all party votes for this district
    const distVotes = {};
    let distTotal = 0;

    if (useDeputyData) {
      // ---- Use precomputed deputy data from distritos_votos.json ----
      const distData = distritosVotosData[String(fid)];
      if (distData && distData[deputyKey]) {
        const depVotes = distData[deputyKey];
        for (const [party, votes] of Object.entries(depVotes)) {
          if (party === 'VOTOS_BRANCOS' || party === 'VOTOS_NULOS' || party === 'TOTAL_VOTOS_VALIDOS') continue;
          const v = parseInt(votes) || 0;
          if (v <= 0) continue;
          distVotes[party] = (distVotes[party] || 0) + v;
          distTotal += v;
        }
      }
    } else {
      // ---- Use presidential data from GeoJSON properties ----
      for (const [key, val] of Object.entries(props)) {
        if (!key.endsWith(suffix)) continue;
        if (key.startsWith('Total_') || key.startsWith('Votos_') || key.startsWith('Absten') || key.startsWith('Eleitores_') || key.startsWith('MARGEM_') || key.startsWith('VENCEDOR_')) continue;

        const partyRaw = key.replace(suffix, '');
        if (!partyRaw) continue;

        const votes = parseInt(val) || 0;
        if (votes <= 0) continue;

        const stdParty = getStandardFederationKey(partyRaw);
        distVotes[stdParty] = (distVotes[stdParty] || 0) + votes;
        distTotal += votes;
      }
    }

    // Apply presidential coalition grouping if requested
    const finalDistVotes = {};
    const coalitionMap = getPresCoalitionMap();
    for (const [party, votes] of Object.entries(distVotes)) {
      let finalParty = party;
      if (currentConfig.groupByPresidentialCoalition && coalitionMap[party]) {
        finalParty = coalitionMap[party];
      }
      finalDistVotes[finalParty] = (finalDistVotes[finalParty] || 0) + votes;
    }

    // Determine district winner (most votes)
    let winner = null;
    let winnerVotes = 0;
    let secondVotes = 0;
    for (const [party, votes] of Object.entries(finalDistVotes)) {
      if (votes > winnerVotes) {
        secondVotes = winnerVotes;
        winnerVotes = votes;
        winner = party;
      } else if (votes > secondVotes) {
        secondVotes = votes;
      }
    }

    const margin = distTotal > 0 ? ((winnerVotes - secondVotes) / distTotal) * 100 : 0;
    const winnerPct = distTotal > 0 ? (winnerVotes / distTotal) * 100 : 0;

    districtWinners.push({
      fid, uf, district: districtNum, winner,
      winnerVotes, totalVotes: distTotal, margin, winnerPct,
      allVotes: finalDistVotes
    });

    // Accumulate seats
    if (winner) {
      nationalSeats[winner] = (nationalSeats[winner] || 0) + 1;
      if (!stateSeats[uf]) stateSeats[uf] = {};
      stateSeats[uf][winner] = (stateSeats[uf][winner] || 0) + 1;
    }

    // Accumulate votes
    for (const [party, votes] of Object.entries(finalDistVotes)) {
      partyNationalVotes[party] = (partyNationalVotes[party] || 0) + votes;
    }
    nationalValidVotes += distTotal;
  }

  const totalSeats = districtWinners.length;
  const partyNationalPct = {};
  for (const [party, votes] of Object.entries(partyNationalVotes)) {
    partyNationalPct[party] = (votes / nationalValidVotes) * 100;
  }

  districtSimResults = {
    nationalSeats,
    stateSeats,
    districtWinners,
    partyNationalVotes,
    partyNationalPct,
    nationalValidVotes,
    totalSeats
  };
}

// Render the district map at national level
function renderDistrictMapNational() {
  if (!distritosGeoJSON || !districtSimResults) return;

  if (mapObj) {
    clearInsetOutlines();
    clearInsetMapLayers();
    if (semilocalLayer) {
      glRemove(semilocalLayer);
      semilocalLayer = null;
    }
  }

  // Restore map tiles for district view
  if (tileLayer) tileLayer.setOpacity(1);
  const zoomCtrl = document.querySelector('.maplibregl-ctrl-bottom-right');
  if (zoomCtrl) zoomCtrl.style.display = 'block';

  // Remove municipal / proportional layers
  if (muniLayer) {
    glRemove(muniLayer);
    muniLayer = null;
  }
  if (distritosMuniLayer) {
    glRemove(distritosMuniLayer);
    distritosMuniLayer = null;
  }
  if (estadosLayer) {
    glRemove(estadosLayer);
  }
  clearStateCircles();

  // Build a fid -> winner lookup from simulation results
  const fidToResult = {};
  for (const dw of districtSimResults.districtWinners) {
    fidToResult[dw.fid] = dw;
  }

  if (distritosLayer) {
    glRemove(distritosLayer);
    distritosLayer = null;
  }

  const filterUF = selectedState;

  distritosLayer = glGeoJSON(distritosGeoJSON, {
    filter: feature => {
      if (filterUF) {
        const featUf = UF_CODE_TO_SIGLA[feature.properties.CD_UF] || feature.properties.CD_UF;
        return featUf === filterUF;
      }
      return true;
    },
    style: feature => {
      const fid = feature.properties.fid;
      const result = fidToResult[fid];
      const winner = result ? result.winner : null;
      const color = winner ? getPartyColor(winner) : '#777777';
      const winnerPct = result ? result.winnerPct : 0;
      const fillCol = getUniversalGradientColor(color, winnerPct);

      return {
        fillColor: fillCol,
        fillOpacity: 0.85,
        color: '#ffffff',
        weight: filterUF ? 1.0 : 0.5,
        opacity: 0.8
      };
    },
    onEachFeature: (feature, layer) => {
      const fid = feature.properties.fid;
      const result = fidToResult[fid];
      const uf = UF_CODE_TO_SIGLA[feature.properties.CD_UF] || feature.properties.CD_UF;
      const districtNum = feature.properties.DISTRICT;
      const munName = feature.properties.NM_MUN || '';

      let tt = ``;
      if (result && result.allVotes) {
        const total = result.totalVotes;
        // Sort parties by votes
        const parties = Object.entries(result.allVotes)
          .map(([p, v]) => ({ party: p, votes: v }))
          .sort((a, b) => b.votes - a.votes)
          .slice(0, 5); // show top 5

        let rowsHtml = '';
        parties.forEach((p, idx) => {
          const isWinner = idx === 0 && p.party === result.winner;
          const cleanParty = getCleanGroupName(p.party);
          const color = getPartyColor(p.party);
          const pctStr = total > 0 ? ((p.votes / total) * 100).toFixed(2) : '0.00';

          if (isWinner) {
            rowsHtml += `
              <tr>
                <td style="padding: 0;">
                  <div class="district-nyt-winner-cell" style="background-color: ${color};">
                    <span>${cleanParty}</span>
                    <span style="font-size: 10px; margin-left: 6px;">✔</span>
                  </div>
                </td>
                <td style="color: var(--text);">${fmtInt(p.votes)}</td>
                <td style="font-weight: bold; color: var(--text);">${pctStr}%</td>
              </tr>
            `;
          } else {
            rowsHtml += `
              <tr>
                <td style="padding: 0;">
                  <div class="district-nyt-loser-cell" style="border-left-color: ${color};">
                    <span style="margin-left: 6px; color: var(--text);">${cleanParty}</span>
                  </div>
                </td>
                <td style="color: var(--text-sec);">${fmtInt(p.votes)}</td>
                <td style="font-weight: bold; color: var(--text);">${pctStr}%</td>
              </tr>
            `;
          }
        });

        tt = `
          <div class="district-nyt-title">Distrito ${districtNum} (${uf})</div>
          <table class="district-nyt-table">
            <thead>
              <tr>
                <th>Partido</th>
                <th>Votos</th>
                <th>Pct.</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        `;
      } else {
        tt = `<div class="district-nyt-title">Distrito ${districtNum} (${uf})</div><div style="font-size:13px;color:var(--muted);">Sem dados</div>`;
      }

      layer.bindTooltip(tt, { className: 'district-nyt-tooltip', sticky: true });

      layer.on('click', () => {
        if (!filterUF) {
          // National view: click zooms to the state
          selectDistrictState(uf);
        } else {
          // State view: click selects this specific district
          selectDistrictDetail(fid);
        }
      });
    }
  }).addTo(mapObj);
}

// Select state in district mode (zooms to state, filters districts)
async function selectDistrictState(uf) {
  const loader = document.getElementById('mapLoader');
  const loaderText = document.getElementById('loaderText');
  loaderText.textContent = `Carregando distritos de ${UF_NAMES[uf]}...`;
  loader.classList.add('visible');

  try {
    selectedState = uf;
    selectedDistrict = null;
    document.getElementById('btnBackToNational').classList.remove('hidden');


    // Re-render filtered district map
    renderDistrictMapNational();

    // Zoom to state bounds
    if (distritosLayer) {
      const bounds = distritosLayer.getBounds();
      if (bounds.isValid()) {
        glFitBounds(bounds, [20, 20]);
      }
    }

    renderDistrictResultsList();
  } catch (err) {
    console.error(err);
  } finally {
    loader.classList.remove('visible');
  }
}

// Select a specific district for detailed view
async function selectDistrictDetail(fid) {
  selectedDistrict = fid;

  const loader = document.getElementById('mapLoader');
  const loaderText = document.getElementById('loaderText');
  loaderText.textContent = `Carregando municípios do distrito...`;
  loader.classList.add('visible');

  try {
    let uf = null;
    let districtLayerToFocus = null;

    if (distritosLayer) {
      distritosLayer.eachLayer(layer => {
        if (layer.feature.properties.fid === fid) {
          uf = UF_CODE_TO_SIGLA[layer.feature.properties.CD_UF] || layer.feature.properties.CD_UF;
          districtLayerToFocus = layer;
        }
      });
    }

    if (!uf) return;

    // Remove existing muni layer if any
    if (distritosMuniLayer) {
      glRemove(distritosMuniLayer);
      distritosMuniLayer = null;
    }

    const { year, base } = getDistrictElectionSuffix();
    const isPresident = (base === 'presidente');
    let hasMuniData = false;

    // Fetch muni geojson if not cached, only if we have detailed presidential data
    if (isPresident && distritosDetalheMunisData) {
      if (!cachedMuniGeoJSON[uf]) {
        cachedMuniGeoJSON[uf] = await fetchGeoJSON(DATA_BASE_URL + 'municipios/municipios_' + uf + '.geojson');
      }
      const muniGeo = cachedMuniGeoJSON[uf];
      const electionKey = `presidente_${year}`;
      const rawMuniVotes = distritosDetalheMunisData[String(fid)]?.[electionKey] || {};

      const cleanKey = (str) => String(str || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['’\s-]/g, "");
      const muniVotes = {};
      for (const [k, v] of Object.entries(rawMuniVotes)) {
        muniVotes[cleanKey(k)] = v;
      }

      if (Object.keys(muniVotes).length > 0) {
        hasMuniData = true;
        distritosMuniLayer = glGeoJSON(muniGeo, {
          style: (feature) => {
            const rawName = feature.properties.NM_MUN || '';
            const cleanMuniName = cleanKey(rawName);

            const mVotes = muniVotes[cleanMuniName];
            if (!mVotes) {
              return { stroke: false, fill: false, interactive: false }; // hide if not part of district
            }

            // Find winner in this municipality portion, grouping by coalition if requested
            const groupedVotes = {};
            const coalitionMap = getPresCoalitionMap();
            for (const [party, votes] of Object.entries(mVotes)) {
              if (party === 'VOTOS_BRANCOS' || party === 'VOTOS_NULOS' || party === 'TOTAL_VOTOS_VALIDOS') continue;
              let finalParty = party;
              if (currentConfig.groupByPresidentialCoalition && coalitionMap[party]) {
                finalParty = coalitionMap[party];
              }
              groupedVotes[finalParty] = (groupedVotes[finalParty] || 0) + votes;
            }

            let winner = null;
            let maxV = 0;
            for (const [p, v] of Object.entries(groupedVotes)) {
              if (v > maxV) {
                maxV = v;
                winner = p;
              }
            }

            const color = winner ? getPartyColor(winner) : '#777777';
            const total = mVotes['TOTAL_VOTOS_VALIDOS'] || 0;
            const sortedVotes = Object.entries(groupedVotes).sort((a, b) => b[1] - a[1]);
            const firstVotes = sortedVotes[0] ? sortedVotes[0][1] : 0;
            const totalVal = total > 0 ? total : 1;
            const winnerPct = (firstVotes / totalVal) * 100;
            const fillCol = getUniversalGradientColor(color, winnerPct);
            return {
              fillColor: fillCol,
              fillOpacity: 0.95,
              color: '#ffffff',
              weight: 0.6,
              opacity: 0.8
            };
          },
          onEachFeature: (feature, layer) => {
            const rawName = feature.properties.NM_MUN || '';
            const cleanMuniName = cleanKey(rawName);
            const mVotes = muniVotes[cleanMuniName];

            if (!mVotes) return;

            const total = mVotes['TOTAL_VOTOS_VALIDOS'] || 0;

            // Find winner in this municipality portion, grouping by coalition if requested
            const groupedVotes = {};
            const coalitionMap = getPresCoalitionMap();
            for (const [party, votes] of Object.entries(mVotes)) {
              if (party === 'VOTOS_BRANCOS' || party === 'VOTOS_NULOS' || party === 'TOTAL_VOTOS_VALIDOS') continue;
              let finalParty = party;
              if (currentConfig.groupByPresidentialCoalition && coalitionMap[party]) {
                finalParty = coalitionMap[party];
              }
              groupedVotes[finalParty] = (groupedVotes[finalParty] || 0) + votes;
            }

            let winner = null;
            let maxV = 0;
            for (const [p, v] of Object.entries(groupedVotes)) {
              if (v > maxV) {
                maxV = v;
                winner = p;
              }
            }

            let tt = `<strong>${rawName}</strong><br>`;
            if (winner) {
              const cleanWinner = getCleanGroupName(winner);
              const pct = total > 0 ? (maxV / total) * 100 : 0;
              tt += `Vencedor local: <strong>${cleanWinner}</strong><br>`;
              tt += `Votos: ${fmtInt(maxV)} (${fmtPct(pct)})`;
            } else {
              tt += `Sem dados`;
            }
            layer.bindTooltip(tt, { className: 'sim-tooltip', sticky: true });
          }
        }).addTo(mapObj);
      }
    }

    // Now style the districts to create the clipping effect (if muni data exists) or standard highlight
    if (distritosLayer) {
      distritosLayer.eachLayer(layer => {
        if (layer.feature.properties.fid === fid) {
          if (hasMuniData) {
            // Selected district with muni view: Transparent fill to show munis, thick border
            layer.setStyle({
              weight: 2,
              color: '#ffffff', // strong border
              opacity: 1.0,
              fillOpacity: 0.0 // transparent window to the municipal layer
            });
            if (layer._path) {
              layer._path.style.pointerEvents = 'none'; // allow mouse events to pass through
            }
          } else {
            // Standard highlight
            layer.setStyle({
              weight: 1.75,
              color: '#ffffff',
              opacity: 1.0,
              fillOpacity: 0.95
            });
            if (layer._path) {
              layer._path.style.pointerEvents = '';
            }
          }
          layer.bringToFront();
          layer.openTooltip();
        } else {
          if (hasMuniData) {
            // Unselected districts: Dark and opaque to hide overflowing municipalities
            layer.setStyle({
              weight: 0.5,
              color: '#2a2a35',
              opacity: 0.6,
              fillColor: '#0c0d11',
              fillOpacity: 0.95
            });
            if (layer._path) {
              layer._path.style.pointerEvents = '';
            }
            layer.bringToFront(); // bring unselected districts above the muni layer too
          } else {
            distritosLayer.resetStyle(layer);
            if (layer._path) {
              layer._path.style.pointerEvents = '';
            }
          }
        }
      });

      // Ensure the selected district border is ON TOP of everything else
      if (hasMuniData && districtLayerToFocus) {
        districtLayerToFocus.bringToFront();
      }
    }

    if (districtLayerToFocus) {
      glFitBounds(districtLayerToFocus.getBounds(), [30, 30]);
    }

    renderDistrictResultsList();
  } catch (err) {
    console.error(err);
  } finally {
    loader.classList.remove('visible');
  }
}

// Render results list for district mode
function renderDistrictResultsList() {
  const resultsList = document.getElementById('resultsList');
  resultsList.innerHTML = '';

  const resultsTitle = document.getElementById('resultsTitle');
  const resultsSubtitle = document.getElementById('resultsSubtitle');
  const simMetrics = document.getElementById('simMetrics');
  simMetrics.innerHTML = ''; // Clear boxy metrics completely

  if (!districtSimResults) {
    resultsTitle.textContent = 'Modo Distrital';
    resultsSubtitle.textContent = 'Dados não carregados';
    return;
  }

  const { nationalSeats, stateSeats, districtWinners, partyNationalVotes, partyNationalPct, nationalValidVotes, totalSeats } = districtSimResults;

  if (selectedState === null) {
    // NATIONAL VIEW - show party seat totals
    resultsTitle.textContent = 'Brasil — Distrital';
    resultsSubtitle.textContent = `Câmara dos Deputados (${totalSeats} distritos)`;

    // List parties by seats won
    const sortedParties = Object.entries(nationalSeats)
      .filter(([party, seats]) => seats > 0 || (partyNationalVotes[party] > 0))
      .map(([party, seats]) => ({
        party, seats,
        votes: partyNationalVotes[party] || 0,
        pct: partyNationalPct[party] || 0,
        color: getPartyColor(party),
        cleanName: getCleanGroupName(party)
      }))
      .sort((a, b) => b.seats - a.seats || b.votes - a.votes);

    const seatWinner = sortedParties[0] ? sortedParties[0].party : null;

    // Header block in NYT editorial style (Dark Theme)
    const headerBlock = document.createElement('div');
    headerBlock.style.backgroundColor = '#1c1c1c';
    headerBlock.style.border = '1px solid var(--border-color)';
    headerBlock.style.padding = '12px';
    headerBlock.style.marginBottom = '16px';
    headerBlock.style.borderRadius = 'var(--radius-md)';
    headerBlock.innerHTML = `
      <div style="display: inline-block; font-size: 10px; font-weight: 700; color: #fff; background: var(--ok); padding: 2px 6px; margin-bottom: 6px; letter-spacing: 0.5px; border-radius: 2px;">CÂMARA DOS DEPUTADOS</div>
      <div style="font-family: var(--font-title); font-size: 1.1rem; font-weight: 700; line-height: 1.3; color: #fff; margin-bottom: 4px;">
        Projeção de Bancadas Distritais
      </div>
      <div style="font-size: 12px; color: var(--text-sec);">
        Simulação baseada no vencedor de cada um dos <strong>${totalSeats}</strong> distritos uninominais do país.
      </div>
    `;
    resultsList.appendChild(headerBlock);

    let rowsHtml = '';
    sortedParties.forEach((p, idx) => {
      const isWinner = p.party === seatWinner;
      const votePctStr = p.pct.toFixed(1);
      const checkmark = isWinner ? '<span style="font-size: 10px; margin-left: 6px; color: var(--text);">✔</span>' : '';

      rowsHtml += `
        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease; ${p.seats === 0 ? 'opacity: 0.55;' : ''}">
          <td style="text-align: left; padding: 8px 6px; border-left: 4px solid ${p.color};">
            <span style="font-weight: ${isWinner ? '700' : '500'}; margin-left: 4px; font-size: 13px;">${p.cleanName}</span>${checkmark}
          </td>
          <td style="padding: 8px 6px; text-align: right; font-weight: 700; font-size: 13px; color: var(--text);">${p.seats}</td>
          <td style="padding: 8px 6px; text-align: right;">
            <div style="display: flex; align-items: center; gap: 6px; justify-content: flex-end;">
              <span style="font-weight: 700; min-width: 32px; font-size: 11px; text-align: right;">${votePctStr}%</span>
              <div style="width: 50px; height: 6px; background: #262626; border-radius: 2px; overflow: hidden; flex-shrink: 0;">
                <div style="width: ${votePctStr}%; height: 100%; background: ${p.color};"></div>
              </div>
            </div>
          </td>
          <td style="padding: 8px 6px; text-align: right; color: var(--text-sec); font-size: 11px;">${fmtInt(p.votes)}</td>
        </tr>
      `;
    });

    if (rowsHtml === '') {
      rowsHtml = `<tr><td colspan="4" style="text-align:center;color:#777;padding: 12px;">Sem dados</td></tr>`;
    }

    const tableDiv = document.createElement('div');
    tableDiv.innerHTML = `
      <table class="district-nyt-table" style="color: var(--text); border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th style="text-align: left; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px; font-size: 11px;">Partido</th>
            <th style="text-align: right; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px; font-size: 11px;">Cadeiras</th>
            <th style="text-align: right; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px; font-size: 11px; width: 95px;">% Votos</th>
            <th style="text-align: right; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px; font-size: 11px;">Votos Totais</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="font-size: 11px; color: var(--muted); border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 8px; text-align: right;">
        Votos válidos nacionais: <strong>${fmtInt(nationalValidVotes)}</strong>
      </div>
    `;
    resultsList.appendChild(tableDiv);
    drawChamber(totalSeats, nationalSeats, partyNationalVotes, nationalValidVotes);

  } else if (selectedDistrict === null) {
    // STATE VIEW - show districts in this state
    const stateName = UF_NAMES[selectedState];
    const stateDistricts = districtWinners.filter(d => d.uf === selectedState);

    resultsTitle.textContent = `${stateName} (${selectedState})`;
    resultsSubtitle.textContent = `${stateDistricts.length} distrito(s) uninominais`;

    const stateVotes = stateDistricts.reduce((s, d) => s + d.totalVotes, 0);
    const statePartySeats = stateSeats[selectedState] || {};

    // Header block in NYT editorial style (Dark Theme)
    const headerBlock = document.createElement('div');
    headerBlock.style.backgroundColor = '#1c1c1c';
    headerBlock.style.border = '1px solid var(--border-color)';
    headerBlock.style.padding = '12px';
    headerBlock.style.marginBottom = '16px';
    headerBlock.style.borderRadius = 'var(--radius-md)';
    headerBlock.innerHTML = `
      <div style="display: inline-block; font-size: 10px; font-weight: 700; color: #fff; background: var(--accent); padding: 2px 6px; margin-bottom: 6px; letter-spacing: 0.5px; border-radius: 2px;">ELEIÇÃO ESTADUAL</div>
      <div style="font-family: var(--font-title); font-size: 1.1rem; font-weight: 700; line-height: 1.3; color: #fff; margin-bottom: 4px;">
        Resultados em ${stateName}
      </div>
      <div style="font-size: 12px; color: var(--text-sec);">
        Divisão de distritos no estado: <strong>${stateDistricts.length}</strong> vagas uninominais.
      </div>
    `;
    resultsList.appendChild(headerBlock);

    // 1. State seat summary table
    const statePartList = Object.keys(partyNationalVotes)
      .map(party => ({
        party,
        seats: statePartySeats[party] || 0,
        color: getPartyColor(party),
        cleanName: getCleanGroupName(party)
      }))
      .filter(p => p.seats > 0 || (partyNationalVotes[p.party] > 0))
      .sort((a, b) => b.seats - a.seats);

    const totalStateSeats = stateDistricts.length;
    const stateWinner = statePartList[0] ? statePartList[0].party : null;

    let summaryRowsHtml = '';
    statePartList.forEach(p => {
      const isWinner = p.party === stateWinner;
      const seatPct = totalStateSeats > 0 ? ((p.seats / totalStateSeats) * 100).toFixed(1) : '0.0';
      const checkmark = isWinner ? '<span style="font-size: 10px; margin-left: 6px; color: var(--text);">✔</span>' : '';

      summaryRowsHtml += `
        <tr style="border-bottom: 1px solid var(--border-color); ${p.seats === 0 ? 'opacity: 0.55;' : ''}">
          <td style="text-align: left; padding: 6px 8px; border-left: 4px solid ${p.color};">
            <span style="font-weight: ${isWinner ? '700' : '500'}; margin-left: 4px; font-size: 13px;">${p.cleanName}</span>${checkmark}
          </td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 700; font-size: 13px; color: var(--text);">${p.seats}</td>
          <td style="padding: 6px 8px; text-align: right;">
            <div style="display: flex; align-items: center; gap: 6px; justify-content: flex-end;">
              <span style="font-weight: 700; min-width: 32px; font-size: 11px; text-align: right;">${seatPct}%</span>
              <div style="width: 50px; height: 6px; background: #262626; border-radius: 2px; overflow: hidden; flex-shrink: 0;">
                <div style="width: ${seatPct}%; height: 100%; background: ${p.color};"></div>
              </div>
            </div>
          </td>
        </tr>
      `;
    });

    if (summaryRowsHtml === '') {
      summaryRowsHtml = `<tr><td colspan="3" style="text-align:center;color:#777;padding: 8px;font-size:12px;">Nenhum distrito vencido neste estado</td></tr>`;
    }

    const summaryTableHtml = `
      <div style="margin-bottom: 20px;">
        <h4 style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted); margin-bottom: 8px;">Cadeiras por Partido</h4>
        <table class="district-nyt-table" style="color: var(--text); border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="text-align: left; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px 8px; font-size: 11px;">Partido</th>
              <th style="text-align: right; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px 8px; font-size: 11px;">Vagas</th>
              <th style="text-align: right; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px 8px; font-size: 11px; width: 95px;">%</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRowsHtml}
          </tbody>
        </table>
      </div>
    `;

    const summaryContainer = document.createElement('div');
    summaryContainer.innerHTML = summaryTableHtml;
    resultsList.appendChild(summaryContainer);

    const statePartyVotes = {};
    stateDistricts.forEach(d => {
      for (const [party, votes] of Object.entries(d.allVotes || {})) {
        statePartyVotes[party] = (statePartyVotes[party] || 0) + votes;
      }
    });
    drawChamber(totalStateSeats, statePartySeats, statePartyVotes, stateVotes);

    // 2. Individual districts table
    stateDistricts.sort((a, b) => a.district - b.district);

    let districtsRowsHtml = '';
    stateDistricts.forEach(d => {
      const winnerColor = d.winner ? getPartyColor(d.winner) : '#777';
      const cleanWinner = d.winner ? getCleanGroupName(d.winner) : 'N/A';
      districtsRowsHtml += `
        <tr data-fid="${d.fid}" style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease; cursor: pointer;">
          <td style="text-align: left; padding: 8px; font-weight: 600; font-size: 13px; color: var(--text);">Distrito ${d.district}</td>
          <td style="text-align: left; padding: 8px; border-left: 4px solid ${winnerColor}; font-size: 13px;">
            <span style="margin-left: 4px; font-weight: 500;">${cleanWinner}</span>
          </td>
          <td style="text-align: right; padding: 8px; font-size: 12px; font-weight: 600; color: var(--text-sec);">${fmtPct(d.margin)}</td>
          <td style="text-align: right; padding: 8px; font-size: 11px; color: var(--muted);">${fmtInt(d.totalVotes)}</td>
        </tr>
      `;
    });

    const districtsTableHtml = `
      <div>
        <h4 style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted); margin-bottom: 8px;">Resultados Detalhados</h4>
        <table class="district-nyt-table" style="color: var(--text); border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="text-align: left; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 8px; font-size: 11px;">Distrito</th>
              <th style="text-align: left; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 8px; font-size: 11px;">Vencedor</th>
              <th style="text-align: right; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 8px; font-size: 11px;">Margem</th>
              <th style="text-align: right; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 8px; font-size: 11px;">Votos</th>
            </tr>
          </thead>
          <tbody>
            ${districtsRowsHtml}
          </tbody>
        </table>
        <div style="font-size: 11px; color: var(--muted); border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 8px; text-align: right;">
          Votos válidos no estado: <strong>${fmtInt(stateVotes)}</strong>
        </div>
      </div>
    `;

    const districtsContainer = document.createElement('div');
    districtsContainer.innerHTML = districtsTableHtml;
    resultsList.appendChild(districtsContainer);

    // Bind click and hover interactions
    const distRows = districtsContainer.querySelectorAll('tbody tr[data-fid]');
    distRows.forEach(row => {
      const fid = parseInt(row.getAttribute('data-fid'));
      row.addEventListener('click', () => {
        selectDistrictDetail(fid);
      });

      row.addEventListener('mouseenter', () => {
        if (distritosLayer) {
          distritosLayer.eachLayer(layer => {
            if (layer.feature.properties.fid === fid) {
              layer.setStyle({ weight: 3, color: '#ffffff', opacity: 1 });
              layer.bringToFront();
            }
          });
        }
      });

      row.addEventListener('mouseleave', () => {
        if (distritosLayer && selectedDistrict !== fid) {
          distritosLayer.eachLayer(layer => {
            if (layer.feature.properties.fid === fid) {
              distritosLayer.resetStyle(layer);
            }
          });
        }
      });
    });

  } else {
    // DISTRICT DETAIL VIEW - show vote breakdown for this district
    const dResult = districtWinners.find(d => d.fid === selectedDistrict);
    if (!dResult) return;

    const stateName = UF_NAMES[dResult.uf];
    resultsTitle.textContent = `Distrito ${dResult.district} — ${stateName}`;
    resultsSubtitle.textContent = `Resultado Uninominal`;

    const winnerColor = dResult.winner ? getPartyColor(dResult.winner) : '#777';
    const cleanWinner = dResult.winner ? getCleanGroupName(dResult.winner) : 'N/A';

    // Header block in NYT editorial style (Dark Theme)
    const headerBlock = document.createElement('div');
    headerBlock.style.backgroundColor = '#1c1c1c';
    headerBlock.style.border = '1px solid var(--border-color)';
    headerBlock.style.padding = '12px';
    headerBlock.style.marginBottom = '16px';
    headerBlock.style.borderRadius = 'var(--radius-md)';
    headerBlock.innerHTML = `
      <div style="display: inline-block; font-size: 10px; font-weight: 700; color: #fff; background: var(--accent); padding: 2px 6px; margin-bottom: 6px; letter-spacing: 0.5px; border-radius: 2px;">VENCEDOR DISTRITAL</div>
      <div style="font-family: var(--font-title); font-size: 1.1rem; font-weight: 700; line-height: 1.3; color: #fff; margin-bottom: 4px;">
        Vitória do ${cleanWinner}
      </div>
      <div style="font-size: 12px; color: var(--text-sec);">
        Margem de vitória: <strong>${fmtPct(dResult.margin)}</strong> sobre o segundo colocado.
      </div>
    `;
    resultsList.appendChild(headerBlock);

    // Show all parties sorted by votes
    const sortedVotes = Object.entries(dResult.allVotes)
      .map(([party, votes]) => ({
        party, votes,
        pct: dResult.totalVotes > 0 ? (votes / dResult.totalVotes) * 100 : 0,
        color: getPartyColor(party),
        cleanName: getCleanGroupName(party),
        isWinner: party === dResult.winner
      }))
      .sort((a, b) => b.votes - a.votes);

    let rowsHtml = '';
    sortedVotes.forEach(p => {
      const checkmark = p.isWinner ? '<span style="font-size: 10px; margin-left: 6px; color: var(--text);">✔</span>' : '';
      const pctStr = p.pct.toFixed(2);

      rowsHtml += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="text-align: left; padding: 8px 6px; border-left: 4px solid ${p.color};">
            <span style="font-weight: ${p.isWinner ? '700' : '500'}; margin-left: 4px; font-size: 13px;">${p.cleanName}</span>${checkmark}
          </td>
          <td style="padding: 8px 6px; text-align: right; font-weight: 600; font-size: 13px; color: var(--text);">${fmtInt(p.votes)}</td>
          <td style="padding: 8px 6px; text-align: right;">
            <div style="display: flex; align-items: center; gap: 6px; justify-content: flex-end;">
              <span style="font-weight: 700; min-width: 45px; font-size: 12px; text-align: right;">${pctStr}%</span>
              <div style="width: 60px; height: 6px; background: #262626; border-radius: 2px; overflow: hidden; flex-shrink: 0;">
                <div style="width: ${p.pct}%; height: 100%; background: ${p.color};"></div>
              </div>
            </div>
          </td>
        </tr>
      `;
    });

    if (rowsHtml === '') {
      rowsHtml = `<tr><td colspan="3" style="text-align:center;color:#777;padding: 12px;">Sem dados de votação</td></tr>`;
    }

    const tableDiv = document.createElement('div');
    tableDiv.innerHTML = `
      <table class="district-nyt-table" style="color: var(--text); border-collapse: collapse; width: 100%; margin-bottom: 16px;">
        <thead>
          <tr>
            <th style="text-align: left; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px; font-size: 11px;">Partido</th>
            <th style="text-align: right; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px; font-size: 11px;">Votos</th>
            <th style="text-align: right; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px; font-size: 11px; width: 120px;">Porcentagem</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="font-size: 11px; color: var(--muted); border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 8px; text-align: right;">
        Votos válidos no distrito: <strong>${fmtInt(dResult.totalVotes)}</strong>
      </div>
    `;
    resultsList.appendChild(tableDiv);
    drawChamber(0, {}, {}, 0);

    // Add back button to go to state district list
    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-apply';
    backBtn.style.marginTop = '16px';
    backBtn.style.width = '100%';
    backBtn.innerHTML = '← Voltar aos distritos de ' + stateName;
    backBtn.addEventListener('click', () => {
      selectedDistrict = null;
      renderDistrictMapNational();
      if (distritosLayer) {
        glFitBounds(distritosLayer.getBounds(), [20, 20]);
      }
      renderDistrictResultsList();
    });
    resultsList.appendChild(backBtn);
  }
}

// Toggle between proportional and district modes
function setSystemType(type) {
  currentSystemType = type;
  selectedDistrict = null;
  selectedRegion = null;

  if (type === 'distrital') {
    document.body.classList.add('mode-distrital');

    // Run district simulation
    runDistrictSimulation();
    renderDistrictMapNational();
    renderDistrictResultsList();

    // Reset view to national
    if (selectedState !== null) {
      selectedState = null;
      fitNationalBounds();
    }
    document.getElementById('btnBackToNational').classList.add('hidden');



  } else {
    document.body.classList.remove('mode-distrital');

    // Remove district layers
    if (distritosLayer) {
      glRemove(distritosLayer);
      distritosLayer = null;
    }
    if (distritosMuniLayer) {
      glRemove(distritosMuniLayer);
      distritosMuniLayer = null;
    }

    // Return to proportional mode
    if (selectedState !== null || selectedRegion !== null) {
      selectedState = null;
      selectedRegion = null;
      fitNationalBounds();
    }
    document.getElementById('btnBackToNational').classList.add('hidden');



    runSimulation();
    renderResultsList();
    renderMap();
  }
}

// Zip loaders
async function loadZipIndex() {
  try {
    const res = await fetch(DATA_BASE_URL + 'zip_index.json');
    if (res.ok) {
      ZIP_INDEX = await res.json();
    } else {
      ZIP_INDEX = {};
    }
  } catch (e) {
    ZIP_INDEX = {};
  }
}

async function fetchGeoJSON(path) {
  if (ZIP_INDEX === null) await loadZipIndex();
  let relativePath = path.startsWith(DATA_BASE_URL) ? path.substring(DATA_BASE_URL.length) : path;

  if (ZIP_INDEX && ZIP_INDEX[relativePath]) {
    const entry = ZIP_INDEX[relativePath];
    const zipUrl = DATA_BASE_URL + entry.zip;
    let reader = ZIP_READERS.get(zipUrl);
    if (!reader) {
      reader = await unzipit.unzip(zipUrl);
      ZIP_READERS.set(zipUrl, reader);
    }
    let fileEntry = reader.entries[entry.file];
    if (!fileEntry) {
      const lowerName = entry.file.toLowerCase();
      for (const k in reader.entries) {
        if (k.toLowerCase() === lowerName) { fileEntry = reader.entries[k]; break; }
      }
    }
    if (!fileEntry) throw new Error("File not found in zip");
    const blob = await fileEntry.blob('application/json');
    return JSON.parse(await blob.text());
  }
  const response = await fetch(path);
  return await response.json();
}

// District geometries are stored split per state (UF) under resultados_geo/distritos/
// to keep each file under GitHub's 100MB limit. Load every state file in parallel and
// merge them back into a single FeatureCollection so the rest of the app sees one dataset.
async function fetchDistritosGeoJSON() {
  const ufs = Object.values(UF_CODE_TO_SIGLA);
  const parts = await Promise.all(
    ufs.map(uf =>
      fetchGeoJSON(`${DATA_BASE_URL}distritos/distritos_simulados_${uf}.geojson`)
        .catch(err => {
          console.warn(`Falha ao carregar distritos do estado ${uf}:`, err);
          return null;
        })
    )
  );
  const features = [];
  for (const part of parts) {
    if (part && part.features) features.push(...part.features);
  }
  if (features.length === 0) return null;
  return { type: 'FeatureCollection', features };
}

async function fetchDeputyData(uf) {
  const zipUrl = `${DATA_BASE_URL}Legislativas ${currentYear}/deputados_federal_${currentYear}_${uf}.zip`;
  const jsonName = `deputados_federal_${currentYear}_${uf}.json`;
  const reader = await unzipit.unzip(zipUrl);
  const fileEntry = reader.entries[jsonName];
  if (!fileEntry) throw new Error(`File ${jsonName} not found in zip`);
  const blob = await fileEntry.blob('application/json');
  return JSON.parse(await blob.text());
}

async function fetchPresidentData(uf) {
  const zipUrl = `${DATA_BASE_URL}Majoritarias ${currentYear}/presidente_${currentYear}_t1_${uf}.zip`;
  const jsonName = `presidente_${currentYear}_t1_${uf}.json`;
  const reader = await unzipit.unzip(zipUrl);
  const fileEntry = reader.entries[jsonName];
  if (!fileEntry) throw new Error(`File ${jsonName} not found in zip`);
  const blob = await fileEntry.blob('application/json');
  return JSON.parse(await blob.text());
}

async function fetchGovernorData(uf) {
  const isOrd = (currentYear === 2014 || currentYear === 2010 || currentYear === 2006);
  const zipUrl = `${DATA_BASE_URL}Majoritarias ${currentYear}/governador_${currentYear}${isOrd ? '_ord' : ''}_t1_${uf}.zip`;
  const jsonName = `governador_${currentYear}${isOrd ? '_ord' : ''}_t1_${uf}.json`;
  const reader = await unzipit.unzip(zipUrl);
  const fileEntry = reader.entries[jsonName];
  if (!fileEntry) throw new Error(`File ${jsonName} not found in zip`);
  const blob = await fileEntry.blob('application/json');
  return JSON.parse(await blob.text());
}

// Proportional seat distribution helper using Hare Quota on populations
function getProportionalSeats(totalSeatsCount) {
  const activePop = getActivePopulations();
  const totalPop = Object.values(activePop).reduce((s, v) => s + v, 0);
  const qp = totalPop / totalSeatsCount;
  const seats = {};
  let allocated = 0;
  const remainders = [];

  for (const [uf, pop] of Object.entries(activePop)) {
    const initial = Math.floor(pop / qp);
    seats[uf] = initial;
    allocated += initial;
    remainders.push({ uf, rem: pop % qp });
  }

  // Sort remainder descending
  remainders.sort((a, b) => b.rem - a.rem);

  let i = 0;
  while (allocated < totalSeatsCount) {
    seats[remainders[i].uf]++;
    allocated++;
    i++;
  }

  return seats;
}

// Proportional seat distribution with floor minimum, adjusting surplus from most populous remainder states
function getSeatsWithMinimum(totalSeatsCount, minSeats) {
  const activePop = getActivePopulations();
  const totalPop = Object.values(activePop).reduce((s, v) => s + v, 0);
  const qp = totalPop / totalSeatsCount;
  const seats = {};
  let allocated = 0;
  const remainders = [];

  for (const [uf, pop] of Object.entries(activePop)) {
    const initial = Math.floor(pop / qp);
    seats[uf] = initial;
    allocated += initial;
    remainders.push({ uf, rem: pop % qp, pop });
  }

  remainders.sort((a, b) => b.rem - a.rem);

  const remainderAllocatedUFs = new Set();
  let i = 0;
  while (allocated < totalSeatsCount) {
    const uf = remainders[i].uf;
    seats[uf]++;
    remainderAllocatedUFs.add(uf);
    allocated++;
    i++;
  }

  // Enforce minimum and count seats needed
  let seatsNeeded = 0;
  for (const uf of Object.keys(activePop)) {
    if (seats[uf] < minSeats) {
      seatsNeeded += (minSeats - seats[uf]);
      seats[uf] = minSeats;
    }
  }

  // Remove surplus seats from states that got remainder seats, starting from most populous
  if (seatsNeeded > 0) {
    const candidates = [];
    for (const uf of remainderAllocatedUFs) {
      if (seats[uf] > minSeats) {
        candidates.push({ uf, pop: activePop[uf] });
      }
    }
    candidates.sort((a, b) => b.pop - a.pop);

    let removed = 0;
    for (let j = 0; j < candidates.length && removed < seatsNeeded; j++) {
      const uf = candidates[j].uf;
      seats[uf]--;
      removed++;
    }

    // Fallback if needed
    if (removed < seatsNeeded) {
      const fallbackCandidates = [];
      for (const [uf, val] of Object.entries(seats)) {
        if (val > minSeats) {
          fallbackCandidates.push({ uf, pop: activePop[uf] });
        }
      }
      fallbackCandidates.sort((a, b) => b.pop - a.pop);
      for (let j = 0; j < fallbackCandidates.length && removed < seatsNeeded; j++) {
        const uf = fallbackCandidates[j].uf;
        seats[uf]--;
        removed++;
      }
    }
  }

  return seats;
}

// Seat distribution logic
function getSeatsAllocationByState(distributionType) {
  if (distributionType === 'real') {
    return { ...REAL_SEATS };
  }
  if (distributionType === 'fair') {
    return getProportionalSeats(513);
  }
  if (distributionType === 'danish') {
    return getSeatsWithMinimum(513, 3);
  }
  if (distributionType === 'cubicroot') {
    const baseSeats = getProportionalSeats(588);
    const seats = {};
    for (const [uf, val] of Object.entries(baseSeats)) {
      seats[uf] = Math.max(3, val);
    }
    return seats;
  }
  if (distributionType === 'deputados_semilocal') {
    return getProportionalSeats(513);
  }
  if (distributionType === 'senado_regionalizado_1') {
    const seats = {};
    for (const uf of Object.keys(UF_NAMES)) {
      seats[uf] = 1;
    }
    return seats;
  }
  if (distributionType === 'senado_regionalizado_2') {
    const seats = {};
    for (const uf of Object.keys(UF_NAMES)) {
      seats[uf] = 2;
    }
    return seats;
  }
  if (distributionType === 'senado_degressivo') {
    return { ...DEGRESSIVE_SEATS };
  }
  return getProportionalSeats(513);
}



// Update global configuration from UI controls
function updateCurrentConfig() {
  const calcMethod = document.getElementById('selectCalcMethod')?.value || 'dhondt';
  let seatDistribution = document.getElementById('selectSeatDistribution')?.value || 'real';
  const circumscription = document.getElementById('selectCircumscription')?.value || 'estadual';

  const toggleFederalBarrier = document.getElementById('toggleFederalBarrier').checked;
  const valFederalBarrier = parseFloat(document.getElementById('sliderFederalBarrier').value);

  const toggleStateBarrier = document.getElementById('toggleStateBarrier').checked;
  const valStateBarrier = parseFloat(document.getElementById('sliderStateBarrier').value);

  const togglePresCoalition = document.getElementById('togglePresCoalition').checked;

  currentElectionLevel = document.getElementById('selectElectionLevel')?.value || 'nacional';
  currentElectionState = document.getElementById('selectElectionState')?.value || '';

  // Override seat distribution to 'real' if level is estadual but no state is selected
  if (currentElectionLevel === 'estadual' && !currentElectionState) {
    seatDistribution = 'real';
  }

  currentConfig = {
    calcMethod,
    seatDistribution,
    circumscription,
    toggleFederalBarrier,
    valFederalBarrier,
    toggleStateBarrier,
    valStateBarrier,
    groupByPresidentialCoalition: togglePresCoalition,
    electionLevel: currentElectionLevel,
    electionState: currentElectionState
  };
}

// Dynamic visibility of UI sections based on current configuration
function updateConfigVisibility() {
  const level = document.getElementById('selectElectionLevel')?.value || 'nacional';
  const circumscription = document.getElementById('selectCircumscription')?.value || 'estadual';
  const isEstadual = (level === 'estadual');

  // State selection — only visible when estadual
  const stateSection = document.getElementById('stateSelectionSection');
  if (stateSection) stateSection.classList.toggle('hidden', !isEstadual);

  // System type — only visible when nacional (estadual is always proporcional)
  const systemSection = document.getElementById('systemTypeSection');
  if (systemSection) systemSection.classList.toggle('hidden', isEstadual);
  if (isEstadual) {
    // Force proporcional in estadual mode
    const selectSystem = document.getElementById('selectSystemType');
    if (selectSystem && selectSystem.value !== 'proporcional') {
      selectSystem.value = 'proporcional';
      setSystemType('proporcional');
    }
  }

  // Circumscription type — "Nacional" option only available when level=nacional
  const optNacional = document.getElementById('optCircNacional');
  if (optNacional) {
    optNacional.disabled = isEstadual;
    if (isEstadual && circumscription === 'nacional') {
      document.getElementById('selectCircumscription').value = 'estadual';
    }
  }

  // Seat Distribution — swap options based on level
  const seatDistSelect = document.getElementById('selectSeatDistribution');
  const seatDistLabel = document.getElementById('seatDistributionLabel');
  const seatDistSection = document.getElementById('seatDistributionSection');
  if (seatDistSelect && seatDistLabel) {
    if (isEstadual) {
      seatDistLabel.textContent = 'Distribuição de Cadeiras na Assembleia';
      const uf = document.getElementById('selectElectionState')?.value || '';
      const realSeats = uf ? (ASSEMBLY_SEATS_REAL[uf] || 0) : '?';
      const alt1Seats = uf ? (ASSEMBLY_SEATS_ALT1[uf] || 0) : '?';
      const alt2Seats = uf ? (ASSEMBLY_SEATS_ALT2[uf] || 0) : '?';
      const currentVal = seatDistSelect.value;
      seatDistSelect.innerHTML = `
        <option value="real_assembly">Realista (${realSeats} cadeiras)</option>
        <option value="alt1_assembly">Método Alternativo 1 (${alt1Seats} cadeiras)</option>
        <option value="alt2_assembly">Método Alternativo 2 (${alt2Seats} cadeiras)</option>
      `;
      if (currentVal === 'alt1_assembly' || currentVal === 'alt2_assembly') {
        seatDistSelect.value = currentVal;
      } else {
        seatDistSelect.value = 'real_assembly';
      }
    } else {
      seatDistLabel.textContent = 'Distribuição de Cadeiras por Estado';
      // Check if options need to be restored to nacional set
      if (!seatDistSelect.querySelector('option[value="real"]')) {
        seatDistSelect.innerHTML = `
          <optgroup label="Câmara dos Deputados">
            <option value="real" selected>Realista (513 cadeiras)</option>
            <option value="fair">Proporcional (513 cadeiras)</option>
            <option value="danish">Compensatória (513 cadeiras)</option>
            <option value="cubicroot">Raiz Cúbica (588 cadeiras)</option>
          </optgroup>
          <optgroup label="Senado Federal">
            <option value="senado_regionalizado_1">Senado Regionalizado 1 (75 cadeiras)</option>
            <option value="senado_regionalizado_2">Senado Regionalizado 2 (100 cadeiras)</option>
            <option value="senado_degressivo">Senado Degressivo (135 cadeiras)</option>
          </optgroup>
        `;
      }
    }
  }

  // Vote base — swap options based on level
  updateVoteBaseOptions();

  // Circunscricional barrier — visible only with sub-circumscriptions
  // Nacional + estadual circumscription, Nacional + regional, Estadual + regional
  const stateBarrierSection = document.getElementById('stateBarrierSection');
  if (stateBarrierSection) {
    const actualCirc = document.getElementById('selectCircumscription')?.value || 'estadual';
    let showCircBarrier = false;
    if (!isEstadual) {
      // Nacional: show when circumscription is estadual or regional
      showCircBarrier = (actualCirc === 'estadual' || actualCirc === 'regional');
    } else {
      // Estadual: show only when circumscription is regional
      showCircBarrier = (actualCirc === 'regional');
    }
    stateBarrierSection.style.display = showCircBarrier ? '' : 'none';
  }

  // Hide Circumscription selector in AC, RO, RR, TO, AP, SE (only 1 subregion) or when Senate mode
  const circumscriptionSection = document.getElementById('circumscriptionSection');
  if (circumscriptionSection) {
    const selectedStateVal = document.getElementById('selectElectionState')?.value || '';
    const isSingleSubregionState = ['AC', 'RO', 'RR', 'TO', 'AP', 'SE'].includes(selectedStateVal);
    const seatDistVal = document.getElementById('selectSeatDistribution')?.value || '';
    const isSenado = ['senado_regionalizado_1', 'senado_regionalizado_2', 'senado_degressivo'].includes(seatDistVal);

    if (isSenado || (isEstadual && isSingleSubregionState)) {
      circumscriptionSection.style.display = 'none';
      const selectCirc = document.getElementById('selectCircumscription');
      if (selectCirc && selectCirc.value !== 'estadual') {
        selectCirc.value = 'estadual';
        currentConfig.circumscription = 'estadual';
      }
    } else {
      circumscriptionSection.style.display = '';
    }
  }

  // Presidential coalitions — hidden in proporcional mode (both nacional and estadual)
  const presCoalitionSection = document.getElementById('presCoalitionSection');
  if (presCoalitionSection) {
    const isDistrital = (currentSystemType === 'distrital' && !isEstadual);
    presCoalitionSection.classList.toggle('hidden', !isDistrital);
  }

  // Hide distribution section in nacional circumscription mode (single national pool)
  if (seatDistSection) {
    const actualCirc = document.getElementById('selectCircumscription')?.value || 'estadual';
    if (!isEstadual && actualCirc === 'nacional') {
      seatDistSection.style.display = 'none';
    } else {
      seatDistSection.style.display = '';
    }
  }
}

// Update vote base options based on election level
function updateVoteBaseOptions() {
  const selectVoteBase = document.getElementById('selectVoteBase');
  if (!selectVoteBase) return;
  const level = document.getElementById('selectElectionLevel')?.value || 'nacional';
  const currentValue = selectVoteBase.value;

  if (level === 'estadual') {
    // Only rebuild if not already showing estadual options
    if (!selectVoteBase.querySelector('option[value="estadual_2022"]')) {
      selectVoteBase.innerHTML = `
        <optgroup label="Eleições para Deputado Estadual">
          <option value="estadual_2022">Deputado Estadual 2022</option>
          <option value="estadual_2018">Deputado Estadual 2018</option>
          <option value="estadual_2014">Deputado Estadual 2014</option>
          <option value="estadual_2010">Deputado Estadual 2010</option>
          <option value="estadual_2006">Deputado Estadual 2006</option>
        </optgroup>
        <optgroup label="Eleições para Governador">
          <option value="governador_2022">Governador 2022</option>
          <option value="governador_2018">Governador 2018</option>
          <option value="governador_2014">Governador 2014</option>
          <option value="governador_2010">Governador 2010</option>
          <option value="governador_2006">Governador 2006</option>
        </optgroup>
      `;
      // Map: presidente -> governador, deputado -> estadual
      const yearMatch = currentValue.match(/(\d{4})/);
      const year = yearMatch ? yearMatch[1] : '2022';
      const isExec = currentValue.startsWith('presidente');
      const targetVal = isExec ? `governador_${year}` : `estadual_${year}`;
      if (selectVoteBase.querySelector(`option[value="${targetVal}"]`)) {
        selectVoteBase.value = targetVal;
      } else {
        selectVoteBase.value = `estadual_${year}`;
      }
    }
  } else {
    // Only restore if currently showing estadual options
    if (selectVoteBase.querySelector('option[value="estadual_2022"]')) {
      selectVoteBase.innerHTML = `
        <optgroup label="Eleições Presidenciais">
          <option value="presidente_2022">Presidente 2022 (1º Turno)</option>
          <option value="presidente_2018">Presidente 2018 (1º Turno)</option>
          <option value="presidente_2014">Presidente 2014 (1º Turno)</option>
          <option value="presidente_2010">Presidente 2010 (1º Turno)</option>
          <option value="presidente_2006">Presidente 2006 (1º Turno)</option>
        </optgroup>
        <optgroup label="Eleições para Deputado Federal">
          <option value="deputado_2022" selected>Deputado Federal 2022</option>
          <option value="deputado_2018">Deputado Federal 2018</option>
          <option value="deputado_2014">Deputado Federal 2014</option>
          <option value="deputado_2010">Deputado Federal 2010</option>
          <option value="deputado_2006">Deputado Federal 2006</option>
        </optgroup>
      `;
      // Map: governador -> presidente, estadual -> deputado
      const yearMatch = currentValue.match(/(\d{4})/);
      const year = yearMatch ? yearMatch[1] : '2022';
      const isExec = currentValue.startsWith('governador');
      const targetVal = isExec ? `presidente_${year}` : `deputado_${year}`;
      if (selectVoteBase.querySelector(`option[value="${targetVal}"]`)) {
        selectVoteBase.value = targetVal;
      } else {
        selectVoteBase.value = `deputado_${year}`;
      }
    }
  }
}

// Run simulation logic
function runSimulation() {
  updateCurrentConfig();

  // If estadual level AND a state is selected, delegate to state-level simulation
  if (currentConfig.electionLevel === 'estadual' && currentConfig.electionState) {
    runStateSimulation();
    return;
  }

  const calcMethod = currentConfig.calcMethod;
  const seatDistribution = currentConfig.seatDistribution;
  const circumscription = currentConfig.circumscription;
  const toggleFederalBarrier = currentConfig.toggleFederalBarrier;
  const valFederalBarrier = currentConfig.valFederalBarrier;
  const toggleStateBarrier = currentConfig.toggleStateBarrier;
  const valStateBarrier = currentConfig.valStateBarrier;
  const togglePresCoalition = currentConfig.groupByPresidentialCoalition;

  // Handle national circumscription (single national pool)
  if (circumscription === 'nacional') {
    runNationalCircumscriptionSimulation();
    return;
  }

  // Handle regional circumscription (semilocal subregions)
  if (circumscription === 'regional') {
    runRegionalCircumscriptionSimulation();
    return;
  }

  // Get seat counts per state (estadual circumscription — default)
  const stateSeats = getSeatsAllocationByState(seatDistribution);

  let regionalSimulationAllocations = {}; // region -> party -> seats

  // 1. Calculate party national totals and total valid votes
  const partyNationalVotes = {};
  const partyStateVotes = {}; // state -> party -> votes
  let nationalValidVotes = 0;

  for (const [uf, ufData] of Object.entries(officialTotals)) {
    const ufFederal = ufData.f;
    if (!ufFederal) continue;

    partyStateVotes[uf] = {};
    ufFederal.coalitions.forEach(c => {
      const votes = c.votes;
      let stdKey = getStandardFederationKey(c.id);

      const coalitionMap = getPresCoalitionMap();
      if (togglePresCoalition && coalitionMap[stdKey]) {
        stdKey = coalitionMap[stdKey];
      }

      partyNationalVotes[stdKey] = (partyNationalVotes[stdKey] || 0) + votes;
      partyStateVotes[uf][stdKey] = (partyStateVotes[uf][stdKey] || 0) + votes;
      nationalValidVotes += votes;
    });
  }

  // 2. Determine which parties pass the Federal Barrier
  const eligiblePartiesNational = new Set();
  const partyNationalPct = {};
  for (const [party, votes] of Object.entries(partyNationalVotes)) {
    const pct = (votes / nationalValidVotes) * 100;
    partyNationalPct[party] = pct;
    if (!toggleFederalBarrier || pct >= valFederalBarrier) {
      eligiblePartiesNational.add(party);
    }
  }

  // 3. Allocate seats by state
  const stateAllocations = {}; // state -> party -> seats
  const nationalSeats = {};
  let constituencySeats = null;
  if (seatDistribution === 'danish') {
    constituencySeats = getSeatsWithMinimum(393, 3);
  }

  for (const uf of Object.keys(officialTotals)) {
    const seatsToAllocate = seatDistribution === 'danish' ? (constituencySeats[uf] || 0) : (stateSeats[uf] || 0);
    if (seatsToAllocate <= 0) continue;

    const ufVotes = partyStateVotes[uf] || {};
    const stateValidVotes = Object.values(ufVotes).reduce((s, v) => s + v, 0);
    const qe = stateValidVotes / seatsToAllocate;

    // Filter eligible parties in this state (must pass federal barrier and state barrier)
    const eligibleStateParties = [];
    for (const [party, votes] of Object.entries(ufVotes)) {
      if (!eligiblePartiesNational.has(party)) continue;

      let passState = true;
      if (toggleStateBarrier) {
        const pct = (votes / stateValidVotes) * 100;
        if (pct < valStateBarrier) passState = false;
      }

      if (passState && votes > 0) {
        eligibleStateParties.push({ party, votes });
      }
    }

    stateAllocations[uf] = {};
    if (eligibleStateParties.length === 0) continue;

    if (calcMethod === 'hare') {
      // Largest Remainder (Hare Quota)
      const stateEligibleVotes = eligibleStateParties.reduce((s, p) => s + p.votes, 0);
      const stateQE = stateEligibleVotes / seatsToAllocate;

      let allocated = 0;
      const remainders = [];

      eligibleStateParties.forEach(p => {
        const initial = Math.floor(p.votes / stateQE);
        stateAllocations[uf][p.party] = initial;
        allocated += initial;
        remainders.push({ party: p.party, rem: p.votes % stateQE, votes: p.votes });
      });

      // Sort remainders descending
      remainders.sort((a, b) => {
        if (Math.abs(b.rem - a.rem) > 0.0001) return b.rem - a.rem;
        return b.votes - a.votes; // tie breaker: votes
      });

      let i = 0;
      while (allocated < seatsToAllocate && remainders[i]) {
        stateAllocations[uf][remainders[i].party]++;
        allocated++;
        i++;
      }

    } else {
      // Divisors method (D'Hondt or Saint-Laguë)
      const seatsWon = {};
      eligibleStateParties.forEach(p => seatsWon[p.party] = 0);

      for (let round = 0; round < seatsToAllocate; round++) {
        let maxQuotient = -1;
        let chosenParty = null;

        eligibleStateParties.forEach(p => {
          const seats = seatsWon[p.party];
          let quotient = 0;
          if (calcMethod === 'dhondt') {
            quotient = p.votes / (seats + 1);
          } else {
            // Saint-Laguë
            quotient = p.votes / (2 * seats + 1);
          }

          if (quotient > maxQuotient) {
            maxQuotient = quotient;
            chosenParty = p.party;
          } else if (Math.abs(quotient - maxQuotient) < 0.00001 && chosenParty) {
            // Tie breaker: total votes
            const curVotes = eligibleStateParties.find(x => x.party === p.party).votes;
            const chosenVotes = eligibleStateParties.find(x => x.party === chosenParty).votes;
            if (curVotes > chosenVotes) {
              chosenParty = p.party;
            }
          }
        });

        if (chosenParty) {
          seatsWon[chosenParty]++;
        }
      }

      stateAllocations[uf] = seatsWon;
    }

    // Accumulate national totals
    for (const [party, seats] of Object.entries(stateAllocations[uf])) {
      if (seats > 0) {
        nationalSeats[party] = (nationalSeats[party] || 0) + seats;
      }
    }
  }

  if (seatDistribution === 'senado_regionalizado_1' || seatDistribution === 'senado_regionalizado_2') {
    regionalSimulationAllocations = {
      "Norte": {}, "Nordeste": {}, "Centro-Oeste": {}, "Sudeste": {}, "Sul": {}
    };

    const regionCompSeats = seatDistribution === 'senado_regionalizado_1'
      ? { "Norte": 8, "Nordeste": 6, "Centro-Oeste": 11, "Sudeste": 11, "Sul": 12 }
      : { "Norte": 6, "Nordeste": 2, "Centro-Oeste": 12, "Sudeste": 12, "Sul": 14 };

    // For each region, sum votes of states and allocate regionCompSeats
    for (const [region, compSeatsCount] of Object.entries(regionCompSeats)) {
      const ufs = REGION_STATES[region];

      // Sum party votes in the region
      const regionPartyVotes = {};
      let regionValidVotes = 0;

      ufs.forEach(uf => {
        const ufVotes = partyStateVotes[uf] || {};
        for (const [party, votes] of Object.entries(ufVotes)) {
          if (eligiblePartiesNational.has(party)) {
            regionPartyVotes[party] = (regionPartyVotes[party] || 0) + votes;
            regionValidVotes += votes;
          }
        }
      });

      // Allocate compSeatsCount seats proportionally to regionPartyVotes (applying state barrier clause at region level)
      const eligibleRegionParties = [];
      for (const [party, votes] of Object.entries(regionPartyVotes)) {
        let passState = true;
        if (toggleStateBarrier && regionValidVotes > 0) {
          const pct = (votes / regionValidVotes) * 100;
          if (pct < valStateBarrier) {
            passState = false;
          }
        }
        if (passState && votes > 0) {
          eligibleRegionParties.push({ party, votes });
        }
      }

      const seatsWon = {};
      eligibleRegionParties.forEach(p => seatsWon[p.party] = 0);
      if (eligibleRegionParties.length > 0) {
        if (calcMethod === 'hare') {
          const regionQE = regionValidVotes / compSeatsCount;
          let allocated = 0;
          const remainders = [];

          eligibleRegionParties.forEach(p => {
            const initial = Math.floor(p.votes / regionQE);
            seatsWon[p.party] = initial;
            allocated += initial;
            remainders.push({ party: p.party, rem: p.votes % regionQE, votes: p.votes });
          });

          remainders.sort((a, b) => {
            if (Math.abs(b.rem - a.rem) > 0.0001) return b.rem - a.rem;
            return b.votes - a.votes;
          });

          let idx = 0;
          while (allocated < compSeatsCount && remainders[idx]) {
            seatsWon[remainders[idx].party]++;
            allocated++;
            idx++;
          }
        } else {
          // D'Hondt or Saint-Laguë
          for (let round = 0; round < compSeatsCount; round++) {
            let maxQuotient = -1;
            let chosenParty = null;

            eligibleRegionParties.forEach(p => {
              const seats = seatsWon[p.party];
              let quotient = 0;
              if (calcMethod === 'dhondt') {
                quotient = p.votes / (seats + 1);
              } else {
                quotient = p.votes / (2 * seats + 1);
              }

              if (quotient > maxQuotient) {
                maxQuotient = quotient;
                chosenParty = p.party;
              } else if (Math.abs(quotient - maxQuotient) < 0.00001 && chosenParty) {
                const curVotes = regionPartyVotes[p.party] || 0;
                const chosenVotes = regionPartyVotes[chosenParty] || 0;
                if (curVotes > chosenVotes) {
                  chosenParty = p.party;
                }
              }
            });

            if (chosenParty) {
              seatsWon[chosenParty]++;
            }
          }
        }
      }

      regionalSimulationAllocations[region] = seatsWon;

      // Accumulate to national seats!
      for (const [party, seats] of Object.entries(seatsWon)) {
        if (seats > 0) {
          nationalSeats[party] = (nationalSeats[party] || 0) + seats;
        }
      }
    }
  }

  let constituencyAllocations = null;
  let partyCompSeats = null;

  // 4. If Danish compensatory system, distribute 120 compensatory seats
  if (seatDistribution === 'danish') {
    function allocateSeatsNationally(totalSeatsCount, partyVotes, eligibleParties, method) {
      const partyVotesList = Array.from(eligibleParties).map(party => ({
        party,
        votes: partyVotes[party] || 0
      }));
      const seatsWon = {};
      eligibleParties.forEach(p => seatsWon[p] = 0);

      if (method === 'hare') {
        const totalEligibleVotes = partyVotesList.reduce((s, p) => s + p.votes, 0);
        if (totalEligibleVotes <= 0) return seatsWon;
        const nationalQE = totalEligibleVotes / totalSeatsCount;
        let allocated = 0;
        const remainders = [];

        partyVotesList.forEach(p => {
          const initial = Math.floor(p.votes / nationalQE);
          seatsWon[p.party] = initial;
          allocated += initial;
          remainders.push({ party: p.party, rem: p.votes % nationalQE, votes: p.votes });
        });

        remainders.sort((a, b) => {
          if (Math.abs(b.rem - a.rem) > 0.0001) return b.rem - a.rem;
          return b.votes - a.votes;
        });

        let i = 0;
        while (allocated < totalSeatsCount && remainders[i]) {
          seatsWon[remainders[i].party]++;
          allocated++;
          i++;
        }
      } else {
        // D'Hondt or Saint-Laguë
        for (let round = 0; round < totalSeatsCount; round++) {
          let maxQuotient = -1;
          let chosenParty = null;

          partyVotesList.forEach(p => {
            const seats = seatsWon[p.party];
            let quotient = 0;
            if (method === 'dhondt') {
              quotient = p.votes / (seats + 1);
            } else {
              quotient = p.votes / (2 * seats + 1);
            }

            if (quotient > maxQuotient) {
              maxQuotient = quotient;
              chosenParty = p.party;
            } else if (Math.abs(quotient - maxQuotient) < 0.00001 && chosenParty) {
              const curVotes = partyVotes[p.party] || 0;
              const chosenVotes = partyVotes[chosenParty] || 0;
              if (curVotes > chosenVotes) {
                chosenParty = p.party;
              }
            }
          });

          if (chosenParty) {
            seatsWon[chosenParty]++;
          }
        }
      }
      return seatsWon;
    }

    // Calculate constituency seats won by each party
    const partyConstituencySeats = {};
    for (const uf of Object.keys(stateAllocations)) {
      for (const [party, seats] of Object.entries(stateAllocations[uf])) {
        partyConstituencySeats[party] = (partyConstituencySeats[party] || 0) + seats;
      }
    }

    // Proportional allocation of 513 seats nationally with overhang check
    let targetSeats = {};
    let activeEligibleParties = new Set(eligiblePartiesNational);
    let totalSeatsToAllocate = 513;

    while (true) {
      if (totalSeatsToAllocate <= 0) {
        targetSeats = { ...partyConstituencySeats };
        break;
      }
      const allocatedTargets = allocateSeatsNationally(totalSeatsToAllocate, partyNationalVotes, activeEligibleParties, calcMethod);

      let hasOverhang = false;
      for (const party of activeEligibleParties) {
        const constituency = partyConstituencySeats[party] || 0;
        if (constituency > allocatedTargets[party]) {
          targetSeats[party] = constituency;
          totalSeatsToAllocate -= constituency;
          activeEligibleParties.delete(party);
          hasOverhang = true;
        }
      }

      if (!hasOverhang) {
        for (const party of activeEligibleParties) {
          targetSeats[party] = allocatedTargets[party];
        }
        break;
      }
    }

    // Calculate compensatory seats needed for each party
    partyCompSeats = {};
    for (const party of eligiblePartiesNational) {
      const target = targetSeats[party] || 0;
      const constituency = partyConstituencySeats[party] || 0;
      partyCompSeats[party] = Math.max(0, target - constituency);
    }

    // Distribute compensatory seats to states
    const totalSeatsByState = getSeatsAllocationByState('danish');
    const stateCompLimit = {};
    for (const uf of Object.keys(officialTotals)) {
      stateCompLimit[uf] = (totalSeatsByState[uf] || 0) - (constituencySeats[uf] || 0);
    }

    const compAllocated = {};
    const compAllocatedState = {};
    const compAllocatedParty = {};

    for (const party of eligiblePartiesNational) {
      compAllocated[party] = {};
      for (const uf of Object.keys(officialTotals)) {
        compAllocated[party][uf] = 0;
      }
      compAllocatedParty[party] = 0;
    }
    for (const uf of Object.keys(officialTotals)) {
      compAllocatedState[uf] = 0;
    }

    let remainingCompSeats = Object.values(partyCompSeats).reduce((s, v) => s + v, 0);
    const states = Object.keys(officialTotals);
    const eligibleParties = Array.from(eligiblePartiesNational);

    while (remainingCompSeats > 0) {
      let bestQuotient = -1;
      let bestP = null;
      let bestS = null;

      for (const p of eligibleParties) {
        const pCompNeed = partyCompSeats[p] || 0;
        if (compAllocatedParty[p] >= pCompNeed) continue;

        for (const s of states) {
          const sCompAvailable = stateCompLimit[s] || 0;
          if (compAllocatedState[s] >= sCompAvailable) continue;

          const votes = partyStateVotes[s][p] || 0;
          const seatsSoFar = (stateAllocations[s][p] || 0) + compAllocated[p][s];

          let quotient = 0;
          if (calcMethod === 'dhondt' || calcMethod === 'hare') {
            quotient = votes / (seatsSoFar + 1);
          } else {
            quotient = votes / (2 * seatsSoFar + 1);
          }

          if (quotient > bestQuotient) {
            bestQuotient = quotient;
            bestP = p;
            bestS = s;
          }
        }
      }

      if (bestP === null) {
        // Fallback: fill remaining slot under constraints
        for (const p of eligibleParties) {
          const pCompNeed = partyCompSeats[p] || 0;
          if (compAllocatedParty[p] >= pCompNeed) continue;

          for (const s of states) {
            const sCompAvailable = stateCompLimit[s] || 0;
            if (compAllocatedState[s] >= sCompAvailable) continue;
            bestP = p;
            bestS = s;
            break;
          }
          if (bestP !== null) break;
        }
      }

      if (bestP !== null && bestS !== null) {
        compAllocated[bestP][bestS]++;
        compAllocatedParty[bestP]++;
        compAllocatedState[bestS]++;
        remainingCompSeats--;
      } else {
        break; // Guard against infinite loop
      }
    }

    // Save constituency allocations before merging compensatory seats
    constituencyAllocations = JSON.parse(JSON.stringify(stateAllocations));

    // Merge compensatory seats into stateAllocations
    for (const p of eligibleParties) {
      for (const s of states) {
        const compSeats = compAllocated[p][s] || 0;
        if (compSeats > 0) {
          stateAllocations[s][p] = (stateAllocations[s][p] || 0) + compSeats;
        }
      }
    }

    // Recalculate/Overwrite nationalSeats to include compensatory seats
    for (const p of Object.keys(nationalSeats)) {
      nationalSeats[p] = 0;
    }
    for (const s of states) {
      for (const [party, seats] of Object.entries(stateAllocations[s] || {})) {
        nationalSeats[party] = (nationalSeats[party] || 0) + seats;
      }
    }
  }

  // Calculate subregion allocations if seatDistribution is 'deputados_semilocal'
  let subregionSeats = {};
  let subregionAllocations = {};
  if (seatDistribution === 'deputados_semilocal') {
    const electionKey = document.getElementById('selectVoteBase') ? document.getElementById('selectVoteBase').value : 'deputado_2022';
    const useExactVotes = (semilocalVotosData !== null);

    for (const uf of Object.keys(officialTotals)) {
      const stateSeatsCount = stateSeats[uf] || 0;
      if (stateSeatsCount <= 0) continue;

      const stateName = UF_NAMES[uf];
      if (!stateName) continue;

      const subregions = circuitosPopData.filter(d => d.estado === stateName);
      const subregionsCount = subregions.length;
      if (subregionsCount === 0) continue;

      // 1. Calculate seats capacity for each subregion in this state
      const subSeats = {};
      if (subregionsCount === 1) {
        const d = subregions[0];
        subSeats[d.id_local] = stateSeatsCount;
      } else {
        const totalPop = subregions.reduce((sum, d) => sum + d.populacao, 0);
        const Q = totalPop / stateSeatsCount;
        let allocated = 0;
        const remainders = [];
        subregions.forEach(d => {
          const initial = Math.floor(d.populacao / Q);
          subSeats[d.id_local] = initial;
          allocated += initial;
          remainders.push({ id_local: d.id_local, rem: d.populacao % Q, pop: d.populacao });
        });

        remainders.sort((a, b) => {
          if (Math.abs(b.rem - a.rem) > 0.0001) return b.rem - a.rem;
          return b.pop - a.pop;
        });

        let idx = 0;
        while (allocated < stateSeatsCount) {
          subSeats[remainders[idx].id_local]++;
          allocated++;
          idx++;
        }
      }

      // Initialize state allocations
      stateAllocations[uf] = {};

      // 2. Allocate seats to parties in each subregion based on subregion votes
      for (const d of subregions) {
        const subName = `${stateName}-${d.id_local}`;
        const capacity = subSeats[d.id_local];
        subregionSeats[subName] = capacity;

        if (capacity <= 0) {
          subregionAllocations[subName] = {};
          continue;
        }

        // Get subregion votes
        const subVotes = {};
        const subVotesData = (useExactVotes && semilocalVotosData[subName]) ? semilocalVotosData[subName][electionKey] : null;

        if (subVotesData) {
          let subTotalVotes = 0;
          for (const [party, votes] of Object.entries(subVotesData)) {
            if (party === 'VOTOS_BRANCOS' || party === 'VOTOS_NULOS' || party === 'TOTAL_VOTOS_VALIDOS') continue;
            if (!eligiblePartiesNational.has(party)) continue;
            subTotalVotes += votes;
          }
          for (const [party, votes] of Object.entries(subVotesData)) {
            if (party === 'VOTOS_BRANCOS' || party === 'VOTOS_NULOS' || party === 'TOTAL_VOTOS_VALIDOS') continue;
            if (!eligiblePartiesNational.has(party)) continue;
            // Apply state barrier at subregion level
            if (toggleStateBarrier && subTotalVotes > 0) {
              const pct = (votes / subTotalVotes) * 100;
              if (pct < valStateBarrier) continue;
            }
            subVotes[party] = votes;
          }
        }

        const eligibleSubParties = Object.entries(subVotes)
          .map(([party, votes]) => ({ party, votes }))
          .filter(p => p.votes > 0);

        const seatsWon = {};
        eligibleSubParties.forEach(p => seatsWon[p.party] = 0);

        if (eligibleSubParties.length > 0) {
          if (calcMethod === 'hare') {
            const totalSubVotes = eligibleSubParties.reduce((sum, p) => sum + p.votes, 0);
            const subQE = totalSubVotes / capacity;
            let allocated = 0;
            const remainders = [];

            eligibleSubParties.forEach(p => {
              const initial = Math.floor(p.votes / subQE);
              seatsWon[p.party] = initial;
              allocated += initial;
              remainders.push({ party: p.party, rem: p.votes % subQE, votes: p.votes });
            });

            remainders.sort((a, b) => {
              if (Math.abs(b.rem - a.rem) > 0.0001) return b.rem - a.rem;
              return b.votes - a.votes;
            });

            let rIdx = 0;
            while (allocated < capacity && remainders[rIdx]) {
              seatsWon[remainders[rIdx].party]++;
              allocated++;
              rIdx++;
            }
          } else {
            // Divisors method (D'Hondt or Saint-Laguë)
            for (let round = 0; round < capacity; round++) {
              let maxQuotient = -1;
              let chosenParty = null;

              eligibleSubParties.forEach(p => {
                const seats = seatsWon[p.party] || 0;
                let quotient = 0;
                if (calcMethod === 'dhondt') {
                  quotient = p.votes / (seats + 1);
                } else {
                  // Saint-Laguë
                  quotient = p.votes / (2 * seats + 1);
                }

                if (quotient > maxQuotient) {
                  maxQuotient = quotient;
                  chosenParty = p.party;
                } else if (Math.abs(quotient - maxQuotient) < 0.00001 && chosenParty) {
                  const curVotes = subVotes[p.party] || 0;
                  const chosenVotes = subVotes[chosenParty] || 0;
                  if (curVotes > chosenVotes) {
                    chosenParty = p.party;
                  }
                }
              });

              if (chosenParty) {
                seatsWon[chosenParty] = (seatsWon[chosenParty] || 0) + 1;
              }
            }
          }
        } else {
          // Fallback if there are no votes in the subregion: use the state's party votes
          const stateVotes = partyStateVotes[uf] || {};
          const eligibleStateParties = Object.entries(stateVotes)
            .map(([party, votes]) => ({ party, votes }))
            .filter(p => eligiblePartiesNational.has(p.party) && p.votes > 0)
            .sort((a, b) => b.votes - a.votes);

          let allocated = 0;
          let idx = 0;
          while (allocated < capacity && eligibleStateParties.length > 0) {
            const party = eligibleStateParties[idx % eligibleStateParties.length].party;
            seatsWon[party] = (seatsWon[party] || 0) + 1;
            allocated++;
            idx++;
          }
        }

        subregionAllocations[subName] = seatsWon;

        // Accumulate in stateAllocations
        for (const [party, count] of Object.entries(seatsWon)) {
          if (count > 0) {
            stateAllocations[uf][party] = (stateAllocations[uf][party] || 0) + count;
          }
        }
      }
    }

    // Rebuild nationalSeats from subregion allocations so the national total
    // matches the exact sum of subregion seats (avoids discrepancy from the
    // earlier state-level proportional pass that ran before subregions).
    for (const party of Object.keys(nationalSeats)) {
      nationalSeats[party] = 0;
    }
    for (const seatsWon of Object.values(subregionAllocations)) {
      for (const [party, count] of Object.entries(seatsWon)) {
        if (count > 0) {
          nationalSeats[party] = (nationalSeats[party] || 0) + count;
        }
      }
    }
  }

  nationalSimulationResults = {
    stateSeats,
    stateAllocations,
    constituencySeats,
    constituencyAllocations,
    partyCompSeats,
    nationalSeats,
    partyNationalVotes,
    partyNationalPct,
    nationalValidVotes,
    regionalAllocations: regionalSimulationAllocations,
    subregionSeats,
    subregionAllocations
  };
}

// =========================================================
// STATE-LEVEL SIMULATION (Estadual)
// =========================================================
function runStateSimulation() {
  const uf = currentConfig.electionState;
  if (!uf) {
    nationalSimulationResults = null;
    return;
  }
  const calcMethod = currentConfig.calcMethod;
  const seatDistribution = currentConfig.seatDistribution;
  const circumscription = currentConfig.circumscription;
  const toggleFederalBarrier = currentConfig.toggleFederalBarrier;
  const valFederalBarrier = currentConfig.valFederalBarrier;
  const toggleStateBarrier = currentConfig.toggleStateBarrier;
  const valStateBarrier = currentConfig.valStateBarrier;

  // Determine total seats for this state assembly
  let totalSeats = ASSEMBLY_SEATS_REAL[uf] || 24;
  if (seatDistribution === 'alt1_assembly') {
    totalSeats = ASSEMBLY_SEATS_ALT1[uf] || 25;
  } else if (seatDistribution === 'alt2_assembly') {
    totalSeats = ASSEMBLY_SEATS_ALT2[uf] || 33;
  }

  const ufData = officialTotals[uf];
  const estadualData = ufData ? (ufData.e || ufData.g) : null;

  // Collect party votes (sum subregions if available to ignore coalitions before 2022)
  const partyVotes = {};
  let totalValidVotes = 0;

  const electionKey = currentVoteBase === 'governador' ? `governador_${currentYear}` : `estadual_${currentYear}`;
  const stateName = UF_NAMES[uf];
  const subregions = circuitosPopData.filter(d => d.estado === stateName);
  let hasSubregionData = false;

  if (circumscription === 'regional' && semilocalVotosData) {
    subregions.forEach(d => {
      const subName = `${stateName}-${d.id_local}`;
      const subVotesData = semilocalVotosData[subName] ? semilocalVotosData[subName][electionKey] : null;
      if (subVotesData) {
        hasSubregionData = true;
        for (const [party, votes] of Object.entries(subVotesData)) {
          if (party === 'VOTOS_BRANCOS' || party === 'VOTOS_NULOS' || party === 'TOTAL_VOTOS_VALIDOS') continue;
          const stdKey = currentYear >= 2022 ? getStandardFederationKey(party) : getStandardFederationKey(party, true);
          partyVotes[stdKey] = (partyVotes[stdKey] || 0) + votes;
          totalValidVotes += votes;
        }
      }
    });
  }

  if (!hasSubregionData) {
    const useCandidateVotes = currentVoteBase === 'deputado' && loadedStateResults && loadedStateResults.RESULTS && loadedStateResults.METADATA && loadedStateResults.METADATA.cand_names;
    if (useCandidateVotes) {
      const { partyVotes: candidatePartyVotes, totalValidVotes: candidateValidVotes } =
        collectPartyVotesFromCandidateResults(
          loadedStateResults.RESULTS,
          loadedStateResults.METADATA.cand_names
        );

      for (const [party, votes] of Object.entries(candidatePartyVotes)) {
        partyVotes[party] = (partyVotes[party] || 0) + votes;
      }
      totalValidVotes += candidateValidVotes;
    } else {
      if (!estadualData) {
        // No state assembly or governor data available
        nationalSimulationResults = {
          stateSeats: { [uf]: totalSeats },
          stateAllocations: {},
          constituencySeats: null,
          constituencyAllocations: null,
          partyCompSeats: null,
          nationalSeats: {},
          partyNationalVotes: {},
          partyNationalPct: {},
          nationalValidVotes: 0,
          regionalAllocations: {},
          subregionSeats: {},
          subregionAllocations: {}
        };
        return;
      }

      estadualData.coalitions.forEach(c => {
        // For estadual elections, use individual parties (no federation grouping before 2022)
        let stdKey;
        if (currentYear >= 2022) {
          stdKey = getStandardFederationKey(c.id);
        } else {
          // Before 2022: no proportional coalitions — treat each party individually
          stdKey = getStandardFederationKey(c.id, true); // ignoreFederation
        }
        partyVotes[stdKey] = (partyVotes[stdKey] || 0) + c.votes;
        totalValidVotes += c.votes;
      });
    }
  }

  // Apply exclusion clause (federal barrier equivalent at state level)
  const eligibleParties = new Set();
  const partyPct = {};
  for (const [party, votes] of Object.entries(partyVotes)) {
    const pct = (votes / totalValidVotes) * 100;
    partyPct[party] = pct;
    if (!toggleFederalBarrier || pct >= valFederalBarrier) {
      eligibleParties.add(party);
    }
  }

  if (circumscription === 'regional') {
    // Regional circumscription — use semilocal subregions
    runStateRegionalSimulation(uf, totalSeats, partyVotes, totalValidVotes, eligibleParties, partyPct);
    return;
  }

  // Estadual circumscription — single district for the whole state
  const eligiblePartyList = Array.from(eligibleParties)
    .map(party => ({ party, votes: partyVotes[party] || 0 }))
    .filter(p => p.votes > 0);

  const seatsWon = allocateSeatsGeneric(totalSeats, eligiblePartyList, calcMethod);

  nationalSimulationResults = {
    stateSeats: { [uf]: totalSeats },
    stateAllocations: { [uf]: seatsWon },
    constituencySeats: null,
    constituencyAllocations: null,
    partyCompSeats: null,
    nationalSeats: { ...seatsWon },
    partyNationalVotes: partyVotes,
    partyNationalPct: partyPct,
    nationalValidVotes: totalValidVotes,
    regionalAllocations: {},
    subregionSeats: {},
    subregionAllocations: {}
  };
}

// State-level regional simulation (subregion within a single state)
function runStateRegionalSimulation(uf, totalSeats, partyVotes, totalValidVotes, eligibleParties, partyPct) {
  const calcMethod = currentConfig.calcMethod;
  const toggleStateBarrier = currentConfig.toggleStateBarrier;
  const valStateBarrier = currentConfig.valStateBarrier;
  const stateName = UF_NAMES[uf];
  const electionKey = document.getElementById('selectVoteBase')?.value || 'estadual_2022';
  const useExactVotes = (semilocalVotosData !== null);

  const subregions = circuitosPopData.filter(d => d.estado === stateName);
  const subregionSeats = {};
  const subregionAllocations = {};

  if (subregions.length === 0) {
    // Fallback: treat as single district
    const eligiblePartyList = Array.from(eligibleParties)
      .map(party => ({ party, votes: partyVotes[party] || 0 }))
      .filter(p => p.votes > 0);
    const seatsWon = allocateSeatsGeneric(totalSeats, eligiblePartyList, calcMethod);
    nationalSimulationResults = {
      stateSeats: { [uf]: totalSeats },
      stateAllocations: { [uf]: seatsWon },
      constituencySeats: null, constituencyAllocations: null, partyCompSeats: null,
      nationalSeats: { ...seatsWon },
      partyNationalVotes: partyVotes, partyNationalPct: partyPct,
      nationalValidVotes: totalValidVotes,
      regionalAllocations: {}, subregionSeats: {}, subregionAllocations: {}
    };
    return;
  }

  // Distribute seats to subregions by population
  const subSeats = {};
  if (subregions.length === 1) {
    subSeats[subregions[0].id_local] = totalSeats;
  } else {
    const totalPop = subregions.reduce((sum, d) => sum + d.populacao, 0);
    const Q = totalPop / totalSeats;
    let allocated = 0;
    const remainders = [];
    subregions.forEach(d => {
      const initial = Math.floor(d.populacao / Q);
      subSeats[d.id_local] = initial;
      allocated += initial;
      remainders.push({ id_local: d.id_local, rem: d.populacao % Q, pop: d.populacao });
    });
    remainders.sort((a, b) => Math.abs(b.rem - a.rem) > 0.0001 ? b.rem - a.rem : b.pop - a.pop);
    let idx = 0;
    while (allocated < totalSeats) {
      subSeats[remainders[idx].id_local]++;
      allocated++;
      idx++;
    }
  }

  const stateAllocations = {};
  const nationalSeats = {};

  for (const d of subregions) {
    const subName = `${stateName}-${d.id_local}`;
    const capacity = subSeats[d.id_local];
    subregionSeats[subName] = capacity;

    if (capacity <= 0) {
      subregionAllocations[subName] = {};
      continue;
    }

    // Get subregion votes — try semilocal data
    const subVotes = {};
    const subVotesData = (useExactVotes && semilocalVotosData[subName]) ? semilocalVotosData[subName][electionKey] : null;

    if (subVotesData) {
      let subTotalVotes = 0;
      for (const [party, votes] of Object.entries(subVotesData)) {
        if (party === 'VOTOS_BRANCOS' || party === 'VOTOS_NULOS' || party === 'TOTAL_VOTOS_VALIDOS') continue;
        const stdKey = currentYear >= 2022 ? getStandardFederationKey(party) : getStandardFederationKey(party, true);
        if (!eligibleParties.has(stdKey)) continue;
        subTotalVotes += votes;
      }
      for (const [party, votes] of Object.entries(subVotesData)) {
        if (party === 'VOTOS_BRANCOS' || party === 'VOTOS_NULOS' || party === 'TOTAL_VOTOS_VALIDOS') continue;
        const stdKey = currentYear >= 2022 ? getStandardFederationKey(party) : getStandardFederationKey(party, true);
        if (!eligibleParties.has(stdKey)) continue;
        if (toggleStateBarrier && subTotalVotes > 0) {
          const pct = (votes / subTotalVotes) * 100;
          if (pct < valStateBarrier) continue;
        }
        subVotes[stdKey] = (subVotes[stdKey] || 0) + votes;
      }
    }

    const eligibleSubParties = Object.entries(subVotes)
      .map(([party, votes]) => ({ party, votes }))
      .filter(p => p.votes > 0);

    let seatsWon = {};
    if (eligibleSubParties.length > 0) {
      seatsWon = allocateSeatsGeneric(capacity, eligibleSubParties, calcMethod);
    } else {
      // Fallback to state-level proportional if no subregion data
      const stateParties = Object.entries(partyVotes)
        .map(([party, votes]) => ({ party, votes }))
        .filter(p => eligibleParties.has(p.party) && p.votes > 0);
      seatsWon = allocateSeatsGeneric(capacity, stateParties, calcMethod);
    }

    subregionAllocations[subName] = seatsWon;

    // Accumulate state totals
    for (const [party, count] of Object.entries(seatsWon)) {
      if (count > 0) {
        if (!stateAllocations[uf]) stateAllocations[uf] = {};
        stateAllocations[uf][party] = (stateAllocations[uf][party] || 0) + count;
        nationalSeats[party] = (nationalSeats[party] || 0) + count;
      }
    }
  }

  nationalSimulationResults = {
    stateSeats: { [uf]: totalSeats },
    stateAllocations,
    constituencySeats: null, constituencyAllocations: null, partyCompSeats: null,
    nationalSeats,
    partyNationalVotes: partyVotes, partyNationalPct: partyPct,
    nationalValidVotes: totalValidVotes,
    regionalAllocations: {},
    subregionSeats, subregionAllocations
  };
}

// =========================================================
// NATIONAL CIRCUMSCRIPTION SIMULATION (single national pool)
// =========================================================
function runNationalCircumscriptionSimulation() {
  const calcMethod = currentConfig.calcMethod;
  const toggleFederalBarrier = currentConfig.toggleFederalBarrier;
  const valFederalBarrier = currentConfig.valFederalBarrier;
  const seatDistribution = currentConfig.seatDistribution;

  // Total seats
  let totalSeats = 513;
  if (seatDistribution === 'cubicroot') totalSeats = 588;
  else if (seatDistribution === 'senado_regionalizado_1') totalSeats = 75;
  else if (seatDistribution === 'senado_regionalizado_2') totalSeats = 100;
  else if (seatDistribution === 'senado_degressivo') totalSeats = 135;

  // Sum all votes nationally
  const partyNationalVotes = {};
  let nationalValidVotes = 0;

  for (const [uf, ufData] of Object.entries(officialTotals)) {
    const ufFederal = ufData.f;
    if (!ufFederal) continue;
    ufFederal.coalitions.forEach(c => {
      let stdKey = getStandardFederationKey(c.id);
      partyNationalVotes[stdKey] = (partyNationalVotes[stdKey] || 0) + c.votes;
      nationalValidVotes += c.votes;
    });
  }

  // Barrier
  const eligibleParties = [];
  const partyNationalPct = {};
  for (const [party, votes] of Object.entries(partyNationalVotes)) {
    const pct = (votes / nationalValidVotes) * 100;
    partyNationalPct[party] = pct;
    if (!toggleFederalBarrier || pct >= valFederalBarrier) {
      eligibleParties.push({ party, votes });
    }
  }

  const seatsWon = allocateSeatsGeneric(totalSeats, eligibleParties, calcMethod);

  // No state-level breakdown for national circumscription
  nationalSimulationResults = {
    stateSeats: {},
    stateAllocations: {},
    constituencySeats: null, constituencyAllocations: null, partyCompSeats: null,
    nationalSeats: seatsWon,
    partyNationalVotes, partyNationalPct, nationalValidVotes,
    regionalAllocations: {},
    subregionSeats: {}, subregionAllocations: {}
  };
}

// =========================================================
// REGIONAL CIRCUMSCRIPTION SIMULATION (semilocal, nacional level)
// =========================================================
function runRegionalCircumscriptionSimulation() {
  // This reuses the existing semilocal logic but separates it from the
  // 'deputados_semilocal' seat distribution option. Instead, it uses
  // the currently selected seat distribution for state totals, then
  // distributes within subregions.
  const calcMethod = currentConfig.calcMethod;
  const seatDistribution = currentConfig.seatDistribution;
  const toggleFederalBarrier = currentConfig.toggleFederalBarrier;
  const valFederalBarrier = currentConfig.valFederalBarrier;
  const toggleStateBarrier = currentConfig.toggleStateBarrier;
  const valStateBarrier = currentConfig.valStateBarrier;

  const stateSeats = getSeatsAllocationByState(seatDistribution);
  const electionKey = document.getElementById('selectVoteBase')?.value || 'deputado_2022';
  const useExactVotes = (semilocalVotosData !== null);

  // Calculate national party votes and barrier
  const partyNationalVotes = {};
  const partyStateVotes = {};
  let nationalValidVotes = 0;

  for (const [uf, ufData] of Object.entries(officialTotals)) {
    const ufFederal = ufData.f;
    if (!ufFederal) continue;
    partyStateVotes[uf] = {};
    ufFederal.coalitions.forEach(c => {
      let stdKey = getStandardFederationKey(c.id);
      partyNationalVotes[stdKey] = (partyNationalVotes[stdKey] || 0) + c.votes;
      partyStateVotes[uf][stdKey] = (partyStateVotes[uf][stdKey] || 0) + c.votes;
      nationalValidVotes += c.votes;
    });
  }

  const eligiblePartiesNational = new Set();
  const partyNationalPct = {};
  for (const [party, votes] of Object.entries(partyNationalVotes)) {
    const pct = (votes / nationalValidVotes) * 100;
    partyNationalPct[party] = pct;
    if (!toggleFederalBarrier || pct >= valFederalBarrier) {
      eligiblePartiesNational.add(party);
    }
  }

  // Now allocate within subregions, state by state
  const subregionSeats = {};
  const subregionAllocations = {};
  const stateAllocations = {};
  const nationalSeats = {};

  for (const uf of Object.keys(officialTotals)) {
    const stateSeatsCount = stateSeats[uf] || 0;
    if (stateSeatsCount <= 0) continue;
    const stateName = UF_NAMES[uf];
    if (!stateName) continue;

    const subregions = circuitosPopData.filter(d => d.estado === stateName);
    if (subregions.length === 0) {
      // Fallback to state-level allocation
      const ufVotes = partyStateVotes[uf] || {};
      const eligibleStateParties = Object.entries(ufVotes)
        .filter(([party]) => eligiblePartiesNational.has(party))
        .map(([party, votes]) => ({ party, votes }))
        .filter(p => p.votes > 0);
      const seatsWon = allocateSeatsGeneric(stateSeatsCount, eligibleStateParties, calcMethod);
      stateAllocations[uf] = seatsWon;
      for (const [party, count] of Object.entries(seatsWon)) {
        if (count > 0) nationalSeats[party] = (nationalSeats[party] || 0) + count;
      }
      continue;
    }

    // Distribute seats to subregions by population
    const subSeats = {};
    if (subregions.length === 1) {
      subSeats[subregions[0].id_local] = stateSeatsCount;
    } else {
      const totalPop = subregions.reduce((sum, d) => sum + d.populacao, 0);
      const Q = totalPop / stateSeatsCount;
      let allocated = 0;
      const remainders = [];
      subregions.forEach(d => {
        const initial = Math.floor(d.populacao / Q);
        subSeats[d.id_local] = initial;
        allocated += initial;
        remainders.push({ id_local: d.id_local, rem: d.populacao % Q, pop: d.populacao });
      });
      remainders.sort((a, b) => Math.abs(b.rem - a.rem) > 0.0001 ? b.rem - a.rem : b.pop - a.pop);
      let idx = 0;
      while (allocated < stateSeatsCount) {
        subSeats[remainders[idx].id_local]++;
        allocated++;
        idx++;
      }
    }

    stateAllocations[uf] = {};

    for (const d of subregions) {
      const subName = `${stateName}-${d.id_local}`;
      const capacity = subSeats[d.id_local];
      subregionSeats[subName] = capacity;

      if (capacity <= 0) {
        subregionAllocations[subName] = {};
        continue;
      }

      const subVotes = {};
      const subVotesData = (useExactVotes && semilocalVotosData[subName]) ? semilocalVotosData[subName][electionKey] : null;

      if (subVotesData) {
        let subTotalVotes = 0;
        for (const [party, votes] of Object.entries(subVotesData)) {
          if (party === 'VOTOS_BRANCOS' || party === 'VOTOS_NULOS' || party === 'TOTAL_VOTOS_VALIDOS') continue;
          if (!eligiblePartiesNational.has(party)) continue;
          subTotalVotes += votes;
        }
        for (const [party, votes] of Object.entries(subVotesData)) {
          if (party === 'VOTOS_BRANCOS' || party === 'VOTOS_NULOS' || party === 'TOTAL_VOTOS_VALIDOS') continue;
          if (!eligiblePartiesNational.has(party)) continue;
          if (toggleStateBarrier && subTotalVotes > 0) {
            const pct = (votes / subTotalVotes) * 100;
            if (pct < valStateBarrier) continue;
          }
          subVotes[party] = (subVotes[party] || 0) + votes;
        }
      }

      const eligibleSubParties = Object.entries(subVotes)
        .map(([party, votes]) => ({ party, votes }))
        .filter(p => p.votes > 0);

      let seatsWon = {};
      if (eligibleSubParties.length > 0) {
        seatsWon = allocateSeatsGeneric(capacity, eligibleSubParties, calcMethod);
      } else {
        // Fallback to state-level
        const stateVotes = partyStateVotes[uf] || {};
        const fallbackParties = Object.entries(stateVotes)
          .filter(([party]) => eligiblePartiesNational.has(party))
          .map(([party, votes]) => ({ party, votes }))
          .filter(p => p.votes > 0);
        seatsWon = allocateSeatsGeneric(capacity, fallbackParties, calcMethod);
      }

      subregionAllocations[subName] = seatsWon;

      for (const [party, count] of Object.entries(seatsWon)) {
        if (count > 0) {
          stateAllocations[uf][party] = (stateAllocations[uf][party] || 0) + count;
          nationalSeats[party] = (nationalSeats[party] || 0) + count;
        }
      }
    }
  }

  nationalSimulationResults = {
    stateSeats,
    stateAllocations,
    constituencySeats: null, constituencyAllocations: null, partyCompSeats: null,
    nationalSeats,
    partyNationalVotes, partyNationalPct, nationalValidVotes,
    regionalAllocations: {},
    subregionSeats, subregionAllocations
  };
}

// Generic seat allocation function (reusable for all circumscription types)
function allocateSeatsGeneric(totalSeats, partyList, method) {
  if (totalSeats <= 0 || partyList.length === 0) return {};

  const seatsWon = {};
  partyList.forEach(p => seatsWon[p.party] = 0);

  if (method === 'hare') {
    const totalVotes = partyList.reduce((s, p) => s + p.votes, 0);
    if (totalVotes <= 0) return seatsWon;
    const qe = totalVotes / totalSeats;
    let allocated = 0;
    const remainders = [];

    partyList.forEach(p => {
      const initial = Math.floor(p.votes / qe);
      seatsWon[p.party] = initial;
      allocated += initial;
      remainders.push({ party: p.party, rem: p.votes % qe, votes: p.votes });
    });

    remainders.sort((a, b) => {
      if (Math.abs(b.rem - a.rem) > 0.0001) return b.rem - a.rem;
      return b.votes - a.votes;
    });

    let i = 0;
    while (allocated < totalSeats && remainders[i]) {
      seatsWon[remainders[i].party]++;
      allocated++;
      i++;
    }
  } else {
    // Divisors (D'Hondt or Saint-Laguë)
    for (let round = 0; round < totalSeats; round++) {
      let maxQuotient = -1;
      let chosenParty = null;

      partyList.forEach(p => {
        const seats = seatsWon[p.party] || 0;
        let quotient = 0;
        if (method === 'dhondt') {
          quotient = p.votes / (seats + 1);
        } else {
          quotient = p.votes / (2 * seats + 1);
        }

        if (quotient > maxQuotient) {
          maxQuotient = quotient;
          chosenParty = p.party;
        } else if (Math.abs(quotient - maxQuotient) < 0.00001 && chosenParty) {
          if (p.votes > (partyList.find(x => x.party === chosenParty)?.votes || 0)) {
            chosenParty = p.party;
          }
        }
      });

      if (chosenParty) {
        seatsWon[chosenParty]++;
      }
    }
  }

  return seatsWon;
}

// Semicircle Plenary Chamber drawer
function getMajoritySeatCount(totalSeats) {
  return Math.floor(totalSeats / 2) + 1;
}

function escapeSvgText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function translateSvgPath(d, dx, dy) {
  if (!d) return '';
  const regex = /([a-df-z])|([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)/ig;
  let match;
  let cmd = '';
  let parts = [];
  let currentParams = [];

  while ((match = regex.exec(d)) !== null) {
    if (match[1]) {
      cmd = match[1];
      parts.push(cmd);
      currentParams = [];
    } else if (match[2]) {
      const num = parseFloat(match[2]);
      currentParams.push(num);

      const cmdUpper = cmd.toUpperCase();
      if (cmdUpper === 'M' || cmdUpper === 'L') {
        if (currentParams.length === 2) {
          const x = currentParams[0] + dx;
          const y = currentParams[1] + dy;
          parts.push(x.toFixed(2));
          parts.push(y.toFixed(2));
          currentParams = [];
        }
      } else if (cmdUpper === 'A') {
        if (currentParams.length === 7) {
          const x = currentParams[5] + dx;
          const y = currentParams[6] + dy;
          parts.push(currentParams[0].toFixed(2)); // rx
          parts.push(currentParams[1].toFixed(2)); // ry
          parts.push(currentParams[2].toString()); // x-axis-rotation
          parts.push(currentParams[3].toString()); // large-arc-flag
          parts.push(currentParams[4].toString()); // sweep-flag
          parts.push(x.toFixed(2));
          parts.push(y.toFixed(2));
          currentParams = [];
        }
      } else {
        parts.push(match[2]);
      }
    }
  }

  let pathStr = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isCmd = /[a-df-z]/i.test(part);
    if (i > 0 && !isCmd) {
      pathStr += ' ';
    }
    pathStr += part;
  }
  return pathStr;
}

function getSemicircleSeats(N) {
  if (N <= 0) return [];

  // Determine number of rows K based on N
  let K = 9;
  if (N <= 10) K = 1;
  else if (N <= 30) K = 2;
  else if (N <= 60) K = 3;
  else if (N <= 120) K = 4;
  else if (N <= 200) K = 5;
  else if (N <= 350) K = 6;
  else K = 7;

  const cx = 300;
  const cy = 360;

  let Rmin = 100;
  if (N <= 10) Rmin = 260;
  else if (N <= 30) Rmin = 245;
  else if (N <= 60) Rmin = 230;
  else if (N <= 120) Rmin = 220;
  else if (N <= 200) Rmin = 210;
  else if (N <= 350) Rmin = 200;
  else Rmin = 195;

  const Rmax = 285;

  const radii = [];
  if (K === 1) {
    radii.push((Rmin + Rmax) / 2);
  } else {
    for (let row = 0; row < K; row++) {
      radii.push(Rmin + row * (Rmax - Rmin) / (K - 1));
    }
  }

  // Distribute seat counts per ring proportional to radius
  const weightSum = radii.reduce((sum, r) => sum + r, 0);
  const seatCounts = radii.map(r => Math.round(N * r / weightSum));

  let allocated = seatCounts.reduce((sum, val) => sum + val, 0);
  let difference = N - allocated;
  let index = K - 1;

  while (difference !== 0) {
    if (difference > 0) {
      seatCounts[index]++;
      difference--;
    } else if (seatCounts[index] > 1) {
      seatCounts[index]--;
      difference++;
    }
    index = (index - 1 + K) % K;
  }

  const seats = [];
  const thetaMargin = 0.06;
  const thetaSpan = Math.PI - (2 * thetaMargin);
  const step = K === 1 ? (Rmax - Rmin) : (Rmax - Rmin) / (K - 1);

  // Use a nice thickness to create a small gap between rows
  const thickness = step * 0.88;

  // Calculate dynamic corner radius
  const cornerRadius = Math.max(1.2, Math.min(3.5, thickness * 0.20));

  // Initialize D3 arc generator
  const arcGen = d3.arc();

  for (let row = 0; row < K; row++) {
    const count = seatCounts[row];
    const rRing = radii[row];
    const thetaStep = count > 1 ? thetaSpan / (count - 1) : 0;

    const r1 = rRing - thickness / 2;
    const r2 = rRing + thickness / 2;

    for (let seatIndex = 0; seatIndex < count; seatIndex++) {
      const theta = count === 1 ? Math.PI / 2 : (Math.PI - thetaMargin - seatIndex * thetaStep);

      const localGap = 0.93; // 7% angular gap between seats
      const dTheta = (thetaSpan / count) * localGap;
      const theta1 = theta - dTheta / 2;
      const theta2 = theta + dTheta / 2;

      // D3 angles: 0 is 12 o'clock, clockwise.
      // Standard angles: 0 is 3 o'clock, counter-clockwise.
      const startAngle = Math.PI / 2 - theta2;
      const endAngle = Math.PI / 2 - theta1;

      // Generate the raw path centered at (0, 0)
      const rawPath = arcGen({
        innerRadius: r1,
        outerRadius: r2,
        startAngle: startAngle,
        endAngle: endAngle,
        cornerRadius: cornerRadius
      });

      // Translate path to (cx, cy)
      const d = translateSvgPath(rawPath, cx, cy);

      seats.push({ d, theta });
    }
  }

  seats.sort((a, b) => b.theta - a.theta);
  return seats;
}

function buildMajorityMarkerMarkup(seatsData, totalSeats) {
  const majoritySeats = getMajoritySeatCount(totalSeats);
  const markerIndex = Math.min(majoritySeats - 1, seatsData.length - 1);
  const markerSeat = seatsData[markerIndex];

  if (!markerSeat) return '';

  const viewWidth = 600;
  const labelText = `Maioria absoluta: ${majoritySeats}`;
  const labelWidth = Math.max(170, labelText.length * 6.9);
  const markerX = markerSeat.x ?? markerSeat.cx;
  const markerY = markerSeat.y ?? markerSeat.cy;
  const markerRadius = markerSeat.r || 0;
  const labelX = Math.max(14, Math.min(viewWidth - labelWidth - 14, markerX - labelWidth / 2));
  const labelY = 14;
  const lineTopY = 46;
  const lineBottomY = Math.max(lineTopY + 18, markerY - markerRadius - 8);

  return `
    <g class="majority-marker">
      <line x1="${markerX}" y1="${lineTopY}" x2="${markerX}" y2="${lineBottomY}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6 5" stroke-linecap="round" opacity="0.9"></line>
      <circle cx="${markerX}" cy="${lineBottomY}" r="5.5" fill="#f59e0b" stroke="#0d0e12" stroke-width="1.5"></circle>
      <rect x="${labelX}" y="${labelY}" width="${labelWidth}" height="24" rx="8" fill="rgba(245, 158, 11, 0.16)" stroke="rgba(245, 158, 11, 0.35)" stroke-width="1"></rect>
      <text x="${labelX + labelWidth / 2}" y="${labelY + 15}" text-anchor="middle" font-family="var(--font-title)" font-size="11" font-weight="700" fill="var(--text)">${escapeSvgText(labelText)}</text>
    </g>
  `;
}

// Rectangular Grid Plenary Chamber drawer for states
function getRectangularSeats(N) {
  if (N <= 0) return [];

  // Determine rows. If N >= 6, force at least 2 rows.
  let Rows = Math.ceil(N / 10);
  if (N >= 6 && Rows === 1) {
    Rows = 2;
  }

  // Distribute seats among rows as evenly as possible, putting remainders in top rows
  const seatsInRow = [];
  const baseSeats = Math.floor(N / Rows);
  const remainder = N % Rows;
  for (let r = 0; r < Rows; r++) {
    seatsInRow.push(baseSeats + (r < remainder ? 1 : 0));
  }

  // Maximum columns in any row (to define cell sizes uniformly)
  const maxCols = Math.max(...seatsInRow);

  // We want to center the grid inside the SVG viewBox: Y from 90 to 300, X from 70 to 530
  // Area width: 460, Area height: 210
  const W_area = 460;
  const H_area = 210;

  // Let's compute a nice size for the seats based on maximum row column count
  const cellW = W_area / maxCols;
  const cellH = H_area / Rows;

  // We want the seats to be square, let's keep them square
  const seatSize = Math.min(cellW, cellH, 32); // max size 32px

  // Separation parameter: same as circle localGap = 0.96
  const gapFactor = 0.96;
  const w_seat = seatSize * gapFactor;
  const h_seat = seatSize * gapFactor;

  // Total grid height
  const gridH = Rows * seatSize;

  // Center coordinates in viewBox (viewBox="0 65 600 305")
  const cx = 300;
  let cy = 205; // Center Y of the vertical space

  // Prevent overlap with bottom seat count text (at Y=332)
  const bottomLimit = 295;
  if (cy + gridH / 2 > bottomLimit) {
    cy = bottomLimit - gridH / 2;
  }

  const Y_start = cy - gridH / 2;

  const seats = [];
  const rx = 3;
  const ry = 3;

  for (let r = 0; r < Rows; r++) {
    const numSeats = seatsInRow[r];
    const rowW = numSeats * seatSize;
    // Each row has its own starting X coordinate to center it horizontally!
    const X_start_row = cx - rowW / 2;
    const y = Y_start + r * seatSize + (seatSize - h_seat) / 2;

    for (let c = 0; c < numSeats; c++) {
      const x = X_start_row + c * seatSize + (seatSize - w_seat) / 2;

      // Rounded rectangle path
      const d = `M ${x + rx} ${y} ` +
        `h ${w_seat - 2 * rx} ` +
        `a ${rx},${ry} 0 0 1 ${rx},${ry} ` +
        `v ${h_seat - 2 * ry} ` +
        `a ${rx},${ry} 0 0 1 -${rx},${ry} ` +
        `h -${w_seat - 2 * rx} ` +
        `a ${rx},${ry} 0 0 1 -${rx},-${ry} ` +
        `v -${h_seat - 2 * ry} ` +
        `a ${rx},${ry} 0 0 1 ${rx},-${ry} Z`;

      seats.push({ d, theta: 0 });
    }
  }

  return seats;
}

function drawChamber(totalSeats, partyAllocations, partyVotes, totalVotes) {
  // Capture current chamber results for Pactômetro
  pactChamberTotalSeats = totalSeats;
  pactChamberAllocations = { ...partyAllocations };

  const btnPactometro = document.getElementById('btnPactometro');
  if (btnPactometro) {
    const isStateViewInNational = (currentElectionLevel === 'nacional' && selectedState !== null);
    const isCircumscriptionView = (selectedRegion !== null || selectedSubregion !== null || selectedDistrict !== null);
    if (totalSeats <= 1 || isStateViewInNational || isCircumscriptionView) {
      btnPactometro.style.display = 'none';
    } else {
      btnPactometro.style.display = 'inline-flex';
    }
  }

  const svg = document.getElementById('chamberSvg');
  if (!svg) return;
  const svgNS = 'http://www.w3.org/2000/svg';

  const createSvgEl = (tagName, attributes = {}) => {
    const element = document.createElementNS(svgNS, tagName);
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(key, String(value));
      }
    });
    return element;
  };

  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }

  // Create array of seat objects grouped by party
  // Sort parties by seats won descending
  const sortedParties = Object.entries(partyAllocations)
    .filter(([_, seats]) => seats > 0)
    .map(([party, seats]) => ({
      party,
      seats,
      color: getPartyColor(party),
      cleanName: getCleanGroupName(party),
      votes: partyVotes[party] || 0
    }))
    .sort((a, b) => b.seats - a.seats || b.votes - a.votes || a.cleanName.localeCompare(b.cleanName));

  const seatsArray = [];
  sortedParties.forEach(p => {
    for (let i = 0; i < p.seats; i++) {
      seatsArray.push({
        party: p.party,
        color: p.color,
        cleanName: p.cleanName,
        votes: p.votes,
        totalSeats: p.seats
      });
    }
  });

  const useSemicircle = (selectedState === null && selectedRegion === null && selectedSubregion === null) ||
    (currentElectionLevel === 'estadual' && selectedSubregion === null && selectedRegion === null);
  const seatsData = useSemicircle ? getSemicircleSeats(totalSeats) : getRectangularSeats(totalSeats);
  const seatsGroup = createSvgEl('g', { class: 'chamber-seats' });

  seatsData.forEach((seat, index) => {
    const seatInfo = seatsArray[index];
    const color = seatInfo ? seatInfo.color : '#555555';
    const party = seatInfo ? seatInfo.party : 'OUTROS';
    const seatElement = createSvgEl('path', {
      class: 'chamber-seat',
      d: seat.d,
      fill: color,
      stroke: '#0d0e12',
      'stroke-width': '0.5',
      'data-party': party
    });

    seatsGroup.appendChild(seatElement);
  });

  svg.appendChild(seatsGroup);

  if (totalSeats > 0) {
    const totalGroup = createSvgEl('g', { class: 'chamber-total' });

    const numberText = createSvgEl('text', {
      x: '300',
      y: '332',
      'text-anchor': 'middle',
      'font-family': 'var(--font-title)',
      'font-size': '36',
      'font-weight': '700',
      fill: 'var(--text)'
    });
    numberText.textContent = totalSeats;

    const labelText = createSvgEl('text', {
      x: '300',
      y: '354',
      'text-anchor': 'middle',
      'font-family': 'var(--font-main)',
      'font-size': '11',
      'font-weight': '600',
      fill: 'var(--text-sec)',
      'letter-spacing': '1',
      'text-transform': 'uppercase'
    });
    labelText.textContent = totalSeats === 1 ? 'Cadeira' : 'Cadeiras';

    totalGroup.appendChild(numberText);
    totalGroup.appendChild(labelText);
    svg.appendChild(totalGroup);
  }

  // Tooltip interaction
  const tooltip = document.getElementById('chamberTooltip');
  const container = document.querySelector('.chamber-container');
  const dots = svg.querySelectorAll('.chamber-seat');

  dots.forEach((dot, index) => {
    const seatInfo = seatsArray[index];
    if (!seatInfo) return;

    dot.addEventListener('mouseover', () => {
      highlightPartySeats(seatInfo.party);

      const seatsPct = ((seatInfo.totalSeats / totalSeats) * 100).toFixed(1);
      const votesPct = totalVotes > 0 ? ((seatInfo.votes / totalVotes) * 100).toFixed(1) : '0.0';

      tooltip.innerHTML = `
        <div class="tooltip-header">
          <span class="tooltip-badge" style="background: ${seatInfo.color}"></span>
          <strong>${seatInfo.cleanName}</strong>
        </div>
        <div class="tooltip-row">
          <span>Cadeiras</span>
          <span>${seatInfo.totalSeats} (${seatsPct}%)</span>
        </div>
        <div class="tooltip-row">
          <span>Votos</span>
          <span>${fmtInt(seatInfo.votes)} (${votesPct}%)</span>
        </div>
      `;
      tooltip.classList.remove('hidden');
    });

    dot.addEventListener('mousemove', (event) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const tooltipWidth = tooltip.offsetWidth || 180;
      const tooltipHeight = tooltip.offsetHeight || 80;
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      let x = mouseX + 12;
      if (x + tooltipWidth > containerWidth - 10) {
        x = mouseX - tooltipWidth - 12;
      }
      x = Math.max(10, Math.min(containerWidth - tooltipWidth - 10, x));

      let y = mouseY - 12;
      if (y + tooltipHeight > containerHeight - 10) {
        y = mouseY - tooltipHeight - 12;
      }
      y = Math.max(10, y);

      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
    });

    dot.addEventListener('mouseout', () => {
      highlightPartySeats(null);
      tooltip.classList.add('hidden');
    });
  });
}

// Highlight party seats on list hover
function highlightPartySeats(partyKey) {
  const svg = document.getElementById('chamberSvg');
  if (!svg) return;

  const seats = svg.querySelectorAll('.chamber-seat');
  seats.forEach(seat => {
    const match = partyKey && seat.getAttribute('data-party') === partyKey;
    seat.style.opacity = partyKey ? (match ? '1' : '0.25') : '1';
    seat.style.filter = partyKey ? (match ? 'brightness(1.2)' : 'none') : 'none';
  });
}

// Render Results list (Right Panel)
function renderResultsList() {
  const resultsList = document.getElementById('resultsList');
  resultsList.innerHTML = '';

  const resultsTitle = document.getElementById('resultsTitle');
  const resultsSubtitle = document.getElementById('resultsSubtitle');
  const simMetrics = document.getElementById('simMetrics');


  const { stateSeats, stateAllocations, nationalSeats, partyNationalVotes, partyNationalPct, nationalValidVotes } = nationalSimulationResults;
  let totalSimulationSeats = Object.values(stateSeats || {}).reduce((s, v) => s + v, 0) || 513;
  if (currentConfig.seatDistribution === 'senado_regionalizado_1') {
    totalSimulationSeats = 75;
  } else if (currentConfig.seatDistribution === 'senado_regionalizado_2') {
    totalSimulationSeats = 100;
  }

  let totalSeatsToDraw = 0;
  let allocationsToDraw = {};
  let votesToDraw = {};
  let totalVotesToDraw = 0;

  if (selectedState !== null && selectedSubregion === null && selectedRegion === null) {
    // ----------------------------------------------------------
    // STATE VIEW – selectedState is set
    // ----------------------------------------------------------
    const stateName = UF_NAMES[selectedState];
    let seatsToAllocate;
    if (currentElectionLevel === 'estadual') {
      if (currentConfig.seatDistribution === 'alt1_assembly') {
        seatsToAllocate = ASSEMBLY_SEATS_ALT1[selectedState] || 25;
      } else if (currentConfig.seatDistribution === 'alt2_assembly') {
        seatsToAllocate = ASSEMBLY_SEATS_ALT2[selectedState] || 33;
      } else {
        seatsToAllocate = ASSEMBLY_SEATS_REAL[selectedState] || 24;
      }
    } else {
      seatsToAllocate = currentConfig.seatDistribution === 'real' ? REAL_SEATS[selectedState] : getSeatsAllocationByState(currentConfig.seatDistribution)[selectedState];
    }
    const isSenado = currentConfig.seatDistribution === 'senado_regionalizado_1' || currentConfig.seatDistribution === 'senado_regionalizado_2' || currentConfig.seatDistribution === 'senado_degressivo';

    resultsTitle.textContent = `${stateName} (${selectedState})`;
    if (currentElectionLevel === 'estadual') {
      resultsSubtitle.textContent = `Assembleia Legislativa (${seatsToAllocate} vagas)`;
    } else {
      resultsSubtitle.textContent = isSenado ? `Eleição Proporcional (${seatsToAllocate} vagas de senador)` : `Eleição Proporcional (${seatsToAllocate} vagas)`;
    }

    // Calculate state stats
    const statePartySeats = stateAllocations[selectedState] || {};
    let stateVotes = {};
    let stateValidVotes = 0;

    if (currentElectionLevel === 'estadual') {
      stateVotes = nationalSimulationResults.partyNationalVotes || {};
      stateValidVotes = nationalSimulationResults.nationalValidVotes || 0;
    } else {
      const coalitionMap = getPresCoalitionMap();
      if (officialTotals[selectedState] && officialTotals[selectedState].f) {
        officialTotals[selectedState].f.coalitions.forEach(c => {
          let stdKey = getStandardFederationKey(c.id);
          if (currentConfig.groupByPresidentialCoalition && coalitionMap[stdKey]) {
            stdKey = coalitionMap[stdKey];
          }
          stateVotes[stdKey] = (stateVotes[stdKey] || 0) + c.votes;
          stateValidVotes += c.votes;
        });
      }
    }

    const qe = seatsToAllocate > 0 ? Math.round(stateValidVotes / seatsToAllocate) : 0;

    // Clear boxy metrics completely
    simMetrics.innerHTML = '';

    // Header block in NYT editorial style (Dark Theme)
    const headerBlock = document.createElement('div');
    headerBlock.style.backgroundColor = '#1c1c1c';
    headerBlock.style.border = '1px solid var(--border-color)';
    headerBlock.style.padding = '12px';
    headerBlock.style.marginBottom = '16px';
    headerBlock.style.borderRadius = 'var(--radius-md)';
    headerBlock.innerHTML = `
      <div style="display: inline-block; font-size: 10px; font-weight: 700; color: #fff; background: var(--accent); padding: 2px 6px; margin-bottom: 6px; letter-spacing: 0.5px; border-radius: 2px;">${currentElectionLevel === 'estadual' ? 'ELEIÇÃO ESTADUAL' : 'ELEIÇÃO FEDERAL'}</div>
      <div style="font-family: var(--font-title); font-size: 1.1rem; font-weight: 700; line-height: 1.3; color: #fff; margin-bottom: 4px;">
        Resultados em ${stateName}
      </div>
      <div style="font-size: 12px; color: var(--text-sec);">
        ${isSenado ? 'Vagas senatórias' : 'Vagas proporcionais'}: <strong>${seatsToAllocate}</strong>. Quociente Eleitoral (QE): <strong>${fmtInt(qe)}</strong>.
      </div>
    `;
    resultsList.appendChild(headerBlock);

    // List of parties in state
    const sortedParties = Object.keys(stateVotes)
      .map(party => ({
        party,
        seats: statePartySeats[party] || 0,
        votes: stateVotes[party] || 0,
        pct: stateValidVotes > 0 ? (stateVotes[party] / stateValidVotes) * 100 : 0,
        color: getPartyColor(party),
        cleanName: getCleanGroupName(party)
      }))
      .filter(p => p.seats > 0 || p.votes > 0)
      .sort((a, b) => b.seats - a.seats || b.votes - a.votes);

    totalSeatsToDraw = seatsToAllocate;
    allocationsToDraw = statePartySeats;
    votesToDraw = stateVotes;
    totalVotesToDraw = stateValidVotes;

    if (sortedParties.length === 0) {
      resultsList.innerHTML = '<div class="help-text" style="padding:20px;text-align:center;">Nenhum partido conquistou vagas nesta simulação.</div>';
      drawChamber(0, {}, {}, 0);
      return;
    }

    // Static table-like header row above the party groups
    const staticHeader = document.createElement('div');
    staticHeader.style.display = 'flex';
    staticHeader.style.padding = '6px 14px';
    staticHeader.style.borderBottom = '1px solid var(--border-color)';
    staticHeader.style.fontSize = '11px';
    staticHeader.style.color = 'var(--text-sec)';
    staticHeader.style.fontWeight = '600';
    staticHeader.style.paddingLeft = '38px';
    staticHeader.style.marginBottom = '8px';
    staticHeader.innerHTML = `
      <div style="flex: 1; text-align: left;">Partido</div>
      <div style="width: 50px; text-align: right;">Vagas</div>
      <div style="width: 100px; text-align: right; padding-right: 8px;">% Votos</div>
      <div style="width: 80px; text-align: right;">Votos</div>
    `;
    resultsList.appendChild(staticHeader);

    if (isSenado || !loadedDeputyResults || currentElectionLevel === 'estadual') {
      // Senado / sem dados de candidatos: renderizar tabela simples de partidos
      let rowsHtml = '';
      sortedParties.forEach(p => {
        const votePctStr = p.pct.toFixed(1);
        rowsHtml += `
          <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease; ${p.seats === 0 ? 'opacity: 0.55;' : ''}">
            <td style="text-align: left; padding: 8px 6px; border-left: 4px solid ${p.color};">
              <span style="font-weight: 600; margin-left: 4px; font-size: 13px;">${p.cleanName}</span>
            </td>
            <td style="padding: 8px 6px; text-align: right; font-weight: 700; font-size: 13px; color: var(--text);">${p.seats}</td>
            <td style="padding: 8px 6px; text-align: right;">
              <div style="display: flex; align-items: center; gap: 6px; justify-content: flex-end;">
                <span style="font-weight: 700; min-width: 32px; font-size: 11px; text-align: right;">${votePctStr}%</span>
                <div style="width: 40px; height: 6px; background: #262626; border-radius: 2px; overflow: hidden; flex-shrink: 0;">
                  <div style="width: ${votePctStr}%; height: 100%; background: ${p.color};"></div>
                </div>
              </div>
            </td>
            <td style="padding: 8px 6px; text-align: right; color: var(--text-sec); font-size: 11px;">${fmtInt(p.votes)}</td>
          </tr>
        `;
      });

      const tableDiv = document.createElement('div');
      tableDiv.innerHTML = `
        <table class="district-nyt-table" style="color: var(--text); border-collapse: collapse; width: 100%;">
          <tbody>${rowsHtml}</tbody>
        </table>
      `;
      resultsList.appendChild(tableDiv);

    } else {
      // Deputados: renderizar cards expansíveis com candidatos

      // Load candidates mapping dynamically
      const candNames = loadedDeputyResults.METADATA.cand_names;

      // Aggregate candidate votes from RESULTS since TOTALS is not present in the federal deputy JSONs
      const totals = {};
      if (loadedDeputyResults.RESULTS) {
        for (const voteMap of Object.values(loadedDeputyResults.RESULTS)) {
          for (const [candId, votesVal] of Object.entries(voteMap)) {
            totals[candId] = (totals[candId] || 0) + (parseInt(votesVal) || 0);
          }
        }
      }

      // Group candidates by their composition key
      const candCompositionMap = {};
      for (const [candId, meta] of Object.entries(candNames)) {
        if (candId.length <= 2) continue; // Legend votes are separately handled

        const candParty = meta[1];
        const comp = meta[4];
        const name = meta[0];
        const status = meta[2];

        // Determine composition key
        let compKey = getStandardFederationKey(candParty);
        if (currentYear >= 2022 && comp && comp.toUpperCase() !== 'PARTIDO ISOLADO' && comp.toUpperCase() !== 'COLIGAÇÃO') {
          compKey = getStandardFederationKey(comp);
        }

        const coalitionMap2 = getPresCoalitionMap();
        if (currentConfig.groupByPresidentialCoalition && coalitionMap2[compKey]) {
          compKey = coalitionMap2[compKey];
        }

        if (!candCompositionMap[compKey]) candCompositionMap[compKey] = [];
        candCompositionMap[compKey].push({
          id: candId,
          name,
          party: candParty,
          status,
          votes: totals[candId] || 0
        });
      }

      // Scan candidates and build individual card elements
      sortedParties.forEach(p => {
        const card = document.createElement('div');
        card.className = 'party-group';
        card.style.borderLeft = `4px solid ${p.color}`;
        card.style.marginBottom = '6px';
        if (p.seats === 0) {
          card.style.opacity = '0.55';
        }

        const compKey = currentConfig.groupByPresidentialCoalition ? p.party : getStandardFederationKey(p.party);
        const candidates = (candCompositionMap[compKey] || [])
          .sort((a, b) => b.votes - a.votes);

        const seatsWon = p.seats;
        let candRowsHtml = '';

        const distinctParties = new Set(candidates.map(cand => cand.party));
        const showBorder = distinctParties.size > 1;

        candidates.forEach((c, idx) => {
          const isElected = idx < seatsWon;
          const statusLabel = isElected ? "Eleito por Simulação" : "Suplente por Simulação";
          const statusClass = isElected ? "eleito" : "suplente";
          const partyColor = getPartyColor(c.party, true);
          const borderStyle = `border-left: 3px solid ${showBorder ? partyColor : 'transparent'};`;

          candRowsHtml += `
            <div class="cand-row" style="${borderStyle}">
              <div class="cand-name-row">
                <span class="cand-sim-name">${c.name}</span>
              </div>
              <div class="cand-meta-row">
                <span class="cand-sim-detail">${getCleanGroupName(c.party, true)}</span>
                <div class="cand-meta-right">
                  <span class="cand-sim-votes">${fmtInt(c.votes)}</span>
                  <span class="status-badge-sim ${statusClass}">${statusLabel}</span>
                </div>
              </div>
            </div>
          `;
        });

        if (candRowsHtml === '') {
          candRowsHtml = '<div style="padding:10px;text-align:center;color:var(--muted);font-size:0.75rem;">Nenhum candidato listado.</div>';
        }

        const votePctStr = p.pct.toFixed(1);

        card.innerHTML = `
          <div class="party-header" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; cursor: pointer; user-select: none;">
            <div style="flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0;">
              <span class="party-arrow">▶</span>
              <span class="party-name" style="font-weight: 600; font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.cleanName}</span>
            </div>
            <div style="width: 50px; text-align: right; font-weight: 700; font-size: 13px; color: var(--text);">${p.seats}</div>
            <div style="width: 100px; display: flex; align-items: center; gap: 6px; justify-content: flex-end; padding-right: 8px;">
              <span style="font-weight: 700; min-width: 32px; font-size: 11px; text-align: right;">${votePctStr}%</span>
              <div style="width: 40px; height: 6px; background: #262626; border-radius: 2px; overflow: hidden; flex-shrink: 0;">
                <div style="width: ${p.pct}%; height: 100%; background: ${p.color};"></div>
              </div>
            </div>
            <div style="width: 80px; text-align: right; color: var(--text-sec); font-size: 11px;">${fmtInt(p.votes)}</div>
          </div>
          <div class="party-candidates">
            ${candRowsHtml}
          </div>
        `;

        const header = card.querySelector('.party-header');
        header.addEventListener('click', () => {
          const isOpen = card.classList.contains('party-group-open');
          document.querySelectorAll('.party-group').forEach(el => el.classList.remove('party-group-open'));
          if (!isOpen) card.classList.add('party-group-open');
        });

        resultsList.appendChild(card);
      });
    }



  } else if (selectedRegion !== null) {
    // ----------------------------------------------------------
    // REGION VIEW – selectedRegion is set (senado_regionalizado)
    // ----------------------------------------------------------
    const { regionalAllocations } = nationalSimulationResults;
    const regionSeats = (regionalAllocations || {})[selectedRegion] || {};
    const regionCompSeats = currentConfig.seatDistribution === 'senado_regionalizado_1'
      ? { "Norte": 8, "Nordeste": 6, "Centro-Oeste": 11, "Sudeste": 11, "Sul": 12 }
      : { "Norte": 6, "Nordeste": 2, "Centro-Oeste": 12, "Sudeste": 12, "Sul": 14 };
    const seatsToAllocate = regionCompSeats[selectedRegion] || 0;

    const isSenado1 = currentConfig.seatDistribution === 'senado_regionalizado_1';
    const senadoName = isSenado1 ? 'Senado Regionalizado 1' : 'Senado Regionalizado 2';

    resultsTitle.textContent = selectedRegion;
    resultsSubtitle.textContent = `${senadoName} – ${seatsToAllocate} vagas complementares`;
    simMetrics.innerHTML = '';

    // Sum votes and valid votes for this region from officialTotals
    const coalitionMap = getPresCoalitionMap();
    const regionVotes = {};
    let regionValidVotes = 0;
    const ufs = REGION_STATES[selectedRegion] || [];
    ufs.forEach(uf => {
      if (!officialTotals[uf] || !officialTotals[uf].f) return;
      officialTotals[uf].f.coalitions.forEach(c => {
        let stdKey = getStandardFederationKey(c.id);
        if (currentConfig.groupByPresidentialCoalition && coalitionMap[stdKey]) {
          stdKey = coalitionMap[stdKey];
        }
        regionVotes[stdKey] = (regionVotes[stdKey] || 0) + c.votes;
        regionValidVotes += c.votes;
      });
    });

    totalSeatsToDraw = seatsToAllocate;
    allocationsToDraw = regionSeats;
    votesToDraw = regionVotes;
    totalVotesToDraw = regionValidVotes;

    const qe = seatsToAllocate > 0 ? Math.round(regionValidVotes / seatsToAllocate) : 0;

    const headerBlock = document.createElement('div');
    headerBlock.style.cssText = 'background:#1c1c1c;border:1px solid var(--border-color);padding:12px;margin-bottom:16px;border-radius:var(--radius-md);';
    headerBlock.innerHTML = `
      <div style="display:inline-block;font-size:10px;font-weight:700;color:#fff;background:var(--ok);padding:2px 6px;margin-bottom:6px;letter-spacing:0.5px;border-radius:2px;">${senadoName.toUpperCase()}</div>
      <div style="font-family:var(--font-title);font-size:1.1rem;font-weight:700;line-height:1.3;color:#fff;margin-bottom:4px;">Região ${selectedRegion}</div>
      <div style="font-size:12px;color:var(--text-sec);">Vagas complementares: <strong>${seatsToAllocate}</strong>. Quociente Eleitoral (QE): <strong>${fmtInt(qe)}</strong>.</div>
    `;
    resultsList.appendChild(headerBlock);

    const sortedRegionParties = Object.keys(regionVotes)
      .map(party => ({
        party,
        seats: regionSeats[party] || 0,
        votes: regionVotes[party] || 0,
        pct: regionValidVotes > 0 ? (regionVotes[party] / regionValidVotes) * 100 : 0,
        color: getPartyColor(party),
        cleanName: getCleanGroupName(party)
      }))
      .filter(p => p.seats > 0 || p.votes > 0)
      .sort((a, b) => b.seats - a.seats || b.votes - a.votes);

    if (sortedRegionParties.length === 0) {
      resultsList.innerHTML += '<div class="help-text" style="padding:20px;text-align:center;">Nenhum partido conquistou vagas nesta região.</div>';
    } else {
      const staticHeader = document.createElement('div');
      staticHeader.style.cssText = 'display:flex;padding:6px 14px;border-bottom:1px solid var(--border-color);font-size:11px;color:var(--text-sec);font-weight:600;padding-left:14px;margin-bottom:8px;';
      staticHeader.innerHTML = `
        <div style="flex:1;text-align:left;">Partido</div>
        <div style="width:50px;text-align:right;">Vagas</div>
        <div style="width:100px;text-align:right;padding-right:8px;">% Votos</div>
        <div style="width:80px;text-align:right;">Votos</div>
      `;
      resultsList.appendChild(staticHeader);

      let rowsHtml = '';
      sortedRegionParties.forEach(p => {
        const votePctStr = p.pct.toFixed(1);
        rowsHtml += `
          <tr style="border-bottom:1px solid var(--border-color);transition:background 0.15s; ${p.seats === 0 ? 'opacity: 0.55;' : ''}">
            <td style="text-align:left;padding:8px 6px;border-left:4px solid ${p.color};">
              <span style="font-weight:600;margin-left:4px;font-size:13px;">${p.cleanName}</span>
            </td>
            <td style="padding:8px 6px;text-align:right;font-weight:700;font-size:13px;color:var(--text);">${p.seats}</td>
            <td style="padding:8px 6px;text-align:right;">
              <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;">
                <span style="font-weight:700;min-width:32px;font-size:11px;text-align:right;">${votePctStr}%</span>
                <div style="width:40px;height:6px;background:#262626;border-radius:2px;overflow:hidden;flex-shrink:0;">
                  <div style="width:${votePctStr}%;height:100%;background:${p.color};"></div>
                </div>
              </div>
            </td>
            <td style="padding:8px 6px;text-align:right;color:var(--text-sec);font-size:11px;">${fmtInt(p.votes)}</td>
          </tr>
        `;
      });

      const tableDiv = document.createElement('div');
      tableDiv.innerHTML = `<table class="district-nyt-table" style="color:var(--text);border-collapse:collapse;width:100%;"><tbody>${rowsHtml}</tbody></table>`;
      resultsList.appendChild(tableDiv);

    }

  } else if (selectedSubregion !== null) {
    // ----------------------------------------------------------
    // SUBREGION VIEW – selectedSubregion is set (deputados_semilocal)
    // ----------------------------------------------------------
    const { subregionSeats, subregionAllocations } = nationalSimulationResults;
    const seatsToAllocate = subregionSeats[selectedSubregion] || 0;
    const allocations = subregionAllocations[selectedSubregion] || {};

    const lastDash2 = selectedSubregion.lastIndexOf('-');
    const state = lastDash2 >= 0 ? selectedSubregion.slice(0, lastDash2) : selectedSubregion;
    const num = lastDash2 >= 0 ? selectedSubregion.slice(lastDash2 + 1) : '1';

    const electionKey = document.getElementById('selectVoteBase') ? document.getElementById('selectVoteBase').value : 'deputado_2022';
    const subVotesRaw = (semilocalVotosData && semilocalVotosData[selectedSubregion]) ? semilocalVotosData[selectedSubregion][electionKey] : null;

    const subInfo = circuitosPopData.find(d => d.estado === state && d.id_local === parseInt(num));
    const popStr = subInfo ? fmtInt(subInfo.populacao) : 'N/A';
    const distName = (subInfo && subInfo.nome_distrito) ? subInfo.nome_distrito : `Subregião ${num}`;

    resultsTitle.textContent = `${state} - ${distName}`;
    resultsSubtitle.textContent = `Circunscrição Regional – ${seatsToAllocate} vagas`;
    simMetrics.innerHTML = '';

    // Compute subregion valid votes and QE from actual vote data
    let subValidVotes = 0;
    const subVotesByParty = {};
    if (subVotesRaw) {
      for (const [party, votes] of Object.entries(subVotesRaw)) {
        if (party === 'VOTOS_BRANCOS' || party === 'VOTOS_NULOS' || party === 'TOTAL_VOTOS_VALIDOS') continue;
        subVotesByParty[party] = votes;
        subValidVotes += votes;
      }
    }

    totalSeatsToDraw = seatsToAllocate;
    allocationsToDraw = allocations;
    votesToDraw = subVotesByParty;
    totalVotesToDraw = subValidVotes;

    const qeSub = seatsToAllocate > 0 && subValidVotes > 0 ? Math.round(subValidVotes / seatsToAllocate) : 0;

    const headerBlock = document.createElement('div');
    headerBlock.style.cssText = 'background:#1c1c1c;border:1px solid var(--border-color);padding:12px;margin-bottom:16px;border-radius:var(--radius-md);';
    headerBlock.innerHTML = `
      <div style="display:inline-block;font-size:10px;font-weight:700;color:#fff;background:var(--accent);padding:2px 6px;margin-bottom:6px;letter-spacing:0.5px;border-radius:2px;">CIRCUNSCRIÇÃO REGIONAL</div>
      <div style="font-family:var(--font-title);font-size:1.1rem;font-weight:700;line-height:1.3;color:#fff;margin-bottom:4px;">${state} - ${distName}</div>
      <div style="font-size:12px;color:var(--text-sec);">Vagas proporcionais: <strong>${seatsToAllocate}</strong>. Quociente Eleitoral (QE): <strong>${fmtInt(qeSub)}</strong>.</div>
    `;
    resultsList.appendChild(headerBlock);

    const sortedSubParties = Object.keys(subVotesByParty)
      .map(party => ({
        party,
        seats: allocations[party] || 0,
        votes: subVotesByParty[party] || 0,
        pct: subValidVotes > 0 ? ((subVotesByParty[party] || 0) / subValidVotes) * 100 : 0,
        color: getPartyColor(party),
        cleanName: getCleanGroupName(party)
      }))
      .filter(p => p.seats > 0 || p.votes > 0)
      .sort((a, b) => b.seats - a.seats || b.votes - a.votes);

    if (sortedSubParties.length === 0) {
      resultsList.innerHTML += '<div class="help-text" style="padding:20px;text-align:center;">Nenhum partido conquistou vagas nesta subregião.</div>';
    } else {
      const staticHeader = document.createElement('div');
      staticHeader.style.cssText = 'display:flex;padding:6px 14px;border-bottom:1px solid var(--border-color);font-size:11px;color:var(--text-sec);font-weight:600;padding-left:14px;margin-bottom:8px;';
      staticHeader.innerHTML = `
        <div style="flex:1;text-align:left;">Partido</div>
        <div style="width:50px;text-align:right;">Vagas</div>
        <div style="width:100px;text-align:right;padding-right:8px;">% Votos</div>
        <div style="width:80px;text-align:right;">Votos</div>
      `;
      resultsList.appendChild(staticHeader);

      let rowsHtml = '';
      sortedSubParties.forEach(p => {
        const votePctStr = p.pct.toFixed(1);
        rowsHtml += `
          <tr style="border-bottom:1px solid var(--border-color);transition:background 0.15s; ${p.seats === 0 ? 'opacity: 0.55;' : ''}">
            <td style="text-align:left;padding:8px 6px;border-left:4px solid ${p.color};">
              <span style="font-weight:600;margin-left:4px;font-size:13px;">${p.cleanName}</span>
            </td>
            <td style="padding:8px 6px;text-align:right;font-weight:700;font-size:13px;color:var(--text);">${p.seats}</td>
            <td style="padding:8px 6px;text-align:right;">
              <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;">
                <span style="font-weight:700;min-width:32px;font-size:11px;text-align:right;">${votePctStr}%</span>
                <div style="width:40px;height:6px;background:#262626;border-radius:2px;overflow:hidden;flex-shrink:0;">
                  <div style="width:${votePctStr}%;height:100%;background:${p.color};"></div>
                </div>
              </div>
            </td>
            <td style="padding:8px 6px;text-align:right;color:var(--text-sec);font-size:11px;">${fmtInt(p.votes)}</td>
          </tr>
        `;
      });

      const tableDiv = document.createElement('div');
      tableDiv.innerHTML = `<table class="district-nyt-table" style="color:var(--text);border-collapse:collapse;width:100%;"><tbody>${rowsHtml}</tbody></table>`;
      resultsList.appendChild(tableDiv);

    }

  } else {
    // ----------------------------------------------------------
    // NATIONAL VIEW – neither state nor region selected
    // ----------------------------------------------------------
    const isSenado = currentConfig.seatDistribution === 'senado_regionalizado_1' || currentConfig.seatDistribution === 'senado_regionalizado_2' || currentConfig.seatDistribution === 'senado_degressivo';
    resultsTitle.textContent = isSenado ? "Brasil - Senado" : "Brasil - Federal";
    resultsSubtitle.textContent = isSenado ? `Senado Federal (${totalSimulationSeats} cadeiras)` : `Câmara dos Deputados (${totalSimulationSeats} cadeiras)`;

    totalSeatsToDraw = totalSimulationSeats;
    allocationsToDraw = nationalSeats;
    votesToDraw = partyNationalVotes;
    totalVotesToDraw = nationalValidVotes;

    // Clear boxy metrics completely
    simMetrics.innerHTML = '';

    // Header block in NYT editorial style (Dark Theme)
    const headerBlock = document.createElement('div');
    headerBlock.style.backgroundColor = '#1c1c1c';
    headerBlock.style.border = '1px solid var(--border-color)';
    headerBlock.style.padding = '12px';
    headerBlock.style.marginBottom = '16px';
    headerBlock.style.borderRadius = 'var(--radius-md)';
    headerBlock.innerHTML = `
      <div style="display: inline-block; font-size: 10px; font-weight: 700; color: #fff; background: var(--ok); padding: 2px 6px; margin-bottom: 6px; letter-spacing: 0.5px; border-radius: 2px;">${isSenado ? 'SENADO FEDERAL' : 'CÂMARA DOS DEPUTADOS'}</div>
      <div style="font-family: var(--font-title); font-size: 1.1rem; font-weight: 700; line-height: 1.3; color: #fff; margin-bottom: 4px;">
        Projeção de Bancadas Proporcionais
      </div>
      <div style="font-size: 12px; color: var(--text-sec);">
        Simulação baseada nas regras definidas no painel, somando <strong>${totalSimulationSeats}</strong> ${isSenado ? 'senadores' : 'deputados'}.
      </div>
    `;
    resultsList.appendChild(headerBlock);

    // List of parties
    const sortedParties = Object.keys(partyNationalVotes)
      .map(party => ({
        party,
        seats: nationalSeats[party] || 0,
        votes: partyNationalVotes[party] || 0,
        pct: partyNationalPct[party] || 0,
        color: getPartyColor(party),
        cleanName: getCleanGroupName(party)
      }))
      .filter(p => p.seats > 0 || p.votes > 0)
      .sort((a, b) => b.seats - a.seats || b.votes - a.votes);

    const seatWinner = sortedParties[0] ? sortedParties[0].party : null;

    let rowsHtml = '';
    sortedParties.forEach((p, idx) => {
      const isWinner = p.party === seatWinner;
      const votePctStr = p.pct.toFixed(1);
      const checkmark = isWinner ? '<span style="font-size: 10px; margin-left: 6px; color: var(--text);">&#10004;</span>' : '';

      rowsHtml += `
        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease; ${p.seats === 0 ? 'opacity: 0.55;' : ''}">
          <td style="text-align: left; padding: 8px 6px; border-left: 4px solid ${p.color};">
            <span style="font-weight: ${isWinner ? '700' : '500'}; margin-left: 4px; font-size: 13px;">${p.cleanName}</span>${checkmark}
          </td>
          <td style="padding: 8px 6px; text-align: right; font-weight: 700; font-size: 13px; color: var(--text);">${p.seats}</td>
          <td style="padding: 8px 6px; text-align: right;">
            <div style="display: flex; align-items: center; gap: 6px; justify-content: flex-end;">
              <span style="font-weight: 700; min-width: 32px; font-size: 11px; text-align: right;">${votePctStr}%</span>
              <div style="width: 50px; height: 6px; background: #262626; border-radius: 2px; overflow: hidden; flex-shrink: 0;">
                <div style="width: ${votePctStr}%; height: 100%; background: ${p.color};"></div>
              </div>
            </div>
          </td>
          <td style="padding: 8px 6px; text-align: right; color: var(--text-sec); font-size: 11px;">${fmtInt(p.votes)}</td>
        </tr>
      `;
    });

    if (rowsHtml === '') {
      rowsHtml = `<tr><td colspan="4" style="text-align:center;color:#777;padding: 12px;">Sem dados</td></tr>`;
    }

    const tableDiv = document.createElement('div');
    tableDiv.innerHTML = `
      <table class="district-nyt-table" style="color: var(--text); border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th style="text-align: left; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px; font-size: 11px;">Partido</th>
            <th style="text-align: right; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px; font-size: 11px;">Cadeiras</th>
            <th style="text-align: right; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px; font-size: 11px; width: 95px;">% Votos</th>
            <th style="text-align: right; color: var(--text-sec); border-bottom: 1px solid var(--border-color); padding: 6px; font-size: 11px;">Votos Totais</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="font-size: 11px; color: var(--muted); border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 8px; text-align: right;">
        Votos válidos nacionais: <strong>${fmtInt(nationalValidVotes)}</strong>
      </div>
    `;
    resultsList.appendChild(tableDiv);

  }

  drawChamber(totalSeatsToDraw, allocationsToDraw, votesToDraw, totalVotesToDraw);
}

// Map Rendering logic
function getWinningPartyForUF(uf) {
  if (!nationalSimulationResults || !nationalSimulationResults.stateAllocations) return null;
  const ufAllocations = nationalSimulationResults.stateAllocations[uf] || {};
  let maxSeats = -1;
  let winner = null;

  for (const [party, seats] of Object.entries(ufAllocations)) {
    if (seats > maxSeats) {
      maxSeats = seats;
      winner = party;
    } else if (seats === maxSeats && winner) {
      // Tie breaker: votes in state
      let ufVotes = {};
      if (currentElectionLevel === 'estadual') {
        ufVotes = nationalSimulationResults.partyNationalVotes || {};
      } else {
        const coalitionMap = getPresCoalitionMap();
        if (officialTotals[uf] && officialTotals[uf].f) {
          officialTotals[uf].f.coalitions.forEach(c => {
            let std = getStandardFederationKey(c.id);
            if (currentConfig.groupByPresidentialCoalition && coalitionMap[std]) {
              std = coalitionMap[std];
            }
            ufVotes[std] = (ufVotes[std] || 0) + c.votes;
          });
        }
      }
      if ((ufVotes[party] || 0) > (ufVotes[winner] || 0)) {
        winner = party;
      }
    }
  }
  return winner;
}

function clearStateCircles() {
  stateCircleLayers.forEach(layer => glRemove(layer));
  stateCircleLayers = [];
}

function createStateCircleSVG(uf, N, seatColors, innerOnly = false) {
  // Keep the inner disk and its labels at the MG standard size.
  // MG uses 53 seats in the default distribution, which maps to this scale.
  const rCenter = 18;
  const centerLabelSize = 9.9;
  const centerCountSize = 8.1;
  const ringThickness = 4.32;
  const ringGap = 1.0;

  let baseSize = 44;
  if (N <= 9) {
    baseSize = 44;
  } else if (N <= 18) {
    baseSize = 52;
  } else if (N <= 31) {
    baseSize = 64;
  } else if (N <= 53) {
    baseSize = 76;
  } else {
    baseSize = 92;
  }

  const ringCount = N <= 18 ? 1 : N <= 31 ? 2 : N <= 53 ? 3 : 4;
  const minSize = Math.ceil(2 * (rCenter + (ringCount * ringThickness) + (ringCount * ringGap) + 2));
  const size = Math.max(baseSize, minSize);

  const cx = size / 2;
  const cy = size / 2;
  const rBg = size / 2 - 2;

  // Distribute seats in concentric rings
  const seats = [];
  function getSectorPath(rRing, thickness, theta, count) {
    const localGap = count === 1 ? 0.999 : 1.0;
    const r1 = rRing - thickness / 2;
    const r2 = rRing + thickness / 2;
    const dTheta = (2 * Math.PI / count) * localGap;
    const theta1 = theta - dTheta / 2;
    const theta2 = theta + dTheta / 2;

    const p1x = cx + r1 * Math.cos(theta1);
    const p1y = cy + r1 * Math.sin(theta1);
    const p2x = cx + r2 * Math.cos(theta1);
    const p2y = cy + r2 * Math.sin(theta1);
    const p3x = cx + r2 * Math.cos(theta2);
    const p3y = cy + r2 * Math.sin(theta2);
    const p4x = cx + r1 * Math.cos(theta2);
    const p4y = cy + r1 * Math.sin(theta2);

    const largeArc = (dTheta > Math.PI) ? 1 : 0;

    return `M ${p1x.toFixed(2)} ${p1y.toFixed(2)} L ${p2x.toFixed(2)} ${p2y.toFixed(2)} A ${r2.toFixed(2)} ${r2.toFixed(2)} 0 ${largeArc} 1 ${p3x.toFixed(2)} ${p3y.toFixed(2)} L ${p4x.toFixed(2)} ${p4y.toFixed(2)} A ${r1.toFixed(2)} ${r1.toFixed(2)} 0 ${largeArc} 0 ${p1x.toFixed(2)} ${p1y.toFixed(2)} Z`;
  }

  if (N <= 18) {
    // 1 ring
    const rRing = rCenter + ringGap + (ringThickness / 2);
    const thickness = ringThickness;
    for (let i = 0; i < N; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / N);
      const d = getSectorPath(rRing, thickness, theta, N);
      seats.push({ d, theta });
    }
  } else if (N <= 31) {
    // 2 rings
    const n1 = Math.floor(N * 0.4);
    const n2 = N - n1;
    const thickness = ringThickness;
    const r1 = rCenter + ringGap + (ringThickness / 2);
    const r2 = r1 + ringGap + ringThickness;

    // Ring 2 (outer)
    for (let i = 0; i < n2; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n2);
      const d = getSectorPath(r2, thickness, theta, n2);
      seats.push({ d, theta });
    }
    // Ring 1 (inner)
    for (let i = 0; i < n1; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n1);
      const d = getSectorPath(r1, thickness, theta, n1);
      seats.push({ d, theta });
    }
  } else if (N <= 53) {
    // 3 rings
    const n1 = Math.floor(N * 0.25);
    const n2 = Math.floor(N * 0.35);
    const n3 = N - n1 - n2;

    const thickness = ringThickness;
    const r1 = rCenter + ringGap + (ringThickness / 2);
    const r2 = r1 + ringGap + ringThickness;
    const r3 = r2 + ringGap + ringThickness;

    // Ring 3 (outer)
    for (let i = 0; i < n3; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n3);
      const d = getSectorPath(r3, thickness, theta, n3);
      seats.push({ d, theta });
    }
    // Ring 2 (middle)
    for (let i = 0; i < n2; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n2);
      const d = getSectorPath(r2, thickness, theta, n2);
      seats.push({ d, theta });
    }
    // Ring 1 (inner)
    for (let i = 0; i < n1; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n1);
      const d = getSectorPath(r1, thickness, theta, n1);
      seats.push({ d, theta });
    }
  } else {
    // 4 rings dynamically scaled for N > 53 (supporting up to 130+ seats)
    const n1 = Math.floor(N * 0.15);
    const n2 = Math.floor(N * 0.23);
    const n3 = Math.floor(N * 0.29);
    const n4 = N - n1 - n2 - n3;

    const thickness = ringThickness;
    const r1 = rCenter + ringGap + (ringThickness / 2);
    const r2 = r1 + ringGap + ringThickness;
    const r3 = r2 + ringGap + ringThickness;
    const r4 = r3 + ringGap + ringThickness;

    // Ring 4 (outer)
    for (let i = 0; i < n4; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n4);
      const d = getSectorPath(r4, thickness, theta, n4);
      seats.push({ d, theta });
    }
    // Ring 3 (middle-outer)
    for (let i = 0; i < n3; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n3);
      const d = getSectorPath(r3, thickness, theta, n3);
      seats.push({ d, theta });
    }
    // Ring 2 (middle-inner)
    for (let i = 0; i < n2; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n2);
      const d = getSectorPath(r2, thickness, theta, n2);
      seats.push({ d, theta });
    }
    // Ring 1 (inner)
    for (let i = 0; i < n1; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n1);
      const d = getSectorPath(r1, thickness, theta, n1);
      seats.push({ d, theta });
    }
  }

  // Sort seats by their angle (theta) to group colors like pie chart slices
  seats.sort((a, b) => a.theta - b.theta);

  // Map seats to paths with corresponding party color
  const seatElements = seats.map((seat, idx) => {
    const color = seatColors[idx] || '#555555';
    return `<path d="${seat.d}" fill="${color}" stroke="#0d0e12" stroke-width="0.4"/>`;
  });

  // Generate the full SVG
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="state-circle-svg">
      <!-- Outer background circle -->
      <circle cx="${cx}" cy="${cy}" r="${rBg}" fill="none" stroke="none"/>
      
      <!-- Inner text circle -->
      <circle cx="${cx}" cy="${cy}" r="${rCenter}" fill="#0d0e12" stroke="${uf === 'CP' ? 'var(--accent)' : '#242936'}" stroke-width="${uf === 'CP' ? '2' : '1'}"/>
      
      <!-- Seat dots -->
      ${seatElements.join('\n')}
      
      <!-- Center text labels -->
      <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-family="var(--font-title)" font-weight="700" font-size="${centerLabelSize}" fill="#ffffff" dominant-baseline="middle">${uf}</text>
      <text x="${cx}" y="${cy + rCenter * 0.35}" text-anchor="middle" font-family="var(--font-main)" font-weight="500" font-size="${centerCountSize}" fill="#9ca3af" dominant-baseline="middle">${N}</text>
    </svg>
  `;

  return svg;
}

// ── Dot-grid view: one colored circle per deputy ──────────────────────────────
// Returns { html, width, height } for use in L.divIcon
function createStateCircleDotsHTML(label, N, seatColors, dotROverride = null) {
  // Choose number of columns for a roughly compact square grid
  let cols;
  if (N <= 4) cols = 2;
  else if (N <= 9) cols = 3;
  else if (N <= 16) cols = 4;
  else if (N <= 25) cols = 5;
  else if (N <= 42) cols = 6;
  else if (N <= 63) cols = 8;
  else cols = 10;

  const rows = Math.ceil(N / cols);

  // Dot radius is constant within the current rendered scenario.
  const dotR = dotROverride ?? getDotRadiusForSeats(N);

  const gap = 1.25;
  const padding = 6.25;
  const dotSpacing = dotR * 2 + gap;

  const svgW = cols * dotSpacing - gap + padding * 2;
  const svgH = rows * dotSpacing - gap + padding * 2;

  let circles = '';
  for (let i = 0; i < N; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const rowSeats = row === rows - 1 ? (N - row * cols) : cols;
    const rowOffset = row === rows - 1 && rowSeats < cols ? ((cols - rowSeats) * dotSpacing) / 2 : 0;
    const cx = (padding + dotR + rowOffset + col * dotSpacing).toFixed(1);
    const cy = (padding + dotR + row * dotSpacing).toFixed(1);
    const fill = seatColors[i] || '#555555';
    circles += `<circle cx="${cx}" cy="${cy}" r="${dotR}" fill="${fill}" stroke="#0b0d11" stroke-width="0.375"/>`;
  }

  const w = Math.ceil(svgW);
  const h = Math.ceil(svgH);

  const html = `<svg width="${w}" height="${h}" viewBox="0 0 ${svgW.toFixed(1)} ${svgH.toFixed(1)}" style="display:block;overflow:visible;">
    ${circles}
  </svg>`;

  return { html, width: w, height: h };
}

// Helper: show or hide the circle view toggle
function setCircleToggleVisible(visible) {
  const el = document.getElementById('circleViewToggle');
  if (!el) return;
  if (visible) el.classList.remove('hidden');
  else el.classList.add('hidden');
}

// Re-render only the circle markers when the display mode changes.
// Avoids rebuilding the entire GeoJSON base layer.
async function redrawCircles() {
  if (currentConfig.seatDistribution === 'senado_regionalizado_1' || currentConfig.seatDistribution === 'senado_regionalizado_2') {
    await renderSenadoRegionalizadoSvgMapV3();
    return;
  }

  if (currentConfig.circumscription === 'regional') {
    // Semilocal mode: only clear/redraw the circle markers
    drawSemilocalCircles();
  } else if (currentSystemType === 'proporcional' && selectedState === null) {
    // National proportional: clear and redraw state circles
    clearStateCircles();
    drawStateCircles();
  }
}

function drawStateCircles() {
  clearStateCircles();
  if (!nationalSimulationResults) return;

  const { stateAllocations, partyNationalVotes = {} } = nationalSimulationResults;
  const circleEntries = [];
  let maxSeatsInScenario = 0;

  for (const [uf, config] of Object.entries(STATE_CIRCLE_CONFIGS)) {
    let allocations = stateAllocations[uf] || {};
    let seatsToAllocate = currentConfig.seatDistribution === 'real' ? REAL_SEATS[uf] : getSeatsAllocationByState(currentConfig.seatDistribution)[uf];

    if (currentConfig.seatDistribution === 'danish') {
      seatsToAllocate = nationalSimulationResults.constituencySeats ? (nationalSimulationResults.constituencySeats[uf] || 0) : seatsToAllocate;
      allocations = nationalSimulationResults.constituencyAllocations ? (nationalSimulationResults.constituencyAllocations[uf] || {}) : allocations;
    }

    if (seatsToAllocate > 0) {
      maxSeatsInScenario = Math.max(maxSeatsInScenario, seatsToAllocate);
    }

    circleEntries.push({ uf, config, allocations, seatsToAllocate });
  }

  const scenarioDotRadius = getDotRadiusForSeats(maxSeatsInScenario);

  for (const { uf, config, allocations, seatsToAllocate } of circleEntries) {
    if (seatsToAllocate <= 0) continue;

    const { seatColors } = buildOrderedSeatColors(allocations, partyNationalVotes);

    // If offset label is defined, draw leader line and anchor point
    const circlePos = config.label || config.center;
    if (config.label) {
      // Leader line
      const poly = glPolyline([config.center, config.label], {
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9
      });
      stateCircleLayers.push(poly);

      // Anchor dot on state centroid
      const dot = glCircleMarker(config.center, {
        radius: 3,
        fillColor: '#ffffff',
        color: '#1a1a24',
        weight: 1.5,
        fillOpacity: 1
      });
      stateCircleLayers.push(dot);
    }

    // Build circle icon based on current circle display mode
    let myIcon;
    if (circleViewMode === 'dots') {
      const dotsResult = createStateCircleDotsHTML(uf, seatsToAllocate, seatColors, scenarioDotRadius);
      myIcon = {
        className: 'state-parliament-circle state-parliament-dots',
        html: dotsResult.html
      };
    } else {
      const svgHtml = createStateCircleSVG(uf, seatsToAllocate, seatColors);
      myIcon = {
        className: 'state-parliament-circle',
        html: svgHtml
      };
    }

    const marker = glMarker([circlePos[1], circlePos[0]], myIcon).addTo();

    marker.on('click', () => {
      if (currentSystemType === 'proporcional' && currentElectionLevel !== 'estadual') {
        selectStateProportional(uf);
      } else {
        selectState(uf);
      }
    });

    if (selectedState !== null && selectedState !== uf) {
      marker.setOpacity(0.15);
    } else {
      marker.setOpacity(1.0);
    }

    const tooltipHtml = getStateTooltipHtml(uf);
    marker.bindTooltip(tooltipHtml, { className: 'district-nyt-tooltip', sticky: true });

    stateCircleLayers.push(marker);
  }

  // Draw national compensatory circle over the Atlantic Ocean
  if (currentConfig.seatDistribution === 'danish') {
    const cpSeats = 120;
    const cpAllocations = nationalSimulationResults.partyCompSeats || {};

    const { orderedParties: sortedCPParties, seatColors: cpSeatColors } = buildOrderedSeatColors(cpAllocations, nationalSimulationResults.partyNationalVotes || {});

    const cpPos = [-28.0, -12.0]; // [lng, lat] — positioned in the Atlantic Ocean

    let cpIcon;
    if (circleViewMode === 'dots') {
      const dotsResult = createStateCircleDotsHTML('CP', cpSeats, cpSeatColors, getDotRadiusForSeats(cpSeats));
      cpIcon = {
        className: 'state-parliament-circle compensatory-circle state-parliament-dots',
        html: dotsResult.html
      };
    } else {
      const svgHtml = createStateCircleSVG('CP', cpSeats, cpSeatColors);
      cpIcon = {
        className: 'state-parliament-circle compensatory-circle',
        html: svgHtml
      };
    }

    const cpMarker = glMarker(cpPos, cpIcon).addTo();

    const cpWinner = sortedCPParties[0] ? sortedCPParties[0].party : null;
    let cpRowsHtml = '';
    sortedCPParties.forEach((p, idx) => {
      const isWinner = p.party === cpWinner;
      const pctStr = cpSeats > 0 ? ((p.seats / cpSeats) * 100).toFixed(2) : '0.00';

      if (isWinner) {
        cpRowsHtml += `
          <tr>
            <td style="padding: 0;">
              <div class="district-nyt-winner-cell" style="background-color: ${p.color};">
                <span>${getCleanGroupName(p.party)}</span>
                <span style="font-size: 10px; margin-left: 6px;">✔</span>
              </div>
            </td>
            <td style="color: var(--text);">${p.seats}</td>
            <td style="font-weight: bold; color: var(--text);">${pctStr}%</td>
          </tr>
        `;
      } else {
        cpRowsHtml += `
          <tr>
            <td style="padding: 0;">
              <div class="district-nyt-loser-cell" style="border-left-color: ${p.color};">
                <span style="margin-left: 6px; color: var(--text);">${getCleanGroupName(p.party)}</span>
              </div>
            </td>
            <td style="color: var(--text-sec);">${p.seats}</td>
            <td style="font-weight: bold; color: var(--text);">${pctStr}%</td>
          </tr>
        `;
      }
    });

    if (cpRowsHtml === '') {
      cpRowsHtml = `<tr><td colspan="3" style="text-align:center;color:var(--muted);padding: 8px;">Nenhuma vaga conquistada</td></tr>`;
    }

    const cpTooltipHtml = `
      <div class="nyt-tooltip-container" style="font-family: var(--font-main); color: var(--text); min-width: 250px;">
        <div class="district-nyt-title">Círculo de Compensação Nacional</div>
        <table class="district-nyt-table">
          <thead>
            <tr>
              <th style="text-align: left;">Partido</th>
              <th>Vagas</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            ${cpRowsHtml}
          </tbody>
        </table>
        <div style="font-size: 11px; color: var(--muted); margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 6px; text-align: right;">Total: ${cpSeats} vagas de compensação</div>
      </div>
    `;
    cpMarker.bindTooltip(cpTooltipHtml, { className: 'district-nyt-tooltip', sticky: true });

    stateCircleLayers.push(cpMarker);
  }

  // Show the display-mode toggle when circles are visible
  setCircleToggleVisible(true);
}

// Merge state geometries into region outlines using Turf.js
function buildRegionsGeoJSON() {
  if (regionsGeoJSON) return; // Already built
  if (!estadosGeoJSON) return;

  const regionFeatures = [];

  for (const [regionName, ufs] of Object.entries(REGION_STATES)) {
    const ufsSet = new Set(ufs);
    let stateFeatures = estadosGeoJSON.features.filter(f => ufsSet.has(f.properties.SIGLA_UF));

    // Filter out oceanic islands (longitude > -34.7) to prevent map scaling compression
    stateFeatures = stateFeatures.map(f => {
      const cloned = JSON.parse(JSON.stringify(f));
      const geom = cloned.geometry;
      if (!geom) return cloned;

      if (geom.type === "MultiPolygon") {
        geom.coordinates = geom.coordinates.filter(poly => {
          let sum = 0;
          poly[0].forEach(pt => sum += pt[0]);
          return (sum / poly[0].length) <= -34.7;
        });
      } else if (geom.type === "Polygon") {
        let sum = 0;
        geom.coordinates[0].forEach(pt => sum += pt[0]);
        if ((sum / geom.coordinates[0].length) > -34.7) {
          geom.coordinates = [];
        }
      }
      return cloned;
    }).filter(f => {
      const geom = f.geometry;
      if (!geom) return false;
      if (geom.type === "MultiPolygon" && geom.coordinates.length === 0) return false;
      if (geom.type === "Polygon" && geom.coordinates.length === 0) return false;
      return true;
    });

    if (stateFeatures.length > 0) {
      let mergedFeature = JSON.parse(JSON.stringify(stateFeatures[0]));

      for (let i = 1; i < stateFeatures.length; i++) {
        try {
          const nextFeature = stateFeatures[i];
          const union = turf.union(mergedFeature, nextFeature);
          if (union) {
            mergedFeature = union;
          }
        } catch (e) {
          console.error(`Error merging state ${stateFeatures[i].properties.SIGLA_UF} into region ${regionName}:`, e);
        }
      }

      mergedFeature.properties = { REGION: regionName };
      try {
        mergedFeature = turf.rewind(mergedFeature, { reverse: true });
      } catch (e) {
        console.error(`Error rewinding region ${regionName}:`, e);
      }
      regionFeatures.push(mergedFeature);
    }
  }

  regionsGeoJSON = {
    type: "FeatureCollection",
    features: regionFeatures
  };
}

// Aggregate results by region for Senado Regionalizado
function getRegionResults() {
  if (!nationalSimulationResults) {
    return {
      regionSeats: { "Norte": {}, "Nordeste": {}, "Centro-Oeste": {}, "Sudeste": {}, "Sul": {} },
      regionWinner: {},
      regionVotes: { "Norte": {}, "Nordeste": {}, "Centro-Oeste": {}, "Sudeste": {}, "Sul": {} }
    };
  }
  const { regionalAllocations } = nationalSimulationResults;
  const regionSeats = {
    "Norte": {}, "Nordeste": {}, "Centro-Oeste": {}, "Sudeste": {}, "Sul": {}
  };
  const regionVotes = {
    "Norte": {}, "Nordeste": {}, "Centro-Oeste": {}, "Sudeste": {}, "Sul": {}
  };

  const stateToRegion = {};
  for (const [region, ufs] of Object.entries(REGION_STATES)) {
    for (const uf of ufs) {
      stateToRegion[uf] = region;
    }
  }

  // Populate region seats directly from the parallel regional allocations!
  for (const region of Object.keys(REGION_STATES)) {
    regionSeats[region] = { ...(regionalAllocations[region] || {}) };
  }

  // Aggregate votes for tooltip display
  for (const uf of Object.keys(officialTotals)) {
    const region = stateToRegion[uf];
    if (!region) continue;

    const ufFederal = officialTotals[uf].f;
    if (ufFederal) {
      ufFederal.coalitions.forEach(c => {
        let stdKey = getStandardFederationKey(c.id);
        const coalitionMap = getPresCoalitionMap();
        if (currentConfig.groupByPresidentialCoalition && coalitionMap[stdKey]) {
          stdKey = coalitionMap[stdKey];
        }
        regionVotes[region][stdKey] = (regionVotes[region][stdKey] || 0) + c.votes;
      });
    }
  }

  // Find winner for each region based on parallel region seats/votes
  const regionWinner = {};
  for (const region of Object.keys(REGION_STATES)) {
    let maxSeats = -1;
    let maxVotes = -1;
    let winner = null;

    const seatsMap = regionSeats[region];
    const votesMap = regionVotes[region];

    const allParties = new Set([
      ...Object.keys(seatsMap || {}),
      ...Object.keys(votesMap || {})
    ]);

    for (const party of allParties) {
      const seats = seatsMap[party] || 0;
      const votes = votesMap[party] || 0;

      if (seats > maxSeats || (seats === maxSeats && votes > maxVotes)) {
        maxSeats = seats;
        maxVotes = votes;
        winner = party;
      }
    }
    regionWinner[region] = winner;
  }

  return { regionSeats, regionVotes, regionWinner };
}

// Draw the regional minimap using D3.js
function drawRegionMinimap() {
  const container = d3.select('#regionMiniMapBody');
  container.selectAll('*').remove();

  const width = 280;
  const height = 240;

  const svg = container.append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Build and fit projection to dissolved regions
  buildRegionsGeoJSON();
  if (!regionsGeoJSON) return;

  const projection = d3.geoMercator();
  const pathGenerator = d3.geoPath().projection(projection);

  projection.fitSize([width, height], regionsGeoJSON);

  const { regionSeats, regionVotes, regionWinner } = getRegionResults();

  const statesGroup = svg.append('g');

  statesGroup.selectAll('path')
    .data(regionsGeoJSON.features)
    .enter()
    .append('path')
    .attr('d', pathGenerator)
    .attr('fill', d => {
      const reg = d.properties.REGION;
      const winner = regionWinner[reg];
      return winner ? getPartyColor(winner) : '#777777';
    })
    .attr('stroke', '#111111')
    .attr('stroke-width', 0.8)
    .attr('fill-opacity', 0.85)
    .on('mouseover', function (event, d) {
      const reg = d.properties.REGION;
      d3.selectAll('.region-state-path')
        .style('fill-opacity', s => s.properties.REGION === reg ? 1.0 : 0.4);

      showRegionTooltip(event, reg, regionSeats[reg], regionVotes[reg], regionWinner[reg]);
    })
    .on('mousemove', function (event) {
      moveRegionTooltip(event);
    })
    .on('mouseout', function () {
      d3.selectAll('.region-state-path').style('fill-opacity', 0.85);
      hideRegionTooltip();
    })
    .attr('class', 'region-state-path');

  // Draw regional seat circle pizzas at region centroids
  regionsGeoJSON.features.forEach(feat => {
    const reg = feat.properties.REGION;
    const seats = regionSeats[reg] || {};
    const N = Object.values(seats).reduce((s, v) => s + v, 0);
    if (N <= 0) return;

    const sortedParties = Object.entries(seats)
      .filter(([_, sCount]) => sCount > 0)
      .map(([party, sCount]) => ({
        party,
        seats: sCount,
        color: getPartyColor(party)
      }))
      .sort((a, b) => b.seats - a.seats);

    const seatColors = [];
    sortedParties.forEach(p => {
      for (let i = 0; i < p.seats; i++) {
        seatColors.push(p.color);
      }
    });

    const svgHtml = createStateCircleSVG(reg, N, seatColors);
    const centroid = pathGenerator.centroid(feat);
    if (isNaN(centroid[0]) || isNaN(centroid[1])) return;

    let size = 44;
    if (N <= 9) size = 44;
    else if (N <= 18) size = 52;
    else if (N <= 31) size = 64;
    else if (N <= 53) size = 76;
    else size = 92;

    const circleGroup = svg.append('g')
      .attr('transform', `translate(${centroid[0] - size / 2}, ${centroid[1] - size / 2})`)
      .html(svgHtml);

    circleGroup
      .on('mouseover', function (event) {
        d3.selectAll('.region-state-path')
          .style('fill-opacity', s => s.properties.REGION === reg ? 1.0 : 0.4);
        showRegionTooltip(event, reg, regionSeats[reg], regionVotes[reg], regionWinner[reg]);
      })
      .on('mousemove', function (event) {
        moveRegionTooltip(event);
      })
      .on('mouseout', function () {
        d3.selectAll('.region-state-path').style('fill-opacity', 0.85);
        hideRegionTooltip();
      })
      .style('cursor', 'pointer');
  });
}

// Regional tooltips
function showRegionTooltip(event, region, seatsMap, votesMap, winner) {
  const tooltip = document.getElementById('regionTooltip');
  const container = document.querySelector('.panel.side-res');
  if (!tooltip || !container) return;

  const regionCompSeats = {
    "Norte": 6, "Nordeste": 2, "Centro-Oeste": 12, "Sudeste": 12, "Sul": 14
  };
  const totalSeats = regionCompSeats[region] || 20;
  const sortedParties = Object.entries(seatsMap || {})
    .filter(([_, seats]) => seats > 0)
    .map(([party, seats]) => ({
      party,
      seats,
      color: getPartyColor(party),
      cleanName: getCleanGroupName(party)
    }))
    .sort((a, b) => b.seats - a.seats);

  let rowsHtml = '';
  sortedParties.forEach(p => {
    const isWinner = p.party === winner;
    const pct = ((p.seats / totalSeats) * 100).toFixed(1);
    const checkmark = isWinner ? '<span style="font-size: 10px; margin-left: 4px; color: var(--text);">✔</span>' : '';
    rowsHtml += `
      <div class="tooltip-row" style="display: flex; justify-content: space-between; gap: 8px; margin-top: 3px;">
        <span style="display: flex; align-items: center; gap: 4px; color: var(--text);">
          <span class="tooltip-badge" style="background: ${p.color}; width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span>
          <strong>${p.cleanName}</strong>${checkmark}
        </span>
        <span style="font-weight: 700; color: var(--text-sec);">${p.seats} (${pct}%)</span>
      </div>
    `;
  });

  if (rowsHtml === '') {
    rowsHtml = '<div style="color: var(--muted); text-align: center;">Nenhuma vaga conquistada</div>';
  }

  tooltip.innerHTML = `
    <div class="tooltip-header" style="font-family: var(--font-title); font-weight: 700; font-size: 0.85rem; margin-bottom: 6px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; color: var(--text);">
      Região ${region}
    </div>
    ${rowsHtml}
    <div style="font-size: 0.65rem; color: var(--muted); margin-top: 6px; border-top: 1px solid var(--border-color); padding-top: 4px; text-align: right;">
      Total: ${totalSeats} vagas
    </div>
  `;

  tooltip.className = 'chamber-tooltip';
  tooltip.style.opacity = '1';
  tooltip.style.display = 'block';
  moveRegionTooltip(event);
}

function moveRegionTooltip(event) {
  const tooltip = document.getElementById('regionTooltip');
  const container = document.querySelector('.panel.side-res');
  if (!tooltip || !container) return;

  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left + 12;
  const y = event.clientY - rect.top - 12;
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}

function hideRegionTooltip() {
  const tooltip = document.getElementById('regionTooltip');
  if (tooltip) {
    tooltip.className = 'chamber-tooltip hidden';
    tooltip.style.opacity = '0';
    tooltip.style.display = 'none';
  }
}

let cachedSenadoSvg = null;

async function loadSenadoSvg() {
  if (cachedSenadoSvg) return cachedSenadoSvg;
  try {
    const response = await fetch('Senado Regionalizado.svg');
    if (!response.ok) throw new Error('Failed to load Senado Regionalizado.svg');
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');

    // Clean up width/height to make it responsive
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.setAttribute('width', '100%');
    svgEl.setAttribute('height', '100%');

    cachedSenadoSvg = svgEl.outerHTML;
    return cachedSenadoSvg;
  } catch (error) {
    console.error('Error loading Senado Regionalizado SVG:', error);
    return null;
  }
}

async function renderSenadoRegionalizadoSvgMap() {
  const container = document.getElementById('svgMapContainer');
  if (!container) return;

  const svgText = await loadSenadoSvg();
  if (!svgText) {
    container.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">Erro ao carregar o mapa do Senado Regionalizado. Certifique-se de que o simulador está rodando em um servidor web.</div>';
    return;
  }

  container.innerHTML = svgText;

  // Unhide seat circles group
  const g6Group = container.querySelector('#g6');
  if (g6Group) {
    g6Group.style.display = 'inline';
  }

  if (!nationalSimulationResults) return;
  const { stateAllocations } = nationalSimulationResults;
  const { regionSeats, regionWinner, regionVotes } = getRegionResults();

  // 1. Color State Paths (under g#Estados)
  const estadosGroup = container.querySelector('#Estados');
  if (estadosGroup) {
    const paths = estadosGroup.querySelectorAll('path');
    paths.forEach(path => {
      const pathId = path.getAttribute('id');
      const uf = SENADO_SVG_STATE_MAPPING[pathId];
      if (uf) {
        const winner = getWinningPartyForUF(uf);
        const color = winner ? getPartyColor(winner) : '#777777';

        let winnerPct = 0;
        const ufAllocations = stateAllocations[uf] || {};
        const sorted = Object.values(ufAllocations).sort((a, b) => b - a);
        if (sorted.length > 0) {
          const sumSeats = sorted.reduce((s, v) => s + v, 0);
          winnerPct = sumSeats > 0 ? (sorted[0] / sumSeats) * 100 : 0;
        }

        const fillCol = getUniversalGradientColor(color, winnerPct);
        path.setAttribute('fill', fillCol);
        path.style.fill = fillCol;
        path.style.fillOpacity = '0.85';
        path.style.stroke = '#ffffff';
        path.style.strokeWidth = '138px';

        // Tooltip events
        path.addEventListener('mouseenter', (e) => {
          showStateTooltipSvg(e, uf);
        });
        path.addEventListener('mousemove', (e) => {
          moveRegionTooltip(e);
        });
        path.addEventListener('mouseleave', () => {
          hideRegionTooltip();
        });
      }
    });
  }

  // 2. Color Region Paths (under g#Estados-8)
  const regionsGroup = container.querySelector('#Estados-8');
  if (regionsGroup) {
    const paths = regionsGroup.querySelectorAll('path');
    paths.forEach(path => {
      const pathId = path.getAttribute('id');
      const region = SENADO_SVG_REGION_MAPPING[pathId];
      if (region) {
        const winner = regionWinner[region];
        const color = winner ? getPartyColor(winner) : '#777777';
        path.setAttribute('fill', color);
        path.style.fill = color;
        path.style.fillOpacity = '0.85';
        path.style.stroke = '#ffffff';
        path.style.strokeWidth = '282px';

        // Tooltip events
        path.addEventListener('mouseenter', (e) => {
          showRegionTooltip(e, region, regionSeats[region], regionVotes[region], regionWinner[region]);
        });
        path.addEventListener('mousemove', (e) => {
          moveRegionTooltip(e);
        });
        path.addEventListener('mouseleave', () => {
          hideRegionTooltip();
        });
      }
    });
  }

  // Helper to color circles in a group
  function colorCircleGroup(gId, seatsMap) {
    const group = container.querySelector('#' + gId);
    if (!group) return;

    const sortedParties = Object.entries(seatsMap || {})
      .filter(([_, sCount]) => sCount > 0)
      .map(([party, sCount]) => ({
        party,
        seats: sCount,
        color: getPartyColor(party)
      }))
      .sort((a, b) => b.seats - a.seats);

    const seatColors = [];
    sortedParties.forEach(p => {
      for (let i = 0; i < p.seats; i++) {
        seatColors.push(p.color);
      }
    });

    const circles = group.querySelectorAll('circle');
    circles.forEach((circle, idx) => {
      if (idx < seatColors.length) {
        circle.style.display = '';
        circle.setAttribute('fill', seatColors[idx]);
        circle.style.fill = seatColors[idx];
        circle.style.fillOpacity = '1';
        circle.style.stroke = '#000000';
      } else {
        circle.style.display = 'none';
      }
    });
  }

  // 3. Color State Circle Groups
  for (const [uf, gId] of Object.entries(SENADO_SVG_STATE_CIRCLES)) {
    const allocations = stateAllocations[uf] || {};
    colorCircleGroup(gId, allocations);

    const group = container.querySelector('#' + gId);
    if (group) {
      group.style.cursor = 'default';
      group.addEventListener('mouseenter', (e) => {
        showStateTooltipSvg(e, uf);
      });
      group.addEventListener('mousemove', (e) => {
        moveRegionTooltip(e);
      });
      group.addEventListener('mouseleave', () => {
        hideRegionTooltip();
      });
    }
  }

  // 4. Color Regional Circle Groups
  for (const [region, gId] of Object.entries(SENADO_SVG_REGION_CIRCLES)) {
    const seats = regionSeats[region] || {};
    colorCircleGroup(gId, seats);

    const group = container.querySelector('#' + gId);
    if (group) {
      group.style.cursor = 'default';
      group.addEventListener('mouseenter', (e) => {
        showRegionTooltip(e, region, regionSeats[region], regionVotes[region], regionWinner[region]);
      });
      group.addEventListener('mousemove', (e) => {
        moveRegionTooltip(e);
      });
      group.addEventListener('mouseleave', () => {
        hideRegionTooltip();
      });
    }
  }
}

async function renderSenadoRegionalizadoSvgMapV2() {
  return renderSenadoRegionalizadoSvgMapV3();
  /* legacy implementation kept below
  const container = document.getElementById('svgMapContainer');
  if (!container) return;

  const svgText = await loadSenadoSvg();
  if (!svgText) {
    container.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">Erro ao carregar o mapa do Senado Regionalizado. Certifique-se de que o simulador estÃ¡ rodando em um servidor web.</div>';
    return;
  }

  container.innerHTML = svgText;

  const g6Group = container.querySelector('#g6');
  if (g6Group) g6Group.style.display = 'inline';

  const tooltip = document.getElementById('regionTooltip');
  const { stateAllocations } = nationalSimulationResults;
  const { regionSeats, regionWinner, regionVotes } = getRegionResults();
  const hasStateSelection = selectedState !== null;
  const hasRegionSelection = selectedRegion !== null;

  const showTooltip = (html, event) => {
    if (!tooltip) return;
    tooltip.innerHTML = html;
    tooltip.className = 'district-nyt-tooltip';
    tooltip.style.opacity = '1';
    tooltip.style.display = 'block';
    moveRegionTooltip(event);
  };

  const hideTooltip = () => {
    if (!tooltip) return;
    tooltip.className = 'district-nyt-tooltip hidden';
    tooltip.style.opacity = '0';
    tooltip.style.display = 'none';
  };

  const renderCarouselInGroup = (group, label, seatMap) => {
    if (!group) return;

    const allocations = Object.entries(seatMap || {})
      .filter(([_, seats]) => seats > 0)
      .map(([party, seats]) => ({ party, seats, color: getPartyColor(party) }))
      .sort((a, b) => b.seats - a.seats);

    const seatColors = [];
    allocations.forEach(p => {
      for (let i = 0; i < p.seats; i++) seatColors.push(p.color);
    });

    const seatsCount = seatColors.length;
    const selected = selectedState === label || selectedRegion === label;
    const dimmed = (hasStateSelection && selectedState !== label) || (hasRegionSelection && selectedRegion !== label);

    if (seatsCount <= 0) {
      group.style.display = 'none';
      return;
    }

    group.style.display = '';
    group.style.opacity = selected ? '1' : (dimmed ? '0.25' : '1');
    group.style.cursor = 'pointer';

    const bbox = group.getBBox();
    const size = seatsCount <= 9 ? 44 : seatsCount <= 18 ? 52 : seatsCount <= 31 ? 64 : seatsCount <= 53 ? 76 : 92;
    const x = bbox.x + (bbox.width / 2) - (size / 2);
    const y = bbox.y + (bbox.height / 2) - (size / 2);

    group.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('x', x);
    svg.setAttribute('y', y);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('class', 'state-circle-svg');
    svg.innerHTML = createStateCircleSVG(label, seatsCount, seatColors, true);
    group.appendChild(svg);
  };

  const estadosGroup = container.querySelector('#Estados');
  if (estadosGroup) {
    estadosGroup.querySelectorAll('path').forEach(path => {
      const uf = SENADO_SVG_STATE_MAPPING[path.getAttribute('id')];
      if (!uf) return;

      const winner = getWinningPartyForUF(uf);
      const color = winner ? getPartyColor(winner) : '#777777';
      const ufAllocations = stateAllocations[uf] || {};
      const sorted = Object.values(ufAllocations).sort((a, b) => b - a);
      let winnerPct = 0;
      if (sorted.length > 0) {
        const sumSeats = sorted.reduce((s, v) => s + v, 0);
        winnerPct = sumSeats > 0 ? (sorted[0] / sumSeats) * 100 : 0;
      }

      const fillCol = getUniversalGradientColor(color, winnerPct);
      path.setAttribute('fill', fillCol);
      path.style.fill = fillCol;
      path.style.fillOpacity = '0.85';
      path.style.stroke = '#ffffff';
      path.style.strokeWidth = '138px';
      path.style.cursor = 'pointer';
      path.style.opacity = selectedState === uf ? '1' : (hasStateSelection && selectedState !== uf ? '0.35' : '1');

      path.addEventListener('mouseenter', e => showTooltip(getStateTooltipHtml(uf), e));
      path.addEventListener('mousemove', e => moveRegionTooltip(e));
      path.addEventListener('mouseleave', hideTooltip);
      path.addEventListener('click', e => {
        e.stopPropagation();
        selectStateProportional(uf);
      });
    });
  }

  const regionsGroup = container.querySelector('#Estados-8');
  if (regionsGroup) {
    regionsGroup.querySelectorAll('path').forEach(path => {
      const region = SENADO_SVG_REGION_MAPPING[path.getAttribute('id')];
      if (!region) return;

      const winner = regionWinner[region];
      const color = winner ? getPartyColor(winner) : '#777777';
      path.setAttribute('fill', color);
      path.style.fill = color;
      path.style.fillOpacity = '0.85';
      path.style.stroke = '#ffffff';
      path.style.strokeWidth = '282px';
      path.style.cursor = 'pointer';
      path.style.opacity = selectedRegion === region ? '1' : (hasRegionSelection && selectedRegion !== region ? '0.35' : '1');

      path.addEventListener('mouseenter', e => showTooltip(buildSeatTooltipHtml(`Região ${region}`, Object.entries(regionSeats[region] || {}).map(([party, seats]) => ({
        party,
        seats,
        color: getPartyColor(party),
        cleanName: getCleanGroupName(party),
        isWinner: party === winner
      })), (region === 'Norte' ? 6 : region === 'Nordeste' ? 2 : region === 'Centro-Oeste' ? 12 : region === 'Sudeste' ? 12 : 14, 'vagas'), e));
      path.addEventListener('mousemove', e => moveRegionTooltip(e));
      path.addEventListener('mouseleave', hideTooltip);
      path.addEventListener('click', e => {
        e.stopPropagation();
        selectRegionProportional(region);
      });
    });
  }

  for (const [uf, gId] of Object.entries(SENADO_SVG_STATE_CIRCLES)) {
    const group = container.querySelector('#' + gId);
    const allocations = stateAllocations[uf] || {};
    renderCarouselInGroup(group, uf, allocations);
    if (group) {
      group.addEventListener('mouseenter', e => showTooltip(getStateTooltipHtml(uf), e));
      group.addEventListener('mousemove', e => moveRegionTooltip(e));
      group.addEventListener('mouseleave', hideTooltip);
      group.addEventListener('click', e => {
        e.stopPropagation();
        selectStateProportional(uf);
      });
    }
  }

  for (const [region, gId] of Object.entries(SENADO_SVG_REGION_CIRCLES)) {
    const group = container.querySelector('#' + gId);
    const allocations = regionSeats[region] || {};
    const regionParties = Object.entries(allocations).map(([party, seats]) => ({
      party,
      seats,
      color: getPartyColor(party),
      cleanName: getCleanGroupName(party),
      isWinner: party === regionWinner[region]
    }));
    const regionTotalSeats = Object.values(allocations).reduce((sum, value) => sum + value, 0);
    renderCarouselInGroup(group, region, allocations);
    if (group) {
      group.addEventListener('mouseenter', e => {
        showTooltip(buildSeatTooltipHtml(`Região ${region}`, regionParties, regionTotalSeats, 'vagas'), e);
      });
      group.addEventListener('mousemove', e => moveRegionTooltip(e));
      group.addEventListener('mouseleave', hideTooltip);
      group.addEventListener('click', e => {
        e.stopPropagation();
        selectRegionProportional(region);
      });
    }
  }
}

*/
}

async function renderSenadoRegionalizadoSvgMapV3() {
  const container = document.getElementById('svgMapContainer');
  if (!container) return;

  const svgText = await loadSenadoSvg();
  if (!svgText) {
    container.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">Erro ao carregar o mapa do Senado Regionalizado. Certifique-se de que o simulador esta rodando em um servidor web.</div>';
    return;
  }

  container.innerHTML = svgText;

  const g6Group = container.querySelector('#g6');
  if (g6Group) g6Group.style.display = 'inline';

  const tooltip = document.getElementById('regionTooltip');
  const { stateAllocations } = nationalSimulationResults;
  const { regionSeats, regionWinner, regionVotes } = getRegionResults();
  const hasStateSelection = selectedState !== null;
  const hasRegionSelection = selectedRegion !== null;
  const rootSvg = container.querySelector('svg');
  const rootViewBoxWidth = (() => {
    if (rootSvg && rootSvg.viewBox && rootSvg.viewBox.baseVal && rootSvg.viewBox.baseVal.width) {
      return rootSvg.viewBox.baseVal.width;
    }
    const viewBox = rootSvg ? rootSvg.getAttribute('viewBox') : null;
    if (viewBox) {
      const parts = viewBox.trim().split(/[,\s]+/);
      const parsed = parseFloat(parts[2]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return 220000;
  })();
  const rootRenderedWidth = rootSvg?.getBoundingClientRect().width || container.getBoundingClientRect().width || 1;
  const rootUnitsPerPixel = rootRenderedWidth > 0 ? (rootViewBoxWidth / rootRenderedWidth) : 1;

  const showTooltip = (html, event) => {
    if (!tooltip) return;
    tooltip.innerHTML = html;
    tooltip.className = 'district-nyt-tooltip';
    tooltip.style.opacity = '1';
    tooltip.style.display = 'block';
    moveRegionTooltip(event);
  };

  const hideTooltip = () => {
    if (!tooltip) return;
    tooltip.className = 'district-nyt-tooltip hidden';
    tooltip.style.opacity = '0';
    tooltip.style.display = 'none';
  };

  const getCarouselBaseSize = seatsCount => {
    if (seatsCount <= 9) return 44;
    if (seatsCount <= 18) return 52;
    if (seatsCount <= 31) return 64;
    if (seatsCount <= 53) return 76;
    return 92;
  };

  const getGroupLocalScale = group => {
    const transformAttr = group.getAttribute('transform') || '';
    const match = transformAttr.match(/matrix\(([^)]+)\)/i);
    if (!match) return 1;

    const values = match[1].split(/[,\s]+/).map(Number).filter(value => Number.isFinite(value));
    if (values.length < 4) return 1;

    const [a, b, c, d] = values;
    const scaleX = Math.hypot(a, b) || 1;
    const scaleY = Math.hypot(c, d) || 1;
    return (scaleX + scaleY) / 2 || 1;
  };

  const getGroupLocalCenter = group => {
    const circles = Array.from(group.querySelectorAll('circle'));
    if (circles.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      circles.forEach(circle => {
        const cx = parseFloat(circle.getAttribute('cx') || '0');
        const cy = parseFloat(circle.getAttribute('cy') || '0');
        const r = parseFloat(circle.getAttribute('r') || '0');

        if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r)) return;
        minX = Math.min(minX, cx - r);
        minY = Math.min(minY, cy - r);
        maxX = Math.max(maxX, cx + r);
        maxY = Math.max(maxY, cy + r);
      });

      if (Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)) {
        return {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2
        };
      }
    }

    const bbox = group.getBBox();
    return {
      x: bbox.x + (bbox.width / 2),
      y: bbox.y + (bbox.height / 2)
    };
  };

  const renderCarouselInGroup = (group, label, allocations, selectedFlag, dimmedFlag) => {
    if (!group) return;

    group.querySelectorAll('.senado-carousel-overlay').forEach(node => node.remove());

    const seatColors = [];
    Object.entries(allocations || {})
      .filter(([_, seats]) => seats > 0)
      .sort((a, b) => b[1] - a[1])
      .forEach(([party, seats]) => {
        for (let i = 0; i < seats; i++) {
          seatColors.push(getPartyColor(party));
        }
      });

    const seatsCount = seatColors.length;
    if (seatsCount <= 0) {
      group.style.display = 'none';
      return;
    }

    group.style.display = '';
    group.style.opacity = selectedFlag ? '1' : (dimmedFlag ? '0.25' : '1');
    group.style.cursor = 'pointer';

    if (circleViewMode === 'dots') {
      group.querySelectorAll('circle').forEach(circle => {
        circle.style.visibility = 'hidden';
        circle.style.pointerEvents = 'none';
      });

      const N = seatsCount;
      let cols;
      if (N <= 4) cols = 2;
      else if (N <= 9) cols = 3;
      else if (N <= 16) cols = 4;
      else if (N <= 25) cols = 5;
      else if (N <= 42) cols = 6;
      else if (N <= 63) cols = 8;
      else cols = 10;

      const dotRows = Math.ceil(N / cols);
      const dotR = getDotRadiusForSeats(N);
      const gap = 1.25;
      const padding = 6.25;
      const dotSpacing = dotR * 2 + gap;
      const svgW = cols * dotSpacing - gap + padding * 2;
      const svgH = dotRows * dotSpacing - gap + padding * 2;

      let circlesInner = '';
      for (let i = 0; i < N; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const rowSeats = row === dotRows - 1 ? (N - row * cols) : cols;
        const rowOffset = rowSeats < cols ? ((cols - rowSeats) * dotSpacing) / 2 : 0;
        const cx = (padding + dotR + rowOffset + col * dotSpacing).toFixed(1);
        const cy = (padding + dotR + row * dotSpacing).toFixed(1);
        const fill = seatColors[i] || '#555555';
        circlesInner += `<circle cx="${cx}" cy="${cy}" r="${dotR}" fill="${fill}" stroke="#0b0d11" stroke-width="0.375"/>`;
      }

      const groupScale = getGroupLocalScale(group) || 1;
      const renderedW = svgW * rootUnitsPerPixel / groupScale;
      const renderedH = svgH * rootUnitsPerPixel / groupScale;
      const center = getGroupLocalCenter(group);

      const dotOverlaySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      dotOverlaySvg.setAttribute('class', 'state-circle-svg senado-carousel-overlay');
      dotOverlaySvg.setAttribute('x', `${center.x - renderedW / 2}`);
      dotOverlaySvg.setAttribute('y', `${center.y - renderedH / 2}`);
      dotOverlaySvg.setAttribute('width', `${renderedW}`);
      dotOverlaySvg.setAttribute('height', `${renderedH}`);
      dotOverlaySvg.setAttribute('viewBox', `0 0 ${svgW.toFixed(1)} ${svgH.toFixed(1)}`);
      dotOverlaySvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      dotOverlaySvg.style.overflow = 'visible';
      dotOverlaySvg.style.pointerEvents = 'all';
      dotOverlaySvg.innerHTML = circlesInner;
      group.appendChild(dotOverlaySvg);
      return;
    }

    const logicalSize = getCarouselBaseSize(seatsCount);
    const groupScale = getGroupLocalScale(group) || 1;
    const renderedSize = logicalSize * rootUnitsPerPixel / groupScale;
    const center = getGroupLocalCenter(group);
    const x = center.x - (renderedSize / 2);
    const y = center.y - (renderedSize / 2);

    group.querySelectorAll('circle').forEach(circle => {
      circle.style.visibility = 'hidden';
      circle.style.pointerEvents = 'none';
    });

    const overlaySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    overlaySvg.setAttribute('class', 'state-circle-svg senado-carousel-overlay');
    overlaySvg.setAttribute('x', `${x}`);
    overlaySvg.setAttribute('y', `${y}`);
    overlaySvg.setAttribute('width', `${renderedSize}`);
    overlaySvg.setAttribute('height', `${renderedSize}`);
    overlaySvg.setAttribute('viewBox', `0 0 ${logicalSize} ${logicalSize}`);
    overlaySvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    overlaySvg.style.overflow = 'visible';
    overlaySvg.style.pointerEvents = 'all';
    overlaySvg.innerHTML = createStateCircleSVG(label, seatsCount, seatColors, true);
    group.appendChild(overlaySvg);
  };

  const statePathGroup = container.querySelector('#Estados');
  if (statePathGroup) {
    statePathGroup.querySelectorAll('path').forEach(path => {
      const uf = SENADO_SVG_STATE_MAPPING[path.getAttribute('id')];
      if (!uf) return;

      const winner = getWinningPartyForUF(uf);
      const color = winner ? getPartyColor(winner) : '#777777';
      const ufAllocations = stateAllocations[uf] || {};
      const sorted = Object.values(ufAllocations).sort((a, b) => b - a);
      let winnerPct = 0;
      if (sorted.length > 0) {
        const sumSeats = sorted.reduce((sum, value) => sum + value, 0);
        winnerPct = sumSeats > 0 ? (sorted[0] / sumSeats) * 100 : 0;
      }

      const fillCol = getUniversalGradientColor(color, winnerPct);
      path.setAttribute('fill', fillCol);
      path.style.fill = fillCol;
      path.style.fillOpacity = '0.85';
      path.style.stroke = '#0d0e12';
      path.style.strokeWidth = '138px';
      path.style.cursor = 'pointer';
      path.style.opacity = selectedState === uf ? '1' : (hasStateSelection && selectedState !== uf ? '0.35' : '1');

      path.addEventListener('mouseenter', e => showTooltip(getStateTooltipHtml(uf), e));
      path.addEventListener('mousemove', e => moveRegionTooltip(e));
      path.addEventListener('mouseleave', hideTooltip);
      path.addEventListener('click', e => {
        e.stopPropagation();
        selectStateProportional(uf);
      });
    });
  }

  const regionPathGroup = container.querySelector('#Estados-8');
  if (regionPathGroup) {
    regionPathGroup.querySelectorAll('path').forEach(path => {
      const region = SENADO_SVG_REGION_MAPPING[path.getAttribute('id')];
      if (!region) return;

      const winner = regionWinner[region];
      const color = winner ? getPartyColor(winner) : '#777777';
      const allocations = regionSeats[region] || {};
      const regionParties = Object.entries(allocations).map(([party, seats]) => ({
        party,
        seats,
        color: getPartyColor(party),
        cleanName: getCleanGroupName(party),
        isWinner: party === winner
      }));
      const regionTotalSeats = Object.values(allocations).reduce((sum, value) => sum + value, 0);

      const sorted = Object.values(allocations).sort((a, b) => b - a);
      let winnerPct = 0;
      if (sorted.length > 0) {
        const sumSeats = sorted.reduce((sum, value) => sum + value, 0);
        winnerPct = sumSeats > 0 ? (sorted[0] / sumSeats) * 100 : 0;
      }
      const fillCol = getUniversalGradientColor(color, winnerPct);

      path.setAttribute('fill', fillCol);
      path.style.fill = fillCol;
      path.style.fillOpacity = '0.85';
      path.style.stroke = '#0d0e12';
      path.style.strokeWidth = '282px';
      path.style.cursor = 'pointer';
      path.style.opacity = selectedRegion === region ? '1' : (hasRegionSelection && selectedRegion !== region ? '0.35' : '1');

      path.addEventListener('mouseenter', e => {
        showTooltip(buildSeatTooltipHtml(`Regiao ${region}`, regionParties, regionTotalSeats, 'vagas'), e);
      });
      path.addEventListener('mousemove', e => moveRegionTooltip(e));
      path.addEventListener('mouseleave', hideTooltip);
      path.addEventListener('click', e => {
        e.stopPropagation();
        selectRegionProportional(region);
      });
    });
  }

  for (const [uf, gId] of Object.entries(SENADO_SVG_STATE_CIRCLES)) {
    const group = container.querySelector('#' + gId);
    if (currentConfig.seatDistribution === 'senado_regionalizado_1') {
      if (group) {
        group.querySelectorAll('.senado-carousel-overlay').forEach(node => node.remove());
        group.querySelectorAll('circle').forEach(c => { c.style.display = 'none'; });
        group.style.display = 'none';
      }
    } else {
      const allocations = stateAllocations[uf] || {};
      renderCarouselInGroup(group, uf, allocations, selectedState === uf, hasStateSelection && selectedState !== uf);
      if (group) {
        group.addEventListener('mouseenter', e => showTooltip(getStateTooltipHtml(uf), e));
        group.addEventListener('mousemove', e => moveRegionTooltip(e));
        group.addEventListener('mouseleave', hideTooltip);
        group.addEventListener('click', e => {
          e.stopPropagation();
          selectStateProportional(uf);
        });
      }
    }
  }

  for (const [region, gId] of Object.entries(SENADO_SVG_REGION_CIRCLES)) {
    const group = container.querySelector('#' + gId);
    const allocations = regionSeats[region] || {};
    const regionParties = Object.entries(allocations).map(([party, seats]) => ({
      party,
      seats,
      color: getPartyColor(party),
      cleanName: getCleanGroupName(party),
      isWinner: party === regionWinner[region]
    }));
    const regionTotalSeats = Object.values(allocations).reduce((sum, value) => sum + value, 0);

    renderCarouselInGroup(group, region, allocations, selectedRegion === region, hasRegionSelection && selectedRegion !== region);
    if (group) {
      group.addEventListener('mouseenter', e => {
        showTooltip(buildSeatTooltipHtml(`Regiao ${region}`, regionParties, regionTotalSeats, 'vagas'), e);
      });
      group.addEventListener('mousemove', e => moveRegionTooltip(e));
      group.addEventListener('mouseleave', hideTooltip);
      group.addEventListener('click', e => {
        e.stopPropagation();
        selectRegionProportional(region);
      });
    }
  }
}

function createPieChartSvgGroup(cx, cy, R, label, N, seatColors) {
  const rBg = R;
  let rCenter;
  if (N <= 9) rCenter = R * 0.25;
  else if (N <= 18) rCenter = R * 0.30;
  else if (N <= 31) rCenter = R * 0.35;
  else if (N <= 53) rCenter = R * 0.40;
  else rCenter = R * 0.45;

  const seats = [];
  function getSectorPath(rRing, thickness, theta, count) {
    const localGap = count === 1 ? 0.999 : 1.0;
    const r1 = rRing - thickness / 2;
    const r2 = rRing + thickness / 2;
    const dTheta = (2 * Math.PI / count) * localGap;
    const theta1 = theta - dTheta / 2;
    const theta2 = theta + dTheta / 2;

    const p1x = cx + r1 * Math.cos(theta1);
    const p1y = cy + r1 * Math.sin(theta1);
    const p2x = cx + r2 * Math.cos(theta1);
    const p2y = cy + r2 * Math.sin(theta1);
    const p3x = cx + r2 * Math.cos(theta2);
    const p3y = cy + r2 * Math.sin(theta2);
    const p4x = cx + r1 * Math.cos(theta2);
    const p4y = cy + r1 * Math.sin(theta2);

    const largeArc = (dTheta > Math.PI) ? 1 : 0;

    return `M ${p1x.toFixed(2)} ${p1y.toFixed(2)} L ${p2x.toFixed(2)} ${p2y.toFixed(2)} A ${r2.toFixed(2)} ${r2.toFixed(2)} 0 ${largeArc} 1 ${p3x.toFixed(2)} ${p3y.toFixed(2)} L ${p4x.toFixed(2)} ${p4y.toFixed(2)} A ${r1.toFixed(2)} ${r1.toFixed(2)} 0 ${largeArc} 0 ${p1x.toFixed(2)} ${p1y.toFixed(2)} Z`;
  }

  if (N <= 18) {
    const rRing = (rCenter + rBg) / 2;
    const thickness = (rBg - rCenter) * 0.85;
    for (let i = 0; i < N; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / N);
      const d = getSectorPath(rRing, thickness, theta, N);
      seats.push({ d, theta });
    }
  } else if (N <= 31) {
    const n1 = Math.floor(N * 0.4);
    const n2 = N - n1;
    const dist = rBg - rCenter;
    const r1 = rCenter + dist * 0.25;
    const r2 = rCenter + dist * 0.75;
    const thickness = dist * 0.45;

    for (let i = 0; i < n2; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n2);
      const d = getSectorPath(r2, thickness, theta, n2);
      seats.push({ d, theta });
    }
    for (let i = 0; i < n1; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n1);
      const d = getSectorPath(r1, thickness, theta, n1);
      seats.push({ d, theta });
    }
  } else if (N <= 53) {
    const n1 = Math.floor(N * 0.22);
    const n2 = Math.floor(N * 0.35);
    const n3 = N - n1 - n2;
    const dist = rBg - rCenter;
    const r1 = rCenter + dist * 0.20;
    const r2 = rCenter + dist * 0.50;
    const r3 = rCenter + dist * 0.80;
    const thickness = dist * 0.28;

    for (let i = 0; i < n3; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n3);
      const d = getSectorPath(r3, thickness, theta, n3);
      seats.push({ d, theta });
    }
    for (let i = 0; i < n2; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n2);
      const d = getSectorPath(r2, thickness, theta, n2);
      seats.push({ d, theta });
    }
    for (let i = 0; i < n1; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n1);
      const d = getSectorPath(r1, thickness, theta, n1);
      seats.push({ d, theta });
    }
  } else {
    const n1 = Math.floor(N * 0.15);
    const n2 = Math.floor(N * 0.23);
    const n3 = Math.floor(N * 0.29);
    const n4 = N - n1 - n2 - n3;
    const dist = rBg - rCenter;
    const r1 = rCenter + dist * 0.15;
    const r2 = rCenter + dist * 0.40;
    const r3 = rCenter + dist * 0.65;
    const r4 = rCenter + dist * 0.90;
    const thickness = dist * 0.21;

    for (let i = 0; i < n4; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n4);
      const d = getSectorPath(r4, thickness, theta, n4);
      seats.push({ d, theta });
    }
    for (let i = 0; i < n3; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n3);
      const d = getSectorPath(r3, thickness, theta, n3);
      seats.push({ d, theta });
    }
    for (let i = 0; i < n2; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n2);
      const d = getSectorPath(r2, thickness, theta, n2);
      seats.push({ d, theta });
    }
    for (let i = 0; i < n1; i++) {
      const theta = -Math.PI / 2 + (i * 2 * Math.PI / n1);
      const d = getSectorPath(r1, thickness, theta, n1);
      seats.push({ d, theta });
    }
  }

  seats.sort((a, b) => a.theta - b.theta);

  const seatElements = seats.map((seat, idx) => {
    const color = seatColors[idx] || '#555555';
    return `<path d="${seat.d}" fill="${color}" stroke="#0d0e12" stroke-width="${(R * 0.01).toFixed(1)}"/>`;
  });

  const fontSizeTitle = (rCenter * 0.65).toFixed(1);
  const fontSizeCount = (rCenter * 0.50).toFixed(1);

  const innerSvg = `
    <circle cx="${cx}" cy="${cy}" r="${rBg}" fill="#0d0e12" fill-opacity="0.6" stroke="none"/>
    ${seatElements.join('\n')}
    <circle cx="${cx}" cy="${cy}" r="${rCenter}" fill="#0d0e12" stroke="#242936" stroke-width="${(R * 0.015).toFixed(1)}"/>
    <text x="${cx}" y="${cy - R * 0.01}" text-anchor="middle" font-family="var(--font-title)" font-weight="700" font-size="${fontSizeTitle}" fill="#ffffff" dominant-baseline="middle">${label}</text>
    <text x="${cx}" y="${cy + rCenter * 0.45}" text-anchor="middle" font-family="var(--font-main)" font-weight="500" font-size="${fontSizeCount}" fill="#9ca3af" dominant-baseline="middle">${N}</text>
  `;

  if (innerOnly) {
    return innerSvg;
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="state-circle-svg">
      ${innerSvg}
    </svg>
  `;
}

function replaceCircleGroupWithCarousel(group, label, seatsCount, seatColors) {
  if (!group) return;

  if (seatsCount <= 0) {
    group.style.display = 'none';
    return;
  }

  const bounds = group.getBBox();
  const size = seatsCount <= 9 ? 44 : seatsCount <= 18 ? 52 : seatsCount <= 31 ? 64 : seatsCount <= 53 ? 76 : 92;
  const x = bounds.x + (bounds.width / 2) - (size / 2);
  const y = bounds.y + (bounds.height / 2) - (size / 2);

  group.style.display = '';
  group.innerHTML = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('x', x);
  svg.setAttribute('y', y);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('class', 'state-circle-svg');
  svg.innerHTML = createStateCircleSVG(label, seatsCount, seatColors, true);
  group.appendChild(svg);
}

function selectStateProportional(uf) {
  selectedState = uf;
  selectedRegion = null;
  renderResultsList();
  renderMap();
  if (currentConfig.seatDistribution !== 'senado_regionalizado_1' && currentConfig.seatDistribution !== 'senado_regionalizado_2') {
    focusStateOnMap(uf);
  }
}

function focusStateOnMap(uf) {
  if (!mapObj || !estadosGeoJSON || !uf) return;

  const bounds = geoBboxBounds(estadosGeoJSON, feature => feature.properties && feature.properties.SIGLA_UF === uf);
  if (bounds && bounds.isValid()) {
    glFitBounds(bounds, [24, 24]);
  }
}

function selectRegionProportional(region) {
  selectedState = null;
  selectedRegion = region;
  renderResultsList();
  renderMap();
}

function showStateTooltipSvg(event, uf) {
  const tooltip = document.getElementById('regionTooltip');
  if (!tooltip) return;
  const html = getStateTooltipHtml(uf);
  tooltip.innerHTML = html;
  tooltip.className = 'district-nyt-tooltip';
  tooltip.style.opacity = '1';
  tooltip.style.display = 'block';
  moveRegionTooltip(event);
}

let cachedDeputadosSemilocalSvg = null;

async function loadDeputadosSemilocalSvg() {
  if (cachedDeputadosSemilocalSvg) return cachedDeputadosSemilocalSvg;
  try {
    const response = await fetch('Deputados Semilocal.svg');
    if (!response.ok) throw new Error('Failed to load Deputados Semilocal.svg');
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');

    // Remove white background rectangle inside the SVG
    const rect5 = svgEl.querySelector('#rect5');
    if (rect5) {
      rect5.remove();
    }

    // Clean up width/height to make it responsive
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.setAttribute('width', '100%');
    svgEl.setAttribute('height', '100%');
    svgEl.style.backgroundColor = 'transparent';

    cachedDeputadosSemilocalSvg = svgEl.outerHTML;
    return cachedDeputadosSemilocalSvg;
  } catch (error) {
    console.error('Error loading Deputados Semilocal SVG:', error);
    return null;
  }
}

function getSubregionWinner(subName) {
  const alloc = (nationalSimulationResults && nationalSimulationResults.subregionAllocations)
    ? (nationalSimulationResults.subregionAllocations[subName] || {})
    : {};

  let maxSeats = -1;
  let winner = null;

  const electionKey = document.getElementById('selectVoteBase')
    ? document.getElementById('selectVoteBase').value
    : 'deputado_2022';

  const subVotesData = (semilocalVotosData && semilocalVotosData[subName])
    ? semilocalVotosData[subName][electionKey]
    : null;

  for (const [party, count] of Object.entries(alloc)) {
    if (count > maxSeats) {
      maxSeats = count;
      winner = party;
    } else if (count === maxSeats && winner !== null) {
      const votesCurr = (subVotesData && subVotesData[party]) || 0;
      const votesWinner = (subVotesData && subVotesData[winner]) || 0;
      if (votesCurr > votesWinner) {
        winner = party;
      }
    }
  }
  return winner;
}

async function renderDeputadosSemilocalSvgMap() {
  const container = document.getElementById('svgMapContainer');
  if (!container) return;

  const svgText = await loadDeputadosSemilocalSvg();
  if (!svgText) {
    container.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">Erro ao carregar o mapa do Deputados Semilocal. Certifique-se de que o simulador está rodando em um servidor web.</div>';
    return;
  }

  container.innerHTML = svgText;

  if (!nationalSimulationResults) return;
  const tooltip = document.getElementById('regionTooltip');
  const { subregionSeats, subregionAllocations } = nationalSimulationResults;

  const hasSubregionSelection = selectedSubregion !== null;
  const rootSvg = container.querySelector('svg');

  const contornosGroup = container.querySelector('#g33');
  if (contornosGroup) {
    contornosGroup.style.pointerEvents = 'none';
  }

  // Force physical connector lines in g5 to white
  const conLinesGroup = container.querySelector('#g5');
  if (conLinesGroup) {
    const conPaths = conLinesGroup.querySelectorAll('path');
    conPaths.forEach(p => {
      p.style.stroke = '#ffffff';
      p.style.fill = 'none';
    });
  }

  const showTooltip = (html, event) => {
    if (!tooltip) return;
    tooltip.innerHTML = html;
    tooltip.className = 'district-nyt-tooltip';
    tooltip.style.opacity = '1';
    tooltip.style.display = 'block';
    moveRegionTooltip(event);
  };

  const hideTooltip = () => {
    if (!tooltip) return;
    tooltip.className = 'district-nyt-tooltip hidden';
    tooltip.style.opacity = '0';
    tooltip.style.display = 'none';
  };


  const paths = container.querySelectorAll('path.subdivision');
  paths.forEach(path => {
    const subName = path.getAttribute('data-name');
    if (!subName) return;

    // Check if the path is in group #g33 (Contornos Pretos)
    const isContornoPreto = path.closest('#g33') !== null;

    // Read the scale factor from the transform attribute
    let scale = 1;
    const transform = path.getAttribute('transform');
    if (transform) {
      const matrixMatch = transform.match(/matrix\(([^,)]+)/);
      if (matrixMatch) {
        scale = parseFloat(matrixMatch[1]);
      } else {
        const scaleMatch = transform.match(/scale\(([^,)]+)/);
        if (scaleMatch) {
          scale = parseFloat(scaleMatch[1]);
        }
      }
    }

    if (isContornoPreto) {
      // Outline paths in #g33 highlight empty slots or inset borders
      path.setAttribute('fill', 'none');
      path.style.fill = 'none';
      path.style.fillOpacity = '0';
      path.style.stroke = '#ffffff'; // White highlights as requested
      path.style.strokeWidth = `${(0.833333 / scale).toFixed(6)}px`; // Uniform outline width
      path.style.pointerEvents = 'none';
    } else {
      // Subdivision paths
      const winner = getSubregionWinner(subName);
      const color = winner ? getPartyColor(winner) : '#777777';

      let winnerPct = 0;
      const alloc = subregionAllocations[subName] || {};
      const sorted = Object.values(alloc).sort((a, b) => b - a);
      if (sorted.length > 0) {
        const sumSeats = sorted.reduce((sum, value) => sum + value, 0);
        winnerPct = sumSeats > 0 ? (sorted[0] / sumSeats) * 100 : 0;
      }

      const fillCol = getUniversalGradientColor(color, winnerPct);
      path.setAttribute('fill', fillCol);
      path.style.fill = fillCol;
      path.style.fillOpacity = '0.85';
      path.style.stroke = '#0d0e12';
      path.style.strokeWidth = `${(0.5 / scale).toFixed(6)}px`; // Uniform stroke width (scaled down if path has scale transform)
      path.style.cursor = 'pointer';

      const isSelected = selectedSubregion === subName;
      path.style.opacity = isSelected ? '1' : (hasSubregionSelection ? '0.35' : '1');

      path.addEventListener('mouseenter', e => {
        showTooltip(getSubregionTooltipHtml(subName), e);
      });
      path.addEventListener('mousemove', e => {
        moveRegionTooltip(e);
      });
      path.addEventListener('mouseleave', hideTooltip);
      path.addEventListener('click', e => {
        e.stopPropagation();
        selectSubregion(subName);
      });
    }
  });

  // Map and color pre-placed SVG circles instead of rendering dynamic pizza carousels
  const allCircles = container.querySelectorAll('#g18 circle');
  // Initially hide all circles in group g18
  allCircles.forEach(circle => {
    circle.style.display = 'none';
  });

  if (rootSvg) {
    const subdivisionPaths = Array.from(container.querySelectorAll('path.subdivision')).filter(p => !p.closest('#g33'));

    // Cache bounding boxes of interactive subdivision paths for optimized intersection checks
    const bboxes = subdivisionPaths.map(p => {
      try {
        return {
          path: p,
          name: p.getAttribute('data-name'),
          bbox: p.getBBox()
        };
      } catch (e) {
        return null;
      }
    }).filter(b => b && b.name);

    const mappedCircles = {};

    allCircles.forEach(circle => {
      const cx = parseFloat(circle.getAttribute('cx'));
      const cy = parseFloat(circle.getAttribute('cy'));
      const pt = rootSvg.createSVGPoint();
      pt.x = cx;
      pt.y = cy;

      let name = null;
      // 1. Fast bbox intersection + exact isPointInFill check
      for (const b of bboxes) {
        const box = b.bbox;
        if (cx >= box.x && cx <= box.x + box.width && cy >= box.y && cy <= box.y + box.height) {
          if (b.path.isPointInFill(pt)) {
            name = b.name;
            break;
          }
        }
      }

      // 2. Fallback to closest bounding box center
      if (!name) {
        let minDist = Infinity;
        for (const b of bboxes) {
          const box = b.bbox;
          const px = box.x + box.width / 2;
          const py = box.y + box.height / 2;
          const dist = Math.hypot(cx - px, cy - py);
          if (dist < minDist) {
            minDist = dist;
            name = b.name;
          }
        }
      }

      if (name) {
        if (!mappedCircles[name]) {
          mappedCircles[name] = [];
        }
        mappedCircles[name].push(circle);
      }
    });

    const electionKey = document.getElementById('selectVoteBase') ? document.getElementById('selectVoteBase').value : 'deputado_2022';

    // Color and make active circles interactive
    for (const [subName, capacity] of Object.entries(subregionSeats)) {
      if (capacity <= 0) continue;

      const subCircles = mappedCircles[subName] || [];
      // Sort circles row-by-row (top-to-bottom, left-to-right)
      subCircles.sort((a, b) => {
        const ay = parseFloat(a.getAttribute('cy'));
        const by = parseFloat(b.getAttribute('cy'));
        if (Math.abs(ay - by) > 1.0) {
          return ay - by;
        }
        const ax = parseFloat(a.getAttribute('cx'));
        const bx = parseFloat(b.getAttribute('cx'));
        return ax - bx;
      });

      const alloc = subregionAllocations[subName] || {};
      const subVotesData = (semilocalVotosData && semilocalVotosData[subName]) ? semilocalVotosData[subName][electionKey] : null;

      // Sort parties: 1. seats (descending), 2. votes (descending), 3. name (alphabetically)
      const sortedParties = Object.entries(alloc)
        .filter(([_, seats]) => seats > 0)
        .map(([party, seats]) => {
          const votes = subVotesData ? (subVotesData[party] || 0) : 0;
          return { party, seats, votes };
        })
        .sort((a, b) => {
          if (b.seats !== a.seats) return b.seats - a.seats;
          if (b.votes !== a.votes) return b.votes - a.votes;
          return a.party.localeCompare(b.party);
        });

      const seatColors = [];
      sortedParties.forEach(p => {
        const color = getPartyColor(p.party);
        for (let i = 0; i < p.seats; i++) {
          seatColors.push(color);
        }
      });

      const isSelected = selectedSubregion === subName;
      const circleOpacity = isSelected ? '1' : (hasSubregionSelection ? '0.35' : '1');

      subCircles.forEach((circle, idx) => {
        if (idx < seatColors.length) {
          circle.style.display = '';
          circle.setAttribute('fill', seatColors[idx]);
          circle.style.fill = seatColors[idx];
          circle.style.fillOpacity = '1';
          circle.style.stroke = '#0d0e12';
          circle.style.strokeWidth = '0.5px';
          circle.style.cursor = 'pointer';
          circle.style.pointerEvents = 'all';
          circle.style.opacity = circleOpacity;

          circle.addEventListener('mouseenter', e => {
            showTooltip(getSubregionTooltipHtml(subName), e);
          });
          circle.addEventListener('mousemove', e => {
            moveRegionTooltip(e);
          });
          circle.addEventListener('mouseleave', hideTooltip);
          circle.addEventListener('click', e => {
            e.stopPropagation();
            selectSubregion(subName);
          });
        } else {
          circle.style.display = 'none';
        }
      });
    }
  }
}

// Style for a single semilocal (regional circumscription) feature. Reads current
// globals so it can be reused both on initial build and on in-place restyle.
function getSemilocalFeatureStyle(feature) {
  const selectedCirc = document.getElementById('selectCircumscription')?.value || 'estadual';
  const selectedLevel = document.getElementById('selectElectionLevel')?.value || 'nacional';
  const isRegionalNacional = selectedCirc === 'regional' && selectedLevel === 'nacional';
  const subName = feature.properties.sub_name;

  // Inset districts: show dark/empty fill with no visible polygon border
  if (isRegionalNacional && getInsetDistrictSet().has(subName)) {
    return { fillColor: '#0e1016', fillOpacity: 0.85, color: '#0e1016', weight: 0, opacity: 0 };
  }

  const subregionAllocations = (nationalSimulationResults && nationalSimulationResults.subregionAllocations) || {};
  const winner = getSubregionWinner(subName);
  const color = winner ? getPartyColor(winner) : '#777777';
  let winnerPct = 0;
  const alloc = subregionAllocations[subName] || {};
  const sorted = Object.values(alloc).sort((a, b) => b - a);
  if (sorted.length > 0) {
    const sumSeats = sorted.reduce((s, v) => s + v, 0);
    winnerPct = sumSeats > 0 ? (sorted[0] / sumSeats) * 100 : 0;
  }
  const fillCol = getUniversalGradientColor(color, winnerPct);
  const hasSubregionSelection = selectedSubregion !== null;
  const isSelected = selectedSubregion === subName;
  const opacity = isSelected ? 1 : (hasSubregionSelection ? 0.35 : 0.85);
  return { fillColor: fillCol, fillOpacity: opacity, color: '#111111', weight: 0.8, opacity: 0.9 };
}

// Fit the map to the selected subregion (or the whole semilocal layer when none).
function fitSemilocalBounds(isRegionalNacional) {
  if (!semilocalLayer) return;
  const isInsetSubregion = selectedSubregion !== null && getInsetDistrictSet().has(selectedSubregion);
  if (isInsetSubregion) return;

  let targetBounds = null;
  if (selectedSubregion !== null) {
    semilocalLayer.eachLayer(layer => {
      if (layer.feature && layer.feature.properties && layer.feature.properties.sub_name === selectedSubregion) {
        targetBounds = layer.getBounds();
      }
    });
  }

  if (targetBounds && targetBounds.isValid()) {
    glFitBounds(targetBounds, [30, 30]);
  } else {
    const bounds = isRegionalNacional ? getRegionalNationalBounds() : semilocalLayer.getBounds();
    if (bounds && bounds.isValid()) {
      glFitBounds(bounds, isRegionalNacional ? [35, 35] : [16, 16]);
    }
  }
}

// ─── Leaflet-based Semilocal map (replaces SVG renderer) ────────────────────
function renderDeputadosSemilocalLeafletMap() {
  if (!mapObj) return;

  const selectedCirc = document.getElementById('selectCircumscription')?.value || 'estadual';
  const selectedLevel = document.getElementById('selectElectionLevel')?.value  || 'nacional';
  const isRegionalNacional = selectedCirc === 'regional' && selectedLevel === 'nacional';

  // Show Leaflet map, hide tiles (same style as other national views)
  if (tileLayer) tileLayer.setOpacity(0);
  syncBackToNationalButton();

  if (!semilocalCircuitosGeoJSON) {
    console.warn('semilocalCircuitosGeoJSON not loaded yet');
    return;
  }
  if (!nationalSimulationResults) return;

  // The visible feature set only depends on the source data and (in state-level
  // mode) the selected state. When it is unchanged, restyle the existing layer in
  // place instead of rebuilding the whole GeoJSON source — a full rebuild blanks
  // the map for a frame, which is the flicker seen when clicking a circumscription.
  const filterState = (currentElectionLevel === 'estadual' && selectedState) ? selectedState : null;
  const canReuse = semilocalLayer && semilocalLayer._added
    && semilocalLayer.__semilocalSrc === semilocalCircuitosGeoJSON
    && semilocalLayer.__semilocalFilterState === filterState;

  if (canReuse) {
    semilocalLayer.eachLayer(layer => {
      if (!layer.feature || !layer.feature.properties) return;
      const subName = layer.feature.properties.sub_name;
      layer.setStyle(getSemilocalFeatureStyle(layer.feature));
      layer.bindTooltip(getSubregionTooltipHtml(subName), { className: 'district-nyt-tooltip', sticky: true });
    });
    drawSemilocalCircles();
    fitSemilocalBounds(isRegionalNacional);
    return;
  }

  // Feature set changed — rebuild the layer from scratch.
  if (semilocalLayer) {
    glRemove(semilocalLayer);
    semilocalLayer = null;
  }
  // Remove states layer to avoid overlap
  if (estadosLayer) {
    glRemove(estadosLayer);
    estadosLayer = null;
  }
  if (muniLayer) {
    glRemove(muniLayer);
    muniLayer = null;
  }
  if (distritosLayer) {
    glRemove(distritosLayer);
    distritosLayer = null;
  }
  if (distritosMuniLayer) {
    glRemove(distritosMuniLayer);
    distritosMuniLayer = null;
  }
  clearStateCircles();

  semilocalLayer = glGeoJSON(semilocalCircuitosGeoJSON, {
    filter: feature => {
      if (currentElectionLevel === 'estadual' && selectedState) {
        const stateName = UF_NAMES[selectedState];
        return feature.properties && feature.properties.estado === stateName;
      }
      return true;
    },
    style: feature => getSemilocalFeatureStyle(feature),
    onEachFeature: (feature, layer) => {
      const subName = feature.properties.sub_name;
      layer.bindTooltip(getSubregionTooltipHtml(subName), { className: 'district-nyt-tooltip', sticky: true });
      layer.on('click', () => {
        selectSubregion(subName);
      });
    }
  }).addTo(mapObj);
  semilocalLayer.__semilocalSrc = semilocalCircuitosGeoJSON;
  semilocalLayer.__semilocalFilterState = filterState;

  // Draw seat circles for each regional circumscription (mode-aware)
  drawSemilocalCircles();
  fitSemilocalBounds(isRegionalNacional);
}

// ══════════════════════════════════════════════════════════════════════════════
// INSET MAP SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

function getInsetDistrictSet() {
  const s = new Set();
  Object.values(INSET_GROUPS).forEach(g => g.districts.forEach(d => s.add(d)));
  return s;
}

async function loadInsetsGeoJSON() {
  if (insetsGeoJSONCache) return insetsGeoJSONCache;
  try {
    insetsGeoJSONCache = await fetchGeoJSON(DATA_BASE_URL + 'semilocal_insets.geojson');
  } catch (e) {
    console.warn('Could not load semilocal_insets.geojson', e);
  }
  return insetsGeoJSONCache;
}

function clearInsetOutlines() {
  insetOutlineLayers.forEach(l => { try { glRemove(l); } catch(e){} });
  insetOutlineLayers = [];
}

function clearInsetMapLayers() {
  insetMapLayers.forEach(l => { try { glRemove(l); } catch(e){} });
  insetMapLayers = [];
}

function removeHoles(geomOrFeature) {
  if (!geomOrFeature) return null;
  let isFeature = geomOrFeature.type === 'Feature';
  let geom = isFeature ? geomOrFeature.geometry : geomOrFeature;
  if (!geom) return geomOrFeature;

  let cleanedGeom = geom;
  if (geom.type === 'Polygon') {
    cleanedGeom = { type: 'Polygon', coordinates: [geom.coordinates[0]] };
  } else if (geom.type === 'MultiPolygon') {
    cleanedGeom = { type: 'MultiPolygon', coordinates: geom.coordinates.map(poly => [poly[0]]) };
  }

  if (isFeature) {
    return { ...geomOrFeature, geometry: cleanedGeom };
  }
  return cleanedGeom;
}

// Draw merged black outlines on the main map for top-level inset groups only
function drawInsetOutlines() {
  clearInsetOutlines();
  if (!mapObj) return;

  const outlines = semilocalInsetsMainMapOutlinesGeoJSON ? semilocalInsetsMainMapOutlinesGeoJSON.features : [];
  outlines.forEach(geom => {
    const layer = glGeoJSON(geom, {
      style: { fillColor: '#0e1016', fillOpacity: 1.0, color: '#ffffff', weight: 1.2, opacity: 1.0, dashArray: '3,3' }
    }).addTo(mapObj);
    insetOutlineLayers.push(layer);
  });
}

// ── Mercator helpers ──────────────────────────────────────────────────────────
function _mercY(lat) { return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }
function _invMercY(y) { return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI; }

function _buildMercatorTransform(features, tgtLat, tgtLng, scale) {
  let minLng = Infinity, maxLng = -Infinity, minMY = Infinity, maxMY = -Infinity;
  features.forEach(f => {
    const geom = f.geometry;
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    polys.forEach(poly => poly[0].forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
      const my = _mercY(lat);
      if (my < minMY) minMY = my; if (my > maxMY) maxMY = my;
    }));
  });
  const srcCxLng = (minLng + maxLng) / 2;
  const srcCyMY  = (minMY + maxMY)  / 2;
  const tgtMY    = _mercY(tgtLat);
  return (lng, lat) => [
    tgtLng + (lng - srcCxLng) * scale,
    _invMercY(tgtMY + (_mercY(lat) - srcCyMY) * scale)
  ];
}

function _transformGeom(geom, fn) {
  const tr = ring => ring.map(([lng, lat]) => fn(lng, lat));
  if (geom.type === 'Polygon') return { ...geom, coordinates: geom.coordinates.map(tr) };
  return { ...geom, coordinates: geom.coordinates.map(poly => poly.map(tr)) };
}

function _computeUnion(features) {
  if (!features.length) return null;
  try {
    let m = turf.rewind(features[0], { mutate: false });
    for (let i = 1; i < features.length; i++) m = turf.union(m, turf.rewind(features[i], { mutate: false }));
    return removeHoles(m);
  } catch (e) { return removeHoles(features.length === 1 ? features[0] : null); }
}

function _filterFN(geom) {
  if (geom.type !== 'MultiPolygon') return geom;
  const ok = geom.coordinates.filter(p => { const [lng, lat] = p[0][0]; return lat < -5 && lng < -33; });
  return ok.length ? { ...geom, coordinates: ok } : geom;
}

function _renderInsetGroup(groupId, geoSrc, subregionSeats, subregionAllocations) {
  const group = INSET_GROUPS[groupId];
  if (!group) return;
  const { tgtLat, tgtLng, scale } = group;

  // Districts that belong to child groups appear as dark/dashed inside this inset
  const nestedDistricts = new Set();
  group.contains.forEach(cid => INSET_GROUPS[cid]?.districts.forEach(d => nestedDistricts.add(d)));

  let tFeatures = cachedTransformedFeatures[groupId];
  let transformFn = cachedTransformFns[groupId];

  if (!tFeatures) {
    const rawFeatures = geoSrc.features
      .filter(f => group.districts.includes(f.properties.sub_name))
      .map(f => ({
        ...f,
        geometry: f.properties.sub_name === 'Pernambuco-6' ? _filterFN(f.geometry) : f.geometry
      }));
    if (!rawFeatures.length) return;

    transformFn = _buildMercatorTransform(rawFeatures, tgtLat, tgtLng, scale);
    tFeatures = rawFeatures.map(f => ({ ...f, geometry: _transformGeom(f.geometry, transformFn) }));
    cachedTransformedFeatures[groupId] = tFeatures;
    cachedTransformFns[groupId] = transformFn;
  }
  if (!tFeatures || !tFeatures.length) return;

  // 1) Filled polygons — styled with district borders
  const hasSubregionSelection = selectedSubregion !== null;
  const filledLayer = glGeoJSON({ type: 'FeatureCollection', features: tFeatures }, {
    style: feat => {
      const sub = feat.properties.sub_name;
      if (nestedDistricts.has(sub)) {
        return { fillColor: '#0e1016', fillOpacity: 0.85, color: '#111111', weight: 0.8, opacity: 0.9 };
      }
      const winner = getSubregionWinner(sub);
      const col = winner ? getPartyColor(winner) : '#555555';
      const alloc = subregionAllocations[sub] || {};
      const vals = Object.values(alloc).sort((a, b) => b - a);
      const sum = vals.reduce((s, v) => s + v, 0);
      const pct = sum > 0 ? (vals[0] / sum) * 100 : 0;
      
      const isSelected = selectedSubregion === sub;
      const fillOpacity = isSelected ? 1.0 : (hasSubregionSelection ? 0.35 : 0.9);
      
      return {
        fillColor: getUniversalGradientColor(col, pct),
        fillOpacity: fillOpacity,
        color: '#111111',
        weight: 0.8,
        opacity: 0.9
      };
    },
    onEachFeature: (feature, layer) => {
      const subName = feature.properties.sub_name;
      if (nestedDistricts.has(subName)) return; // child placeholders are not clickable
      const tooltipHtml = getSubregionTooltipHtml(subName);
      layer.bindTooltip(tooltipHtml, { className: 'district-nyt-tooltip', sticky: true });
      layer.on('click', () => {
        selectSubregion(subName);
      });
    }
  }).addTo(mapObj);
  insetMapLayers.push(filledLayer);

  // 2) Solid black outer contour removed (districts already have borders mapped)

  // 3) Dashed outlines for each child group's area inside this inset
  for (const childId of group.contains) {
    const childGroup = INSET_GROUPS[childId];
    if (!childGroup) continue;

    const cacheKey = groupId + '_' + childId;
    const childUnion = cachedInsetChildUnions[cacheKey];
    if (childUnion) {
      const transformedChild = {
        ...childUnion,
        geometry: _transformGeom(childUnion.geometry, transformFn)
      };
      insetMapLayers.push(
        glGeoJSON(transformedChild, {
          style: { fillOpacity: 0, color: '#ffffff', weight: 1.2, opacity: 1.0, dashArray: '3,3' }
        }).addTo(mapObj)
      );
    }
  }

  // 4) Circle markers for non-nested districts
  const maxN = Math.max(0, ...group.districts.map(d => subregionSeats[d] || 0));
  const dotR = getDotRadiusForSeats(maxN > 0 ? maxN : 9) * 0.65;

  tFeatures.forEach(tf => {
    const sub = tf.properties.sub_name;
    if (nestedDistricts.has(sub)) return;
    const N = subregionSeats[sub] || 0;
    if (!N) return;

    const alloc = subregionAllocations[sub] || {};
    const { seatColors } = buildOrderedSeatColors(alloc, getSubregionVoteMap(sub));

    const override = SUBREGION_CENTER_OVERRIDES[sub]; // [lat, lng]
    if (!override) return;
    const [tLng, tLat] = transformFn(override[1], override[0]);

    let myIcon;
    if (circleViewMode === 'dots') {
      const r = createStateCircleDotsHTML(sub.split('-').pop(), N, seatColors, dotR);
      myIcon = { className: 'state-parliament-circle state-parliament-dots', html: r.html };
    } else {
      const svgHtml = createStateCircleSVG(sub.split('-').pop(), N, seatColors);
      myIcon = { className: 'state-parliament-circle', html: svgHtml };
    }

    const marker = glMarker([tLng, tLat], myIcon).addTo();
    if (selectedSubregion !== null && selectedSubregion !== sub) {
      marker.setOpacity(0.15);
    } else {
      marker.setOpacity(1.0);
    }
    marker.on('click', () => selectSubregion(sub));
    marker.bindTooltip(getSubregionTooltipHtml(sub), { className: 'district-nyt-tooltip', sticky: true });
    insetMapLayers.push(marker);
  });
}

function renderInsetLayers() {
  clearInsetMapLayers();
  if (!nationalSimulationResults || !mapObj) return;
  const geoSrc = insetsGeoJSONCache || semilocalCircuitosGeoJSON;
  if (!geoSrc) return;
  const { subregionSeats, subregionAllocations } = nationalSimulationResults;
  // Every group (including nested) gets its own inset layer set
  for (const groupId of Object.keys(INSET_GROUPS)) {
    _renderInsetGroup(groupId, geoSrc, subregionSeats, subregionAllocations);
  }
}

// ── Legacy stub removed ───────────────────────────────────────────────────────
function insetCircleContent(seatColors, size) {
  const N = seatColors.length;
  if (!N) return '';
  const cx = size / 2, cy = size / 2, R = size / 2 - 0.8;
  let html = '';

  if (circleViewMode === 'dots') {
    let cols = N <= 4 ? 2 : N <= 9 ? 3 : 4;
    const rows = Math.ceil(N / cols);
    const dotR = Math.max(1.5, (size - 4) / (cols * 2 + 1));
    const gap = 0.5, spacing = dotR * 2 + gap;
    const gridW = cols * spacing - gap, gridH = rows * spacing - gap;
    const ox = cx - gridW / 2 + dotR, oy = cy - gridH / 2 + dotR;
    html += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#1a1c24" stroke="#000" stroke-width="0.5"/>`;
    for (let i = 0; i < N; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      const rowSeats = row === rows - 1 ? (N - row * cols) : cols;
      const ro = rowSeats < cols ? ((cols - rowSeats) * spacing) / 2 : 0;
      html += `<circle cx="${(ox + ro + col * spacing).toFixed(1)}" cy="${(oy + row * spacing).toFixed(1)}" r="${dotR.toFixed(1)}" fill="${seatColors[i]||'#555'}" stroke="#0b0d11" stroke-width="0.2"/>`;
    }
  } else {
    const innerR = R * 0.28;
    if (N === 1) {
      html = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${seatColors[0]}" stroke="#0b0d11" stroke-width="0.5"/><circle cx="${cx}" cy="${cy}" r="${innerR}" fill="#1a1c24"/>`;
    } else {
      const step = (2 * Math.PI) / N;
      for (let i = 0; i < N; i++) {
        const a1 = -Math.PI / 2 + i * step, a2 = a1 + step;
        const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
        const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
        const ix1 = cx + innerR * Math.cos(a1), iy1 = cy + innerR * Math.sin(a1);
        const ix2 = cx + innerR * Math.cos(a2), iy2 = cy + innerR * Math.sin(a2);
        const lg = step > Math.PI ? 1 : 0;
        html += `<path d="M${ix1.toFixed(2)} ${iy1.toFixed(2)} L${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${ix2.toFixed(2)} ${iy2.toFixed(2)} A${innerR} ${innerR} 0 ${lg} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)}Z" fill="${seatColors[i]||'#555'}" stroke="#0b0d11" stroke-width="0.25"/>`;
      }
    }
  }
  return html;
}

function renderInsetPanel() { /* removed — see renderInsetLayers / _renderInsetGroup */ }

function _legacyRemovedInsetPanel(groupId, hiresGeo, containerEl) {
  const group = INSET_GROUPS[groupId];
  if (!group || !nationalSimulationResults) return;
  const { subregionSeats, subregionAllocations } = nationalSimulationResults;

  const HEADER_H = 15, PAD = 6;
  const svgW = group.size.w, svgH = group.size.h - HEADER_H;

  // Collect sub-districts (districts that belong to nested groups)
  const subDistricts = new Set();
  group.contains.forEach(cid => INSET_GROUPS[cid]?.districts.forEach(d => subDistricts.add(d)));

  // Pick geometry source: hires preferred, fallback to low-res
  const geoSrc = hiresGeo || semilocalCircuitosGeoJSON;
  const features = geoSrc?.features?.filter(f => group.districts.includes(f.properties.sub_name)) || [];
  if (!features.length) return;

  // Compute geographic bbox
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  features.forEach(f => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    polys.forEach(poly => poly[0].forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
    }));
  });

  // D3 projection fitted to bbox
  const bboxFeature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[
    [minLng - 0.04, minLat - 0.04], [maxLng + 0.04, minLat - 0.04],
    [maxLng + 0.04, maxLat + 0.04], [minLng - 0.04, maxLat + 0.04],
    [minLng - 0.04, minLat - 0.04]
  ]] } };
  const proj = d3.geoMercator().fitExtent([[PAD, PAD], [svgW - PAD, svgH - PAD]], bboxFeature);
  const pathGen = d3.geoPath().projection(proj);

  // Helper: filter Fernando de Noronha out of PE-6
  const cleanGeom = (subName, geom) => {
    if (subName === 'Pernambuco-6' && geom.type === 'MultiPolygon') {
      const mainland = geom.coordinates.filter(poly => {
        const [lng, lat] = poly[0][0];
        return lat < -5.0 && lng < -33.0;
      });
      if (mainland.length) return { type: 'MultiPolygon', coordinates: mainland };
    }
    return geom;
  };

  // Build the cleaned feature list once
  const cleaned = features.map(f => ({
    subName: f.properties.sub_name,
    isNested: subDistricts.has(f.properties.sub_name),
    feat: { ...f, geometry: cleanGeom(f.properties.sub_name, f.geometry) }
  }));

  let svgContent = '';

  // 1) District polygons
  cleaned.forEach(({ subName, isNested, feat }) => {
    const d = pathGen(feat);
    if (!d) return;
    if (isNested) {
      // Nested district shown only as a faint dashed outline (detail lives in child panel)
      svgContent += `<path d="${d}" fill="#0e1016" fill-opacity="0.6" stroke="#666" stroke-width="0.6" stroke-dasharray="2,1.2"/>`;
    } else {
      const winner = getSubregionWinner(subName);
      const col = winner ? getPartyColor(winner) : '#555555';
      const alloc = subregionAllocations[subName] || {};
      const vals = Object.values(alloc).sort((a, b) => b - a);
      const sum = vals.reduce((s, v) => s + v, 0);
      const pct = sum > 0 ? (vals[0] / sum) * 100 : 0;
      svgContent += `<path d="${d}" fill="${getUniversalGradientColor(col, pct)}" fill-opacity="0.9" stroke="#0d0e12" stroke-width="0.4"/>`;
    }
  });

  // 2) Merged black contour around the whole inset area
  let mergedOutline = null;
  try {
    const polyFeats = cleaned.map(c => turf.rewind(c.feat, { mutate: false }));
    mergedOutline = polyFeats[0];
    for (let i = 1; i < polyFeats.length; i++) {
      mergedOutline = turf.union(mergedOutline, polyFeats[i]);
    }
  } catch (e) { mergedOutline = null; }
  if (mergedOutline) {
    const od = pathGen(mergedOutline);
    if (od) svgContent += `<path d="${od}" fill="none" stroke="#000000" stroke-width="1.6" stroke-linejoin="round"/>`;
  }

  // 3) Seat circles for non-nested districts
  const circleSize = Math.min(30, Math.max(15, Math.sqrt(svgW * svgH) / 7));
  cleaned.forEach(({ subName, isNested, feat }) => {
    if (isNested) return;
    const N = subregionSeats[subName] || 0;
    if (!N) return;

    const alloc = subregionAllocations[subName] || {};
    const { seatColors } = buildOrderedSeatColors(alloc, getSubregionVoteMap(subName));

    const override = SUBREGION_CENTER_OVERRIDES[subName];
    let [pcx, pcy] = override ? proj([override[1], override[0]]) : pathGen.centroid(feat);
    if (isNaN(pcx) || isNaN(pcy)) return;

    const half = circleSize / 2;
    svgContent += `<g transform="translate(${(pcx - half).toFixed(1)},${(pcy - half).toFixed(1)})">`
      + `<svg width="${circleSize}" height="${circleSize}" viewBox="0 0 ${circleSize} ${circleSize}" overflow="visible">`
      + insetCircleContent(seatColors, circleSize) + '</svg></g>';
  });

  // Build the SVG via DOMParser so all <path> elements get the correct SVG namespace.
  // (Setting innerHTML on a createElementNS('svg') element parses children in the HTML
  // namespace, which silently drops <path> rendering — only nested <svg> survived.)
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" class="inset-svg" `
    + `width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">${svgContent}</svg>`;
  const parsed = new DOMParser().parseFromString(svgString, 'image/svg+xml').documentElement;

  const existing = containerEl.querySelector('svg.inset-svg');
  if (existing) existing.replaceWith(parsed);
  else containerEl.appendChild(parsed);
}

function _createOrUpdateInsetPanel(groupId, parentEl) {
  const group = INSET_GROUPS[groupId];
  if (!group) return null;

  let panel = parentEl.querySelector(`.map-inset[data-group="${groupId}"]`);
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'map-inset' + (group.nestedIn ? ' map-inset-nested' : '');
    panel.setAttribute('data-group', groupId);

    const hdr = document.createElement('div');
    hdr.className = 'inset-header';
    hdr.textContent = group.label;
    panel.appendChild(hdr);

    parentEl.appendChild(panel);
  }
  panel.style.width  = group.size.w + 'px';
  panel.style.height = group.size.h + 'px';
  const pos = group.pos || {};
  ['top', 'bottom', 'left', 'right'].forEach(p => { panel.style[p] = pos[p] ?? ''; });
  return panel;
}

function _renderGroupRecursive(groupId, hiresGeo, parentEl) {
  const panel = _createOrUpdateInsetPanel(groupId, parentEl);
  if (!panel) return;
  renderInsetPanel(groupId, hiresGeo, panel);
  (INSET_GROUPS[groupId]?.contains || []).forEach(childId => {
    _renderGroupRecursive(childId, hiresGeo, panel);
  });
}

async function renderAllInsets() { /* removed — see renderInsetLayers */ }

// ── Draw seat circles on the semilocal Leaflet map (mode-aware) ───────────────
// Can be called independently to re-render when circleViewMode changes.
function drawSemilocalCircles() {
  if (!semilocalLayer || !nationalSimulationResults) return;
  const { subregionSeats, subregionAllocations } = nationalSimulationResults;

  const selectedCirc = document.getElementById('selectCircumscription')?.value || 'estadual';
  const selectedLevel = document.getElementById('selectElectionLevel')?.value  || 'nacional';
  const isRegionalNacional = selectedCirc === 'regional' && selectedLevel === 'nacional';

  const scenarioDotRadius = getDotRadiusForSeats(
    Math.max(0, ...Object.values(subregionSeats).filter(v => v > 0))
  ) * (isRegionalNacional ? 0.6 : 1.0);

  const pizzaSizeScale = isRegionalNacional ? 0.6 : 1.0;

  // Clear existing circle markers (but not the GeoJSON polygon layer)
  clearStateCircles();

  // Draw merged outlines on main map + render inset GeoJSON layers
  if (isRegionalNacional) {
    drawInsetOutlines();
    renderInsetLayers();
  } else {
    clearInsetOutlines();
    clearInsetMapLayers();
  }

  const insetDistricts = isRegionalNacional ? getInsetDistrictSet() : new Set();

  semilocalLayer.eachLayer(layer => {
    const feature = layer.feature;
    if (!feature || !feature.properties) return;
    const subName = feature.properties.sub_name;
    const seatsToAllocate = subregionSeats[subName] || 0;
    if (seatsToAllocate <= 0) return;

    // Skip inset districts — they are shown in the inset panels instead
    if (insetDistricts.has(subName)) return;

    const allocations = subregionAllocations[subName] || {};
    const subregionVotes = getSubregionVoteMap(subName);
    const { seatColors } = buildOrderedSeatColors(allocations, subregionVotes);
    const lastDash = subName.lastIndexOf('-');
    const label = lastDash >= 0 ? subName.slice(lastDash + 1) : subName;

    // Get position: center of the layer bounds (with override support)
    let center = layer.getBounds().getCenter();
    if (SUBREGION_CENTER_OVERRIDES[subName]) {
      center = latLng(SUBREGION_CENTER_OVERRIDES[subName]);
    }

    // Build icon based on current display mode
    let myIcon;
    if (circleViewMode === 'dots') {
      const dotsResult = createStateCircleDotsHTML(label, seatsToAllocate, seatColors, scenarioDotRadius);
      myIcon = { className: 'state-parliament-circle state-parliament-dots', html: dotsResult.html };
    } else {
      const svgHtml = createStateCircleSVG(label, seatsToAllocate, seatColors);
      myIcon = { className: 'state-parliament-circle', html: svgHtml };
    }

    const marker = glMarker(center, myIcon).addTo();

    marker.on('click', () => { selectSubregion(subName); });

    if (selectedSubregion !== null && selectedSubregion !== subName) {
      marker.setOpacity(0.15);
    } else {
      marker.setOpacity(1.0);
    }

    const tooltipHtml = getSubregionTooltipHtml(subName);
    marker.bindTooltip(tooltipHtml, { className: 'district-nyt-tooltip', sticky: true });

    stateCircleLayers.push(marker);
  });

  // Show the toggle when circles are visible
  setCircleToggleVisible(true);
}

function getSubregionTooltipHtml(subName) {
  const seatsCount = nationalSimulationResults.subregionSeats[subName] || 0;
  const alloc = nationalSimulationResults.subregionAllocations[subName] || {};


  const winner = getSubregionWinner(subName);

  const electionKey = document.getElementById('selectVoteBase')
    ? document.getElementById('selectVoteBase').value
    : 'deputado_2022';

  const subVotesData = (semilocalVotosData && semilocalVotosData[subName])
    ? semilocalVotosData[subName][electionKey]
    : null;

  const parties = Object.entries(alloc)
    .filter(([_, seats]) => seats > 0)
    .map(([party, seats]) => {
      const votes = (subVotesData && subVotesData[party]) || 0;
      return {
        party,
        seats,
        votes,
        color: getPartyColor(party),
        cleanName: getCleanGroupName(party),
        isWinner: party === winner
      };
    })
    .sort((a, b) => {
      if (b.seats !== a.seats) {
        return b.seats - a.seats;
      }
      return b.votes - a.votes;
    });

  const lastDash = subName.lastIndexOf('-');
  const state = lastDash >= 0 ? subName.slice(0, lastDash) : subName;
  const num = lastDash >= 0 ? subName.slice(lastDash + 1) : '1';

  const subInfo = circuitosPopData.find(d => d.estado === state && d.id_local === parseInt(num));
  const distName = (subInfo && subInfo.nome_distrito) ? subInfo.nome_distrito : `Subregião ${num}`;

  return buildSeatTooltipHtml(`${state} - ${distName}`, parties, seatsCount, 'vagas');
}

function getUfAbbreviation(nameOrAbbr) {
  if (!nameOrAbbr) return null;
  const clean = nameOrAbbr.trim();
  if (clean.length === 2 && UF_NAMES[clean.toUpperCase()]) {
    return clean.toUpperCase();
  }
  const found = Object.entries(UF_NAMES).find(([k, v]) => v.toLowerCase() === clean.toLowerCase());
  return found ? found[0] : clean;
}

function selectSubregion(subName) {
  const lastDash = subName.lastIndexOf('-');
  const rawState = lastDash >= 0 ? subName.slice(0, lastDash) : subName;
  selectedState = getUfAbbreviation(rawState);
  selectedRegion = null;
  selectedSubregion = subName;
  renderResultsList();
  renderMap();
}

// Centralized visibility/label for the "Voltar ao Brasil" button.
// Shows whenever any subdivision (state, region, sub-region or district) is
// selected, regardless of the map type (senado SVG, estados, regional, distrital).
function syncBackToNationalButton() {
  const btnBack = document.getElementById('btnBackToNational');
  if (!btnBack) return;

  const hasSelection = selectedState !== null || selectedRegion !== null
    || selectedSubregion !== null || selectedDistrict !== null;

  if (!hasSelection) {
    btnBack.classList.add('hidden');
    return;
  }

  // In state-level mode, drilling into a sub-region/region/district returns to
  // the state first; otherwise the button returns to the national view.
  const backToState = currentElectionLevel === 'estadual' && selectedState !== null
    && (selectedSubregion !== null || selectedRegion !== null || selectedDistrict !== null);
  const label = backToState ? (UF_NAMES[selectedState] || selectedState) : 'Brasil todo';

  btnBack.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>${label}`;
  btnBack.classList.remove('hidden');
}

function renderMap() {
  // Clear any existing regional map insets/outlines first
  if (mapObj) {
    clearInsetOutlines();
    clearInsetMapLayers();
  }

  // Keep the "Voltar ao Brasil" button in sync for every map type below.
  syncBackToNationalButton();

  // Clean up semilocal layer if we are not in semilocal mode
  if (currentConfig.circumscription !== 'regional' && semilocalLayer && mapObj) {
    glRemove(semilocalLayer);
    semilocalLayer = null;
  }

  // If in district mode, delegate to district renderer
  if (currentSystemType === 'distrital') {
    setCircleToggleVisible(false);
    renderDistrictMapNational();
    const minimapEl = document.getElementById('regionMiniMap');
    if (minimapEl) minimapEl.classList.add('hidden');
    return;
  }

  // Handle region minimap visibility and drawing
  const minimapEl = document.getElementById('regionMiniMap');
  const svgMapContainer = document.getElementById('svgMapContainer');
  const mapEl = document.getElementById('map');

  if (currentConfig.seatDistribution === 'senado_regionalizado_1' || currentConfig.seatDistribution === 'senado_regionalizado_2') {
    if (minimapEl) minimapEl.classList.add('hidden');
    if (svgMapContainer) svgMapContainer.classList.remove('hidden');
    if (mapEl) mapEl.classList.add('hidden');

    if (tileLayer) tileLayer.setOpacity(0);
    const zoomCtrl = document.querySelector('.maplibregl-ctrl-bottom-right');
    if (zoomCtrl) zoomCtrl.style.display = 'none';

    setCircleToggleVisible(true);
    renderSenadoRegionalizadoSvgMapV2();
    return;
  }

  const isEstadualWithNoState = (currentElectionLevel === 'estadual' && selectedState === null);
  if (currentConfig.circumscription === 'regional' && !isEstadualWithNoState) {
    if (minimapEl) minimapEl.classList.add('hidden');
    if (svgMapContainer) svgMapContainer.classList.add('hidden');
    if (mapEl) {
      if (mapEl.classList.contains('hidden')) {
        mapEl.classList.remove('hidden');
        if (mapObj) setTimeout(() => { mapObj.resize(); }, 50);
      }
    }
    renderDeputadosSemilocalLeafletMap();
    return;
  }

  const keepNationalMap = (currentElectionLevel === 'nacional' && currentSystemType === 'proporcional' && selectedState !== null);
  if (svgMapContainer) svgMapContainer.classList.add('hidden');
  if (mapEl) {
    if (mapEl.classList.contains('hidden')) {
      mapEl.classList.remove('hidden');
      if (mapObj) {
        setTimeout(() => { mapObj.resize(); }, 50);
      }
    }
  }
  if (minimapEl) minimapEl.classList.add('hidden');

  if (selectedState === null || keepNationalMap) {
    // Show national view (button visibility handled by syncBackToNationalButton)

    // Hide map tiles for proportional national view to just show plain bg
    if (tileLayer) tileLayer.setOpacity(0);
    const zoomCtrl = document.querySelector('.maplibregl-ctrl-bottom-right');
    if (zoomCtrl) zoomCtrl.style.display = 'none';

    if (muniLayer) {
      glRemove(muniLayer);
      muniLayer = null;
    }

    if (estadosLayer) {
      glRemove(estadosLayer);
      estadosLayer = null;
    }

    estadosLayer = glGeoJSON(estadosGeoJSON, {
      style: feature => {
        const sigla = feature.properties.SIGLA_UF;
        const winner = getWinningPartyForUF(sigla);
        const color = winner ? getPartyColor(winner) : '#777777';

        // Calculate winner percentage of seats for styling
        let winnerPct = 0;
        const ufAllocations = (nationalSimulationResults && nationalSimulationResults.stateAllocations)
          ? (nationalSimulationResults.stateAllocations[sigla] || {})
          : {};
        const sorted = Object.values(ufAllocations).sort((a, b) => b - a);
        if (sorted.length > 0) {
          const sumSeats = sorted.reduce((s, v) => s + v, 0);
          winnerPct = sumSeats > 0 ? (sorted[0] / sumSeats) * 100 : 0;
        }

        const fillCol = getUniversalGradientColor(color, winnerPct);

        return {
          fillColor: fillCol,
          fillOpacity: 0.85,
          color: '#111111',
          weight: 1.0,
          opacity: 0.8
        };
      },
      onEachFeature: (feature, layer) => {
        const sigla = feature.properties.SIGLA_UF;
        const tooltipHtml = getStateTooltipHtml(sigla);
        layer.bindTooltip(tooltipHtml, { className: 'district-nyt-tooltip', sticky: true });

        if (currentSystemType !== 'proporcional' || currentElectionLevel === 'estadual') {
          layer.on('click', () => {
            selectState(sigla);
          });
        } else {
          layer.on('click', () => {
            selectStateProportional(sigla);
          });
        }
      }
    }).addTo(mapObj);

    drawStateCircles();
  } else {
    // State-selected detail view: hide the toggle (no circles on detail view)
    // (button visibility/label handled by syncBackToNationalButton)
    setCircleToggleVisible(false);

    // Restore map tiles for proportional state view
    if (tileLayer) tileLayer.setOpacity(1);
    const zoomCtrl = document.querySelector('.maplibregl-ctrl-bottom-right');
    if (zoomCtrl) zoomCtrl.style.display = 'block';

    clearStateCircles();

    if (estadosLayer) {
      glRemove(estadosLayer);
    }

    if (muniLayer) {
      glRemove(muniLayer);
      muniLayer = null;
    }

    // Process municipal winner results
    const results = loadedStateResults.RESULTS || {};
    const candNames = loadedStateResults.METADATA.cand_names;

    // Group candidate results by municipality
    const muniVotes = {};
    for (const [locKey, voteMap] of Object.entries(results)) {
      const parts = locKey.split('_');
      const tse = parts[1];
      if (!tse) continue;

      let ibge = tseToIbge[tse];
      if (!ibge && tseToName[tse]) {
        const slug = normalizeSlug(tseToName[tse]);
        ibge = nameToIbge[slug];
      }
      if (!ibge) ibge = tse; // fallback

      if (!muniVotes[ibge]) muniVotes[ibge] = {};

      for (const [candId, votesVal] of Object.entries(voteMap)) {
        if (candId === '95' || candId === '96') continue;
        const v = parseInt(votesVal) || 0;
        muniVotes[ibge][candId] = (muniVotes[ibge][candId] || 0) + v;
      }
    }

    // Determine the winning party in each municipality (overall votes)
    const muniWinner = {};
    const muniVotesByParty = {}; // ibge -> party -> votes

    for (const [ibge, cands] of Object.entries(muniVotes)) {
      muniVotesByParty[ibge] = {};
      for (const [candId, votes] of Object.entries(cands)) {
        // Find composition
        let stdKey = null;
        if (candId.length <= 2) {
          const pName = getPartyNameByNumber(candId);
          stdKey = pName ? getStandardFederationKey(pName) : candId;
        } else {
          const meta = candNames[candId];
          if (meta) {
            const pName = meta[1];
            const comp = meta[4];
            let rawComp = pName;
            if (comp && comp.toUpperCase() !== 'PARTIDO ISOLADO' && comp.toUpperCase() !== 'COLIGAÇÃO') {
              rawComp = comp;
            }
            stdKey = getStandardFederationKey(rawComp);
          }
        }

        if (stdKey) {
          const coalitionMap = getPresCoalitionMap();
          if (currentConfig.groupByPresidentialCoalition && coalitionMap[stdKey]) {
            stdKey = coalitionMap[stdKey];
          }
          muniVotesByParty[ibge][stdKey] = (muniVotesByParty[ibge][stdKey] || 0) + votes;
        }
      }

      let maxV = -1;
      let winner = null;
      for (const [party, v] of Object.entries(muniVotesByParty[ibge])) {
        if (v > maxV) {
          maxV = v;
          winner = party;
        }
      }
      muniWinner[ibge] = winner;
    }

    muniLayer = glGeoJSON(loadedStateMuniGeo, {
      filter: feature => {
        const name = String(feature.properties.NM_MUN || '');
        return !name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().includes('AREA OPERACIONAL');
      },
      style: feature => {
        const codM = feature.properties.CD_MUN;
        const winner = muniWinner[codM];
        const color = winner ? getPartyColor(winner) : '#777777';

        // Calculate winner percentage of votes for styling
        let winnerPct = 0;
        const votesObj = muniVotesByParty[codM] || {};
        const sorted = Object.values(votesObj).sort((a, b) => b - a);
        if (sorted.length > 0) {
          const sumVotes = sorted.reduce((s, v) => s + v, 0);
          winnerPct = sumVotes > 0 ? (sorted[0] / sumVotes) * 100 : 0;
        }

        const fillCol = getUniversalGradientColor(color, winnerPct);

        return {
          fillColor: fillCol,
          fillOpacity: 0.85,
          color: '#111111',
          weight: 0.6,
          opacity: 0.8
        };
      },
      onEachFeature: (feature, layer) => {
        const codM = feature.properties.CD_MUN;
        const name = feature.properties.NM_MUN;
        const winner = muniWinner[codM];
        const votesObj = muniVotesByParty[codM] || {};

        const tt = getMuniTooltipHtml(codM, name, winner, votesObj);
        layer.bindTooltip(tt, { className: 'district-nyt-tooltip', sticky: true });
      }
    }).addTo(mapObj);

    if (muniLayer && muniLayer.getBounds().isValid()) {
      glFitBounds(muniLayer.getBounds(), [20, 20]);
    }
  }
}

// Select state interaction
async function selectState(uf) {
  if (currentSystemType === 'proporcional' && currentElectionLevel !== 'estadual') {
    selectStateProportional(uf);
    return;
  }
  const loader = document.getElementById('mapLoader');
  const loaderText = document.getElementById('loaderText');
  loaderText.textContent = `Carregando dados de ${UF_NAMES[uf]}...`;
  loader.classList.add('visible');

  try {
    // 1. Fetch municipal geojson and candidate data in parallel
    const isPres = currentVoteBase === 'presidente';
    const isGov = currentVoteBase === 'governador';
    const isExec = isPres || isGov;
    const promises = [
      fetchGeoJSON(DATA_BASE_URL + `municipios/municipios_${uf}.geojson`),
      fetchGeoJSON(`locais_votacao_${currentYear}/locais_votacao_${currentYear}_${uf}.geojson`),
      !isExec ? fetchDeputyData(uf) : Promise.resolve(null),
      isPres ? fetchPresidentData(uf) : (isGov ? fetchGovernorData(uf) : Promise.resolve(null))
    ];

    const [muniGeo, locGeo, deputyJson, execJson] = await Promise.all(promises);

    if (!muniGeo) throw new Error("Erro ao carregar mapa municipal do estado.");
    if (!locGeo) throw new Error("Erro ao carregar pontos de votação do estado.");
    if (!isExec && !deputyJson) throw new Error("Erro ao carregar resultados de deputados.");
    if (isExec && !execJson) throw new Error("Erro ao carregar resultados do executivo.");

    loadedStateMuniGeo = muniGeo;
    loadedDeputyResults = deputyJson;
    loadedStateResults = isExec ? execJson : deputyJson;

    // 2. Build mapping indexes
    tseToIbge = {};
    tseToName = {};
    locGeo.features.forEach(f => {
      const tse = f.properties.cd_localidade_tse || f.properties.CD_MUNICIPIO;
      const ibge = f.properties.cod_localidade_ibge || f.properties.CD_MUN;
      const name = f.properties.nm_localidade || f.properties.NM_MUN;
      if (tse) {
        if (ibge) tseToIbge[tse] = String(ibge);
        if (name) tseToName[tse] = name;
      }
    });

    nameToIbge = {};
    muniGeo.features.forEach(f => {
      const name = f.properties.NM_MUN;
      const ibge = f.properties.CD_MUN;
      if (name && ibge) {
        nameToIbge[normalizeSlug(name)] = String(ibge);
      }
    });

    selectedState = uf;

    // Update the dropdown value to match the clicked/selected state
    const selectStateEl = document.getElementById('selectElectionState');
    if (selectStateEl) {
      selectStateEl.value = uf;
      currentConfig.electionState = uf;
      currentElectionState = uf;
    }

    if (currentElectionLevel === 'estadual') {
      runSimulation();
    }

    // Zoom map to state bounds
    const stateBounds = geoBboxBounds(muniGeo, feature => {
      const name = String(feature.properties.NM_MUN || '');
      return !name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().includes('AREA OPERACIONAL');
    });
    glFitBounds(stateBounds, [20, 20]);

    // Apply simulation and update
    renderResultsList();
    renderMap();

    // Update select dropdowns



  } catch (err) {
    console.error(err);
    alert(`Não foi possível carregar os dados de ${uf}: ${err.message}`);
  } finally {
    loader.classList.remove('visible');
  }
}

function fitNationalBounds() {
  if (mapObj && estadosGeoJSON) {
    const selectedCirc = document.getElementById('selectCircumscription')?.value || 'estadual';
    const selectedLevel = document.getElementById('selectElectionLevel')?.value  || 'nacional';
    const isRegionalNacional = selectedCirc === 'regional' && selectedLevel === 'nacional';

    if (isRegionalNacional) {
      const bounds = getRegionalNationalBounds();
      if (bounds && bounds.isValid()) {
        glFitBounds(bounds, [35, 35]);
        return;
      }
    }

    const bounds = geoBboxBounds(estadosGeoJSON);
    if (bounds && bounds.isValid()) {
      glFitBounds(bounds, [20, 20]);
      return;
    }
  }
  if (mapObj) {
    mapObj.jumpTo({ center: [-52, -14], zoom: 4 });
  }
}

// Reset state select
function backToNational() {
  if (currentElectionLevel === 'estadual' && selectedState !== null && (selectedSubregion !== null || selectedRegion !== null || selectedDistrict !== null)) {
    selectedSubregion = null;
    selectedRegion = null;
    selectedDistrict = null;
    focusStateOnMap(selectedState);
    renderResultsList();
    renderMap();
    return;
  }

  selectedState = null;
  selectedDistrict = null;
  selectedRegion = null;
  selectedSubregion = null;

  if (currentElectionLevel === 'estadual') {
    const selectStateEl = document.getElementById('selectElectionState');
    if (selectStateEl) {
      selectStateEl.value = "";
    }
  }

  fitNationalBounds();

  if (currentSystemType === 'distrital') {
    renderDistrictMapNational();
    renderDistrictResultsList();
  } else {
    renderResultsList();
    renderMap();
  }

  // Update select dropdowns



}

// Start of year data load
async function loadYearData(year) {
  const loader = document.getElementById('mapLoader');
  const loaderText = document.getElementById('loaderText');
  loaderText.textContent = `Carregando dados de ${year}...`;
  loader.classList.add('visible');

  try {
    const [totals, presTotals, govTotals] = await Promise.all([
      fetchGeoJSON(DATA_BASE_URL + `Legislativas ${year}/official_totals_${year}.json`),
      fetchGeoJSON(DATA_BASE_URL + `official_totals_${year}_presidente.json`),
      fetchGeoJSON(DATA_BASE_URL + `official_totals_${year}_governador.json`).catch(() => null)
    ]);

    if (!totals) throw new Error(`Erro ao carregar os totais oficiais de ${year}.`);
    if (!presTotals) throw new Error(`Erro ao carregar os totais presidenciais de ${year}.`);

    // Clean up encoding glitches in presidential and governor totals
    const cleanString = (str) => {
      if (!str) return str;
      return str.replace(/UNIÃƒO/g, 'UNIÃO');
    };

    for (const uf of Object.keys(presTotals)) {
      if (presTotals[uf] && presTotals[uf].f && presTotals[uf].f.coalitions) {
        presTotals[uf].f.coalitions.forEach(c => {
          c.id = cleanString(c.id);
          c.raw_comp = cleanString(c.raw_comp);
        });
      }
    }

    if (govTotals) {
      for (const uf of Object.keys(govTotals)) {
        if (govTotals[uf] && govTotals[uf].g && govTotals[uf].g.coalitions) {
          govTotals[uf].g.coalitions.forEach(c => {
            c.id = cleanString(c.id);
            c.raw_comp = cleanString(c.raw_comp);
          });
        }
      }
    }

    deputyTotals = totals;
    presidentTotals = presTotals;
    governorTotals = govTotals;

    if (currentVoteBase === 'presidente') {
      officialTotals = presidentTotals;
    } else if (currentVoteBase === 'governador') {
      officialTotals = governorTotals;
    } else {
      officialTotals = deputyTotals;
    }

    // Update year-dependent UI elements
    updateUIForSelectedYear();
  } catch (err) {
    console.error(err);
    alert(`Falha ao carregar os dados de ${year}: ${err.message}`);
  } finally {
    loader.classList.remove('visible');
  }
}

function updateUIForSelectedYear() {
  // Toggle visibility of the presidential coalition section (visible for all years)
  const coalitionSection = document.getElementById('presCoalitionSection');
  if (coalitionSection) {
    coalitionSection.style.display = 'block';

    const titleEl = coalitionSection.querySelector('h3');
    if (titleEl) {
      titleEl.textContent = `Coligações Presidenciais ${currentYear}`;
    }

    const helpEl = coalitionSection.querySelector('.help-text');
    if (helpEl) {
      let desc = '';
      if (currentYear === 2006) {
        desc = "Simula como seria a eleição parlamentar se as coligações presidenciais fossem aplicadas nacionalmente (Por um Brasil Decente, Frente de Esquerda e A Força do Povo).";
      } else if (currentYear === 2010) {
        desc = "Simula como seria a eleição parlamentar se as coligações presidenciais fossem aplicadas nacionalmente (Para o Brasil seguir mudando e O Brasil pode mais).";
      } else if (currentYear === 2014) {
        desc = "Simula como seria a eleição parlamentar se as coligações presidenciais fossem aplicadas nacionalmente (Muda Brasil, Com a Força do Povo e Unidos pelo Brasil).";
      } else if (currentYear === 2018) {
        desc = "Simula como seria a eleição parlamentar se as coligações presidenciais fossem aplicadas nacionalmente (Mudança de Verdade, Brasil Soberano, O Povo Feliz de Novo, Para Unir o Brasil, etc.).";
      } else if (currentYear === 2022) {
        desc = "Simula como seria a eleição parlamentar se as coligações presidenciais fossem aplicadas nacionalmente (Brasil da Esperança, Brasil para Todos e Pelo Bem do Brasil).";
      }
      helpEl.textContent = desc;
    }
  }

  // Update the toolbar page title
  const toolbarPage = document.querySelector('.toolbar-page');
  if (toolbarPage) {
    toolbarPage.textContent = `Simulador Parlamentar Brasil ${currentYear}`;
  }
}

// =========================================================
// PACTÔMETRO FUNCTIONALITY
// =========================================================
let pactSelectedParties = new Set();

function initPactometro() {
  const btnPactometro = document.getElementById('btnPactometro');
  const btnClosePactometro = document.getElementById('btnClosePactometro');
  const modal = document.getElementById('pactometroModal');

  if (btnPactometro) {
    btnPactometro.addEventListener('click', openPactometro);
  }

  if (btnClosePactometro) {
    btnClosePactometro.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
    }
  });
}

function openPactometro() {
  const modal = document.getElementById('pactometroModal');
  if (!modal) return;

  pactSelectedParties.clear();
  modal.classList.remove('hidden');

  // Populate party list
  const listContainer = document.getElementById('pactPartiesList');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  // Get active parties that have seats
  const sortedParties = Object.entries(pactChamberAllocations)
    .filter(([_, seats]) => seats > 0)
    .map(([party, seats]) => ({
      party,
      seats,
      color: getPartyColor(party),
      cleanName: getCleanGroupName(party)
    }))
    .sort((a, b) => b.seats - a.seats || a.cleanName.localeCompare(b.cleanName));

  sortedParties.forEach(p => {
    const row = document.createElement('div');
    row.className = 'pact-party-row';
    row.setAttribute('data-party', p.party);

    const pct = pactChamberTotalSeats > 0 ? (p.seats / pactChamberTotalSeats) * 100 : 0;

    row.innerHTML = `
      <div class="pact-party-left">
        <input type="checkbox" class="pact-party-checkbox" data-party="${p.party}">
        <span class="pact-party-color" style="background-color: ${p.color};"></span>
        <span class="pact-party-name">${p.cleanName}</span>
      </div>
      <div class="pact-party-right">
        <span class="pact-party-seats">${p.seats}</span>
        <span class="pact-party-pct">${pct.toFixed(1)}%</span>
      </div>
    `;

    // Click handler to toggle checkbox on row click
    row.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT') {
        const checkbox = row.querySelector('.pact-party-checkbox');
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    });

    const checkbox = row.querySelector('.pact-party-checkbox');
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        pactSelectedParties.add(p.party);
        row.classList.add('selected');
      } else {
        pactSelectedParties.delete(p.party);
        row.classList.remove('selected');
      }
      updatePactometro();
    });

    listContainer.appendChild(row);
  });

  updatePactometro();
}

function updatePactometro() {
  let coalitionSeats = 0;
  pactSelectedParties.forEach(party => {
    coalitionSeats += pactChamberAllocations[party] || 0;
  });

  const majoritySeats = Math.floor(pactChamberTotalSeats / 2) + 1;

  // Update stats
  const seatsCountEl = document.getElementById('pactSeatsCount');
  const seatsTotalEl = document.getElementById('pactSeatsTotal');
  const statusTextEl = document.getElementById('pactStatusText');
  const progressBar = document.getElementById('pactProgressBar');
  const progressMarker = document.getElementById('pactProgressMarker');

  if (seatsCountEl) seatsCountEl.textContent = coalitionSeats;
  if (seatsTotalEl) seatsTotalEl.textContent = `/ ${pactChamberTotalSeats} Cadeiras`;

  const pct = pactChamberTotalSeats > 0 ? (coalitionSeats / pactChamberTotalSeats) * 100 : 0;
  if (progressBar) {
    progressBar.style.width = pct + '%';
    if (coalitionSeats >= majoritySeats) {
      progressBar.classList.add('has-majority');
    } else {
      progressBar.classList.remove('has-majority');
    }
  }

  if (statusTextEl) {
    if (coalitionSeats >= majoritySeats) {
      statusTextEl.innerHTML = `<span style="color: var(--ok); font-weight: 700;">Maioria absoluta alcançada!</span> (${coalitionSeats} cadeiras)`;
    } else if (coalitionSeats === 0) {
      statusTextEl.innerHTML = `Selecione partidos para formar uma maioria (necessário <strong>${majoritySeats}</strong>)`;
    } else {
      statusTextEl.innerHTML = `Faltam <strong>${majoritySeats - coalitionSeats}</strong> cadeiras para a maioria de <strong>${majoritySeats}</strong>`;
    }
  }

  if (progressMarker) {
    const markerPct = pactChamberTotalSeats > 0 ? (majoritySeats / pactChamberTotalSeats) * 100 : 50;
    progressMarker.style.left = markerPct + '%';
    // Hide marker if total seats is too low or not valid
    progressMarker.style.display = pactChamberTotalSeats > 1 ? 'block' : 'none';
  }

  // Draw semicircle in the popup modal
  drawPactometroChamber(pactChamberTotalSeats, pactChamberAllocations, pactSelectedParties);
}

function drawPactometroChamber(totalSeats, partyAllocations, selectedParties) {
  const svg = document.getElementById('pactometroChamberSvg');
  if (!svg) return;
  const svgNS = 'http://www.w3.org/2000/svg';

  const createSvgEl = (tagName, attributes = {}) => {
    const element = document.createElementNS(svgNS, tagName);
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(key, String(value));
      }
    });
    return element;
  };

  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }

  // Group seats by party
  const sortedParties = Object.entries(partyAllocations)
    .filter(([_, seats]) => seats > 0)
    .map(([party, seats]) => ({
      party,
      seats,
      color: getPartyColor(party),
      cleanName: getCleanGroupName(party)
    }))
    .sort((a, b) => b.seats - a.seats || a.cleanName.localeCompare(b.cleanName));

  const seatsArray = [];
  sortedParties.forEach(p => {
    const isSelected = selectedParties.has(p.party);
    const color = isSelected ? p.color : '#2a2a2e';
    const stroke = isSelected ? '#0d0e12' : '#1e1e24';
    for (let i = 0; i < p.seats; i++) {
      seatsArray.push({
        party: p.party,
        color: color,
        stroke: stroke,
        cleanName: p.cleanName,
        totalSeats: p.seats,
        isSelected: isSelected
      });
    }
  });

  const seatsData = getSemicircleSeats(totalSeats);
  const seatsGroup = createSvgEl('g', { class: 'chamber-seats' });

  seatsData.forEach((seat, index) => {
    const seatInfo = seatsArray[index];
    const color = seatInfo ? seatInfo.color : '#2a2a2e';
    const stroke = seatInfo ? seatInfo.stroke : '#1e1e24';
    const party = seatInfo ? seatInfo.party : 'OUTROS';
    const seatElement = createSvgEl('path', {
      class: 'chamber-seat',
      d: seat.d,
      fill: color,
      stroke: stroke,
      'stroke-width': '0.5',
      'data-party': party,
      style: seatInfo && !seatInfo.isSelected ? 'opacity: 0.4;' : ''
    });

    seatsGroup.appendChild(seatElement);
  });

  svg.appendChild(seatsGroup);

  if (totalSeats > 0) {
    const totalGroup = createSvgEl('g', { class: 'chamber-total' });

    const numberText = createSvgEl('text', {
      x: '300',
      y: '332',
      'text-anchor': 'middle',
      'font-family': 'var(--font-title)',
      'font-size': '36',
      'font-weight': '700',
      fill: 'var(--text)'
    });
    numberText.textContent = totalSeats;

    const labelText = createSvgEl('text', {
      x: '300',
      y: '354',
      'text-anchor': 'middle',
      'font-family': 'var(--font-main)',
      'font-size': '11',
      'font-weight': '600',
      fill: 'var(--text-sec)',
      'letter-spacing': '1',
      'text-transform': 'uppercase'
    });
    labelText.textContent = totalSeats === 1 ? 'Cadeira' : 'Cadeiras';

    totalGroup.appendChild(numberText);
    totalGroup.appendChild(labelText);
    svg.appendChild(totalGroup);
  }

  // Tooltip interaction
  const tooltip = document.getElementById('pactometroChamberTooltip');
  const container = document.querySelector('.pactometro-chamber-container');
  const dots = svg.querySelectorAll('.chamber-seat');

  dots.forEach((dot, index) => {
    const seatInfo = seatsArray[index];
    if (!seatInfo) return;

    dot.addEventListener('mouseover', () => {
      // Highlight seats of this party in the pactometro chamber
      const seats = svg.querySelectorAll('.chamber-seat');
      seats.forEach(s => {
        const match = s.getAttribute('data-party') === seatInfo.party;
        s.style.opacity = match ? '1' : '0.25';
        s.style.filter = match ? 'brightness(1.2)' : 'none';
      });

      const seatsPct = ((seatInfo.totalSeats / totalSeats) * 100).toFixed(1);

      tooltip.innerHTML = `
        <div class="tooltip-header">
          <span class="tooltip-badge" style="background: ${getPartyColor(seatInfo.party)}"></span>
          <strong>${seatInfo.cleanName}</strong>
        </div>
        <div class="tooltip-row">
          <span>Cadeiras</span>
          <span>${seatInfo.totalSeats} (${seatsPct}%)</span>
        </div>
        <div class="tooltip-row">
          <span>Status</span>
          <span>${seatInfo.isSelected ? 'No pacto' : 'Fora do pacto'}</span>
        </div>
      `;
      tooltip.classList.remove('hidden');
    });

    dot.addEventListener('mousemove', (event) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const tooltipWidth = tooltip.offsetWidth || 180;
      const tooltipHeight = tooltip.offsetHeight || 80;
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      let x = mouseX + 12;
      if (x + tooltipWidth > containerWidth - 10) {
        x = mouseX - tooltipWidth - 12;
      }
      x = Math.max(10, Math.min(containerWidth - tooltipWidth - 10, x));

      let y = mouseY - 12;
      if (y + tooltipHeight > containerHeight - 10) {
        y = mouseY - tooltipHeight - 12;
      }
      y = Math.max(10, y);

      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
    });

    dot.addEventListener('mouseout', () => {
      // Reset opacity of all seats
      const seats = svg.querySelectorAll('.chamber-seat');
      seats.forEach(s => {
        const pKey = s.getAttribute('data-party');
        const isSel = selectedParties.has(pKey);
        s.style.opacity = isSel ? '1' : '0.4';
        s.style.filter = 'none';
      });
      tooltip.classList.add('hidden');
    });
  });
}

// App Initialization
async function initApp() {
  const loader = document.getElementById('mapLoader');
  const loaderText = document.getElementById('loaderText');
  loaderText.textContent = "Carregando dados nacionais...";
  loader.classList.add('visible');

  try {
    // Load states map base and district GeoJSON in parallel
    const [statesGeo, distGeo, distVotos, distMunis, circuitsCsv, semilocalVotos, semilocalCircuitos, semilocalInsets, semilocalInsetsOutlines, semilocalInsetsUnions] = await Promise.all([
      fetchGeoJSON(DATA_BASE_URL + 'estados_brasil.geojson'),
      fetchDistritosGeoJSON(),
      fetchGeoJSON(DATA_BASE_URL + 'distritos_votos.json').catch(() => null),
      fetchGeoJSON(DATA_BASE_URL + 'distritos_detalhe_munis.json').catch(() => null),
      d3.csv("Deputados População Circuitos.csv").catch(() => []),
      fetchGeoJSON(DATA_BASE_URL + 'semilocal_votos.json').catch(() => null),
      fetchGeoJSON(DATA_BASE_URL + 'semilocal_circuitos.geojson').catch(() => null),
      fetchGeoJSON(DATA_BASE_URL + 'semilocal_insets.geojson').catch(() => null),
      fetchGeoJSON(DATA_BASE_URL + 'semilocal_insets_main_map_outlines.geojson').catch(() => null),
      fetchGeoJSON(DATA_BASE_URL + 'semilocal_insets_unions.geojson').catch(() => null)
    ]);
    if (!statesGeo) throw new Error("Erro ao carregar o mapa base do Brasil.");
    estadosGeoJSON = statesGeo;

    circuitosPopData = (circuitsCsv || []).map(d => ({
      estado: d.estado,
      id_local: parseInt(d.id_local),
      populacao: parseFloat(d.populacao),
      nome_distrito: d.nome_distrito
    }));

    if (distGeo) {
      distritosGeoJSON = distGeo;
      console.log(`Loaded ${distGeo.features.length} simulated districts.`);
    } else {
      console.warn('Could not load district GeoJSON. District mode will be unavailable.');
    }

    if (distVotos) {
      distritosVotosData = distVotos;
      const distCount = Object.keys(distVotos).length;
      console.log(`Loaded deputy vote data for ${distCount} districts.`);
    } else {
      console.warn('Could not load district deputy votes (distritos_votos.json). Deputy mode in districts will use presidential data only.');
    }

    if (semilocalVotos) {
      semilocalVotosData = semilocalVotos;
      const circCount = Object.keys(semilocalVotos).length;
      console.log(`Loaded subregion vote data for ${circCount} circuits.`);
    } else {
      console.warn('Could not load subregion vote data (semilocal_votos.json).');
    }

    if (semilocalCircuitos) {
      semilocalCircuitosGeoJSON = semilocalCircuitos;
      console.log(`Loaded ${semilocalCircuitos.features.length} semilocal circuit geometries.`);
    } else {
      console.warn('Could not load semilocal circuit geometries (semilocal_circuitos.geojson).');
    }

    if (semilocalInsets) {
      insetsGeoJSONCache = semilocalInsets;
      console.log(`Loaded ${semilocalInsets.features.length} semilocal inset geometries.`);
    } else {
      console.warn('Could not load semilocal inset geometries (semilocal_insets.geojson).');
    }

    if (semilocalInsetsOutlines) {
      semilocalInsetsMainMapOutlinesGeoJSON = semilocalInsetsOutlines;
      console.log("Loaded precomputed main map outlines.");
    }

    if (semilocalInsetsUnions) {
      semilocalInsetsUnionsGeoJSON = semilocalInsetsUnions;
      populateUnionCaches();
      console.log("Loaded precomputed inset unions.");
    }

    if (distMunis) {
      distritosDetalheMunisData = distMunis;
      console.log(`Loaded detailed municipal vote data for districts.`);
    }

    // Load initial year data (2022)
    await loadYearData(currentYear);

    // MapLibre map setup — plain gray background, no basemap tiles
    mapObj = new maplibregl.Map({
      container: 'map',
      style: buildBaseStyle(),
      center: [-52, -14], // [lng, lat]
      zoom: 3.2,
      minZoom: 3,
      attributionControl: false,
      dragRotate: false
    });
    mapObj.touchZoomRotate.disableRotation();
    mapObj.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    // Move region minimap inside the map box itself (not overlaying outer containers)
    const minimapEl = document.getElementById('regionMiniMap');
    const mapContainer = document.getElementById('map');
    if (minimapEl && mapContainer) {
      mapContainer.appendChild(minimapEl);
    }

    // Initial simulation (rendering waits for the GL style to be ready)
    runSimulation();
    renderResultsList();
    initPactometro();
    mapObj.on('load', () => {
      __glStyleReady = true;
      renderMap();
      fitNationalBounds();
    });

    // Event bindings

    // System type selector (Proportional vs District)
    document.getElementById('selectSystemType').addEventListener('change', (e) => {
      setSystemType(e.target.value);
    });

    document.getElementById('selectSeatDistribution').addEventListener('change', () => {
      updateConfigVisibility();
      if (currentSystemType === 'distrital') {
        runDistrictSimulation();
        renderDistrictMapNational();
        renderDistrictResultsList();
      } else {
        runSimulation();
        renderResultsList();
        renderMap();
      }
    });

    document.getElementById('selectCalcMethod').addEventListener('change', () => {
      if (currentSystemType === 'distrital') {
        runDistrictSimulation();
        renderDistrictMapNational();
        renderDistrictResultsList();
      } else {
        runSimulation();
        renderResultsList();
        renderMap();
      }
    });

    // Election level selector (Nacional vs Estadual)
    document.getElementById('selectElectionLevel').addEventListener('change', (e) => {
      const level = e.target.value;

      selectedState = null;
      selectedDistrict = null;
      selectedRegion = null;
      selectedSubregion = null;

      if (level === 'estadual') {
        const stateSelect = document.getElementById('selectElectionState');
        if (stateSelect) stateSelect.value = '';
      }

      updateConfigVisibility();

      const selectVoteBase = document.getElementById('selectVoteBase');
      if (selectVoteBase) {
        const [base, yearStr] = selectVoteBase.value.split('_');
        currentVoteBase = base;
        currentYear = parseInt(yearStr);
        if (currentVoteBase === 'presidente') {
          officialTotals = presidentTotals;
        } else if (currentVoteBase === 'governador') {
          officialTotals = governorTotals;
        } else {
          officialTotals = deputyTotals;
        }
      }

      runSimulation();
      renderResultsList();
      renderMap();
      initPactometro();
    });

    // Election State selector (for Estadual level)
    document.getElementById('selectElectionState').addEventListener('change', (e) => {
      const uf = e.target.value;
      updateConfigVisibility();
      if (currentElectionLevel === 'estadual' && uf) {
        selectState(uf);
      } else {
        runSimulation();
        renderResultsList();
        renderMap();
        initPactometro();
      }
    });

    // Circumscription selector (Nacional, Estadual, Regional)
    document.getElementById('selectCircumscription').addEventListener('change', () => {
      updateConfigVisibility();
      runSimulation();
      renderResultsList();
      renderMap();
      initPactometro();
    });

    document.getElementById('selectVoteBase').addEventListener('change', async (e) => {
      const [base, yearStr] = e.target.value.split('_');
      const selectedYear = parseInt(yearStr);
      const selectedBase = base;

      const yearChanged = selectedYear !== currentYear;
      const baseChanged = selectedBase !== currentVoteBase;

      currentVoteBase = selectedBase;
      currentYear = selectedYear;

      if (yearChanged || baseChanged) {
        // Clear cached state results since we changed election year or vote base
        loadedStateResults = null;
        loadedDeputyResults = null;
        loadedStateMuniGeo = null;
      }

      if (yearChanged) {
        // Load the new year totals
        await loadYearData(currentYear);
      } else {
        if (currentVoteBase === 'presidente') {
          officialTotals = presidentTotals;
        } else if (currentVoteBase === 'governador') {
          officialTotals = governorTotals;
        } else {
          officialTotals = deputyTotals;
        }
      }

      if (currentSystemType === 'distrital') {
        // Re-run district simulation with the new election data
        selectedState = null;
        selectedDistrict = null;
        selectedRegion = null;
        fitNationalBounds();
        document.getElementById('btnBackToNational').classList.add('hidden');
        runDistrictSimulation();
        renderDistrictMapNational();
        renderDistrictResultsList();
      } else {
        if (selectedState !== null) {
          await selectState(selectedState);
        } else {
          runSimulation();
          renderResultsList();
          renderMap();
        }
      }
    });

    document.getElementById('btnApplySimulation').addEventListener('click', () => {
      if (currentSystemType === 'distrital') {
        runDistrictSimulation();
        renderDistrictMapNational();
        renderDistrictResultsList();
      } else {
        runSimulation();
        renderResultsList();
        renderMap();
      }
    });

    document.getElementById('btnBackToNational').addEventListener('click', backToNational);

    // Sliders displays
    const slideFed = document.getElementById('sliderFederalBarrier');
    const valFed = document.getElementById('valFederalBarrier');
    slideFed.addEventListener('input', () => { valFed.textContent = slideFed.value + '%'; });
    // Slider events
    const sliders = [
      { slider: 'sliderFederalBarrier', val: 'valFederalBarrier' },
      { slider: 'sliderStateBarrier', val: 'valStateBarrier' }
    ];

    sliders.forEach(s => {
      const el = document.getElementById(s.slider);
      const valEl = document.getElementById(s.val);
      el.addEventListener('input', (e) => {
        valEl.textContent = parseFloat(e.target.value).toFixed(1) + '%';
      });
    });

    const updateStateHelpText = () => {
      const val = document.getElementById('sliderStateBarrier').value;
      const helpStateBarrier = document.getElementById('helpStateBarrier');
      if (helpStateBarrier) {
        helpStateBarrier.textContent = `Partido precisa de ${val}% dos votos do estado para receber cadeiras.`;
      }
    };

    const stateBarrierSlider = document.getElementById('sliderStateBarrier');
    if (stateBarrierSlider) {
      stateBarrierSlider.addEventListener('input', updateStateHelpText);
    }

    // Collapsible toggles
    const toggleFederalBarrier = document.getElementById('toggleFederalBarrier');
    const federalBarrierSettings = document.getElementById('federalBarrierSettings');
    toggleFederalBarrier.addEventListener('change', () => {
      federalBarrierSettings.classList.toggle('hidden', !toggleFederalBarrier.checked);
    });

    const toggleStateBarrier = document.getElementById('toggleStateBarrier');
    const stateBarrierSettings = document.getElementById('stateBarrierSettings');
    toggleStateBarrier.addEventListener('change', () => {
      stateBarrierSettings.classList.toggle('hidden', !toggleStateBarrier.checked);
    });



    // Geographic dropdown bindings removed

    // ── Circle view mode toggle (pizza ↔ bolinhas) ─────────────────────────
    const btnCirclePizza = document.getElementById('btnCirclePizza');
    const btnCircleDots = document.getElementById('btnCircleDots');

    if (btnCirclePizza && btnCircleDots) {
      btnCirclePizza.addEventListener('click', () => {
        if (circleViewMode === 'pizza') return;
        circleViewMode = 'pizza';
        btnCirclePizza.classList.add('active');
        btnCircleDots.classList.remove('active');
        redrawCircles().catch(console.error);
      });

      btnCircleDots.addEventListener('click', () => {
        if (circleViewMode === 'dots') return;
        circleViewMode = 'dots';
        btnCircleDots.classList.add('active');
        btnCirclePizza.classList.remove('active');
        redrawCircles().catch(console.error);
      });
    }

  } catch (err) {
    console.error(err);
    alert(`Falha ao iniciar o aplicativo: ${err.message}`);
  } finally {
    loader.classList.remove('visible');
  }
}

// Start app
window.addEventListener('DOMContentLoaded', initApp);
