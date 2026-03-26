import type { MarkedExtension, Token } from "marked";

export type HeadingCenter = {
  type: string
  meta?: {
    align: string
  }
  raw: string
  text: string
  depth: number
  tokens: Token[]
}

export type ParagraphCenter = {
  type: string
  meta?: {
    align: string
  }
  raw: string
  text: string
  tokens: Token[]
}

/**
 * Changes the alignment of the text on the line.
 *
 * # Usage
 * ```md
 * !c This text is centered
 * !r This text is right-aligned
 * ```
 */
export function markedCenterText(): MarkedExtension {
  return {
    hooks: {
      processAllTokens(tokens) {
        return tokens.map((token) => {
          if (token.type === 'paragraph' || token.type === 'text' || token.type === 'heading') {
            if ('text' in token && typeof token.text === 'string') {
              const text = token.text;
              let align = '';
              let processedText = text;

              if (text.startsWith('!')) {
                const firstSpace = text.indexOf(' ');
                const command = text.substring(0, firstSpace);
                processedText = text.substring(firstSpace + 1);

                switch (command) {
                  case '!c':
                    align = 'center';
                    break;
                  case '!r':
                    align = 'right';
                    break;
                }
              }

              if (align) {
                token.text = processedText;
                Object.assign(token, {
                  meta: {
                    align: align
                  }
                });
              }
            }
          }
          return token;
        });
      }
    },
    renderer: {
      heading({ meta, depth, text }: HeadingCenter) {
        const align = meta?.align;
        const alignAttr = align ? ` style="text-align: ${align};"` : '';
        return `<h${depth}${alignAttr}>${text}</h${depth}>`;
      },
      paragraph({ meta, text }: ParagraphCenter) {
        const align = meta?.align;
        const alignAttr = align ? ` style="text-align: ${align};"` : '';
        return `<p${alignAttr}>${text}</p>`;
      }
    },
  };
}
