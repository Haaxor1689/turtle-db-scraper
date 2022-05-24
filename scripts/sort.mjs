import { Color } from './utils.mjs';

export const SplitTypes = {
  'enUS/items': 'oneLine',
  'enUS/objects': 'oneLine',
  'enUS/units': 'oneLine',
  'enUS/quests': 'multiLine',
  'areatrigger': 'multiLine',
  'items': 'multiLine',
  'objects': 'multiLine',
  'quests-itemreq': 'multiLine',
  'quests': 'multiLine',
  'units': 'multiLine'
};

const splitByType = {
  oneLine: str => str.split('\n'),
  multiLine: str =>
    `${str}\n`
      .split('\n  },\n')
      .filter(s => s)
      .map(s => `${s}\n  },`)
};

const getId = str => {
  try {
    return Number(str.match(/  \[(\d+)\] = /)[1]);
  } catch (e) {
    console.log(
      `${Color.Red}>>> FATAL: Failed to get id from below entry.${Color.Reset}`
    );
    console.log(str);
    process.exit(1);
  }
};

const sort = (file, name) => {
  const [head, ...rest] = file.split('\n');
  const tail = rest.slice(-2).join('\n');

  const body = splitByType[SplitTypes[name]](rest.slice(0, -2).join('\n'))
    .sort((lhs, rhs) => {
      const lId = getId(lhs);
      const rId = getId(rhs);
      if (lId > rId) return 1;
      if (lId < rId) return -1;
      return 0;
    })
    .reduce((prev, next) => ({ ...prev, [getId(next)]: next }), {});
  return `${head}\n${Object.values(body).join('\n')}\n${tail}`;
};
export default sort;
