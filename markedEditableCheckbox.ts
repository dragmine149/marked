import { MarkedExtension } from "marked";

export function markedEditableDropdown(callback: (state: boolean) => void = (_) => { }): MarkedExtension {
  function clickListener(this: HTMLInputElement, _event: PointerEvent) {
    callback(this.checked);
  }

  return {
    hooks: {
      postprocess(html) {
        requestAnimationFrame(() => {
          document.querySelectorAll('input[callback]').forEach(i => {
            const input = i as HTMLInputElement;

            // remove the previous listener just in case stuff breaks...
            input.removeEventListener('click', clickListener);

            // add our own custom listener.
            input.addEventListener('click', clickListener);
          })
        });
        return html;
      }
    },
    renderer: {
      checkbox({ checked }): string {
        return `<input ${checked ? 'checked' : ''} disabled type="checkbox" callback>`;
      }
    }
  }
}
