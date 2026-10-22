#!/usr/bin/env node
/**
 * live-smoke: check what a visitor actually gets from the LIVE site.
 *
 * Why this exists: the contact form silently delivered nothing for about 15
 * months and the phone menu was hidden for about 9, and nobody noticed,
 * because every check in this repo tests the build, never the deployed site's
 * outcomes. This runs the key UAT journeys (docs/uat/inventory.md, J1-J8)
 * against the real site, in headless Chrome at 375x812 (touch) and 1440x900,
 * and checks outcomes: the menu opens and navigates, the next meeting's
 * calendar file downloads with the right date, search results land on their
 * item, the newest newsletter PDF downloads, and so on.
 *
 * It sends NO contact message unless --send-contact is given (the manual
 * workflow_dispatch input in .github/workflows/live-smoke.yml). Without it,
 * the form is checked in place and the relay is probed with a HEAD request.
 *
 * Usage:
 *   node scripts/live-smoke.js                         # https://www.sastamps.org
 *   node scripts/live-smoke.js --base _site            # a local build, served by scripts/lib/serve.js
 *   node scripts/live-smoke.js --base http://host:port/
 *   node scripts/live-smoke.js --json reports/live-smoke.json
 *   node scripts/live-smoke.js --send-contact          # submits ONE "[SAPA live-smoke]" message
 *
 * Exit: 0 every check passed (warnings never fail); 1 at least one FAIL;
 * 2 the harness itself could not run (puppeteer missing, Chrome would not
 * launch, the local server would not start).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { serve, chromeArgs } = require('./lib/serve');

const DEFAULT_BASE = 'https://www.sastamps.org/';
const CLUB_TIME_ZONE = 'America/Chicago';
const FRESHNESS_DAYS = 21;
const RELAY_ORIGIN = 'https://formsubmit.co';
const SEARCH_QUERIES = ['auction', '2009'];
const NAV_TIMEOUT = 30000;
const VIEWPORTS = {
  phone: { width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 }
};

// ── arguments ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { base: DEFAULT_BASE, json: 'reports/live-smoke.json', sendContact: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined) {
        throw new Error(`${a} needs a value`);
      }
      return v;
    };
    if (a === '--base') {
      opts.base = value();
    } else if (a.startsWith('--base=')) {
      opts.base = a.slice(7);
    } else if (a === '--json') {
      opts.json = value();
    } else if (a.startsWith('--json=')) {
      opts.json = a.slice(7);
    } else if (a === '--send-contact') {
      opts.sendContact = true;
    } else if (a === '-h' || a === '--help') {
      opts.help = true;
    } else {
      throw new Error(`unknown argument: ${a}`);
    }
  }
  return opts;
}

// ── results ─────────────────────────────────────────────────────────────────
const results = [];
function record(status, id, detail) {
  results.push({ status, id, detail });
  console.log(`${status.padEnd(4)}  ${id}${detail ? `: ${detail}` : ''}`);
}
const pass = (id, detail) => record('PASS', id, detail);
const fail = (id, detail) => record('FAIL', id, detail);
const warn = (id, detail) => record('WARN', id, detail);
const check = (cond, id, okDetail, badDetail) => (cond ? pass(id, okDetail) : fail(id, badDetail ?? okDetail));

// Run one journey; an exception inside it is that journey's FAIL, never a crash.
async function journey(id, fn) {
  try {
    await fn();
  } catch (err) {
    fail(id, `stopped: ${firstLine(err)}`);
  }
}
const firstLine = (err) => String((err && err.message) || err).split('\n')[0];

// ── helpers ─────────────────────────────────────────────────────────────────
const RUN_TAG = `smoke-${Date.now().toString(36)}`;
let BASE; // origin + '/', set in main()

// The URL with a cache-buster, so neither the Pages CDN nor any cache in
// between can hand back a copy older than the deploy under test.
function bust(url) {
  const u = new URL(url, BASE);
  if (u.origin === new URL(BASE).origin) {
    u.searchParams.set('smoke', RUN_TAG);
  }
  return u.href;
}

// YYYY-MM-DD in the club's time zone (the site's own rule: js/utils/meeting-calendar.js).
function clubDate(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: CLUB_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

async function fetchUrl(url, { method = 'GET', redirect = 'follow', timeout = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { method, redirect, signal: controller.signal, headers: { 'User-Agent': 'sastamps-live-smoke' } });
    const body = method === 'HEAD' ? '' : await res.text();
    return { status: res.status, type: res.headers.get('content-type') || '', body };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJSON(rel) {
  const res = await fetchUrl(bust(rel));
  if (res.status !== 200) {
    throw new Error(`${rel} answered HTTP ${res.status}`);
  }
  return JSON.parse(res.body);
}

// A new page with its errors and failing same-origin requests recorded.
async function openPage(browser, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.setDefaultTimeout(NAV_TIMEOUT);
  const log = { errors: [], badResponses: [] };
  page.on('pageerror', (err) => log.errors.push(firstLine(err)));
  page.on('response', (res) => {
    let u;
    try {
      u = new URL(res.url());
    } catch {
      return;
    }
    if (u.origin === new URL(BASE).origin && res.status() >= 400) {
      log.badResponses.push(`${u.pathname} ${res.status()}`);
    }
  });
  return { page, log };
}

async function goto(page, url) {
  const res = await page.goto(bust(url), { waitUntil: 'load', timeout: NAV_TIMEOUT });
  // Page bundles render after load (data fetches, dynamic imports): give
  // late errors and late failing requests a moment to show up.
  await new Promise((r) => setTimeout(r, 1200));
  return res;
}

// In-page: is this element rendered, not hidden, and on screen horizontally?
function isShown(el) {
  if (!el) {
    return false;
  }
  const visible = typeof el.checkVisibility === 'function'
    ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    : el.offsetParent !== null;
  const r = el.getBoundingClientRect();
  return visible && r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth;
}

// ── journeys ────────────────────────────────────────────────────────────────

// Every sitemap page, at both sizes: HTTP 200, no page errors, no failing
// same-origin request, no horizontal scroll, and the header nav usable.
async function checkPages(browser) {
  let pages;
  try {
    const sitemap = await fetchUrl(bust('sitemap.xml'));
    if (sitemap.status !== 200) {
      throw new Error(`HTTP ${sitemap.status}`);
    }
    // The sitemap names the canonical host; map each path onto the base under test.
    pages = [...sitemap.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/^\//, ''));
    check(pages.length > 0, 'sitemap', `${pages.length} pages listed`, 'sitemap.xml lists no pages');
  } catch (err) {
    fail('sitemap', `sitemap.xml could not be read (${firstLine(err)})`);
    return;
  }

  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    const { page, log } = await openPage(browser, viewport);
    const problems = { load: [], errors: [], hscroll: [], nav: [] };
    for (const rel of pages) {
      const label = rel || 'index';
      log.errors.length = 0;
      log.badResponses.length = 0;
      try {
        const res = await goto(page, rel);
        if (!res || res.status() !== 200) {
          problems.load.push(`${label} HTTP ${res ? res.status() : 'none'}`);
          continue;
        }
      } catch (err) {
        problems.load.push(`${label} ${firstLine(err)}`);
        continue;
      }
      if (log.errors.length) {
        problems.errors.push(`${label}: ${log.errors.slice(0, 2).join(' | ')}`);
      }
      if (log.badResponses.length) {
        problems.errors.push(`${label}: ${[...new Set(log.badResponses)].slice(0, 3).join(', ')}`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) {
        problems.hscroll.push(`${label} (+${overflow}px)`);
      }
      const nav = await page.evaluate(`(() => {
        const isShown = ${isShown.toString()};
        const links = [...document.querySelectorAll('header nav .nav-menu a')];
        return {
          links: links.length,
          shownLinks: links.filter(isShown).length,
          toggle: isShown(document.querySelector('header .menu-toggle'))
        };
      })()`);
      if (nav.links === 0) {
        problems.nav.push(`${label}: no nav links`);
      } else if (name === 'phone' && !nav.toggle) {
        problems.nav.push(`${label}: menu button not visible`);
      } else if (name === 'desktop' && nav.shownLinks !== nav.links) {
        problems.nav.push(`${label}: ${nav.shownLinks}/${nav.links} nav links visible`);
      }
    }
    await page.close();
    const n = pages.length;
    check(!problems.load.length, `pages-load-${name}`, `${n}/${n} pages HTTP 200`, problems.load.join('; '));
    check(!problems.errors.length, `pages-errors-${name}`, `0 page errors, 0 failing same-origin requests on ${n} pages`, problems.errors.join('; '));
    check(!problems.hscroll.length, `no-hscroll-${name}`, `no horizontal scroll on ${n} pages`, `horizontal scroll on ${problems.hscroll.join(', ')}`);
    check(!problems.nav.length, `nav-${name}`, name === 'phone' ? `menu button visible on ${n} pages` : `all nav links visible on ${n} pages`, problems.nav.join('; '));
  }
}

// J1: on a phone the menu button opens the menu and a link in it navigates.
async function checkPhoneMenu(browser) {
  const { page } = await openPage(browser, VIEWPORTS.phone);
  try {
    await goto(page, '');
    const toggleShown = await page.evaluate(`(${isShown.toString()})(document.querySelector('header .menu-toggle'))`);
    if (!toggleShown) {
      fail('phone-menu', 'the menu button is not visible at 375 px: phone visitors have no navigation');
      return;
    }
    await page.tap('header .menu-toggle');
    const target = await page.waitForFunction(`(() => {
      const isShown = ${isShown.toString()};
      const link = [...document.querySelectorAll('header nav .nav-menu a')]
        .find((a) => !a.hasAttribute('aria-current') && isShown(a));
      return link ? link.getAttribute('href') : null;
    })()`, { timeout: 5000 }).then((h) => h.jsonValue()).catch(() => null);
    if (!target) {
      fail('phone-menu', 'tapping the menu button did not show the menu links');
      return;
    }
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: NAV_TIMEOUT }),
      page.evaluate((href) => [...document.querySelectorAll('header nav .nav-menu a')]
        .find((a) => a.getAttribute('href') === href).click(), target)
    ]);
    const landed = new URL(page.url()).pathname;
    check(landed.endsWith(`/${target.split('#')[0]}`), 'phone-menu', `menu opened; "${target}" navigated to ${landed}`, `menu link "${target}" landed on ${landed}`);
  } finally {
    await page.close();
  }
}

// J2: the contact form posts to the relay, and the relay answers. Sends
// nothing unless --send-contact.
async function checkContact(browser, { sendContact }) {
  const { page } = await openPage(browser, VIEWPORTS.desktop);
  try {
    await goto(page, 'contact.html');
    const form = await page.evaluate(() => {
      const f = document.querySelector('#contact-form');
      if (!f) {
        return null;
      }
      return {
        action: f.getAttribute('action') || '',
        method: (f.getAttribute('method') || 'GET').toUpperCase(),
        fields: ['name', 'email', 'subject', 'message'].filter((n) => f.querySelector(`[name="${n}"]`)),
        submit: Boolean(f.querySelector('button[type="submit"], input[type="submit"]'))
      };
    });
    if (!form) {
      fail('contact-form', 'contact.html has no #contact-form');
      return;
    }
    let host = '';
    try {
      ({ host } = new URL(form.action));
    } catch { /* reported below */ }
    check(host === 'formsubmit.co' && form.method === 'POST' && form.fields.length === 4 && form.submit,
      'contact-form', `POST to ${form.action}`,
      `action="${form.action}" method=${form.method}, fields [${form.fields.join(', ')}], submit button ${form.submit ? 'present' : 'missing'}`);

    // The relay without sending: a HEAD of its home page.
    try {
      const relay = await fetchUrl(`${RELAY_ORIGIN}/`, { method: 'HEAD', redirect: 'manual' });
      check(relay.status >= 200 && relay.status < 400, 'contact-relay', `${RELAY_ORIGIN} answers HTTP ${relay.status}`);
    } catch (err) {
      fail('contact-relay', `${RELAY_ORIGIN} unreachable (${firstLine(err)})`);
    }

    if (!sendContact) {
      return;
    }
    // Opt-in only: one real, clearly labelled message through the page's JS path.
    const runUrl = process.env.GITHUB_RUN_URL || 'a manual run';
    await page.type('#name', '[SAPA live-smoke] Automated check');
    await page.type('#email', process.env.SMOKE_CONTACT_EMAIL || 'live-smoke@example.com');
    await page.select('#subject', 'Website Feedback');
    await page.type('#message', `[SAPA live-smoke] End-to-end test of the website contact form, sent by ${runUrl} at ${new Date().toISOString()}. No reply needed.`);
    await page.click('#submit-btn');
    const outcome = await page.waitForSelector('.form-message.success, .form-message.error', { timeout: 45000 })
      .then((el) => el.evaluate((e) => ({ ok: e.classList.contains('success'), text: e.textContent.trim() })))
      .catch(() => ({ ok: false, text: 'no success or error message within 45 s' }));
    check(outcome.ok, 'contact-send', `sent; page says "${outcome.text}"`, `not confirmed: "${outcome.text}"`);
  } finally {
    await page.close();
  }
}

