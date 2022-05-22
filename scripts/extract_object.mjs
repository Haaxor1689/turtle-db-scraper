import { buildLuaTable, getMapperCoords } from './utils.mjs';

const extractObject = document => {
  // Coords
  const coords = getMapperCoords(document);

  return {
    db: buildLuaTable('  ', ['coords', coords])
  };
};
export default extractObject;
