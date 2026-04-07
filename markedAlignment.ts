import type { MarkedExtension, Token } from "marked";

interface AlignmentToken {
  type: "alignment";
  level?: number;
  align?: string;
  text: Token[];
  raw: string;
}

export function markedAlignment(): MarkedExtension {
  return {
    extensions: [{
      name: "alignment",
      level: "block",
      start(src: string) {
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
