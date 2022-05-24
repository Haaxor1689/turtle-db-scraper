import { readFileSync, writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import prompts from 'prompts';
import fetch from 'node-fetch';
import extractItem from './extract_item.mjs';
import extractNpc from './extract_npc.mjs';
import extractObject from './extract_object.mjs';
import extractQuest from './extract_quest.mjs';
import sort from './sort.mjs';

const DatabaseCache = {};
const SeenCache = {};

export const Color = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Underscore: '\x1b[4m',
  Blue: '\x1b[34m',
  Red: '\x1b[31m',
  Green: '\x1b[32m',
  Yellow: '\x1b[33m'
};

const C = (...colors) => Color.Reset + colors.map(c => Color[c]).join('');

const prompt = async (message = 'Overwrite?') => {
  const { v } = await prompts({
    type: 'confirm',
    name: 'v',
    message
  });
  return v;
};

const Callbacks = {
  item: extractItem,
  npc: extractNpc,
  object: extractObject,
  quest: extractQuest
};

const entityLink = (type, id) =>
  C('Blue', 'Underscore') +
  `https://database.turtle-wow.org/?${type}=${id}` +
  C();

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
    `>>> Loading entry ${C('Bright')}[${id}]${C()} from`,
    C('Blue', 'Underscore') +
      `https://database.turtle-wow.org/?${table}=${id}` +
      C()
  );

  const page = await fetch(`https://database.turtle-wow.org/?${table}=${id}`);
  const content = await page.text();

  return new JSDOM(content).window.document;
};

const typeToFile = type => (type === 'npc' ? 'unit' : type);

const checkContainsId = (file, id) => file.match(`\\n  \\[${id}\\] = `);

const locFile = file => `./db/enUS/${file}s-turtle.lua`;
const dbFile = file => `./db/${file}s-turtle.lua`;

const checkLuaTable = (path, id) => {
  const file = readFileSync(path).toString();
  return checkContainsId(file, id);
};

const appendToLuaTable = async (type, name, id, entry, comment) => {
  const path = type === 'loc' ? locFile(name) : dbFile(name);
  console.log(`\n>>> Adding entry ${C('Bright')}[${id}]${C()} to file ${path}`);
  const file = readFileSync(path).toString();

  const toAppend = `${
    comment ? `  -- ${comment}\n` : ''
  }  [${id}] = ${entry},\n`;
  console.log(toAppend.slice(0, -1));

  const content = sort(
    `${file.slice(0, -2)}${toAppend}}\n`,
    type === 'loc' ? `enUS/${name}s` : `${name}s`
  );

  writeFileSync(path, content);

  console.log(C('Green') + `>>> Above entry was added to ${path}` + C());
};

export const extract = async (type, ids) => {
  const callback = Callbacks[type];
  if (!callback) {
    console.log(
      C('Yellow') + `>>> Unknown entity type "${type}" to extract.` + C()
    );
    return Promise.resolve();
  }

  if (!ids.length) {
    console.log(
      C('Yellow') + `>>> Please provide at least one id as an argument.` + C()
    );
    return Promise.resolve();
  }

  return ids.reduce(
    (prev, id) =>
      prev.then(async () => {
        if (SeenCache[type]?.find(v => v === id)) return;

        const file = typeToFile(type);
        if (
          checkLuaTable(locFile(file), id) &&
          checkLuaTable(dbFile(file), id)
        ) {
          console.log(
            C('Yellow') + `>>> ${type} [${id}], already present.` + C(),
            entityLink(type, id)
          );
          if (!(await prompt())) return Promise.resolve();
        }

        const shaguDb = await loadShaguDatabase(file);
        if (checkContainsId(shaguDb, id)) {
          console.log(
            C('Yellow') +
              `>>> ${type} [${id}], present in vanilla database.` +
              C(),
            entityLink(type, id)
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
            C('Red') + `>>> Failed to parse ${type} [${id}].` + C(),
            entityLink(type, id)
          );
          return Promise.resolve();
        }

        const { loc = `"${name}"`, db, rec } = callback(document, name);

        await appendToLuaTable('loc', file, id, loc);
        await appendToLuaTable('db', file, id, db, name);

        // Update seen cache so the same entry won't appear multiple times if overwriting
        SeenCache[type] = [...(SeenCache[type] ?? []), id];

        if (rec) {
          console.log(`>>> Related entities:`);
          console.table(rec);
          return Object.entries(rec).reduce(
            (prev, [type, ids]) =>
              prev.then(() =>
                ids.length ? extract(type, ids) : Promise.resolve()
              ),
            Promise.resolve()
          );
        }
        return Promise.resolve();
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
