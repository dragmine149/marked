import { MarkedExtension } from "marked";
import { PostedMarkedExtension } from "./marked";

type InputToken = {
  type: "markedInputField";
  raw: string;
  // input_type: string;
  id: string;
  // parameters?: RangeParameters;
} & (
    | {
      input_type: "range";
      parameters: RangeParameters;
    } | {
      input_type: Exclude<string, "range">;
      parameters: undefined;
    }
  );

interface RangeParameters {
  minimum: number,
  maximum: number,
  default?: number,
  step?: number,
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
        return src.match(/^\[(range)/)?.index;
      },
      tokenizer(src): InputToken | undefined {
        const rule = /^\[(range), (.*)\]\[(.*)\]/;
        const match = rule.exec(src);

        if (!match) return undefined;
        switch (match[1]) {
          case "range": {
            const data = match[2].split(",");
            return {
              type: "markedInputField",
              id: match[3],
              input_type: "range",
              raw: match[0],
              parameters: {
                minimum: Number(data[0]),
                maximum: Number(data[1]),
                default: data[2] ? Number(data[2]) : undefined,
                step: data[3] ? Number(data[3]) : undefined,
              }
            }
          }
          default:
            return undefined;
        }
      },
      renderer(t) {
        const token = t as InputToken;
        let result = `<input type="${token.input_type}" id="${token.id}" callback`;
        switch (token.input_type) {
          case "range":
            result = `${result} min="${token.parameters!.minimum}" max="${token.parameters!.maximum}" value="${token.parameters!.default}" step="${token.parameters!.step}"`;
            break;
          default: break;
        }
        return `${result}></input>`;
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
