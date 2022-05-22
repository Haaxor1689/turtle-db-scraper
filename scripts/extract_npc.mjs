import { buildLuaTable, getMapperCoords, getInfoboxValues } from './utils.mjs';

const extractNpc = document => {
  const infobox = getInfoboxValues(document);

  // Faction
  const fac = document.querySelector('.q2')?.textContent;

  // Level
  const lvl = infobox['Level'][0].split(' - ').join('-');

  // Coords
  const coords = getMapperCoords(document);

  return {
    db: buildLuaTable(
      '  ',
      !!fac && ['fac', `"${fac}"`],
      ['lvl', `"${lvl}"`],
      ['coords', coords]
    )
  };
};

export default extractNpc;
