// markedAlignment.ts (V2 of markedCenterText)
//
// Prompt:
// Write a markdown extension for markedJs that eithers:
// - `text-align: center` -> `!c`
// - `text-align: right` -> `!r`
// If any of the above are found at the beginning of a line or heading
//
//
// Written by T3 Chat (Kimi K2.5)

import type { Tokenizer, Renderer } from "marked";

export interface AlignmentOptions {
  /** Class name for centered alignment (default: "text-center") */
  centerClass?: string;
  /** Class name for right alignment (default: "text-right") */
  rightClass?: string;
}

const defaultOptions: Required<AlignmentOptions> = {
  centerClass: "text-center",
  rightClass: "text-right",
};

/**
 * Marked.js extension for text alignment shortcuts.
 * Converts !c and !r at the start of lines/headings to aligned text.
 *
 * Usage:
 *   !c This text is centered
 *   !r This text is right-aligned
 *   # !c Centered heading
 *   ## !r Right-aligned heading
 */
export function alignmentExtension(userOptions: AlignmentOptions = {}) {
  const opts = { ...defaultOptions, ...userOptions };

  const alignmentRegex = /^!([cr])\s+/;

  const processAlignment = (text: string): { align: "c" | "r" | null; content: string } => {
    const match = text.match(alignmentRegex);
    return match
      ? { align: match[1] as "c" | "r", content: text.slice(match[0].length) }
      : { align: null, content: text };
  };

  const getClassName = (align: "c" | "r"): string =>
    align === "c" ? opts.centerClass : opts.rightClass;

  return {
    name: "alignment",
    level: "block",
    start(src: string): number | undefined {
      const match = src.match(/^(?:#{1,6}\s+)?!([cr])\s+/m);
      return match ? match.index : undefined;
    },
    tokenizer(this: Tokenizer, src: string) {
      // Match headings with alignment
      const headingMatch = src.match(/^(#{1,6})\s+!([cr])\s+([^\n]+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const align = headingMatch[2] as "c" | "r";
        const text = headingMatch[3].trim();

        return {
          type: "alignmentHeading",
          raw: headingMatch[0],
          level,
          align,
          text,
          tokens: this.lexer.inlineTokens(text),
        };
      }

      // Match paragraphs with alignment
      const paraMatch = src.match(/^!([cr])\s+([^\n]+)(?:\n|$)/);
      if (paraMatch) {
        const align = paraMatch[1] as "c" | "r";
        const text = paraMatch[2].trim();

        return {
          type: "alignmentParagraph",
          raw: paraMatch[0],
          align,
          text,
          tokens: this.lexer.inlineTokens(text),
        };
      }
    },
    renderer(this: Renderer, token) {
      const className = getClassName(token.align);

      if (token.type === "alignmentHeading") {
        return `<h${token.level} class="${className}">${this.parser.parseInline(token.tokens)}</h${token.level}>\n`;
      }

      if (token.type === "alignmentParagraph") {
        return `<p class="${className}">${this.parser.parseInline(token.tokens)}</p>\n`;
      }

      return "";
    },
  };
}

// Type declarations for custom tokens
declare module "marked" {
  interface Token {
    type: "alignmentHeading" | "alignmentParagraph";
    level?: number;
    align: "c" | "r";
    text: string;
    tokens: Token[];
  }
}
