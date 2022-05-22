import {
  buildLuaTable,
  getInfoboxValues,
  trim,
  matchEntityLink,
  getSectionRows,
  groupByKey
} from './utils.mjs';

const extractQuest = (document, name) => {
  const infobox = getInfoboxValues(document);

  // Objective
  const objective = trim(
    document.querySelector('.main-contents .text h1')?.nextSibling.textContent
  );

  // Description
  const description = trim(
    [...document.querySelectorAll('.main-contents .text h3')].find(
      n => n.textContent === 'Description'
    )?.nextSibling.textContent
  ).replaceAll(/\<([nNrRcC])(ame|AME|lass|LASS|ace|ACE)\>/g, '$$$1');

  // Start
  const start = groupByKey(infobox['Start'].map(matchEntityLink));

  // End
  const end = groupByKey(infobox['End'].map(matchEntityLink));

  // Objectives
  const obj = groupByKey(
    [...document.querySelectorAll('.iconlist td')]
      .map(n => matchEntityLink(n.innerHTML))
      .filter(v => v)
  );

  // Related entities
  const related = [...start, ...end, ...obj].reduce(
    (prev, [t, ids]) => ({
      ...prev,
      [t]: [...(prev[t] ?? []), ...(ids.match(/(\d+)/g) ?? [])]
    }),
    {}
  );

  // Race
  const raceRaw = Number(infobox['Race Mask'][0]);
  // Fix high elf and goblin race to generic faction mask
  const race = raceRaw === 512 ? 77 : raceRaw === 256 ? 178 : raceRaw;

  // Class
  const cls = Number(infobox['Class Mask'][0]);

  // Level
  const lvl = infobox['Level']?.[0];

  const series = getSectionRows(document, 'Series', 'td');
  const currentQuestIndex = series.findIndex(v => !v.match(/<a href/));

  // Prereq
  const pre = [
    ...new Set(
      [
        ...getSectionRows(document, 'Requires'),
        ...series.slice(0, currentQuestIndex)
      ].map(matchEntityLink)
    )
  ];

  // Next
  const next = [
    ...new Set(
      [
        ...getSectionRows(document, 'Open Quests'),
        ...series.slice(currentQuestIndex + 1)
      ].map(matchEntityLink)
    )
  ];

  return {
    loc: buildLuaTable(
      '  ',
      name && ['T', `"${name}"`],
      objective && ['O', `"${objective}"`],
      description && ['D', `"${description}"`]
    ),
    db: buildLuaTable(
      '  ',
      ['start', buildLuaTable('    ', ...start)],
      ['end', buildLuaTable('    ', ...end)],
      !!obj.length && ['obj', buildLuaTable('    ', ...obj)],
      !!race && ['race', race],
      !!cls && ['class', cls],
      !!lvl && ['lvl', lvl],
      ['min', infobox['Requires level'][0]],
      !!pre.length && ['pre', `{ ${pre.join(', ')} }`],
      !!next.length && ['next', `{ ${next.join(', ')} }`]
    ),
    rec: {
      quest: [...new Set([...pre, ...next])],
      item: [...new Set(related.I ?? [])],
      object: [...new Set(related.O ?? [])],
      npc: [...new Set(related.U ?? [])]
    }
  };
};
export default extractQuest;
