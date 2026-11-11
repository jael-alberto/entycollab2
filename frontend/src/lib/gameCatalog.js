// ==========================================================================
// CATÁLOGO DE JUEGOS
// Cien juegos reales y conocidos: diez por cada uno de los diez géneros que
// usa la plataforma. El estudio y el año son los de la obra original, así que
// sirven como referencia rápida y no como dato de negocio.
//
// La taxonomía no se duplica aquí: las claves de `GAMES_BY_GENRE` son los
// mismos valores que `FAVORITE_GENRES` en lib/talent.js (los diez géneros más
// famosos), así que un género nuevo se añade en un solo sitio.
//
// Cuando exista una tabla de juegos en el backend, este archivo se sustituye
// por una consulta y los componentes que lo consumen no cambian.
// ==========================================================================

// [título, estudio, año]. El año ordena la ficha; no se usa para filtrar.
const GAMES_BY_GENRE = {
  shooter: [
    ['Doom', 'id Software', 1993],
    ['Half-Life 2', 'Valve', 2004],
    ['Counter-Strike: Global Offensive', 'Valve', 2012],
    ['Halo: Combat Evolved', 'Bungie', 2001],
    ['Call of Duty: Modern Warfare 2', 'Infinity Ward', 2009],
    ['Battlefield 3', 'DICE', 2011],
    ['Overwatch', 'Blizzard Entertainment', 2016],
    ['Titanfall 2', 'Respawn Entertainment', 2016],
    ['Fortnite', 'Epic Games', 2017],
    ['Valorant', 'Riot Games', 2020]
  ],
  adventure: [
    ['The Secret of Monkey Island', 'LucasArts', 1990],
    ['Myst', 'Cyan', 1993],
    ['Grim Fandango', 'LucasArts', 1998],
    ['The Legend of Zelda: Ocarina of Time', 'Nintendo EAD', 1998],
    ['Grand Theft Auto V', 'Rockstar North', 2013],
    ['The Last of Us', 'Naughty Dog', 2013],
    ['Life is Strange', 'Dontnod Entertainment', 2015],
    ['Uncharted 4: A Thief\u2019s End', 'Naughty Dog', 2016],
    ['The Legend of Zelda: Breath of the Wild', 'Nintendo EPD', 2017],
    ['Red Dead Redemption 2', 'Rockstar Studios', 2018]
  ],
  rpg: [
    ['Chrono Trigger', 'Square', 1995],
    ['Final Fantasy VII', 'Square', 1997],
    ['Diablo II', 'Blizzard North', 2000],
    ['Mass Effect 2', 'BioWare', 2010],
    ['Dark Souls', 'FromSoftware', 2011],
    ['The Elder Scrolls V: Skyrim', 'Bethesda Game Studios', 2011],
    ['The Witcher 3: Wild Hunt', 'CD Projekt Red', 2015],
    ['Persona 5', 'Atlus', 2016],
    ['Elden Ring', 'FromSoftware', 2022],
    ['Baldur\u2019s Gate 3', 'Larian Studios', 2023]
  ],
  strategy: [
    ['Age of Empires II', 'Ensemble Studios', 1999],
    ['Command & Conquer: Red Alert 2', 'Westwood Studios', 2000],
    ['Warcraft III: Reign of Chaos', 'Blizzard Entertainment', 2002],
    ['Company of Heroes', 'Relic Entertainment', 2006],
    ['StarCraft II: Wings of Liberty', 'Blizzard Entertainment', 2010],
    ['Total War: Shogun 2', 'Creative Assembly', 2011],
    ['XCOM: Enemy Unknown', 'Firaxis Games', 2012],
    ['Civilization VI', 'Firaxis Games', 2016],
    ['Frostpunk', '11 bit studios', 2018],
    ['Crusader Kings III', 'Paradox Development Studio', 2020]
  ],
  sports: [
    ['Tony Hawk\u2019s Pro Skater 2', 'Neversoft', 2000],
    ['SSX 3', 'EA Canada', 2003],
    ['Wii Sports', 'Nintendo EAD', 2006],
    ['Rocket League', 'Psyonix', 2015],
    ['FIFA 23', 'EA Vancouver', 2022],
    ['NBA 2K23', 'Visual Concepts', 2022],
    ['MLB The Show 23', 'San Diego Studio', 2023],
    ['Football Manager 2024', 'Sports Interactive', 2023],
    ['Madden NFL 24', 'EA Tiburon', 2023],
    ['NHL 24', 'EA Vancouver', 2023]
  ],
  puzzle: [
    ['Tetris', 'Alexey Pajitnov', 1984],
    ['Bejeweled', 'PopCap Games', 2001],
    ['Braid', 'Number None', 2008],
    ['Portal 2', 'Valve', 2011],
    ['Candy Crush Saga', 'King', 2012],
    ['Monument Valley', 'ustwo games', 2014],
    ['The Talos Principle', 'Croteam', 2014],
    ['Inside', 'Playdead', 2016],
    ['The Witness', 'Thekla', 2016],
    ['Baba Is You', 'Hempuli', 2019]
  ],
  racing: [
    ['Wipeout', 'Psygnosis', 1995],
    ['Crash Team Racing', 'Naughty Dog', 1999],
    ['Burnout 3: Takedown', 'Criterion Games', 2004],
    ['Need for Speed: Most Wanted', 'EA Black Box', 2005],
    ['TrackMania Nations Forever', 'Nadeo', 2008],
    ['Assetto Corsa', 'Kunos Simulazioni', 2014],
    ['Mario Kart 8 Deluxe', 'Nintendo EPD', 2017],
    ['Forza Horizon 5', 'Playground Games', 2021],
    ['Gran Turismo 7', 'Polyphony Digital', 2022],
    ['F1 23', 'Codemasters', 2023]
  ],
  fighting: [
    ['Street Fighter II', 'Capcom', 1991],
    ['Virtua Fighter', 'Sega AM2', 1993],
    ['Killer Instinct', 'Rare', 1994],
    ['Tekken 3', 'Namco', 1997],
    ['Soulcalibur', 'Project Soul', 1998],
    ['The King of Fighters \u201998', 'SNK', 1998],
    ['Dragon Ball FighterZ', 'Arc System Works', 2018],
    ['Super Smash Bros. Ultimate', 'Sora Ltd.', 2018],
    ['Mortal Kombat 11', 'NetherRealm Studios', 2019],
    ['Guilty Gear Strive', 'Arc System Works', 2021]
  ],
  simulation: [
    ['Minecraft', 'Mojang Studios', 2011],
    ['Euro Truck Simulator 2', 'SCS Software', 2012],
    ['The Sims 4', 'Maxis', 2014],
    ['Cities: Skylines', 'Colossal Order', 2015],
    ['Stardew Valley', 'ConcernedApe', 2016],
    ['Planet Coaster', 'Frontier Developments', 2016],
    ['Animal Crossing: New Horizons', 'Nintendo EPD', 2020],
    ['Factorio', 'Wube Software', 2020],
    ['Microsoft Flight Simulator', 'Asobo Studio', 2020],
    ['Farming Simulator 22', 'Giants Software', 2021]
  ],
  platformer: [
    ['Super Mario Bros.', 'Nintendo R&D4', 1985],
    ['Sonic the Hedgehog', 'Sonic Team', 1991],
    ['Donkey Kong Country', 'Rare', 1994],
    ['Crash Bandicoot', 'Naughty Dog', 1996],
    ['Super Mario 64', 'Nintendo EAD', 1996],
    ['Rayman Legends', 'Ubisoft Montpellier', 2013],
    ['Ori and the Blind Forest', 'Moon Studios', 2015],
    ['Hollow Knight', 'Team Cherry', 2017],
    ['Cuphead', 'Studio MDHR', 2017],
    ['Celeste', 'Maddy Makes Games', 2018]
  ]
};

// Id estable y legible a partir del título ("Half-Life 2" -> "half-life-2").
function slug(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Catálogo plano, en el orden de los géneros y con los diez juegos de cada uno.
export const GAME_CATALOG = Object.entries(GAMES_BY_GENRE).flatMap(([genre, rows]) =>
  rows.map(([title, studioLabel, year]) => ({
    id: slug(title),
    title,
    genre,
    studio: studioLabel,
    year
  }))
);

// Juegos de los géneros marcados, en el orden del catálogo. Sin géneros
// marcados devuelve una lista vacía: quien elige los juegos decide si, sin
// filtro, muestra el catálogo completo (`GAME_CATALOG`).
export function gamesForGenres(genres) {
  const chosen = new Set((genres || []).filter(value => GAMES_BY_GENRE[value]));
  if (chosen.size === 0) return [];
  return GAME_CATALOG.filter(game => chosen.has(game.genre));
}

// Fichas a partir de los ids guardados, en el orden del catálogo. Los ids que
// ya no existen (catálogo cambiado) se descartan en silencio.
export function gamesByIds(ids) {
  const wanted = new Set(ids || []);
  if (wanted.size === 0) return [];
  return GAME_CATALOG.filter(game => wanted.has(game.id));
}
