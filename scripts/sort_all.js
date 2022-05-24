import { readFileSync, writeFileSync } from 'fs';
import { Color } from './utils.mjs';
import sort, { SplitTypes } from './sort.mjs';

Object.keys(SplitTypes).forEach(name => {
  console.log(
    `>>> Sorting ${Color.Bright}"/db/${name}-turtle.lua"${Color.Reset}.`
  );
  const file = readFileSync(`./db/${name}-turtle.lua`).toString();
  writeFileSync(`./db/${name}-turtle.lua`, sort(file, name));
  console.log(
    `${Color.Green}>>> Sorted "/db/${name}-turtle.lua".${Color.Reset}`
  );
});
