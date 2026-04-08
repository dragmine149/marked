import { MarkedExtension } from "marked";

/// Uses the navigator language and falls back to the english timezone if it can't find it.
const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-GB';

function fmtParts(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

function twoDigit(number: number) {
  return String(number).padStart(2, '0');
}

/**
 * Calculate the amount to now and format the it accordingly.
 * @param date The date we want to calculate from.
 * @returns The formatted string.
 */
function relative(date: Date) {
  const now = new Date();
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const units = [
    { unit: 'year', seconds: 60 * 60 * 24 * 365 },
    { unit: 'month', seconds: 60 * 60 * 24 * 30 },
    { unit: 'day', seconds: 60 * 60 * 24 },
    { unit: 'hour', seconds: 60 * 60 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 }
  ];
  const found = units.find(x => Math.abs(diffSeconds) >= x.seconds) ?? units[units.length - 1];
  const value = Math.round(diffSeconds / found.seconds);
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, found.unit as Intl.RelativeTimeFormatUnit);
}


// Code to process rules and display.

let rule = '';
const conditions: Record<string, (d: Date) => string> = {};

/**
* Add a rule to the system.
* @param {string} condition The condition to listen for
* @param {(d: Date) => string} callback The function to call to trigger said condition
*/
function addRule(condition: string, callback: (d: Date) => string) {
  const conditioned_rule = `${condition}|`;
  if (!rule.includes(conditioned_rule)) rule += conditioned_rule;
  conditions[condition] = callback;
}

/**
 * Display a timestamp in the viewers local time. Kinda like discord timestamps.
 *
 * Timestamp used is in epoch, although any `number * 1000` accepted by {@link Date} should be fine. If you need a converter i recommend: https://www.epochconverter.com/
 *
 * # Markdown Usage
 *
 * ```md
 * Raw Markdown       -> HTML Output
 * <t:1741109128:w>   -> Tuesday
 * <t:1741109128:W>   -> Tuesday 17:25
 * <t:1741109128:t>   -> 17:25
 * <t:1741109128:T>   -> 17:25:28
 * <t:1741109128:d>   -> 04/03/2025
 * <t:1741109128:D>   -> 04 March 2025
 * <t:1741109128:f>   -> 04 March 2025 at 17:25
 * <t:1741109128:F>   -> Tuesday 04 March 2025 at 17:25
 * <t:1741109128:R>   -> some time ago (this is dynamic)
 * <t:1741109128>     -> 04 March 2025 at 17:25 (none is same as 'f')
 * `<t:1741109128:W>` -> <t:1741109128:W> (put in code blocks to ignore the formatting)
 * ```
 *
 * The overall format is `<t:TIMESTAMP:FORMAT>`
 *
 * ## Discord-relationship
 * This system runs exactly the same as it does in discord, if you just copy and paste the above list they will format in discord as expected. The only ones to not format correct are as follows:
 * - `w`
 * - `W`
 *
 * # Parameters
 *
 * @param extra_rules Allow for the introduction of even more rules than not original included.
 *     - Rules can be any length. However try to keep it simple.
 *     - The string returned is the final form.
 *     - Built-in rules can be overwritten. Except for the blank rule which always returns the `f` rule.
 */
export function markedLocalTime(extra_rules?: Record<string, (d: Date) => string>): MarkedExtension {
  addRule('w', d => fmtParts(d, { weekday: 'long' }));
  addRule('W', d => {
    const day = fmtParts(d, { weekday: 'long' });
    const time = fmtParts(d, { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day} ${time}`;
  });
  addRule('t', d => fmtParts(d, { hour: '2-digit', minute: '2-digit', hour12: false }));
  addRule('T', d => {
    const hh = fmtParts(d, { hour: '2-digit', hour12: false });
    const mm = fmtParts(d, { minute: '2-digit' });
    const ss = twoDigit(d.getSeconds());
    return `${hh}:${mm}:${ss}`;
  });
  addRule('d', d => fmtParts(d, { day: '2-digit', month: '2-digit', year: 'numeric' }));
  addRule('D', d => fmtParts(d, { day: '2-digit', month: 'long', year: 'numeric' }));
  addRule('f', d => {
    const datePart = fmtParts(d, { day: '2-digit', month: 'long', year: 'numeric' });
    const timePart = fmtParts(d, { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${datePart} at ${timePart}`;
  });
  addRule('F', d => {
    const weekday = fmtParts(d, { weekday: 'long' });
    const datePart = fmtParts(d, { day: '2-digit', month: 'long', year: 'numeric' });
    const timePart = fmtParts(d, { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${weekday} ${datePart} at ${timePart}`;
  });
  addRule('R', d => relative(d));
  Object.entries(extra_rules ?? {}).forEach(([rule, callback]) => {
    if (rule.length > 1) {
      console.warn(`Ignoring rule "${rule}" for markedLocalTime because the length can only be one char long.`);
      return;
    }
    addRule(rule, callback);
  });
  console.log(rule);

  /**
   * Formats a timestamp using specified format rule
   * @param time Unix timestamp in seconds
   * @param format Format rule to apply
   * @returns Formatted time string
   */
  const format_time = (time: Date, format: string) => conditions[format] ? conditions[format](time) : conditions.f(time);

  return {
    extensions: [{
      name: 'localtime',
      level: 'inline',
      start(src) {
        const start = src.match(/<t:/)?.index;
        return start === undefined || (start > 0 && src[start - 1] === '`') ? undefined : start;
      },
      tokenizer(src, _) {
        const regex = RegExp(`^<t:(\\d*)(:(${rule}))?>`);
        const match = regex.exec(src);

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
