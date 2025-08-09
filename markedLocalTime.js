function markedLocalTime() {
  // Date formatting written by T3 Chat (GPT-5 mini)
  // Prettier printWidth: 80

  // normalise constructors that might be given in seconds
  function normaliseDate(d) {
    const t = d instanceof Date ? d.getTime() : Number(d);
    const ts = new Date(t < 1e12 ? t * 1000 : t);
    return ts;
  }

  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-GB';

  // helpers
  function fmtParts(date, options) {
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  function twoDigit(n) {
    return String(n).padStart(2, '0');
  }

  function relative(date) {
    const now = new Date();
    const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
    const units = [
      { u: 'year', s: 60 * 60 * 24 * 365 },
      { u: 'month', s: 60 * 60 * 24 * 30 },
      { u: 'day', s: 60 * 60 * 24 },
      { u: 'hour', s: 60 * 60 },
      { u: 'minute', s: 60 },
      { u: 'second', s: 1 }
    ];
    const found = units.find(x => Math.abs(diffSeconds) >= x.s) ?? units[units.length - 1];
    const value = Math.round(diffSeconds / found.s);
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, found.u);
  }


  // Code to process rules and display.

  let rule = '';
  let conditions = {};

  /**
  * Add a rule to the system.
  * @param {string} condition The condition to listen for
  * @param {(d: Date) => string} callback The function to call to trigger said condition
  */
  function addRule(condition, callback) {
    rule += condition;
    conditions[condition] = callback;
  }

  // rules
  addRule('w', d => fmtParts(normaliseDate(d), { weekday: 'long' }));
  addRule('W', d => {
    const dt = normaliseDate(d);
    const day = fmtParts(dt, { weekday: 'long' });
    const time = fmtParts(dt, { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day} ${time}`;
  });
  addRule('t', d => fmtParts(normaliseDate(d), { hour: '2-digit', minute: '2-digit', hour12: false }));
  addRule('T', d => {
    const dt = normaliseDate(d);
    const hh = fmtParts(dt, { hour: '2-digit', hour12: false });
    const mm = fmtParts(dt, { minute: '2-digit' });
    const ss = twoDigit(dt.getSeconds());
    return `${hh}:${mm}:${ss}`;
  });
  addRule('d', d => fmtParts(normaliseDate(d), { day: '2-digit', month: '2-digit', year: 'numeric' }));
  addRule('D', d => fmtParts(normaliseDate(d), { day: '2-digit', month: 'long', year: 'numeric' }));
  addRule('f', d => {
    const dt = normaliseDate(d);
    const datePart = fmtParts(dt, { day: '2-digit', month: 'long', year: 'numeric' });
    const timePart = fmtParts(dt, { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${datePart} at ${timePart}`;
  });
  addRule('F', d => {
    const dt = normaliseDate(d);
    const weekday = fmtParts(dt, { weekday: 'long' });
    const datePart = fmtParts(dt, { day: '2-digit', month: 'long', year: 'numeric' });
    const timePart = fmtParts(dt, { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${weekday} ${datePart} at ${timePart}`;
  });
  addRule('R', d => relative(normaliseDate(d)));

  /**
   * Formats a timestamp using specified format rule
   * @param {number} time Unix timestamp in seconds
   * @param {string} format Format rule to apply
   * @returns {string} Formatted time string
   */
  const format_time = (time, format) => conditions[format] ? conditions[format](time) : conditions.f(time);

  return {
    extensions: [{
      name: 'localtime',
      level: 'inline',
      start(src) {
        const start = src.match(/<t:/)?.index;
        return start === undefined || (start > 0 && src[start - 1] === '`') ? undefined : start;
      },
      tokenizer(src, _) {
        let regex = RegExp(`^<t:(\\d*)(:([${rule}]))?>`);
        let match = regex.exec(src);

        return (match) ? {
          type: 'localtime',
          raw: match[0],
          time: new Date(Number(match[1]) * 1000),
          format: match[3] == undefined ? 'f' : match[3],
        } : undefined
      },
      renderer(token) {
        return `<code>${format_time(token.time, token.format)}</code>`;
      },
    }]
  }
}
