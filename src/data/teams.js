// 2026 FIA Formula One World Championship teams (official entry names) and approximate livery colours.
export const TEAMS = [
  { id: 'mclaren', name: 'McLaren Mastercard F1 Team', short: 'MCL', sponsor: 'MASTERCARD', manufacturer: 'mclaren', bike: 'mcl40', colors: ['#ff8000', '#1b1b1b', '#47c7fc'] },
  { id: 'mercedes', name: 'Mercedes-AMG PETRONAS F1 Team', short: 'MER', sponsor: 'PETRONAS', manufacturer: 'mercedes', bike: 'w17', colors: ['#c6c9cc', '#111111', '#00d2be'] },
  { id: 'redbull', name: 'Oracle Red Bull Racing', short: 'RBR', sponsor: 'ORACLE', manufacturer: 'redbull', bike: 'rb22', colors: ['#1e2a5a', '#e10600', '#ffcc00'] },
  { id: 'ferrari', name: 'Scuderia Ferrari HP', short: 'FER', sponsor: 'HP', manufacturer: 'ferrari', bike: 'sf26', colors: ['#e8002d', '#ffffff', '#111111'] },
  { id: 'williams', name: 'Atlassian Williams Racing', short: 'WIL', sponsor: 'ATLASSIAN', manufacturer: 'williams', bike: 'fw48', colors: ['#1868db', '#0b1f44', '#ffffff'] },
  { id: 'racingbulls', name: 'Visa Cash App Racing Bulls F1 Team', short: 'RB', sponsor: 'VISA CASH APP', manufacturer: 'racingbulls', bike: 'vcarb03', colors: ['#ffffff', '#1634cc', '#e10600'] },
  { id: 'astonmartin', name: 'Aston Martin Aramco F1 Team', short: 'AMR', sponsor: 'ARAMCO', manufacturer: 'astonmartin', bike: 'amr26', colors: ['#00594f', '#cedc00', '#111111'] },
  { id: 'haas', name: 'TGR Haas F1 Team', short: 'HAA', sponsor: 'TOYOTA GAZOO RACING', manufacturer: 'haas', bike: 'vf26', colors: ['#ffffff', '#e6002b', '#1a1a1a'] },
  { id: 'audi', name: 'Audi Revolut F1 Team', short: 'AUD', sponsor: 'REVOLUT', manufacturer: 'audi', bike: 'r26', colors: ['#bcc0c4', '#bb0a30', '#111111'] },
  { id: 'alpine', name: 'BWT Alpine F1 Team', short: 'ALP', sponsor: 'BWT', manufacturer: 'alpine', bike: 'a526', colors: ['#0093cc', '#ff87bc', '#0b1a2b'] },
  { id: 'cadillac', name: 'Cadillac Formula 1 Team', short: 'CAD', sponsor: 'CADILLAC', manufacturer: 'cadillac', bike: 'mac26', colors: ['#141414', '#ffffff', '#c0a062'] },
];
export const TEAM_BY_ID = Object.fromEntries(TEAMS.map(t => [t.id, t]));
export const CURRENT_TEAMS = TEAMS.filter(t => !t.id.startsWith('leg-'));
