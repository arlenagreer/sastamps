/**
 * Small iCalendar (RFC 5545) helpers for the build: reminders (VALARM) on the
 * deployed meeting .ics files, and the subscribe feed that collects them.
 *
 * The .ics sources (data/calendar/*.ics, public/*.ics) are written by the
 * /philatex-update skill and checked by its check-ics.mjs, so the build never
 * edits them: it changes only the copies in _site/. Every edit here works on
 * whole content lines and keeps the file's own line ending (CRLF or LF), so
 * every line the source had reaches _site/ byte for byte.
 */

const MAX_OCTETS = 75;

/** The line ending a file uses: CRLF if it has any, else LF. */
function detectEol(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * Fold one content line at 75 octets (RFC 5545 3.1): continuation lines
 * start with a single space. Never splits a UTF-8 sequence.
 */
function foldLine(line, eol = '\r\n') {
  if (Buffer.byteLength(line, 'utf8') <= MAX_OCTETS) {
    return line;
  }
  const parts = [];
  let current = '';
  let octets = 0;
  let limit = MAX_OCTETS;
  for (const ch of line) {
    const size = Buffer.byteLength(ch, 'utf8');
    if (octets + size > limit) {
      parts.push(current);
      current = '';
      octets = 0;
      limit = MAX_OCTETS - 1; // the leading space counts
    }
    current += ch;
    octets += size;
  }
  parts.push(current);
  return parts.join(`${eol} `);
}

/**
 * Parse an iCalendar text strictly enough to catch a broken file: every
 * content line is NAME[;params]:value, BEGIN/END nest and match, and the
 * text is exactly one VCALENDAR. Throws an Error naming the problem.
 * @returns {{ name: string, props: Array<{name: string, params: string, value: string}>, children: Array }} the VCALENDAR
 */
function parseICS(text) {
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('empty calendar');
  }
  const physical = text.split(/\r?\n/);
  if (physical[physical.length - 1] === '') {
    physical.pop();
  }
  // Unfold: a line starting with a space or tab continues the previous one.
  const lines = [];
  physical.forEach((raw, i) => {
    if (/^[ \t]/.test(raw)) {
      if (lines.length === 0) {
        throw new Error(`line ${i + 1}: continuation line with nothing to continue`);
      }
      lines[lines.length - 1].text += raw.slice(1);
    } else {
      lines.push({ text: raw, n: i + 1 });
    }
  });

  const root = { name: '', props: [], children: [] };
  const stack = [root];
  for (const { text: line, n } of lines) {
    if (line === '') {
      continue; // the generator leaves blank lines between events; tolerated
    }
    const m = /^([A-Za-z0-9-]+)((?:;[^:]*)?):(.*)$/.exec(line);
    if (!m) {
      throw new Error(`line ${n}: not a content line: ${line.slice(0, 60)}`);
    }
    const [, rawName, params] = m;
    const name = rawName.toUpperCase();
    // BEGIN/END values tolerate trailing blanks (some sources have them, and
    // calendar apps accept them); other values are kept exactly.
    const value = name === 'BEGIN' || name === 'END' ? m[3].trimEnd() : m[3];
    const top = stack[stack.length - 1];
    if (name === 'BEGIN') {
      if (!/^[A-Za-z0-9-]+$/.test(value)) {
        throw new Error(`line ${n}: bad BEGIN:${value}`);
      }
      const comp = { name: value.toUpperCase(), props: [], children: [] };
      top.children.push(comp);
      stack.push(comp);
    } else if (name === 'END') {
      if (stack.length === 1 || top.name !== value.toUpperCase()) {
        throw new Error(`line ${n}: END:${value} does not close ${top.name || 'anything'}`);
      }
      stack.pop();
    } else {
      if (stack.length === 1) {
        throw new Error(`line ${n}: property outside any component: ${name}`);
      }
      top.props.push({ name, params, value });
    }
  }
  if (stack.length !== 1) {
    throw new Error(`unclosed ${stack[stack.length - 1].name}`);
  }
  if (root.children.length !== 1 || root.children[0].name !== 'VCALENDAR') {
    throw new Error(`want exactly one VCALENDAR, found ${root.children.map((c) => c.name).join(', ') || 'none'}`);
  }
  return root.children[0];
}

