// marked-checkbox-extension.ts
// (Mostly) Written by Kimi K2.5 (T3 Chat), modified afterwards
import { Token, Tokens } from "marked";
import { PostedMarkedExtension } from "./marked";

interface CheckboxToken extends Tokens.Checkbox {
  type: "checkbox";
  raw: string;
  id: string;
  checked: boolean;
  check_info: Token[];
}


export function markedEditableCheckbox(callback: (state: boolean, id: string) => void = (_) => { }): PostedMarkedExtension {
  function clickListener(this: HTMLInputElement, _event: PointerEvent) {
    // console.warn("EDITABLE MARKDOWN CLICKED ON: ", this.id, " MADE INTO: ", this.checked);
    callback(this.checked, this.id);
  }

  return {
    extensions: [
      {
        name: "checkbox",
        level: "inline",
        start(src) {
          return src.match(/\[(.*)\]\[(.*)\]/)?.index;
        },
        tokenizer(src: string): CheckboxToken | undefined {
          // console.log("marked_editable_checkbox: tokenizer src: ", src);
          const rule = /^\[([ xX])\]\[([^\]]+)\](.*)/;
          const match = rule.exec(src);

          if (!match) return undefined;

          const checked = match[1].toLowerCase() === "x";
          const id = match[2];
          // console.log("marked_editable_checkbox: rest: ", match);

          return {
            type: "checkbox",
            raw: match[0],
            id,
            checked,
            check_info: this.lexer.inlineTokens(match[3].trim()),
          };
        },
        renderer(t): string {
          // console.log("marked_editable_checkbox_internal_render t: ", t);
          const token = t as CheckboxToken;
          const checkedAttr = token.checked ? " checked" : "";
          const escapedId = token.id
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

          return `<input type="checkbox" id="${escapedId}"${checkedAttr} callback>`;
        },
        childTokens: ['check_info']
      },
    ],

    renderer: {
      listitem({ text }) {
        // console.log("marked_editable_checkbox: listitem_render text: ", text);

        const checkboxMatch = text.match(
          /^<input type="checkbox"[^>]*data-checkbox-id="([^"]*)"[^>]*>/,
        );

        if (!checkboxMatch) {
          return false;
        }

        const afterCheckbox = text.slice(checkboxMatch[0].length).trim();
        const labelContent = this.parser.parseInline(afterCheckbox);

        return `<li>${checkboxMatch[0]}<label for="${checkboxMatch[1].replace(/"/g, "&quot;")}">${labelContent}</label></li>`;
      },
    },
    postprocess(obj: HTMLElement) {
      obj.querySelectorAll('input[callback]').forEach(i => {
        const input = i as HTMLInputElement;

        // remove the previous listener just in case stuff breaks...
        input.removeEventListener('click', clickListener);

        // add our own custom listener.
        input.addEventListener('click', clickListener);
      })
    }
  };
}
