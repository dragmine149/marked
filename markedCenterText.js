function markedCenterText() {
  const renderer = {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      let alignClass = '';
      let processedText = text;

      if (text.startsWith('!')) {
        const firstSpace = text.indexOf(' ');
        const command = text.substring(0, firstSpace);
        processedText = text.substring(firstSpace + 1);

        switch (command) {
          case '!c':
            alignClass = ' style="text-align: center;"';
            break;
          case '!r':
            alignClass = ' style="text-align: right;"';
            break;
        }
      }

      return `
              <h${depth}${alignClass}>
                ${processedText}
              </h${depth}>`;
    }
  };
  return { renderer };
}