/** First value of a property on a parsed component, or undefined. */
const prop = (comp, name) => (comp.props.find((p) => p.name === name) || {}).value;

/** The VEVENTs of a parsed calendar. */
const events = (cal) => cal.children.filter((c) => c.name === 'VEVENT');

const isCancelled = (event) => String(prop(event, 'STATUS') || '').trim().toUpperCase() === 'CANCELLED';

// The two reminders every meeting gets: the day before, and two hours before.
const ALARMS = [
  { trigger: '-P1D', lead: 'Tomorrow' },
  { trigger: '-PT2H', lead: 'In 2 hours' }
];

/**
 * Add the VALARM reminders to every VEVENT that is not cancelled and has no
 * VALARM of its own. Lines are inserted before END:VEVENT; nothing else in
 * the text changes. Idempotent.
 * @param {string} text - a whole .ics file
 * @returns {{ text: string, added: number }} added = events that got alarms
 */
function addAlarms(text) {
  parseICS(text); // refuse to edit a file that does not parse
  const eol = detectEol(text);
  // Split keeping each line's own terminator, so nothing is renormalised.
  const lines = text.match(/[^\r\n]*(?:\r\n|\n|$)/g).filter((l) => l !== '');
  const out = [];
  let inEvent = false;
  let block = [];
  let added = 0;
  for (const line of lines) {
    const bare = line.replace(/\r?\n$/, '');
    if (!inEvent) {
      out.push(line);
      if (/^BEGIN:VEVENT[ \t]*$/i.test(bare)) {
        inEvent = true;
        block = [];
      }
      continue;
    }
    if (/^END:VEVENT[ \t]*$/i.test(bare)) {
      const unfolded = block.map((l) => l.replace(/\r?\n$/, '')).join('\n').replace(/\n[ \t]/g, '');
      const cancelled = /^STATUS:CANCELLED[ \t]*$/im.test(unfolded);
      const hasAlarm = /^BEGIN:VALARM[ \t]*$/im.test(unfolded);
      out.push(...block);
      if (!cancelled && !hasAlarm) {
        const summary = (/^SUMMARY(?:;[^:]*)?:(.*)$/im.exec(unfolded) || [])[1] || 'SAPA meeting';
        for (const { trigger, lead } of ALARMS) {
          out.push(
            `BEGIN:VALARM${eol}`,
            `ACTION:DISPLAY${eol}`,
            `${foldLine(`DESCRIPTION:${lead}: ${summary}`, eol)}${eol}`,
            `TRIGGER:${trigger}${eol}`,
            `END:VALARM${eol}`
          );
        }
        added++;
      }
      out.push(line);
      inEvent = false;
      continue;
    }
    block.push(line);
  }
  return { text: out.join(''), added };
}

/**
 * Remove every VALARM block (with its line endings) from a text: the inverse
 * of addAlarms on a file that had none, used to prove the rest is untouched.
 */
function stripAlarms(text) {
  return text.replace(/^BEGIN:VALARM[ \t]*\r?\n[\s\S]*?^END:VALARM[ \t]*(?:\r?\n|$)/gim, '');
}

/**
 * The raw text of each VEVENT block in a file (BEGIN:VEVENT..END:VEVENT
 * inclusive, LF-joined, folding kept).
 */
function rawEvents(text) {
  return [...text.matchAll(/^BEGIN:VEVENT[ \t]*\r?\n[\s\S]*?^END:VEVENT[ \t]*\r?$/gim)]
    .map((m) => m[0].replace(/\r\n?/g, '\n').replace(/\n$/, ''));
}

module.exports = {
  ALARMS, detectEol, foldLine, parseICS, prop, events, isCancelled, addAlarms, stripAlarms, rawEvents
};
