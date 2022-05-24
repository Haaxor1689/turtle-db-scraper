import { extract } from './utils.mjs';

extract(
  process.argv[2],
  process.argv.slice(3).filter(v => !v.match(/^-/))
);
