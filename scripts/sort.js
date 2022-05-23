import { readFileSync, writeFileSync } from 'fs';

import { Color } from './utils.mjs';

const SplitTypes = {
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
    console.log(str);
    console.log(
      `${Color.Red}>>> Failed to get id from above entry.${Color.Reset}`
    );
    process.exit(1);
  }
};

Object.entries(SplitTypes).forEach(([type, splitType]) => {
  console.log(
    `>>> Sorting ${Color.Bright}"/db/${type}-turtle.lua"${Color.Reset}.`
  );
  const file = readFileSync(`./db/${type}-turtle.lua`).toString();

  const [head, ...rest] = file.split('\n');
  const tail = rest.slice(-2).join('\n');

  const body = splitByType[splitType](rest.slice(0, -2).join('\n')).sort(
    (lhs, rhs) => {
      const lId = getId(lhs);
      const rId = getId(rhs);
      if (lId > rId) return 1;
      if (lId < rId) return -1;
      return 0;
    }
  );

  writeFileSync(
    `./db/${type}-turtle.lua`,
    `${head}\n${body.join('\n')}\n${tail}`
  );
  console.log(
    `${Color.Green}>>> Sorted "/db/${type}-turtle.lua".${Color.Reset}`
  );
});
