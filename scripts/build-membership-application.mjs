/**
 * build-membership-application: downloads/SAPA_membership_application.pdf,
 * from scripts/membership-application/application.html.
 *
 * Run by hand (`npm run build:membership-application`) when the form changes,
 * and commit the PDF: it is not part of `npm run build`, so a deploy never
 * depends on headless Chrome printing a PDF.
 *
 * 1. Headless Chrome prints the page as a tagged PDF. Only file:// requests
 *    are allowed (the fonts come from node_modules/@fontsource), so the build
 *    makes no network calls.
 * 2. Every [data-field] element becomes a form field at the same spot:
 *    data-type="checkbox" a check box, anything else a text field
 *    (data-multiline, data-max). The [data-group] elements sharing a name
 *    become one radio group, one option per element (data-value), so an
 *    either/or choice (Yes or No, which dues) cannot take two answers.
 *    data-label (data-group-label for a group) is the field's tooltip (TU),
 *    the name a screen reader announces. pdf-lib's widgets are not in
 *    Chrome's tag tree, so the tooltip is each field's only accessible name.
 * 3. The document info is set here, never left to Chrome (which can put the
 *    file:// path in it). Subject records sourceHash() (the template and this
 *    script), taken before printing, and tests/membership-application.test.mjs
 *    fails if either has changed since the PDF was built. The dates are the
 *    sources' last commit, so rebuilding unchanged sources changes nothing,
 *    and a rebuild after a change carries a new date.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
import { PDFDocument, PDFName, PDFHexString, StandardFonts } from 'pdf-lib';
import { sourceHash, SOURCES } from './membership-application/source-hash.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(ROOT, 'scripts/membership-application/application.html');
const OUT = path.join(ROOT, 'downloads/SAPA_membership_application.pdf');
const PX_TO_PT = 72 / 96;

async function printTemplate() {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => (/^(file|data):/.test(req.url()) ? req.continue() : req.abort()));
    await page.goto(pathToFileURL(TEMPLATE).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const missing = await page.evaluate(() => ['Merriweather', 'Open Sans']
      .filter(f => !document.fonts.check(`12px "${f}"`)));
    if (missing.length) {throw new Error(`fonts did not load: ${missing.join(', ')}`);}

    const fields = await page.evaluate(() => [...document.querySelectorAll('[data-field], [data-group]')].map((el) => {
      const sheet = el.closest('.page');
      const pages = [...document.querySelectorAll('.page')];
      const r = el.getBoundingClientRect();
      const p = sheet.getBoundingClientRect();
      return {
        name: el.dataset.field || el.dataset.group, label: el.dataset.label || el.dataset.groupLabel,
        type: el.dataset.group ? 'radio' : el.dataset.type || 'text', value: el.dataset.value,
        multiline: el.dataset.multiline === 'true', max: el.dataset.max ? Number(el.dataset.max) : undefined,
        page: pages.indexOf(sheet), x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height
      };
    }));
    const pdf = await page.pdf({ format: 'Letter', printBackground: true, tagged: true, preferCSSPageSize: true, outline: false });
    return { pdf, fields };
  } finally {
    await browser.close();
  }
}

// The sources' last commit date; now, if either has uncommitted changes.
function sourceDate() {
  const dirty = execFileSync('git', ['status', '--porcelain', '--', ...SOURCES], { cwd: ROOT, encoding: 'utf8' }).trim();
  const committed = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...SOURCES], { cwd: ROOT, encoding: 'utf8' }).trim();
  return dirty || !committed ? new Date() : new Date(committed);
}

async function addFields(pdfBytes, fields, hash) {
  const doc = await PDFDocument.load(pdfBytes);
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const names = new Set();
  const groups = new Map();

  for (const f of fields) {
    const page = pages[f.page];
    const { height } = page.getSize();
    // No background or border: the printed line or box underneath shows through.
    const look = { backgroundColor: undefined, borderColor: undefined, borderWidth: 0 };
    const box = { x: f.x * PX_TO_PT, y: height - (f.y + f.h) * PX_TO_PT, width: f.w * PX_TO_PT, height: f.h * PX_TO_PT };
    if (f.type === 'radio') {
      if (!f.value) {throw new Error(`${f.name}: an option has no data-value`);}
      let group = groups.get(f.name);
      if (!group) {
        if (!f.label) {throw new Error(`${f.name}: its first option has no data-group-label`);}
        if (names.has(f.name)) {throw new Error(`${f.name}: duplicate field name`);}
        names.add(f.name);
        group = { field: form.createRadioGroup(f.name), label: f.label, values: new Set() };
        group.field.acroField.dict.set(PDFName.of('TU'), PDFHexString.fromText(f.label));
        groups.set(f.name, group);
      } else if (f.label) {
        throw new Error(`${f.name}: data-group-label belongs on the first option only`);
      }
      if (group.values.has(f.value)) {throw new Error(`${f.name}: option "${f.value}" appears twice`);}
      group.values.add(f.value);
      // The circle is printed on the page; the widget sits inside it and draws
      // only the dot (a full-size widget's appearance would cover the ring).
      const inset = 2;
      group.field.addOptionToPage(f.value, page, {
        ...look, x: box.x + inset, y: box.y + inset, width: box.width - 2 * inset, height: box.height - 2 * inset
      });
      // Each option's own name, so a screen reader does not announce eight
      // identical "dues" options.
      const widgets = group.field.acroField.getWidgets();
      widgets[widgets.length - 1].dict.set(PDFName.of('TU'), PDFHexString.fromText(`${f.value}. ${group.label}`));
      continue;
    }
    if (!f.label) {throw new Error(`${f.name}: no data-label`);}
    if (names.has(f.name)) {throw new Error(`${f.name}: duplicate field name`);}
    names.add(f.name);
    let field;
    if (f.type === 'checkbox') {
      field = form.createCheckBox(f.name);
      field.addToPage(page, { ...look, ...box });
    } else {
      field = form.createTextField(f.name);
      if (f.multiline) {field.enableMultiline();}
      if (f.max) {field.setMaxLength(f.max);}
      // Leave the bottom rule visible: the widget stops just above it.
      field.addToPage(page, { ...look, font, ...box, y: box.y + 1.5, height: box.height - 1.5 });
      field.setFontSize(f.multiline ? 9 : 10);
    }
    field.acroField.dict.set(PDFName.of('TU'), PDFHexString.fromText(f.label));
  }
  form.updateFieldAppearances(font);

  const built = sourceDate();
  doc.setTitle('SAPA Membership Application', { showInWindowTitleBar: true });
  doc.setAuthor('San Antonio Philatelic Association');
  doc.setSubject(`source sha256 ${hash}`);
  doc.setKeywords(['SAPA', 'membership', 'application', 'San Antonio Philatelic Association']);
  doc.setCreator('San Antonio Philatelic Association');
  doc.setProducer('pdf-lib');
  doc.setLanguage('en-US');
  doc.setCreationDate(built);
  doc.setModificationDate(built);
  // Plain (not object-stream) dictionaries, so tests can read the file's structure.
  return doc.save({ useObjectStreams: false });
}

// Hashed before printing, so an edit saved mid-build cannot be recorded as printed.
const hash = sourceHash(ROOT);
const { pdf, fields } = await printTemplate();
const out = await addFields(pdf, fields, hash);
fs.writeFileSync(OUT, out);
console.log(`${path.relative(ROOT, OUT)}: ${fields.length} fields, ${out.length} bytes`);
