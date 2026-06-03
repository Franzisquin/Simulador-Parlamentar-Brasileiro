const { DatabaseSync } = require('node:sqlite');
const gpkgPath = 'C:\\Users\\lixov\\OneDrive\\Ambiente de Trabalho\\PR Regional\\Circulos NW Populacao.gpkg';
const db = new DatabaseSync(gpkgPath);
const rows = db.prepare("SELECT DISTINCT estado FROM 'Circulos NW Populacao';").all();

const UF_NAMES = {
  "AC": "Acre", "AL": "Alagoas", "AM": "Amazonas", "AP": "Amapá", "BA": "Bahia",
  "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo", "GO": "Goiás",
  "MA": "Maranhão", "MG": "Minas Gerais", "MS": "Mato Grosso do Sul", "MT": "Mato Grosso",
  "PA": "Pará", "PB": "Paraíba", "PE": "Pernambuco", "PI": "Piauí", "PR": "Paraná",
  "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte", "RO": "Rondônia", "RR": "Roraima",
  "RS": "Rio Grande do Sul", "SC": "Santa Catarina", "SP": "São Paulo", "SE": "Sergipe",
  "TO": "Tocantins"
};
const ufNameSet = new Set(Object.values(UF_NAMES));

rows.forEach(r => {
  const match = ufNameSet.has(r.estado);
  console.log(`GPKG: "${r.estado}" → UF_NAMES match: ${match}`);
});
