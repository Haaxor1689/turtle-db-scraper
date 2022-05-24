import { readFileSync, writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import extractItem from './extract_item.mjs';
import extractNpc from './extract_npc.mjs';
import extractObject from './extract_object.mjs';
import extractQuest from './extract_quest.mjs';

const DatabaseCache = {};

export const Color = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Red: '\x1b[31m',
  Green: '\x1b[32m',
  Yellow: '\x1b[33m'
};

const Callbacks = {
  item: extractItem,
  npc: extractNpc,
  object: extractObject,
  quest: extractQuest
};

const loadShaguDatabase = async file => {
  if (DatabaseCache[file]) return DatabaseCache[file];
  const page = await fetch(
    `https://raw.githubusercontent.com/shagu/pfQuest/master/db/${file}s.lua`
  );
  const content = await page.text();
  DatabaseCache[file] = content;
  return content;
};

const loadDocument = async (table, id) => {
  console.log(
    `>>> Loading entry ${Color.Bright}[${id}]${Color.Reset} from https://database.turtle-wow.org/?${table}=${id}`
  );

  const page = await fetch(`https://database.turtle-wow.org/?${table}=${id}`);
  const content = await page.text();

  return new JSDOM(content).window.document;
};

const typeToFile = type => (type === 'npc' ? 'unit' : type);

const checkContainsId = (file, id) => file.match(`\\n  \\[${id}\\] = `);

const checkLuaTable = (path, id) => {
  const file = readFileSync(path).toString();
  return checkContainsId(file, id);
};

const appendToLuaTable = (path, id, entry, comment) => {
  console.log(
    `\n>>> Adding entry ${Color.Bright}[${id}]${Color.Reset} to file ${path}`
  );
  const file = readFileSync(path).toString();

  const toAppend = `${
    comment ? `  -- ${comment}\n` : ''
  }  [${id}] = ${entry},\n`;
  console.log(toAppend.slice(0, -1));

  if (checkLuaTable(path, id)) {
    console.log(`${Color.Red}>>> Entry [${id}] already present.${Color.Reset}`);
    return;
  }

  writeFileSync(path, `${file.slice(0, -2)}${toAppend}}\n`);

  console.log(
    `${Color.Green}>>> Above data was appended to ${path}${Color.Reset}`
  );
};

export const extract = async (type, ids) => {
  const callback = Callbacks[type];
  if (!callback) {
    console.log(
      `${Color.Yellow}>>> Unknown entity type "${type}" to extract.${Color.Reset}`
    );
    return Promise.resolve();
  }

  if (!ids.length) {
    console.log(
      `${Color.Yellow}>>> Please provide at least one id as an argument.${Color.Reset}`
    );
    return Promise.resolve();
  }

  return ids.reduce(
    (prev, id) =>
      prev.then(async () => {
        const file = typeToFile(type);
        const locFile = `./db/enUS/${file}s-turtle.lua`;
        const dbFile = `./db/${file}s-turtle.lua`;

        const shaguDb = await loadShaguDatabase(file);
        if (checkContainsId(shaguDb, id)) {
          console.log(
            `${Color.Yellow}>>> Skipping [${id}], present in vanilla database.${Color.Reset}`
          );
          return Promise.resolve();
        }

        if (checkLuaTable(locFile, id) && checkLuaTable(dbFile, id)) {
          console.log(
            `${Color.Yellow}>>> Skipping [${id}], already present.${Color.Reset}`
          );
          return Promise.resolve();
        }

        const document = await loadDocument(type, id);
        const name = document
          .querySelector('h1')
          .textContent.split(' - ')
          .slice(0, -1)
          .join(' - ');
        if (!name) {
          console.log(
            `${Color.Red}>>> Entry with id [${id}] and type [${type}] not found.${Color.Reset}`
          );
          return Promise.resolve();
        }

        const { loc = `"${name}"`, db, rec } = callback(document, name);

        appendToLuaTable(locFile, id, loc);
        appendToLuaTable(dbFile, id, db, name);

        return Object.entries(rec ?? {}).reduce(
          (prev, [type, ids]) =>
            prev.then(() =>
              ids.length ? extract(type, ids) : Promise.resolve()
            ),
          Promise.resolve()
        );
      }),
    Promise.resolve()
  );
};

export const buildLuaTable = (indent, ...pairs) =>
  `{\n${pairs.reduce(
    (str, val) =>
      !val || val[1] === undefined
        ? str
        : `${str}${indent}  [${JSON.stringify(val[0])}] = ${val[1]},\n`,
    ''
  )}${indent}}`;

export const trim = str =>
  !str ? undefined : str.replaceAll(/\n/g, ' ').replaceAll(/ +/g, ' ').trim();

export const getMapperCoords = document => {
  const coords = [...document.querySelectorAll('#locations a')].flatMap(n => {
    const mapperData = n.outerHTML.match(/myMapper.update\(([^;]*)\);/)[1];
    const z = mapperData.match(/zone: (\d+),/)?.[1];
    if (!z) return [];
    return (mapperData.match(/\[[^\]]+]/g) ?? []).map(v => {
      const [_, x, y, t] = v.match(
        /(\d+(?:\.\d+)?),(\d+(?:\.\d+)?).*type:'(\d)'/
      );
      return `{ ${x}, ${y}, ${z}, ${t} }`;
    });
  });

  return !coords.length
    ? undefined
    : buildLuaTable('    ', ...coords.map((v, i) => [i + 1, v]));
};

export const getTableData = (document, table) =>
  document
    .querySelector('.main-contents > script:last-of-type')
    .innerHTML.match(
      `new Listview\\({template:'\\w+',id:'${table}'[^;]*,data:\\[{([^;]*)}\\]}\\);`
    )?.[1]
    .split('},{');

export const getInfoboxValues = document =>
  [...document.querySelectorAll('.infobox ul div')]
    .map(v => {
      const [key, ...value] = v.innerHTML.split(':');
      return [key, ...value.join(':').split('<br>')].map(trim);
    })
    .reduce((o, [k, ...v]) => ({ ...o, [k]: v }), {});

export const getSectionRows = (document, section, elem = 'li') =>
  [
    ...([...document.querySelectorAll('.infobox tr')]
      .find(v => v.textContent === section)
      ?.nextSibling.children[0].querySelectorAll(elem) ?? [])
  ].map(n => n.outerHTML);

const routeToLuaKey = {
  npc: 'U',
  object: 'O',
  item: 'I'
};

export const matchEntityLink = str => {
  const m = str.match(/\?(\w+)=(\d+)/)?.slice(1, 3);
  return !m
    ? undefined
    : routeToLuaKey[m[0]]
    ? [routeToLuaKey[m[0]], m[1]]
    : m[1];
};

export const groupByKey = value =>
  Object.entries(
    value.reduce((obj, [k, v]) => ({ ...obj, [k]: [...(obj[k] ?? []), v] }), {})
  ).reduce((obj, [k, v]) => [...obj, [k, `{ ${v.join(', ')} }`]], []);
