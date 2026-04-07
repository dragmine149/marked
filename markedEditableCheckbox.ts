import { Token } from "marked";
import { PostedMarkedExtension } from "./marked";

interface CheckboxToken {
  type: "editableCheckbox";
  raw: string;
  id: string;
  checked: boolean;
  label: Token[],
}


export function markedEditableCheckbox(callback: (id: string, state: boolean) => void = (_) => { }): PostedMarkedExtension {
  function clickListener(this: HTMLInputElement, _event: PointerEvent) {
    // console.warn("EDITABLE MARKDOWN CLICKED ON: ", this.id, " MADE INTO: ", this.checked);
    callback(this.id, this.checked);
  }

  return {
    extensions: [
      {
        name: "editableCheckbox",
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
            type: "editableCheckbox",
            raw: match[0],
            id,
            checked,
            label: this.lexer.inlineTokens(match[3].trim()),
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

          return `<input type="checkbox" id="${escapedId}"${checkedAttr} callback><label for="${escapedId}">${this.parser.parseInline(token.label)}</label>`;
        },
        childTokens: ['label'],
      },
    ],
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
