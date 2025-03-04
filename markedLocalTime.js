function markedLocalTime() {
  let rule = '';
  let conditions = {};

  /**
  * Add a rule to the system.
  * @param {string} condition The condition to listen for
  * @param {Function} callback The function to call to trigger said condition
  */
  function addRule(condition, callback) {
    rule += condition;
    conditions[condition] = callback;
  }

  addRule('w', (d) => d.format('dddd'));
  addRule('W', (d) => d.format('dddd HH:mm'));
  addRule('t', (d) => d.format('HH:mm'));
  addRule('T', (d) => d.format('HH:mm:ss'));
  addRule('d', (d) => d.format('L'));
  addRule('D', (d) => d.format('DD MMMM YYYY'));
  addRule('f', (d) => d.format('DD MMMM YYYY [at] HH:mm'));
  addRule('F', (d) => d.format('dddd DD MMMM YYYY [at] HH:mm'));
  addRule('R', (d) => dayjs().isBefore(d) ? d.fromNow() : d.toNow());

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
          time: dayjs(Number(match[1]) * 1000),
          format: match[3] == undefined ? 'f' : match[3],
        } : undefined
      },
      renderer(token) {
        return `<code>${format_time(token.time, token.format)}</code>`;
      },
    }]
  }
}
