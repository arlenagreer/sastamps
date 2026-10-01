#!/usr/bin/env node
/**
 * test-font-loading: the font-loading script must switch the page to the web
 * fonts (`fonts-loaded` on <html>) whatever the browser does with storage.
 *
 * The previous inline observer called localStorage unguarded. Where storage is
 * blocked (Safari or Chrome with site data blocked) `localStorage` itself
 * throws, the script died, `fonts-loaded` was never set, and the font-loading
 * CSS kept every page on system-ui.
 *
 * Runs the script in a Node `vm` context with a stub document. Blocked storage
 * is modelled INSIDE the context, where even reading `localStorage` throws, as
 * it does in a real browser.
 *
 * Usage: node scripts/test-font-loading.js [script.js]
 * Without an argument it bundles js/font-loading.js the way the build does.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '..');

function loadScript() {
  if (process.argv[2]) return fs.readFileSync(process.argv[2], 'utf8');
  // Exactly the options the build uses (target included), compiled in memory.
  const { builds, compile } = require('./build-css');
  return compile(builds.find((b) => b.outfile.endsWith('font-loading.min.js')));
}

const STORAGE = {
  available: 'storage available, fonts not cached',
  cached: 'storage available, fonts cached',
  getterThrows: 'reading localStorage throws (storage blocked)',
  getItemThrows: 'localStorage.getItem throws',
  setItemThrows: 'localStorage.setItem throws',
};

async function run(source, mode, { noFontsApi = false, fontLoad = 'resolve' } = {}) {
  const classes = new Set();
  const loads = [];
  const stored = {};
  const timers = [];
  const sandbox = {
    console,
    // Timers are recorded and fired by the test, so a 3 s fallback is checked
    // without waiting 3 s.
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].cleared = true; },
    document: {
      documentElement: {
        classList: {
          add: (...c) => c.forEach((x) => classes.add(x)),
          remove: (...c) => c.forEach((x) => classes.delete(x)),
          contains: (c) => classes.has(c),
        },
      },
      fonts: noFontsApi ? undefined : {
        load: (spec) => {
          loads.push(spec);
          if (fontLoad === 'throw') throw new Error('SyntaxError');
          if (fontLoad === 'reject') return Promise.reject(new Error('NetworkError'));
          if (fontLoad === 'hang') return new Promise(() => {});
          return Promise.resolve([{}]);
        },
      },
    },
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  const store = {
    getItem: (k) => {
      if (mode === 'getItemThrows') throw new Error('SecurityError');
      return mode === 'cached' && k === 'fonts-loaded' ? 'true' : (stored[k] ?? null);
    },
    setItem: (k, v) => {
      if (mode === 'setItemThrows') throw new Error('SecurityError');
      stored[k] = String(v);
    },
  };
  if (mode === 'getterThrows') {
    vm.runInContext("Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('SecurityError')}})", ctx);
  } else {
    ctx.localStorage = store;
  }

  const errors = [];
  const onRejection = (e) => errors.push(`unhandled rejection: ${e && e.message}`);
  process.on('unhandledRejection', onRejection);
  try {
    vm.runInContext(source, ctx);
  } catch (e) {
    errors.push(`threw: ${e.message}`);
  }
  const syncClasses = new Set(classes);
  await new Promise((r) => setTimeout(r, 30));
  const beforeTimers = new Set(classes);
  for (const t of timers) if (!t.cleared) t.fn();
  process.off('unhandledRejection', onRejection);
  return { classes, syncClasses, beforeTimers, timers, loads, stored, errors };
}

let checks = 0;
let failures = 0;
function check(cond, msg) {
  checks++;
  if (!cond) { failures++; console.log(`  FAIL ${msg}`); }
}

(async () => {
  const source = loadScript();

  console.log('▸ blocked storage still switches the page to the web fonts');
  for (const mode of ['getterThrows', 'getItemThrows', 'setItemThrows']) {
    const r = await run(source, mode);
    check(r.errors.length === 0, `${STORAGE[mode]}: ${r.errors.join('; ')}`);
    check(r.classes.has('fonts-loaded'), `${STORAGE[mode]}: fonts-loaded never set`);
    check(!r.classes.has('fonts-failed'), `${STORAGE[mode]}: fonts-failed set although the fonts loaded`);
    check(!r.classes.has('fonts-loading'), `${STORAGE[mode]}: fonts-loading left on the page`);
  }

  console.log('▸ controls: normal storage behaves as before');
  const fresh = await run(source, 'available');
  check(fresh.errors.length === 0, `${STORAGE.available}: ${fresh.errors.join('; ')}`);
  check(fresh.classes.has('fonts-loaded') && !fresh.classes.has('fonts-failed'), `${STORAGE.available}: classes ${[...fresh.classes]}`);
  check(fresh.loads.length === 5, `${STORAGE.available}: ${fresh.loads.length} font loads, want 5`);
  for (const [w, fam] of [['400', 'Open Sans'], ['600', 'Open Sans'], ['700', 'Open Sans'], ['400', 'Merriweather'], ['700', 'Merriweather']]) {
    check(fresh.loads.some((s) => s.startsWith(`${w} `) && s.includes(fam)), `${STORAGE.available}: no ${w} ${fam} load (got ${fresh.loads.join(' | ')})`);
  }
  check(fresh.stored['fonts-loaded'] === 'true', `${STORAGE.available}: fonts-loaded was not remembered`);

  const cached = await run(source, 'cached');
  check(cached.errors.length === 0, `${STORAGE.cached}: ${cached.errors.join('; ')}`);
  check(cached.loads.length === 0, `${STORAGE.cached}: ${cached.loads.length} font loads, want 0`);
  check(cached.syncClasses.has('fonts-loaded'), `${STORAGE.cached}: fonts-loaded not set synchronously (first paint would use system-ui)`);

  console.log('▸ a browser without the Font Loading API still gets the web fonts');
  const noApi = await run(source, 'available', { noFontsApi: true });
  check(noApi.errors.length === 0, `no document.fonts: ${noApi.errors.join('; ')}`);
  check(noApi.classes.has('fonts-loaded'), 'no document.fonts: fonts-loaded never set');

  console.log('▸ font loads that fail, hang or throw still end on the web fonts');
  const rejected = await run(source, 'available', { fontLoad: 'reject' });
  check(rejected.errors.length === 0, `a font load rejects: ${rejected.errors.join('; ')}`);
  check(rejected.beforeTimers.has('fonts-loaded') && !rejected.beforeTimers.has('fonts-loading'),
    'a font load rejects: fonts-loaded must be set once the loads settle, without waiting for the fallback timer');
  const hung = await run(source, 'available', { fontLoad: 'hang' });
  check(!hung.beforeTimers.has('fonts-loaded'), 'a font load hangs: fonts-loaded set before the fallback (test is not exercising the timer)');
  check(hung.timers.some((t) => !t.cleared && t.ms > 0 && t.ms <= 5000), 'a font load hangs: no fallback timer of at most 5 s');
  check(hung.classes.has('fonts-loaded') && !hung.classes.has('fonts-loading'), 'a font load hangs: fallback timer did not switch to the web fonts');
  const thrown = await run(source, 'available', { fontLoad: 'throw' });
  check(thrown.errors.length === 0, `document.fonts.load throws synchronously: ${thrown.errors.join('; ')}`);
  check(thrown.classes.has('fonts-loaded') && !thrown.classes.has('fonts-loading'), 'document.fonts.load throws synchronously: page left on system fonts');

  console.log(`test-font-loading: ${checks} checks, ${failures} failed`);
  process.exit(failures === 0 ? 0 : 1);
})();
