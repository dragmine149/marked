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
