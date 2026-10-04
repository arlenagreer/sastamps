/**
 * The membership application and the club facts around it, as the Board of
 * Governors ruled on 2026-10-04: dues $25 ($12.50 juniors) prorated by
 * quarter, checks by US mail to Al Lozano (Vice President) or brought to a
 * meeting and never paid online, APS chapter 53-0388, the schedule described
 * "as shown in the schedule", the newsletter published "regularly", and no
 * one's contact details online but Al Lozano's email and mailing address.
 *
 * The PDF is built from scripts/membership-application/application.html by
 * scripts/build-membership-application.mjs; the build records the template's
 * hash in the PDF, so a template edited without a rebuild fails here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib');
const { sitePages, deployableFiles } = require('../scripts/lib/site.js');

const ROOT = new URL('../', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, ROOT), 'utf8');
const PDF = 'downloads/SAPA_membership_application.pdf';
const TEMPLATE = 'scripts/membership-application/application.html';
const CLUB_ADDRESS = '13530 FM 1560N';

// Contact details of anyone but Al Lozano that the old scanned form carried.
const RETIRED_PII = ['6918 Sunriver', 'Sunriver', '78244-1850', '495-1654'];

test('every page footer names APS chapter 53-0388, and no page says #388', () => {
  const root = new URL('.', ROOT).pathname;
  const pages = sitePages(root, deployableFiles(root));
  let footers = 0;
  for (const page of pages) {
    const html = read(page);
    assert.doesNotMatch(html, /#\s?388/, `${page} still says #388`);
    if (/<footer[\s>]/.test(html)) {
      footers++;
      assert.match(html, /Chapter 53-0388 of the American Philatelic Society/, `${page} footer`);
    }
  }
  assert.ok(footers >= 11, `checked ${footers} footers`);
});

test('meetings.json: the club email is not labelled as the Secretary', () => {
  const { meetings } = JSON.parse(read('data/meetings/meetings.json'));
  const named = meetings.filter(m => m.contact?.email === 'loz33@hotmail.com').map(m => m.contact.name);
  assert.ok(named.length > 70, `${named.length} meetings carry the club email`);
  assert.equal(named.filter(n => /secretary/i.test(n)).length, 0, 'no "SAPA Secretary" on loz33');
  assert.ok(named.filter(n => n === 'Al Lozano, Vice President').length > 70);
  const notes = meetings.flatMap(m => m.specialNotes || []);
  assert.equal(notes.filter(n => /contact secretary/i.test(n)).length, 0, 'no "Contact secretary" note');
});

test('the newsletter is described as published regularly, not quarterly', () => {
  for (const page of ['index.html', 'about.html', 'newsletter.html', 'membership.html']) {
    assert.doesNotMatch(read(page), /quarterly (publication|newsletter|PHILATEX)|published quarterly|Frequency:<\/strong> Quarterly/i, page);
  }
  assert.match(read('newsletter.html'), /Frequency:<\/strong> Published regularly/);
});

test('contact.html describes the schedule as shown in the schedule, not by fixed Fridays', () => {
  const html = read('contact.html');
  assert.doesNotMatch(html, /First Friday:|Second Friday:|Other Fridays:/);
  assert.match(html, /as shown in the schedule/);
});

test('membership.html: dues, how to pay by check, and the application link', () => {
  const html = read('membership.html');
  assert.match(html, /href="downloads\/SAPA_membership_application\.pdf"/);
  assert.match(html, /\$25/);
  assert.match(html, /\$12\.50/);
  assert.match(html, /prorated by quarter/i);
  assert.match(html, /Al Lozano/);
  assert.ok(html.includes(CLUB_ADDRESS), 'mailing address');
  assert.match(html, /no online payment/i);
  assert.doesNotMatch(html, /quarterly auctions/i);
});

test('the application template carries the ruled facts and none of the retired ones', () => {
  const html = read(TEMPLATE);
  for (const s of ['53-0388', '$25.00', '$12.50', 'Al Lozano', 'Vice President', CLUB_ADDRESS, 'Helotes, TX 78023',
    'regularly', 'as shown in the schedule', 'S.A.P.A.', 'loz33@hotmail.com', 'Doors open at 6:30 PM']) {
    assert.ok(html.includes(s), `template has ${s}`);
  }
  for (const s of [...RETIRED_PII, 'Dora', 'Boursette', 'bimonthly', '#388', '#53', 'Fred (our Treasurer)', '2007']) {
    assert.ok(!html.includes(s), `template must not have ${s}`);
  }
});

test('the PDF is fillable, tagged, built from the current template, with no scripts', async () => {
  const bytes = fs.readFileSync(new URL(PDF, ROOT));
  assert.ok(bytes.length < 1024 * 1024, `${bytes.length} bytes`);
  const raw = bytes.toString('latin1');
  assert.doesNotMatch(raw, /\/(JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile|XFA)\b/, 'no PDF scripts, actions or attachments');
  assert.doesNotMatch(raw, /\/Users\/|file:\/\//, 'no local paths');

  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 2);
  const markInfo = doc.catalog.lookup(PDFName.of('MarkInfo'), PDFDict);
  assert.equal(String(markInfo.get(PDFName.of('Marked'))), 'true', 'tagged PDF');
  assert.ok(doc.catalog.get(PDFName.of('StructTreeRoot')), 'has a structure tree');

  const hash = crypto.createHash('sha256').update(read(TEMPLATE)).digest('hex');
  assert.equal(doc.getSubject(), `template sha256 ${hash}`, 'PDF rebuilt from the current template');

  assert.equal(doc.getTitle(), 'SAPA Membership Application');
  assert.equal(doc.getAuthor(), 'San Antonio Philatelic Association');

  const fields = doc.getForm().getFields();
  const names = fields.map(f => f.getName());
  for (const n of ['last_name', 'first_name', 'street', 'city', 'state', 'zip', 'phone', 'email',
    'email_publish_yes', 'email_publish_no', 'collecting_interests', 'signature', 'date', 'junior_sponsor_name']) {
    assert.ok(names.includes(n), `field ${n}`);
  }
  for (const f of fields) {
    const tu = f.acroField.dict.get(PDFName.of('TU'));
    assert.ok(tu && tu.decodeText().trim().length > 2, `${f.getName()} has a screen-reader label`);
  }
});

test('the application source never deploys', () => {
  const { SITE_DIRS } = require('../scripts/lib/site.js');
  assert.ok(!SITE_DIRS.includes('scripts'));
});
