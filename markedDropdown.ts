import { PostedMarkedExtension } from "./marked";
import { Tokens } from "marked";

interface DropdownToken extends Tokens.Generic {
  raw: string,
  type: "editableDropdown",
  id: string,
  options: string[],
}

/**
 * Creates a custom dropdown element to be used. Pairs well with {@link markedInputField}.
 *
 * # Markdown Usage
 *
 * ```markdown
 * [>][some-option-a, some-option-b, some-option-c][some.id]
 * ```
 *
 * To prevent complexity, the value displayed is also the value returned. If you want them to be different write your own extension.
 *
 * Id goes last in order to match the syntax of markedInputField
 *
 * # PostedMarkedExtension
 *
 * In order for full functionality, it is recommended to run the `postprocess` function as returned after the markdown has been rendered to the DOM.
 * Example
 * ```ts
 * // ...
 * const extension = markedDropdown();
 * marked.use(extension);
 * obj.innerHTML = marked.parse(text);
 * extension.postprocess(obj);
 * // ...
 * ```
 * The above call is recomened as input events can't be generated for strings, hence we have to do it afterwards.
 *
 * # Parameters
 *
 * @param callback Function to call upon a value being changed. Does not expect a response back.
 */
export function markedDropdown(callback: (id: string, value: string) => void = () => { }): PostedMarkedExtension {
  function clickListener(this: HTMLInputElement, _event: Event) {
    // console.warn("EDITABLE MARKDOWN CLICKED ON: ", this.id, " MADE INTO: ", this.checked);
    callback(this.id, this.value);
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
            id: match[2],
            options: match[1].split(",")
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
