import { Token } from "marked";
import { PostedMarkedExtension } from "./marked";

type InputToken = {
  type: "markedInputField";
  raw: string;
  // input_type: string;
  id: string;
  // parameters?: RangeParameters;
  label: Token[],
} & (
    | {
      input_type: "range";
      parameters: RangeParameters;
    } | {
      input_type: Exclude<string, "range" | "checkbox">;
      parameters: undefined;
    } | {
      input_type: "checkbox";
      parameters: CheckParameters;
    }
  );

interface RangeParameters {
  minimum: number,
  maximum: number,
  default?: number,
  step?: number,
}

interface CheckParameters {
  checked: boolean,
}

/**
 * Allow for multiple types of input fields to be supported.
 *
 * Currently supported: [ range, checkbox ]
 *
 * # Markdown Usage
 *
 * ```md
 * [ ][checkbox-id] *checkbox label*
 * [range, 100, 500, 100, 20][range-id]
 * ```
 *
 * ## Options
 * All input fields use a variation of the double `[]` combo. The first `[]` gives information on the element whilst the second `[]` gives the id of the element.
 *
 * ### Checkbox
 * Format: `[checked?][id]`.
 * - Checked is optional and can be either `x` or `X` just like normal markdown. If you want it to be optional, make it a space character (`[ ]`) instead.
 * - As a downside, editable checkboxes can be used whilst not in the official list format.
 *
 * ### Range
 * Format: `[range, min, max, default?, step?][id]`
 * - `range` is required in plain text. Everything in the first `[]` must be separated by commas.
 * - `min`, `max`, `default`, `step` if provided should be numbers, that which {@link Number()} can parse.
 * - `default` will resort to `min` if not provided.
 * - `step` will resort to `auto` if not provided.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range for more information related to this.
 *
 *
 * # PostedMarkedExtension
 *
 * In order for full functionality, it is recommended to run the `postprocess` function as returned after the markdown has been rendered to the DOM.
 * Example
 * ```ts
 * // ...
 * const extension = markedInputField();
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
export function markedInputField(callback: (id: string, event: InputEvent) => void = () => { }): PostedMarkedExtension {
  function inputListener(this: HTMLInputElement, event: Event) {
    callback(this.id, event as InputEvent);
  }

  return {
    extensions: [{
      name: "markedInputField",
      level: "inline",
      start(src) {
        return src.match(/^\[(range|[ xX])/)?.index;
      },
      tokenizer(src): InputToken | undefined {
        const rule = /^\[(range|[ xX])(?:, )?(.*)\]\[(.*)\](.*)/;
        const match = rule.exec(src);
        // console.log({ src, match });

        if (!match) return undefined;
        const [raw, input_type, data, id, label] = match;
        // @ts-expect-error 2322 The input_type and parameters get assigned later in their own sections.
        // I just... can't fully work out how to tell ts that...
        const token: InputToken = {
          id, raw, type: "markedInputField",
          label: this.lexer.inlineTokens(label),
        }

        switch (input_type) {
          case "range": {
            const split_data = data.split(",");
            token.input_type = "range";
            token.parameters = {
              minimum: Number(split_data[0]),
              maximum: Number(split_data[1]),
              default: split_data[2] ? Number(split_data[2]) : undefined,
              step: split_data[3] ? Number(split_data[3]) : undefined,
            };
            break;
          }

          case " ":
          case "X":
          case "x": {
            token.input_type = "checkbox";
            token.parameters = {
              checked: input_type.toLowerCase() === "x",
            }
            break;
          }

          default:
            return undefined;
        }
        // console.log(token);
        return token;
      },
      childTokens: ['label'],
      renderer(t) {
        const token = t as InputToken;

        let result = `<input type="${token.input_type}" id="${token.id}" callback`;
        switch (token.input_type) {
          case "range":
            result = `${result} min="${token.parameters!.minimum}" max="${token.parameters!.maximum}" value="${token.parameters!.default}" step="${token.parameters!.step}"`;
            break;
          case "checkbox":
            result = `${result} ${token.parameters!.checked ? "checked" : ""}`;
            break;
          default: break;
        }

        const label = token.label.length > 0 ? `<label for="${token.id}">${this.parser.parseInline(token.label)}</label>` : '';
        return `${result}></input>${label}`;
      }
    }],
    postprocess(obj) {
      obj.querySelectorAll("input[callback]").forEach(i => {
        const input = i as HTMLInputElement;

        input.removeEventListener('input', inputListener);
        input.addEventListener('input', inputListener);
      })
    }
  }
}