// J1/J3: the next meeting is shown with a working calendar file, and its day
// on the calendar opens its details. Data freshness is a warning only.
async function checkMeetings(browser) {
  let data;
  try {
    data = await fetchJSON('data/meetings/meetings.json');
  } catch (err) {
    fail('meetings-data', firstLine(err));
    return;
  }
  const meetings = (data.meetings || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const today = clubDate();
  const next = meetings.find((m) => !m.cancelled && m.date >= today);
  const last = meetings[meetings.length - 1];
  if (last) {
    const left = daysBetween(today, last.date);
    if (left < 0) {
      warn('meetings-freshness', `every meeting in meetings.json is past (last ${last.date}): next quarter's meetings are not posted yet`);
    } else if (left <= FRESHNESS_DAYS) {
      warn('meetings-freshness', `last posted meeting is ${last.date}, ${left} days away: next quarter's meetings are not posted yet`);
    } else {
      pass('meetings-freshness', `meetings posted through ${last.date}`);
    }
  }
  if (!next) {
    warn('meetings-next', 'no upcoming meeting in meetings.json, so there is nothing to check');
    return;
  }

  const { page } = await openPage(browser, VIEWPORTS.phone);
  try {
    await goto(page, 'meetings.html');
    await page.waitForSelector('#meeting-schedule-container .meeting-item', { timeout: 15000 })
      .catch(() => { /* reported below */ });
    const card = await page.evaluate((id) => {
      const el = document.getElementById(`meeting-${id}`);
      const nextEl = document.querySelector('#meeting-schedule-container .meeting-next');
      const pick = el || nextEl;
      if (!pick) {
        return null;
      }
      const link = pick.querySelector('a.btn-calendar');
      return {
        found: Boolean(el),
        isNext: pick.classList.contains('meeting-next'),
        date: pick.dataset.date,
        title: (pick.querySelector('h3') || {}).textContent || '',
        ics: link ? link.href : null
      };
    }, next.id);

    let icsDate = next.date;
    if (!card) {
      fail('meetings-next', `the meeting list shows neither ${next.date} (${next.title}) nor any "next" meeting`);
    } else if (!card.found) {
      // Near a quarter's end the list rolls over to the next quarter.
      warn('meetings-next', `${next.date} (${next.title}) is not in the displayed quarter; checking the list's next meeting, ${card.date}`);
      icsDate = card.date;
    } else {
      check(card.isNext, 'meetings-next', `${next.date} "${card.title.trim()}" shown and marked next`, `${next.date} is listed but not marked as the next meeting`);
    }

    if (card) {
      if (!card.ics) {
        fail('meetings-ics', `no "Add to Calendar" link on the ${icsDate} meeting`);
      } else {
        const res = await fetchUrl(bust(card.ics));
        const dt = icsStartDate(res.body);
        check(res.status === 200 && /text\/calendar/i.test(res.type) && dt === icsDate,
          'meetings-ics', `${new URL(card.ics).pathname} 200 ${res.type}, DTSTART ${dt}`,
          `${new URL(card.ics).pathname}: HTTP ${res.status}, type "${res.type}", DTSTART ${dt || 'missing'} (expected ${icsDate})`);
      }
    }

    // The calendar: move to the meeting's month, click its day, see its details.
    const target = meetings.find((m) => m.date === icsDate) || next;
    await page.waitForSelector('#calendar-container [data-vc-date]', { timeout: 15000 });
    let cell = null;
    for (let i = 0; i < 13 && !cell; i++) {
      cell = await page.$(`#calendar-container [data-vc-date="${icsDate}"]:not([data-vc-date-month="prev"]):not([data-vc-date-month="next"]) [data-vc-date-btn]`);
      if (!cell) {
        const arrow = await page.$('#calendar-container [data-vc-arrow="next"]');
        if (!arrow) {
          break;
        }
        await arrow.click();
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    if (!cell) {
      fail('meetings-calendar', `the calendar never showed ${icsDate}`);
      return;
    }
    await cell.click();
    const modal = await page.waitForSelector('#event-modal.modal-open', { visible: true, timeout: 5000 })
      .then(() => page.$eval('#event-modal', (m) => m.textContent.replace(/\s+/g, ' ').trim()))
      .catch(() => null);
    check(Boolean(modal) && modal.includes(target.title), 'meetings-calendar',
      `clicking ${icsDate} opened "${target.title}"`,
      modal ? `clicking ${icsDate} opened a dialog without "${target.title}"` : `clicking ${icsDate} opened no details`);
  } finally {
    await page.close();
  }
}

// The meeting's start date in Central time, from a single-event .ics.
function icsStartDate(ics) {
  const m = /^DTSTART([^:\r\n]*):(\d{8})(?:T(\d{6})(Z)?)?/m.exec(ics || '');
  if (!m) {
    return null;
  }
  const [, , ymd, hms, z] = m;
  const date = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
  if (!z) {
    return date; // floating, TZID= or VALUE=DATE: the date as written
  }
  return clubDate(new Date(`${date}T${hms.slice(0, 2)}:${hms.slice(2, 4)}:${hms.slice(4, 6)}Z`));
}

// J5: searches return results and the first result lands on its item.
async function checkSearch(browser) {
  const { page } = await openPage(browser, VIEWPORTS.desktop);
  try {
    for (const q of SEARCH_QUERIES) {
      const id = `search-${q}`;
      await goto(page, `search.html?q=${encodeURIComponent(q)}`);
      const status = await page.waitForFunction(() => {
        const s = document.getElementById('searchStatus');
        const t = s ? s.textContent.trim() : '';
        return /result|error|could not/i.test(t) || (s && s.classList.contains('error')) ? t : null;
      }, { timeout: 20000 }).then((h) => h.jsonValue()).catch(() => 'no answer within 20 s');
      const href = await page.$eval('#searchResults a[href]', (a) => a.href).catch(() => null);
      if (!/^Found \d+ results? for/.test(status) || !href) {
        fail(id, `"${status}"${href ? '' : ', no result link'}`);
        continue;
      }
      const url = new URL(href);
      const sameSite = url.origin === new URL(BASE).origin;
      const res = await fetchUrl(sameSite ? bust(href) : href, { method: sameSite ? 'GET' : 'HEAD' });
      if (res.status !== 200) {
        fail(id, `${status}; first result ${url.pathname}${url.hash} answered HTTP ${res.status}`);
        continue;
      }
      const anchor = url.hash.slice(1);
      if (!sameSite || !anchor || /\.pdf$/i.test(url.pathname) || anchor.includes('=')) {
        pass(id, `${status}; first result ${url.pathname}${url.hash} HTTP 200`);
        continue;
      }
      // An in-site anchor: the element it names must exist once the page has rendered.
      const { page: target } = await openPage(browser, VIEWPORTS.desktop);
      try {
        await goto(target, `${url.pathname.replace(/^\//, '')}${url.hash}`);
        const found = await target.waitForFunction((a) => Boolean(document.getElementById(decodeURIComponent(a))), { timeout: 10000 }, anchor)
          .then(() => true).catch(() => false);
        check(found, id, `${status}; first result lands on ${url.pathname}#${anchor}`, `${status}; first result ${url.pathname}#${anchor}: no element with that id after load`);
      } finally {
        await target.close();
      }
    }
  } finally {
    await page.close();
  }
}

// J4: the newest newsletter PDF downloads, and the archive lists it.
async function checkNewsletter(browser) {
  let issues;
  try {
    issues = (await fetchJSON('data/newsletters/newsletters.json')).newsletters || [];
  } catch (err) {
    fail('newsletter-data', firstLine(err));
    return;
  }
  const newest = issues.slice().sort((a, b) => String(b.publishDate).localeCompare(String(a.publishDate)))[0];
  if (!newest || !newest.filePath) {
    fail('newsletter-pdf', 'newsletters.json names no current issue');
    return;
  }
  const res = await fetchUrl(bust(newest.filePath), { method: 'HEAD' });
  check(res.status === 200 && /application\/pdf/i.test(res.type), 'newsletter-pdf',
    `${newest.id} ${newest.filePath} 200 ${res.type}`, `${newest.filePath}: HTTP ${res.status}, type "${res.type}"`);

  const { page } = await openPage(browser, VIEWPORTS.desktop);
  try {
    await goto(page, 'archive.html');
    const file = path.posix.basename(newest.filePath);
    const listed = await page.waitForFunction((f) => [...document.querySelectorAll('main a[href]')]
      .some((a) => decodeURIComponent(a.getAttribute('href')).endsWith(f)), { timeout: 10000 }, file)
      .then(() => true).catch(() => false);
    check(listed, 'newsletter-archive', `archive.html links ${file}`, `archive.html does not link ${file}`);
  } finally {
    await page.close();
  }
}

// J7: a glossary deep link lands on its term, and a resource guide renders.
async function checkGlossaryAndResources(browser) {
  let termId;
  try {
    const glossary = await fetchJSON('data/glossary/glossary.json');
    const terms = glossary.terms || glossary;
    termId = (terms.find((t) => t.id === 'perforation') || terms[0] || {}).id;
  } catch (err) {
    fail('glossary-deeplink', firstLine(err));
  }
  if (termId) {
    const { page } = await openPage(browser, VIEWPORTS.desktop);
    try {
      await goto(page, `glossary.html#term-${termId}`);
      const state = await page.waitForFunction(`(() => {
        const isShown = ${isShown.toString()};
        const el = document.getElementById(${JSON.stringify(`term-${termId}`)});
        if (!el) { return null; }
        const r = el.getBoundingClientRect();
        const content = el.querySelector('.term-content');
        const inView = r.top < window.innerHeight && r.bottom > 0;
        const open = Boolean(content) && !content.hidden && isShown(content);
        return inView && open ? 'ok' : null;
      })()`, { timeout: 10000 }).then(() => true).catch(() => false);
      check(state, 'glossary-deeplink', `#term-${termId} is on screen and expanded`, `#term-${termId} is not on screen with its definition open`);
    } finally {
      await page.close();
    }
  }

  const { page } = await openPage(browser, VIEWPORTS.desktop);
  try {
    await goto(page, 'resources.html');
    const btn = await page.waitForSelector('#resources-container .btn-read-resource', { visible: true, timeout: 15000 }).catch(() => null);
    if (!btn) {
      fail('resource-guide', 'no "Read Guide" button on resources.html');
      return;
    }
    await btn.click();
    const guide = await page.waitForSelector('dialog[open] .resource-modal-content', { visible: true, timeout: 10000 })
      .then((el) => el.evaluate((e) => ({ text: e.innerText, blocks: e.querySelectorAll('h2, h3, h4, p, li').length })))
      .catch(() => null);
    if (!guide) {
      fail('resource-guide', '"Read Guide" opened no guide');
      return;
    }
    // Raw Markdown left in the text: heading hashes, bold stars, link syntax, list dashes.
    const raw = guide.text.split('\n').filter((l) => /^\s*#{1,6}\s|\*\*\S|\]\(|^\s*[-*]\s\S.*\*\*/.test(l));
    check(guide.blocks >= 3 && raw.length === 0 && guide.text.trim().length > 200, 'resource-guide',
      `guide rendered (${guide.blocks} blocks, ${guide.text.length} chars, no raw Markdown)`,
      raw.length ? `raw Markdown in the guide: "${raw[0].trim().slice(0, 80)}"` : `guide nearly empty (${guide.blocks} blocks, ${guide.text.trim().length} chars)`);
  } finally {
    await page.close();
  }
}

// J8: /sw.js is the kill switch, not a caching worker.
async function checkServiceWorker() {
  const res = await fetchUrl(bust('sw.js'));
  check(res.status === 200 && /unregister\s*\(/.test(res.body) && !/addEventListener\(\s*['"]fetch['"]/.test(res.body),
    'service-worker', '/sw.js is the kill switch (unregisters, no fetch handler)',
    `/sw.js: HTTP ${res.status}, ${/unregister\s*\(/.test(res.body) ? 'has' : 'NO'} unregister()`);
}

// The TSDA shows table on meetings.html is hand-written: warn when it runs out.
async function checkTsdaFreshness(browser) {
  const { page } = await openPage(browser, VIEWPORTS.desktop);
  try {
    await goto(page, 'meetings.html');
    const table = await page.evaluate(() => {
      const t = [...document.querySelectorAll('table')].find((x) => /TSDA/i.test(x.textContent));
      if (!t) {
        return null;
      }
      const rows = [...t.querySelectorAll('tbody tr')].map((r) => (r.cells[0] ? r.cells[0].textContent.trim() : ''));
      return { caption: (t.caption ? t.caption.textContent : ''), rows };
    });
    if (!table || !table.rows.length) {
      warn('tsda-freshness', 'no TSDA shows table found on meetings.html');
      return;
    }
    const today = clubDate();
    const year = Number((/(\d{4})/.exec(table.caption) || [])[1]) || Number(today.slice(0, 4));
    let lastDate = null;
    let prevMonth = -1;
    let y = year;
    for (const cell of table.rows) {
      const m = /([A-Za-z]+)\s+(\d{1,2})(?:\D+?(\d{4}))?/.exec(cell.replace(/\s+/g, ' '));
      const month = m ? new Date(`${m[1]} 1, 2000`).getMonth() : NaN;
      if (!m || Number.isNaN(month)) {
        continue;
      }
      if (m[3]) {
        y = Number(m[3]);
      } else if (month < prevMonth) {
        y += 1; // the list runs into the new year
      }
      prevMonth = month;
      lastDate = `${y}-${String(month + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    }
    if (!lastDate) {
      warn('tsda-freshness', `could not read the TSDA dates ("${table.rows.at(-1)}")`);
      return;
    }
    const left = daysBetween(today, lastDate);
    if (left <= FRESHNESS_DAYS) {
      warn('tsda-freshness', `the last TSDA show listed is ${lastDate} (${left} days away): the table needs its next shows`);
    } else {
      pass('tsda-freshness', `TSDA shows listed through ${lastDate}`);
    }
  } finally {
    await page.close();
  }
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`live-smoke: ${err.message}`);
    return 2;
  }
  if (opts.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
    return 0;
  }

  let server = null;
  if (/^https?:\/\//i.test(opts.base)) {
    BASE = new URL(opts.base).href.replace(/\/?$/, '/');
  } else {
    const dir = path.resolve(opts.base);
    if (!fs.existsSync(path.join(dir, 'index.html'))) {
      console.error(`live-smoke: ${dir} has no index.html (build it first: npm run build)`);
      return 2;
    }
    try {
      ({ server, base: BASE } = await serve(dir));
    } catch (err) {
      console.error(`live-smoke: could not start the local server (${err.message})`);
      return 2;
    }
  }

  let browser;
  try {
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({ headless: true, args: chromeArgs() });
  } catch (err) {
    console.error(`live-smoke: could not start headless Chrome (${firstLine(err)})`);
    if (server) {
      server.close();
    }
    return 2;
  }

  const started = Date.now();
  console.log(`live-smoke: ${BASE} (cache-buster ?smoke=${RUN_TAG}, club day ${clubDate()})${opts.sendContact ? ' -- WILL SEND one contact message' : ''}\n`);
  try {
    await journey('pages', () => checkPages(browser));
    await journey('phone-menu', () => checkPhoneMenu(browser));
    await journey('contact', () => checkContact(browser, opts));
    await journey('meetings', () => checkMeetings(browser));
    await journey('tsda-freshness', () => checkTsdaFreshness(browser));
    await journey('search', () => checkSearch(browser));
    await journey('newsletter', () => checkNewsletter(browser));
    await journey('glossary-resources', () => checkGlossaryAndResources(browser));
    await journey('service-worker', () => checkServiceWorker());
  } finally {
    await browser.close().catch(() => {});
    if (server) {
      server.close();
    }
  }

  const count = (s) => results.filter((r) => r.status === s).length;
  const summary = { pass: count('PASS'), fail: count('FAIL'), warn: count('WARN') };
  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`\nlive-smoke: ${summary.pass} passed, ${summary.fail} failed, ${summary.warn} warnings in ${seconds} s`);

  if (opts.json) {
    const report = {
      base: BASE, startedAt: new Date(started).toISOString(), seconds, clubDay: clubDate(),
      sentContact: opts.sendContact, summary, results
    };
    fs.mkdirSync(path.dirname(path.resolve(opts.json)), { recursive: true });
    fs.writeFileSync(opts.json, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`live-smoke: report written to ${opts.json}`);
  }
  return summary.fail ? 1 : 0;
}

main().then((code) => process.exit(code), (err) => {
  console.error(`live-smoke: harness error: ${err && err.stack ? err.stack : err}`);
  process.exit(2);
});
