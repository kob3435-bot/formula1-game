// Formula 1 constructors (2026 grid). engine = audio archetype (all 1.6 L V6 turbo-hybrids in 2026); pu = power-unit supplier.
export const MANUFACTURERS = [
  { id: 'mclaren', name: 'McLAREN', country: 'GBR', engine: 'V6T', pu: 'Mercedes', color: '#ff8000', desc: 'Woking. 2024 & 2025 constructors\' champions; superb high-speed downforce.' },
  { id: 'mercedes', name: 'MERCEDES', country: 'GER', engine: 'V6T', pu: 'Mercedes', color: '#00d2be', desc: 'Brackley/Brixworth works team. Benchmark power unit of the 2026 rules.' },
  { id: 'redbull', name: 'RED BULL', country: 'AUT', engine: 'V6T', pu: 'Red Bull Ford', color: '#1e3a8a', desc: 'Milton Keynes. First season with its own Red Bull Ford power unit.' },
  { id: 'ferrari', name: 'FERRARI', country: 'ITA', engine: 'V6T', pu: 'Ferrari', color: '#e8002d', desc: 'Maranello. The oldest and most successful team in F1.' },
  { id: 'williams', name: 'WILLIAMS', country: 'GBR', engine: 'V6T', pu: 'Mercedes', color: '#1868db', desc: 'Grove. Nine constructors\' titles; efficient low-drag cars.' },
  { id: 'racingbulls', name: 'RACING BULLS', country: 'ITA', engine: 'V6T', pu: 'Red Bull Ford', color: '#6692ff', desc: 'Faenza. Red Bull\'s second team and driver academy.' },
  { id: 'astonmartin', name: 'ASTON MARTIN', country: 'GBR', engine: 'V6T', pu: 'Honda', color: '#00594f', desc: 'Silverstone. New works Honda partnership for 2026.' },
  { id: 'haas', name: 'HAAS', country: 'USA', engine: 'V6T', pu: 'Ferrari', color: '#b6babd', desc: 'Kannapolis/Banbury. Ferrari-powered, Toyota-supported.' },
  { id: 'audi', name: 'AUDI', country: 'GER', engine: 'V6T', pu: 'Audi', color: '#bb0a30', desc: 'Hinwil/Neuburg. Debut season as a full works team (ex-Sauber).' },
  { id: 'alpine', name: 'ALPINE', country: 'FRA', engine: 'V6T', pu: 'Mercedes', color: '#0093cc', desc: 'Enstone (ex-Benetton/Renault). Mercedes customer from 2026.' },
  { id: 'cadillac', name: 'CADILLAC', country: 'USA', engine: 'V6T', pu: 'Ferrari', color: '#c0a062', desc: 'Fishers/Silverstone. The 11th team, new for 2026.' },
];
export const MANUFACTURER_BY_ID = Object.fromEntries(MANUFACTURERS.map(m => [m.id, m]));
