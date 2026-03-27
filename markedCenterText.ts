import type { MarkedExtension, Renderer, Token } from "marked";

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
  function align_content(renderer: Renderer<string, string>, tokens: Token[], text: string, align?: string) {
    return {
      align: align ? ` style="text-align: ${align};"` : '',
      content: align && tokens.length > 1 ? renderer.parser.parseInline(tokens.slice(1)) : text
    }
  }

  return {
    hooks: {
      processAllTokens(tokens) {
        return tokens.map((token) => {
          const valid_type = token.type === 'paragraph' || token.type === 'text' || token.type === 'heading';
          if (!valid_type) { return token; }
          if (typeof token.text !== 'string') { return token; }
          if (!token.text.startsWith('!')) { return token; }

          const firstSpace = token.text.indexOf(' ');
          const command = token.text.substring(0, firstSpace);

          let align = '';
          switch (command) {
            case '!c':
              align = 'center';
              break;
            case '!r':
              align = 'right';
              break;
          }

          if (!align) { return token; }

          Object.assign(token, {
            text: token.text.substring(firstSpace + 1),
            meta: {
              align: align
            }
          });

          return token;
        });
      }
    },
    renderer: {
      heading({ meta, depth, tokens, text }: HeadingCenter) {
        const { content, align } = align_content(this, tokens, text, meta?.align);
        return `<h${depth}${align}>${content}</h${depth}>`;
      },
      paragraph({ meta, tokens, text }: ParagraphCenter) {
        const { content, align } = align_content(this, tokens, text, meta?.align);
        return `<p${align}>${content}</p>`;
      }
    },
  };
}
