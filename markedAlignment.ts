import type { MarkedExtension, Token } from "marked";

interface AlignmentToken {
  type: "alignment";
  level?: number;
  align?: string;
  text: Token[];
  raw: string;
}

/**
 * Custom extension to align content in a different way than on the left.
 *
 * # Markdown Usage
 * ```md
 * # !r This is a heading on the right.
 * !c This text is now centered
 * ```
 *
 * Only `!c` and `!r` are supported, anything else will just be left to the next extension to sort out.
 *
 * This only affects the position, styling will also work as expected
 * ```md
 * # !r So this would be a heading on the *right* with *italic* text
 * ```
 */
export function markedAlignment(): MarkedExtension {
  return {
    extensions: [{
      name: "alignment",
      level: "block",
      start(src) {
        return src.match(/^(?:#{1,6}\s+)?!([cr])\s+/)?.index;
      },
      tokenizer(src): AlignmentToken | undefined {
        const rule = /^([# ]*)!([^ ]*)(.*)/;
        const match = rule.exec(src);

        if (!match) return undefined;
        return {
          type: "alignment",
          raw: match[0],
          text: this.lexer.inlineTokens(match[3]),
          align: match[2],
          level: match[1].length
        }
      },
      childTokens: ['text'],
      renderer(t) {
        const token = t as AlignmentToken;
        let align = '';
        switch (token.align) {
          case 'c':
            align = 'center';
            break;
          case 'r':
            align = 'right';
            break;
          default: return undefined;
        }

        if (token.level! > 0) {
          return `<h${token.level} style="text-align: ${align};">${this.parser.parseInline(token.text)}</h${token.level}>\n`;
        }

        return `<p style="text-align: ${align};">${this.parser.parseInline(token.text)}</p>\n`;
      },
    }]
  };
}
