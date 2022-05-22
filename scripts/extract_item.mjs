import { buildLuaTable, getTableData } from './utils.mjs';

const extractItem = document => {
  // Dropped by
  const droppedByData = getTableData(document, 'dropped-by')?.map(
    v => v.match(/id: (\d+)/)[1]
  );
  const droppedBy = droppedByData?.length
    ? buildLuaTable('    ', ...droppedByData.map(v => [Number(v), '100.00']))
    : undefined;

  // Contained in
  const containedInData = getTableData(document, 'contained-in-object')?.map(
    v => v.match(/id: (\d+)/)[1]
  );
  const containedIn = containedInData?.length
    ? buildLuaTable('    ', ...containedInData.map(v => [Number(v), '100.00']))
    : undefined;

  // Sold by
  const soldByData = getTableData(document, 'sold-by')?.map(v => [
    v.match(/id: (\d+)/)[1],
    v.match(/stock: (\d+)/)?.[1] ?? 0
  ]);
  const soldBy = soldByData?.length
    ? buildLuaTable('    ', ...soldByData)
    : undefined;

  return {
    db: buildLuaTable(
      '  ',
      ['U', droppedBy],
      ['V', soldBy],
      ['O', containedIn]
    ),
    rec: {
      object: [...new Set(containedInData)],
      npc: [
        ...new Set([
          ...(droppedByData ?? []),
          ...(soldByData ?? []).map(v => v[0])
        ])
      ]
    }
  };
};
export default extractItem;
