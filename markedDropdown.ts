import { PostedMarkedExtension } from "./marked";
import { Tokens } from "marked";

interface DropdownToken extends Tokens.Generic {
  raw: string,
  type: "editableDropdown",
  id: string,
  options: string[],
}

export function markedDropdown(callback: (value: string, id: string) => void = () => { }): PostedMarkedExtension {
  function clickListener(this: HTMLInputElement, _event: Event) {
    // console.warn("EDITABLE MARKDOWN CLICKED ON: ", this.id, " MADE INTO: ", this.checked);
    callback(this.value, this.id);
  }

  return {
    extensions: [{
      name: "editableDropdown",
      level: "inline",
      start(src) {
        return src.match(/^\[>\]/)?.index;
      },
      tokenizer(src): DropdownToken | undefined {
        const rule = /^\[>\]\[(.*)\]\[(.*)\]/;
        const match = rule.exec(src);
        // console.log(src, "-> Dropdown match: ", match);

        if (match) {
          return {
            raw: match[0],
            type: "editableDropdown",
            id: match[1],
            options: match[2].split(",")
              .map((opt) => opt.trim().replaceAll('"', "")),
          }
        }
      },
      renderer(t) {
        // console.log("marked_dropdown_internal_render t: ", t);
        const token = t as DropdownToken;
        // return "";
        return `<select id=${token.id} callback>${token.options.map(opt => `<option>${opt}</option>`).join()}</select>`;
      }
    }],
    postprocess(obj) {
      obj.querySelectorAll('select[callback]').forEach(i => {
        const input = i as HTMLInputElement;

        // remove the previous listener just in case stuff breaks...
        input.removeEventListener('change', clickListener);

        // add our own custom listener.
        input.addEventListener('change', clickListener);
      })
    }
  }
}
