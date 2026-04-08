// markedAlignment.ts
function markedAlignment() {
  return {
    extensions: [{
      name: "alignment",
      level: "block",
      start(src) {
        return src.match(/^(?:#{1,6}\s+)?!([cr])\s+/)?.index;
      },
      tokenizer(src) {
        const rule = /^([# ]*)!([^ ]*)(.*)/;
        const match = rule.exec(src);
        if (!match)
          return;
        return {
          type: "alignment",
          raw: match[0],
          text: this.lexer.inlineTokens(match[3]),
          align: match[2],
          level: match[1].length
        };
      },
      childTokens: ["text"],
      renderer(t) {
        const token = t;
        let align = "";
        switch (token.align) {
          case "c":
            align = "center";
            break;
          case "r":
            align = "right";
            break;
          default:
            return;
        }
        if (token.level > 0) {
          return `<h${token.level} style="text-align: ${align};">${this.parser.parseInline(token.text)}</h${token.level}>
`;
        }
        return `<p style="text-align: ${align};">${this.parser.parseInline(token.text)}</p>
`;
      }
    }]
  };
}

// markedDropdown.ts
function markedDropdown(callback = () => {}) {
  function clickListener(_event) {
    callback(this.id, this.value);
  }
  return {
    extensions: [{
      name: "editableDropdown",
      level: "inline",
      start(src) {
        return src.match(/^\[>\]/)?.index;
      },
      tokenizer(src) {
        const rule = /^\[>\]\[(.*)\]\[(.*)\]/;
        const match = rule.exec(src);
        if (match) {
          return {
            raw: match[0],
            type: "editableDropdown",
            id: match[2],
            options: match[1].split(",").map((opt) => opt.trim().replaceAll('"', ""))
          };
        }
      },
      renderer(t) {
        const token = t;
        return `<select id=${token.id} callback>${token.options.map((opt) => `<option>${opt}</option>`).join()}</select>`;
      }
    }],
    postprocess(obj) {
      obj.querySelectorAll("select[callback]").forEach((i) => {
        const input = i;
        input.removeEventListener("change", clickListener);
        input.addEventListener("change", clickListener);
      });
    }
  };
}

// markedInputField.ts
function markedInputField(callback = () => {}) {
  function inputListener(event) {
    callback(this.id, event);
  }
  return {
    extensions: [{
      name: "markedInputField",
      level: "inline",
      start(src) {
        return src.match(/^\[(range|[ xX])/)?.index;
      },
      tokenizer(src) {
        const rule = /^\[(range|[ xX])(?:, )?(.*)\]\[(.*)\](.*)/;
        const match = rule.exec(src);
        if (!match)
          return;
        const [raw, input_type, data, id, label] = match;
        const token = {
          id,
          raw,
          type: "markedInputField",
          label: this.lexer.inlineTokens(label)
        };
        switch (input_type) {
          case "range": {
            const split_data = data.split(",");
            token.input_type = "range";
            token.parameters = {
              minimum: Number(split_data[0]),
              maximum: Number(split_data[1]),
              default: split_data[2] ? Number(split_data[2]) : undefined,
              step: split_data[3] ? Number(split_data[3]) : undefined
            };
            break;
          }
          case " ":
          case "X":
          case "x": {
            token.input_type = "checkbox";
            token.parameters = {
              checked: input_type.toLowerCase() === "x"
            };
            break;
          }
          default:
            return;
        }
        return token;
      },
      childTokens: ["label"],
      renderer(t) {
        const token = t;
        let result = `<input type="${token.input_type}" id="${token.id}" callback`;
        switch (token.input_type) {
          case "range":
            result = `${result} min="${token.parameters.minimum}" max="${token.parameters.maximum}" value="${token.parameters.default}" step="${token.parameters.step}"`;
            break;
          case "checkbox":
            result = `${result} ${token.parameters.checked ? "checked" : ""}`;
            break;
          default:
            break;
        }
        const label = token.label.length > 0 ? `<label for="${token.id}">${this.parser.parseInline(token.label)}</label>` : "";
        return `${result}></input>${label}`;
      }
    }],
    postprocess(obj) {
      obj.querySelectorAll("input[callback]").forEach((i) => {
        const input = i;
        input.removeEventListener("input", inputListener);
        input.addEventListener("input", inputListener);
      });
    }
  };
}

// markedImprovedImage.ts
function markedImprovedImage(useRemote) {
  return {
    renderer: {
      image({ href, text, title }) {
        return `
        <div class="img">
          <img src="${useRemote ? `${useRemote}/${href}` : href}", alt="${text}" title="${title}"">
        </div>
        `;
      }
    }
  };
}

// markedLocalLink.ts
function markedLocalLink(callback = (_) => false, site = window.location.host) {
  const currentUrl = new URL(location.href);
  function clickListener(event) {
    if (event.ctrlKey || event.shiftKey || event.metaKey || event.altKey || event.button === 1)
      return true;
    console.log("link info: ", this.href);
    const result = callback(new URL(this.href));
    if (result !== true) {
      console.log("Callback failed, auto redirect to original location.");
      return true;
    }
    event.preventDefault();
    return false;
  }
  return {
    postprocess(obj) {
      obj.querySelectorAll("a[callback]").forEach((l) => {
        const link = l;
        link.removeEventListener("click", clickListener);
        link.addEventListener("click", clickListener);
      });
    },
    renderer: {
      link({ href, title, text }) {
        let url;
        try {
          if (!href)
            return false;
          url = new URL(href, currentUrl);
        } catch {
          console.error("Invalid URL:", href);
          return false;
        }
        const local = url.host === currentUrl.host || url.host.includes("localhost") || url.host === site;
        return `<a href="${href}"${title ? ` title="${title}"` : ""}${local ? " callback" : ""}>${text}</a>`;
      }
    }
  };
}

// markedLocalTime.ts
var locale = typeof navigator !== "undefined" ? navigator.language : "en-GB";
function fmtParts(date, options) {
  return new Intl.DateTimeFormat(locale, options).format(date);
}
function twoDigit(number) {
  return String(number).padStart(2, "0");
}
function relative(date) {
  const now = new Date;
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const units = [
    { unit: "year", seconds: 60 * 60 * 24 * 365 },
    { unit: "month", seconds: 60 * 60 * 24 * 30 },
    { unit: "day", seconds: 60 * 60 * 24 },
    { unit: "hour", seconds: 60 * 60 },
    { unit: "minute", seconds: 60 },
    { unit: "second", seconds: 1 }
  ];
  const found = units.find((x) => Math.abs(diffSeconds) >= x.seconds) ?? units[units.length - 1];
  const value = Math.round(diffSeconds / found.seconds);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, found.unit);
}
var rule = "";
var conditions = {};
function addRule(condition, callback) {
  const conditioned_rule = `${condition}|`;
  if (!rule.includes(conditioned_rule))
    rule += conditioned_rule;
  conditions[condition] = callback;
}
function markedLocalTime(extra_rules) {
  addRule("w", (d) => fmtParts(d, { weekday: "long" }));
  addRule("W", (d) => {
    const day = fmtParts(d, { weekday: "long" });
    const time = fmtParts(d, { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${day} ${time}`;
  });
  addRule("t", (d) => fmtParts(d, { hour: "2-digit", minute: "2-digit", hour12: false }));
  addRule("T", (d) => {
    const hh = fmtParts(d, { hour: "2-digit", hour12: false });
    const mm = fmtParts(d, { minute: "2-digit" });
    const ss = twoDigit(d.getSeconds());
    return `${hh}:${mm}:${ss}`;
  });
  addRule("d", (d) => fmtParts(d, { day: "2-digit", month: "2-digit", year: "numeric" }));
  addRule("D", (d) => fmtParts(d, { day: "2-digit", month: "long", year: "numeric" }));
  addRule("f", (d) => {
    const datePart = fmtParts(d, { day: "2-digit", month: "long", year: "numeric" });
    const timePart = fmtParts(d, { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${datePart} at ${timePart}`;
  });
  addRule("F", (d) => {
    const weekday = fmtParts(d, { weekday: "long" });
    const datePart = fmtParts(d, { day: "2-digit", month: "long", year: "numeric" });
    const timePart = fmtParts(d, { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${weekday} ${datePart} at ${timePart}`;
  });
  addRule("R", (d) => relative(d));
  Object.entries(extra_rules ?? {}).forEach(([rule2, callback]) => {
    if (rule2.length > 1) {
      console.warn(`Ignoring rule "${rule2}" for markedLocalTime because the length can only be one char long.`);
      return;
    }
    addRule(rule2, callback);
  });
  console.log(rule);
  const format_time = (time, format) => conditions[format] ? conditions[format](time) : conditions.f(time);
  return {
    extensions: [{
      name: "localtime",
      level: "inline",
      start(src) {
        const start = src.match(/<t:/)?.index;
        return start === undefined || start > 0 && src[start - 1] === "`" ? undefined : start;
      },
      tokenizer(src, _) {
        const regex = RegExp(`^<t:(\\d*)(:(${rule}))?>`);
        const match = regex.exec(src);
        return match ? {
          type: "localtime",
          raw: match[0],
          time: new Date(Number(match[1]) * 1000),
          format: match[3] == undefined ? "f" : match[3]
        } : undefined;
      },
      renderer(token) {
        return `<code>${format_time(token.time, token.format)}</code>`;
      }
    }]
  };
}
export {
  markedLocalTime,
  markedLocalLink,
  markedInputField,
  markedImprovedImage,
  markedDropdown,
  markedAlignment
};

//# debugId=4579BACCC266CA5564756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vbWFya2VkQWxpZ25tZW50LnRzIiwgIi4uL21hcmtlZERyb3Bkb3duLnRzIiwgIi4uL21hcmtlZElucHV0RmllbGQudHMiLCAiLi4vbWFya2VkSW1wcm92ZWRJbWFnZS50cyIsICIuLi9tYXJrZWRMb2NhbExpbmsudHMiLCAiLi4vbWFya2VkTG9jYWxUaW1lLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCB0eXBlIHsgTWFya2VkRXh0ZW5zaW9uLCBUb2tlbiB9IGZyb20gXCJtYXJrZWRcIjtcblxuaW50ZXJmYWNlIEFsaWdubWVudFRva2VuIHtcbiAgdHlwZTogXCJhbGlnbm1lbnRcIjtcbiAgbGV2ZWw/OiBudW1iZXI7XG4gIGFsaWduPzogc3RyaW5nO1xuICB0ZXh0OiBUb2tlbltdO1xuICByYXc6IHN0cmluZztcbn1cblxuLyoqXG4gKiBDdXN0b20gZXh0ZW5zaW9uIHRvIGFsaWduIGNvbnRlbnQgaW4gYSBkaWZmZXJlbnQgd2F5IHRoYW4gb24gdGhlIGxlZnQuXG4gKlxuICogIyBNYXJrZG93biBVc2FnZVxuICogYGBgbWRcbiAqICMgIXIgVGhpcyBpcyBhIGhlYWRpbmcgb24gdGhlIHJpZ2h0LlxuICogIWMgVGhpcyB0ZXh0IGlzIG5vdyBjZW50ZXJlZFxuICogYGBgXG4gKlxuICogT25seSBgIWNgIGFuZCBgIXJgIGFyZSBzdXBwb3J0ZWQsIGFueXRoaW5nIGVsc2Ugd2lsbCBqdXN0IGJlIGxlZnQgdG8gdGhlIG5leHQgZXh0ZW5zaW9uIHRvIHNvcnQgb3V0LlxuICpcbiAqIFRoaXMgb25seSBhZmZlY3RzIHRoZSBwb3NpdGlvbiwgc3R5bGluZyB3aWxsIGFsc28gd29yayBhcyBleHBlY3RlZFxuICogYGBgbWRcbiAqICMgIXIgU28gdGhpcyB3b3VsZCBiZSBhIGhlYWRpbmcgb24gdGhlICpyaWdodCogd2l0aCAqaXRhbGljKiB0ZXh0XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmtlZEFsaWdubWVudCgpOiBNYXJrZWRFeHRlbnNpb24ge1xuICByZXR1cm4ge1xuICAgIGV4dGVuc2lvbnM6IFt7XG4gICAgICBuYW1lOiBcImFsaWdubWVudFwiLFxuICAgICAgbGV2ZWw6IFwiYmxvY2tcIixcbiAgICAgIHN0YXJ0KHNyYykge1xuICAgICAgICByZXR1cm4gc3JjLm1hdGNoKC9eKD86I3sxLDZ9XFxzKyk/IShbY3JdKVxccysvKT8uaW5kZXg7XG4gICAgICB9LFxuICAgICAgdG9rZW5pemVyKHNyYyk6IEFsaWdubWVudFRva2VuIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgcnVsZSA9IC9eKFsjIF0qKSEoW14gXSopKC4qKS87XG4gICAgICAgIGNvbnN0IG1hdGNoID0gcnVsZS5leGVjKHNyYyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB0eXBlOiBcImFsaWdubWVudFwiLFxuICAgICAgICAgIHJhdzogbWF0Y2hbMF0sXG4gICAgICAgICAgdGV4dDogdGhpcy5sZXhlci5pbmxpbmVUb2tlbnMobWF0Y2hbM10pLFxuICAgICAgICAgIGFsaWduOiBtYXRjaFsyXSxcbiAgICAgICAgICBsZXZlbDogbWF0Y2hbMV0ubGVuZ3RoXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBjaGlsZFRva2VuczogWyd0ZXh0J10sXG4gICAgICByZW5kZXJlcih0KSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdCBhcyBBbGlnbm1lbnRUb2tlbjtcbiAgICAgICAgbGV0IGFsaWduID0gJyc7XG4gICAgICAgIHN3aXRjaCAodG9rZW4uYWxpZ24pIHtcbiAgICAgICAgICBjYXNlICdjJzpcbiAgICAgICAgICAgIGFsaWduID0gJ2NlbnRlcic7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdyJzpcbiAgICAgICAgICAgIGFsaWduID0gJ3JpZ2h0JztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4ubGV2ZWwhID4gMCkge1xuICAgICAgICAgIHJldHVybiBgPGgke3Rva2VuLmxldmVsfSBzdHlsZT1cInRleHQtYWxpZ246ICR7YWxpZ259O1wiPiR7dGhpcy5wYXJzZXIucGFyc2VJbmxpbmUodG9rZW4udGV4dCl9PC9oJHt0b2tlbi5sZXZlbH0+XFxuYDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBgPHAgc3R5bGU9XCJ0ZXh0LWFsaWduOiAke2FsaWdufTtcIj4ke3RoaXMucGFyc2VyLnBhcnNlSW5saW5lKHRva2VuLnRleHQpfTwvcD5cXG5gO1xuICAgICAgfSxcbiAgICB9XVxuICB9O1xufVxuIiwKICAgICJpbXBvcnQgeyBQb3N0ZWRNYXJrZWRFeHRlbnNpb24gfSBmcm9tIFwiLi9tYXJrZWRcIjtcbmltcG9ydCB7IFRva2VucyB9IGZyb20gXCJtYXJrZWRcIjtcblxuaW50ZXJmYWNlIERyb3Bkb3duVG9rZW4gZXh0ZW5kcyBUb2tlbnMuR2VuZXJpYyB7XG4gIHJhdzogc3RyaW5nLFxuICB0eXBlOiBcImVkaXRhYmxlRHJvcGRvd25cIixcbiAgaWQ6IHN0cmluZyxcbiAgb3B0aW9uczogc3RyaW5nW10sXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGN1c3RvbSBkcm9wZG93biBlbGVtZW50IHRvIGJlIHVzZWQuIFBhaXJzIHdlbGwgd2l0aCB7QGxpbmsgbWFya2VkSW5wdXRGaWVsZH0uXG4gKlxuICogIyBNYXJrZG93biBVc2FnZVxuICpcbiAqIGBgYG1hcmtkb3duXG4gKiBbPl1bc29tZS1vcHRpb24tYSwgc29tZS1vcHRpb24tYiwgc29tZS1vcHRpb24tY11bc29tZS5pZF1cbiAqIGBgYFxuICpcbiAqIFRvIHByZXZlbnQgY29tcGxleGl0eSwgdGhlIHZhbHVlIGRpc3BsYXllZCBpcyBhbHNvIHRoZSB2YWx1ZSByZXR1cm5lZC4gSWYgeW91IHdhbnQgdGhlbSB0byBiZSBkaWZmZXJlbnQgd3JpdGUgeW91ciBvd24gZXh0ZW5zaW9uLlxuICpcbiAqIElkIGdvZXMgbGFzdCBpbiBvcmRlciB0byBtYXRjaCB0aGUgc3ludGF4IG9mIG1hcmtlZElucHV0RmllbGRcbiAqXG4gKiAjIFBvc3RlZE1hcmtlZEV4dGVuc2lvblxuICpcbiAqIEluIG9yZGVyIGZvciBmdWxsIGZ1bmN0aW9uYWxpdHksIGl0IGlzIHJlY29tbWVuZGVkIHRvIHJ1biB0aGUgYHBvc3Rwcm9jZXNzYCBmdW5jdGlvbiBhcyByZXR1cm5lZCBhZnRlciB0aGUgbWFya2Rvd24gaGFzIGJlZW4gcmVuZGVyZWQgdG8gdGhlIERPTS5cbiAqIEV4YW1wbGVcbiAqIGBgYHRzXG4gKiAvLyAuLi5cbiAqIGNvbnN0IGV4dGVuc2lvbiA9IG1hcmtlZERyb3Bkb3duKCk7XG4gKiBtYXJrZWQudXNlKGV4dGVuc2lvbik7XG4gKiBvYmouaW5uZXJIVE1MID0gbWFya2VkLnBhcnNlKHRleHQpO1xuICogZXh0ZW5zaW9uLnBvc3Rwcm9jZXNzKG9iaik7XG4gKiAvLyAuLi5cbiAqIGBgYFxuICogVGhlIGFib3ZlIGNhbGwgaXMgcmVjb21lbmVkIGFzIGlucHV0IGV2ZW50cyBjYW4ndCBiZSBnZW5lcmF0ZWQgZm9yIHN0cmluZ3MsIGhlbmNlIHdlIGhhdmUgdG8gZG8gaXQgYWZ0ZXJ3YXJkcy5cbiAqXG4gKiAjIFBhcmFtZXRlcnNcbiAqXG4gKiBAcGFyYW0gY2FsbGJhY2sgRnVuY3Rpb24gdG8gY2FsbCB1cG9uIGEgdmFsdWUgYmVpbmcgY2hhbmdlZC4gRG9lcyBub3QgZXhwZWN0IGEgcmVzcG9uc2UgYmFjay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmtlZERyb3Bkb3duKGNhbGxiYWNrOiAoaWQ6IHN0cmluZywgdmFsdWU6IHN0cmluZykgPT4gdm9pZCA9ICgpID0+IHsgfSk6IFBvc3RlZE1hcmtlZEV4dGVuc2lvbiB7XG4gIGZ1bmN0aW9uIGNsaWNrTGlzdGVuZXIodGhpczogSFRNTElucHV0RWxlbWVudCwgX2V2ZW50OiBFdmVudCkge1xuICAgIC8vIGNvbnNvbGUud2FybihcIkVESVRBQkxFIE1BUktET1dOIENMSUNLRUQgT046IFwiLCB0aGlzLmlkLCBcIiBNQURFIElOVE86IFwiLCB0aGlzLmNoZWNrZWQpO1xuICAgIGNhbGxiYWNrKHRoaXMuaWQsIHRoaXMudmFsdWUpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBleHRlbnNpb25zOiBbe1xuICAgICAgbmFtZTogXCJlZGl0YWJsZURyb3Bkb3duXCIsXG4gICAgICBsZXZlbDogXCJpbmxpbmVcIixcbiAgICAgIHN0YXJ0KHNyYykge1xuICAgICAgICByZXR1cm4gc3JjLm1hdGNoKC9eXFxbPlxcXS8pPy5pbmRleDtcbiAgICAgIH0sXG4gICAgICB0b2tlbml6ZXIoc3JjKTogRHJvcGRvd25Ub2tlbiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHJ1bGUgPSAvXlxcWz5cXF1cXFsoLiopXFxdXFxbKC4qKVxcXS87XG4gICAgICAgIGNvbnN0IG1hdGNoID0gcnVsZS5leGVjKHNyYyk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHNyYywgXCItPiBEcm9wZG93biBtYXRjaDogXCIsIG1hdGNoKTtcblxuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmF3OiBtYXRjaFswXSxcbiAgICAgICAgICAgIHR5cGU6IFwiZWRpdGFibGVEcm9wZG93blwiLFxuICAgICAgICAgICAgaWQ6IG1hdGNoWzJdLFxuICAgICAgICAgICAgb3B0aW9uczogbWF0Y2hbMV0uc3BsaXQoXCIsXCIpXG4gICAgICAgICAgICAgIC5tYXAoKG9wdCkgPT4gb3B0LnRyaW0oKS5yZXBsYWNlQWxsKCdcIicsIFwiXCIpKSxcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICByZW5kZXJlcih0KSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwibWFya2VkX2Ryb3Bkb3duX2ludGVybmFsX3JlbmRlciB0OiBcIiwgdCk7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdCBhcyBEcm9wZG93blRva2VuO1xuICAgICAgICAvLyByZXR1cm4gXCJcIjtcbiAgICAgICAgcmV0dXJuIGA8c2VsZWN0IGlkPSR7dG9rZW4uaWR9IGNhbGxiYWNrPiR7dG9rZW4ub3B0aW9ucy5tYXAob3B0ID0+IGA8b3B0aW9uPiR7b3B0fTwvb3B0aW9uPmApLmpvaW4oKX08L3NlbGVjdD5gO1xuICAgICAgfVxuICAgIH1dLFxuICAgIHBvc3Rwcm9jZXNzKG9iaikge1xuICAgICAgb2JqLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NlbGVjdFtjYWxsYmFja10nKS5mb3JFYWNoKGkgPT4ge1xuICAgICAgICBjb25zdCBpbnB1dCA9IGkgYXMgSFRNTElucHV0RWxlbWVudDtcblxuICAgICAgICAvLyByZW1vdmUgdGhlIHByZXZpb3VzIGxpc3RlbmVyIGp1c3QgaW4gY2FzZSBzdHVmZiBicmVha3MuLi5cbiAgICAgICAgaW5wdXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgY2xpY2tMaXN0ZW5lcik7XG5cbiAgICAgICAgLy8gYWRkIG91ciBvd24gY3VzdG9tIGxpc3RlbmVyLlxuICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBjbGlja0xpc3RlbmVyKTtcbiAgICAgIH0pXG4gICAgfVxuICB9XG59XG4iLAogICAgImltcG9ydCB7IFRva2VuIH0gZnJvbSBcIm1hcmtlZFwiO1xuaW1wb3J0IHsgUG9zdGVkTWFya2VkRXh0ZW5zaW9uIH0gZnJvbSBcIi4vbWFya2VkXCI7XG5cbnR5cGUgSW5wdXRUb2tlbiA9IHtcbiAgdHlwZTogXCJtYXJrZWRJbnB1dEZpZWxkXCI7XG4gIHJhdzogc3RyaW5nO1xuICAvLyBpbnB1dF90eXBlOiBzdHJpbmc7XG4gIGlkOiBzdHJpbmc7XG4gIC8vIHBhcmFtZXRlcnM/OiBSYW5nZVBhcmFtZXRlcnM7XG4gIGxhYmVsOiBUb2tlbltdLFxufSAmIChcbiAgICB8IHtcbiAgICAgIGlucHV0X3R5cGU6IFwicmFuZ2VcIjtcbiAgICAgIHBhcmFtZXRlcnM6IFJhbmdlUGFyYW1ldGVycztcbiAgICB9IHwge1xuICAgICAgaW5wdXRfdHlwZTogRXhjbHVkZTxzdHJpbmcsIFwicmFuZ2VcIiB8IFwiY2hlY2tib3hcIj47XG4gICAgICBwYXJhbWV0ZXJzOiB1bmRlZmluZWQ7XG4gICAgfSB8IHtcbiAgICAgIGlucHV0X3R5cGU6IFwiY2hlY2tib3hcIjtcbiAgICAgIHBhcmFtZXRlcnM6IENoZWNrUGFyYW1ldGVycztcbiAgICB9XG4gICk7XG5cbmludGVyZmFjZSBSYW5nZVBhcmFtZXRlcnMge1xuICBtaW5pbXVtOiBudW1iZXIsXG4gIG1heGltdW06IG51bWJlcixcbiAgZGVmYXVsdD86IG51bWJlcixcbiAgc3RlcD86IG51bWJlcixcbn1cblxuaW50ZXJmYWNlIENoZWNrUGFyYW1ldGVycyB7XG4gIGNoZWNrZWQ6IGJvb2xlYW4sXG59XG5cbi8qKlxuICogQWxsb3cgZm9yIG11bHRpcGxlIHR5cGVzIG9mIGlucHV0IGZpZWxkcyB0byBiZSBzdXBwb3J0ZWQuXG4gKlxuICogQ3VycmVudGx5IHN1cHBvcnRlZDogWyByYW5nZSwgY2hlY2tib3ggXVxuICpcbiAqICMgTWFya2Rvd24gVXNhZ2VcbiAqXG4gKiBgYGBtZFxuICogWyBdW2NoZWNrYm94LWlkXSAqY2hlY2tib3ggbGFiZWwqXG4gKiBbcmFuZ2UsIDEwMCwgNTAwLCAxMDAsIDIwXVtyYW5nZS1pZF1cbiAqIGBgYFxuICpcbiAqICMjIE9wdGlvbnNcbiAqIEFsbCBpbnB1dCBmaWVsZHMgdXNlIGEgdmFyaWF0aW9uIG9mIHRoZSBkb3VibGUgYFtdYCBjb21iby4gVGhlIGZpcnN0IGBbXWAgZ2l2ZXMgaW5mb3JtYXRpb24gb24gdGhlIGVsZW1lbnQgd2hpbHN0IHRoZSBzZWNvbmQgYFtdYCBnaXZlcyB0aGUgaWQgb2YgdGhlIGVsZW1lbnQuXG4gKlxuICogIyMjIENoZWNrYm94XG4gKiBGb3JtYXQ6IGBbY2hlY2tlZD9dW2lkXWAuXG4gKiAtIENoZWNrZWQgaXMgb3B0aW9uYWwgYW5kIGNhbiBiZSBlaXRoZXIgYHhgIG9yIGBYYCBqdXN0IGxpa2Ugbm9ybWFsIG1hcmtkb3duLiBJZiB5b3Ugd2FudCBpdCB0byBiZSBvcHRpb25hbCwgbWFrZSBpdCBhIHNwYWNlIGNoYXJhY3RlciAoYFsgXWApIGluc3RlYWQuXG4gKiAtIEFzIGEgZG93bnNpZGUsIGVkaXRhYmxlIGNoZWNrYm94ZXMgY2FuIGJlIHVzZWQgd2hpbHN0IG5vdCBpbiB0aGUgb2ZmaWNpYWwgbGlzdCBmb3JtYXQuXG4gKlxuICogIyMjIFJhbmdlXG4gKiBGb3JtYXQ6IGBbcmFuZ2UsIG1pbiwgbWF4LCBkZWZhdWx0Pywgc3RlcD9dW2lkXWBcbiAqIC0gYHJhbmdlYCBpcyByZXF1aXJlZCBpbiBwbGFpbiB0ZXh0LiBFdmVyeXRoaW5nIGluIHRoZSBmaXJzdCBgW11gIG11c3QgYmUgc2VwYXJhdGVkIGJ5IGNvbW1hcy5cbiAqIC0gYG1pbmAsIGBtYXhgLCBgZGVmYXVsdGAsIGBzdGVwYCBpZiBwcm92aWRlZCBzaG91bGQgYmUgbnVtYmVycywgdGhhdCB3aGljaCB7QGxpbmsgTnVtYmVyKCl9IGNhbiBwYXJzZS5cbiAqIC0gYGRlZmF1bHRgIHdpbGwgcmVzb3J0IHRvIGBtaW5gIGlmIG5vdCBwcm92aWRlZC5cbiAqIC0gYHN0ZXBgIHdpbGwgcmVzb3J0IHRvIGBhdXRvYCBpZiBub3QgcHJvdmlkZWQuXG4gKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0hUTUwvUmVmZXJlbmNlL0VsZW1lbnRzL2lucHV0L3JhbmdlIGZvciBtb3JlIGluZm9ybWF0aW9uIHJlbGF0ZWQgdG8gdGhpcy5cbiAqXG4gKlxuICogIyBQb3N0ZWRNYXJrZWRFeHRlbnNpb25cbiAqXG4gKiBJbiBvcmRlciBmb3IgZnVsbCBmdW5jdGlvbmFsaXR5LCBpdCBpcyByZWNvbW1lbmRlZCB0byBydW4gdGhlIGBwb3N0cHJvY2Vzc2AgZnVuY3Rpb24gYXMgcmV0dXJuZWQgYWZ0ZXIgdGhlIG1hcmtkb3duIGhhcyBiZWVuIHJlbmRlcmVkIHRvIHRoZSBET00uXG4gKiBFeGFtcGxlXG4gKiBgYGB0c1xuICogLy8gLi4uXG4gKiBjb25zdCBleHRlbnNpb24gPSBtYXJrZWRJbnB1dEZpZWxkKCk7XG4gKiBtYXJrZWQudXNlKGV4dGVuc2lvbik7XG4gKiBvYmouaW5uZXJIVE1MID0gbWFya2VkLnBhcnNlKHRleHQpO1xuICogZXh0ZW5zaW9uLnBvc3Rwcm9jZXNzKG9iaik7XG4gKiAvLyAuLi5cbiAqIGBgYFxuICogVGhlIGFib3ZlIGNhbGwgaXMgcmVjb21lbmVkIGFzIGlucHV0IGV2ZW50cyBjYW4ndCBiZSBnZW5lcmF0ZWQgZm9yIHN0cmluZ3MsIGhlbmNlIHdlIGhhdmUgdG8gZG8gaXQgYWZ0ZXJ3YXJkcy5cbiAqXG4gKiAjIFBhcmFtZXRlcnNcbiAqXG4gKiBAcGFyYW0gY2FsbGJhY2sgRnVuY3Rpb24gdG8gY2FsbCB1cG9uIGEgdmFsdWUgYmVpbmcgY2hhbmdlZC4gRG9lcyBub3QgZXhwZWN0IGEgcmVzcG9uc2UgYmFjay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmtlZElucHV0RmllbGQoY2FsbGJhY2s6IChpZDogc3RyaW5nLCBldmVudDogSW5wdXRFdmVudCkgPT4gdm9pZCA9ICgpID0+IHsgfSk6IFBvc3RlZE1hcmtlZEV4dGVuc2lvbiB7XG4gIGZ1bmN0aW9uIGlucHV0TGlzdGVuZXIodGhpczogSFRNTElucHV0RWxlbWVudCwgZXZlbnQ6IEV2ZW50KSB7XG4gICAgY2FsbGJhY2sodGhpcy5pZCwgZXZlbnQgYXMgSW5wdXRFdmVudCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGV4dGVuc2lvbnM6IFt7XG4gICAgICBuYW1lOiBcIm1hcmtlZElucHV0RmllbGRcIixcbiAgICAgIGxldmVsOiBcImlubGluZVwiLFxuICAgICAgc3RhcnQoc3JjKSB7XG4gICAgICAgIHJldHVybiBzcmMubWF0Y2goL15cXFsocmFuZ2V8WyB4WF0pLyk/LmluZGV4O1xuICAgICAgfSxcbiAgICAgIHRva2VuaXplcihzcmMpOiBJbnB1dFRva2VuIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgcnVsZSA9IC9eXFxbKHJhbmdlfFsgeFhdKSg/OiwgKT8oLiopXFxdXFxbKC4qKVxcXSguKikvO1xuICAgICAgICBjb25zdCBtYXRjaCA9IHJ1bGUuZXhlYyhzcmMpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyh7IHNyYywgbWF0Y2ggfSk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgW3JhdywgaW5wdXRfdHlwZSwgZGF0YSwgaWQsIGxhYmVsXSA9IG1hdGNoO1xuICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yIDIzMjIgVGhlIGlucHV0X3R5cGUgYW5kIHBhcmFtZXRlcnMgZ2V0IGFzc2lnbmVkIGxhdGVyIGluIHRoZWlyIG93biBzZWN0aW9ucy5cbiAgICAgICAgLy8gSSBqdXN0Li4uIGNhbid0IGZ1bGx5IHdvcmsgb3V0IGhvdyB0byB0ZWxsIHRzIHRoYXQuLi5cbiAgICAgICAgY29uc3QgdG9rZW46IElucHV0VG9rZW4gPSB7XG4gICAgICAgICAgaWQsIHJhdywgdHlwZTogXCJtYXJrZWRJbnB1dEZpZWxkXCIsXG4gICAgICAgICAgbGFiZWw6IHRoaXMubGV4ZXIuaW5saW5lVG9rZW5zKGxhYmVsKSxcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAoaW5wdXRfdHlwZSkge1xuICAgICAgICAgIGNhc2UgXCJyYW5nZVwiOiB7XG4gICAgICAgICAgICBjb25zdCBzcGxpdF9kYXRhID0gZGF0YS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICB0b2tlbi5pbnB1dF90eXBlID0gXCJyYW5nZVwiO1xuICAgICAgICAgICAgdG9rZW4ucGFyYW1ldGVycyA9IHtcbiAgICAgICAgICAgICAgbWluaW11bTogTnVtYmVyKHNwbGl0X2RhdGFbMF0pLFxuICAgICAgICAgICAgICBtYXhpbXVtOiBOdW1iZXIoc3BsaXRfZGF0YVsxXSksXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IHNwbGl0X2RhdGFbMl0gPyBOdW1iZXIoc3BsaXRfZGF0YVsyXSkgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIHN0ZXA6IHNwbGl0X2RhdGFbM10gPyBOdW1iZXIoc3BsaXRfZGF0YVszXSkgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSBcIiBcIjpcbiAgICAgICAgICBjYXNlIFwiWFwiOlxuICAgICAgICAgIGNhc2UgXCJ4XCI6IHtcbiAgICAgICAgICAgIHRva2VuLmlucHV0X3R5cGUgPSBcImNoZWNrYm94XCI7XG4gICAgICAgICAgICB0b2tlbi5wYXJhbWV0ZXJzID0ge1xuICAgICAgICAgICAgICBjaGVja2VkOiBpbnB1dF90eXBlLnRvTG93ZXJDYXNlKCkgPT09IFwieFwiLFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2codG9rZW4pO1xuICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICB9LFxuICAgICAgY2hpbGRUb2tlbnM6IFsnbGFiZWwnXSxcbiAgICAgIHJlbmRlcmVyKHQpIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0IGFzIElucHV0VG9rZW47XG5cbiAgICAgICAgbGV0IHJlc3VsdCA9IGA8aW5wdXQgdHlwZT1cIiR7dG9rZW4uaW5wdXRfdHlwZX1cIiBpZD1cIiR7dG9rZW4uaWR9XCIgY2FsbGJhY2tgO1xuICAgICAgICBzd2l0Y2ggKHRva2VuLmlucHV0X3R5cGUpIHtcbiAgICAgICAgICBjYXNlIFwicmFuZ2VcIjpcbiAgICAgICAgICAgIHJlc3VsdCA9IGAke3Jlc3VsdH0gbWluPVwiJHt0b2tlbi5wYXJhbWV0ZXJzIS5taW5pbXVtfVwiIG1heD1cIiR7dG9rZW4ucGFyYW1ldGVycyEubWF4aW11bX1cIiB2YWx1ZT1cIiR7dG9rZW4ucGFyYW1ldGVycyEuZGVmYXVsdH1cIiBzdGVwPVwiJHt0b2tlbi5wYXJhbWV0ZXJzIS5zdGVwfVwiYDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgXCJjaGVja2JveFwiOlxuICAgICAgICAgICAgcmVzdWx0ID0gYCR7cmVzdWx0fSAke3Rva2VuLnBhcmFtZXRlcnMhLmNoZWNrZWQgPyBcImNoZWNrZWRcIiA6IFwiXCJ9YDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6IGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbGFiZWwgPSB0b2tlbi5sYWJlbC5sZW5ndGggPiAwID8gYDxsYWJlbCBmb3I9XCIke3Rva2VuLmlkfVwiPiR7dGhpcy5wYXJzZXIucGFyc2VJbmxpbmUodG9rZW4ubGFiZWwpfTwvbGFiZWw+YCA6ICcnO1xuICAgICAgICByZXR1cm4gYCR7cmVzdWx0fT48L2lucHV0PiR7bGFiZWx9YDtcbiAgICAgIH1cbiAgICB9XSxcbiAgICBwb3N0cHJvY2VzcyhvYmopIHtcbiAgICAgIG9iai5xdWVyeVNlbGVjdG9yQWxsKFwiaW5wdXRbY2FsbGJhY2tdXCIpLmZvckVhY2goaSA9PiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gaSBhcyBIVE1MSW5wdXRFbGVtZW50O1xuXG4gICAgICAgIGlucHV0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2lucHV0JywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICB9KVxuICAgIH1cbiAgfVxufVxuIiwKICAgICJpbXBvcnQgeyBNYXJrZWRFeHRlbnNpb24gfSBmcm9tIFwibWFya2VkXCJcblxuLyoqXG4gKiBTdXJyb3VuZHMgZXZlcnkgaW1hZ2UgaW4gYSBkaXYgd2l0aCB0aGUgY2xhc3MgYGltZ2AgdG8gYWxsb3cgZm9yIHBhcmVudC1yZWxhdGVkIGNzcy5cbiAqXG4gKiAjIE1hcmtkb3duIFVzYWdlXG4gKlxuICogTi9BLiBUaGUgbWFya2Rvd24gaXMgdGhlIHNhbWUuXG4gKlxuICogIyMgRXhhbXBsZVxuICogYGBgbWRcbiAqICFbQSBwaWN0dXJlIG9mIHRoZSB1bmNvbW1pdHRlZCBmaWxlcyBpIGhhdmUgZnJvbSBydW5uaW5nIHRoZSBjb21tYW5kIGBnaXQgc3RhdHVzYC4gQ29udGFpbnMgZmlsZXMgaW4gbWFueSBmb2xkZXJzLl0oQmxvZy9Bc3NldHMvMjAyNS0wMi0wNy9TY3JlZW5zaG90XzIwMjUwMjA3XzE5NDgxMS5wbmdcbiAqIGBgYFxuICogdHVybnMgdG9cbiAqIGBgYGh0bWxcbiAqIDxkaXYgY2xhc3M9XCJpbWdcIj5cbiAqICAgPGltZyBzcmM9XCJ1cmxcIiBhbHQ9XCJ0ZXh0XCI+XG4gKiA8L2Rpdj5cbiAqIGBgYFxuICpcbiAqICMgUmVjb21tZW5kIGNzc1xuICpcbiAqIFBlcnNvbmFsbHksIGkgcmVjb21tZW5kIGFkZGluZyB0aGUgZm9sbG93aW5nIGNzcy5cbiAqIGBgYGNzc1xuICogLy8gRm9yY2VzIHRoZSBpbWFnZSB0byBzY3JvbGwgaG9yaXpvbnRhbGx5IGluc3RlYWQgb2YgaGF2aW5nIHRoZSB3aG9sZSBjb250YWluZXIgc2Nyb2xsIGhvcml6b250YWxseS5cbiAqIGRpdi5pbWcge1xuICogICB3aWR0aDogMTAwJTtcbiAqICAgb3ZlcmZsb3c6IGF1dG87XG4gKiB9XG4gKiBgYGBcbiAqIFRoZSBhYm92ZSBjc3MgaXMgd2hhdCBpIG9yaWdpbmFsbHkgY3JlYXRlZCB0aGlzIGZvciwgYXMgaXQncyBlYXNpZXIgdGhhbiBqdXN0IGd1ZXNzaW5nLiBUaGlzIGlzIG5vdCBhZGRlZCBhdXRvbWF0aWNhbGx5IGFzIGNzcyBzdHlsaW5nIHNob3VsZCBiZSBsZWZ0IHRvIGV4dGVybmFsIHdvcmsuXG4gKlxuICogIyBQYXJhbWV0ZXJzXG4gKlxuICogQHBhcmFtIHVzZVJlbW90ZSBUaGUgc2VydmVyIHRvIHVzZSB0byByZXRyaWV2ZSB0aGUgaW1hZ2VzLlxuICogICAgQ2FuIGJlIHJlYWxseSB1c2VmdWwgb24gZ2l0aHViLXJlbGF0ZWQgc2VydmVycyB0byBzYXZlIGJ1aWxkIHNpemUuXG4gKiAgICBDaGFuZ2VzIGEgcmVxdWVzdCB0byBgaHR0cHM6Ly97eW91ci1zZXJ2ZXItdXJsfS9wYXRoL3RvL2ZpbGVgIHRvIGBodHRwczovL3t1c2UtcmVtb3RlLXVybH0vcGF0aC90by9maWxlYFxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFya2VkSW1wcm92ZWRJbWFnZSh1c2VSZW1vdGU/OiBVUkwpOiBNYXJrZWRFeHRlbnNpb24ge1xuICByZXR1cm4ge1xuICAgIHJlbmRlcmVyOiB7XG4gICAgICBpbWFnZSh7IGhyZWYsIHRleHQsIHRpdGxlIH0pIHtcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgPGRpdiBjbGFzcz1cImltZ1wiPlxuICAgICAgICAgIDxpbWcgc3JjPVwiJHt1c2VSZW1vdGUgPyBgJHt1c2VSZW1vdGV9LyR7aHJlZn1gIDogaHJlZn1cIiwgYWx0PVwiJHt0ZXh0fVwiIHRpdGxlPVwiJHt0aXRsZX1cIlwiPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgYFxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwKICAgICJpbXBvcnQgeyBQb3N0ZWRNYXJrZWRFeHRlbnNpb24gfSBmcm9tIFwiLi9tYXJrZWRcIjtcblxuLyoqXG4qIFJlcGxhY2UgdGhlIG5vcm1hbCBtYXJrZG93biBsaW5rIHByb3ZpZGVkIGJ5IG1hcmtlZC5qcyB3aXRoIGEgY3VzdG9tIGxpbmsgdGhhdCBhbGxvd3MgZXhlY3V0aW9uIG9mIGEgY3VzdG9tIGZ1bmN0aW9uIGJlZm9yZSByZWRpcmVjdGlvbi5cbipcbiogIyBNYXJrZG93biBVc2FnZVxuKlxuKiBOL0EuIFRoZSBtYXJrZG93biBpcyBleGFjdGx5IHRoZSBzYW1lLlxuKlxuKlxuKiAjIFBvc3RlZE1hcmtlZEV4dGVuc2lvblxuKlxuKiBJbiBvcmRlciBmb3IgZnVsbCBmdW5jdGlvbmFsaXR5LCBpdCBpcyByZWNvbW1lbmRlZCB0byBydW4gdGhlIGBwb3N0cHJvY2Vzc2AgZnVuY3Rpb24gYXMgcmV0dXJuZWQgYWZ0ZXIgdGhlIG1hcmtkb3duIGhhcyBiZWVuIHJlbmRlcmVkIHRvIHRoZSBET00uXG4qIEV4YW1wbGVcbiogYGBgdHNcbiogLy8gLi4uXG4qIGNvbnN0IGV4dGVuc2lvbiA9IG1hcmtlZExvY2FsTGluaygpO1xuKiBtYXJrZWQudXNlKGV4dGVuc2lvbik7XG4qIG9iai5pbm5lckhUTUwgPSBtYXJrZWQucGFyc2UodGV4dCk7XG4qIGV4dGVuc2lvbi5wb3N0cHJvY2VzcyhvYmopO1xuKiAvLyAuLi5cbiogYGBgXG4qIFRoZSBhYm92ZSBjYWxsIGlzIHJlY29tZW5lZCBhcyBpbnB1dCBldmVudHMgY2FuJ3QgYmUgZ2VuZXJhdGVkIGZvciBzdHJpbmdzLCBoZW5jZSB3ZSBoYXZlIHRvIGRvIGl0IGFmdGVyd2FyZHMuXG4qXG4qICMgUGFyYW1ldGVyc1xuKlxuKiBAcGFyYW0gY2FsbGJhY2sgV2hhdCB0byBkbyB1cG9uIGNsaWNraW5nIHRoaXMgbGluay4gTk9URTogSWYgdGhpcyBkb2VzIG5vdCByZXR1cm4gdHJ1ZSwgdGhlIGRlZmF1bHQgKGxpbmsgcmVkaXJlY3QpIHdpbGwgYmUgZG9uZSBhcyB3ZWxsLlxuKiBAcGFyYW0gc2l0ZSBZb3VyIHNpdGUgaG9zdCAobmV3IFVSTChsb2NhdGlvbikuaG9zdCkuIERlc2lnbmVkIGZvciB3aGVuIHJ1bm5pbmcgb24gbG9jYWxob3N0OjgwODAuXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmtlZExvY2FsTGluayhjYWxsYmFjazogKHVybDogVVJMKSA9PiBib29sZWFuID0gKF8pID0+IGZhbHNlLCBzaXRlID0gd2luZG93LmxvY2F0aW9uLmhvc3QpOiBQb3N0ZWRNYXJrZWRFeHRlbnNpb24ge1xuICBjb25zdCBjdXJyZW50VXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcblxuICAvKipcbiAgICogQHRoaXMgSFRNTEFuY2hvckVsZW1lbnQgVGhlIGBhYCB0YWcgcmVmZXJlbmNlZFxuICAgKiBAcGFyYW0gZXZlbnQgVGhlIGV2ZW50IGRldGFpbHNcbiAgICogQHJldHVybnNcbiAgICovXG4gIGZ1bmN0aW9uIGNsaWNrTGlzdGVuZXIodGhpczogSFRNTEFuY2hvckVsZW1lbnQsIGV2ZW50OiBQb2ludGVyRXZlbnQpIHtcbiAgICAvLyBwYXNzIHRvIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgLy8gY29uc29sZS5sb2coXCJsaW5rIGluZm86IFwiLCBsaW5rLmRhdGFzZXQuZGVzdCk7XG4gICAgLy8gY29uc29sZS5sb2coXCJsaW5rIGluZm86IFwiLCBsaW5rLmRhdGFzZXQpO1xuXG4gICAgLy8gYnlwYXNzIGV2ZXJ5dGhpbmcgaW4gb3JkZXIgZm9yIGN0cmwvc2hpZnQgY2xpY2suXG4gICAgaWYgKGV2ZW50LmN0cmxLZXkgfHwgZXZlbnQuc2hpZnRLZXkgfHwgZXZlbnQubWV0YUtleSB8fCBldmVudC5hbHRLZXkgfHwgZXZlbnQuYnV0dG9uID09PSAxKVxuICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zb2xlLmxvZyhcImxpbmsgaW5mbzogXCIsIHRoaXMuaHJlZik7XG4gICAgY29uc3QgcmVzdWx0ID0gY2FsbGJhY2sobmV3IFVSTCh0aGlzLmhyZWYpKTtcblxuICAgIC8vIGlmIHdlIGRvbid0IGdldCBhIHRydWUgcmVzdWx0LCBhc3N1bWUgc29tZXRoaW5nIGJhZCBoYXBwZW5lZC5cbiAgICBpZiAocmVzdWx0ICE9PSB0cnVlKSB7XG4gICAgICBjb25zb2xlLmxvZygnQ2FsbGJhY2sgZmFpbGVkLCBhdXRvIHJlZGlyZWN0IHRvIG9yaWdpbmFsIGxvY2F0aW9uLicpO1xuICAgICAgLy8gd2luZG93LmxvY2F0aW9uLmhyZWYgPSBsaW5rLmRhdGFzZXQuZGVzdDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwb3N0cHJvY2VzcyhvYmopIHtcbiAgICAgIG9iai5xdWVyeVNlbGVjdG9yQWxsKCdhW2NhbGxiYWNrXScpLmZvckVhY2gobCA9PiB7XG4gICAgICAgIGNvbnN0IGxpbmsgPSBsIGFzIEhUTUxBbmNob3JFbGVtZW50O1xuXG4gICAgICAgIC8vIHJlbW92ZSB0aGUgcHJldmlvdXMgbGlzdGVuZXIganVzdCBpbiBjYXNlIHN0dWZmIGJyZWFrcy4uLlxuICAgICAgICBsaW5rLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2xpY2tMaXN0ZW5lcik7XG5cbiAgICAgICAgLy8gYWRkIG91ciBvd24gY3VzdG9tIGxpc3RlbmVyLlxuICAgICAgICBsaW5rLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2xpY2tMaXN0ZW5lcik7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgcmVuZGVyZXI6IHtcbiAgICAgIGxpbmsoeyBocmVmLCB0aXRsZSwgdGV4dCB9KSB7XG4gICAgICAgIC8vIGNoZWNrcyBmb3IgYSB2YWxpZCB1cmwsIGlmIG5vdGhpbmcgaXMgdmFsaWQgcmV0dXJuIGZhbHNlIHRvIGFsbG93IHRoZSBmYWxsYmFjayAocHJldmlvdXMpIHRvIHdvcmsuXG4gICAgICAgIGxldCB1cmw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKCFocmVmKSByZXR1cm4gZmFsc2U7IC8vIGlmIGhyZWYgaXMgZW1wdHksIHJldHVybiBudWxsXG4gICAgICAgICAgdXJsID0gbmV3IFVSTChocmVmLCBjdXJyZW50VXJsKTsgLy8gY29udmVydCByZWxhdGl2ZSBVUkxzIHRvIGFic29sdXRlXG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgVVJMOicsIGhyZWYpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGxvY2FsID0gdXJsLmhvc3QgPT09IGN1cnJlbnRVcmwuaG9zdCB8fFxuICAgICAgICAgIHVybC5ob3N0LmluY2x1ZGVzKFwibG9jYWxob3N0XCIpIHx8IC8vIGZvciBydW5uaW5nIGxvY2FsIHNlcnZlclxuICAgICAgICAgIHVybC5ob3N0ID09PSBzaXRlOyAvLyBmb3IgcnVubmluZyBsb2NhbCBzZXJ2ZXIgd2l0aCBsaW5rcyB0byB5b3VyIGFjdHVhbCBzaXRlLlxuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdMb2NhbDonLCBsb2NhbCk7XG5cbiAgICAgICAgLy8gbWFrZSB0aGUgbmV3IHVybC5cbiAgICAgICAgcmV0dXJuIGA8YSBocmVmPVwiJHtocmVmfVwiJHt0aXRsZSA/IGAgdGl0bGU9XCIke3RpdGxlfVwiYCA6ICcnfSR7bG9jYWwgPyAnIGNhbGxiYWNrJyA6ICcnfT4ke3RleHR9PC9hPmA7XG4gICAgICB9LFxuICAgIH0sXG4gIH07XG59XG4iLAogICAgImltcG9ydCB7IE1hcmtlZEV4dGVuc2lvbiB9IGZyb20gXCJtYXJrZWRcIjtcblxuLy8vIFVzZXMgdGhlIG5hdmlnYXRvciBsYW5ndWFnZSBhbmQgZmFsbHMgYmFjayB0byB0aGUgZW5nbGlzaCB0aW1lem9uZSBpZiBpdCBjYW4ndCBmaW5kIGl0LlxuY29uc3QgbG9jYWxlID0gdHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcgPyBuYXZpZ2F0b3IubGFuZ3VhZ2UgOiAnZW4tR0InO1xuXG5mdW5jdGlvbiBmbXRQYXJ0cyhkYXRlOiBEYXRlLCBvcHRpb25zOiBJbnRsLkRhdGVUaW1lRm9ybWF0T3B0aW9ucykge1xuICByZXR1cm4gbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQobG9jYWxlLCBvcHRpb25zKS5mb3JtYXQoZGF0ZSk7XG59XG5cbmZ1bmN0aW9uIHR3b0RpZ2l0KG51bWJlcjogbnVtYmVyKSB7XG4gIHJldHVybiBTdHJpbmcobnVtYmVyKS5wYWRTdGFydCgyLCAnMCcpO1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZSB0aGUgYW1vdW50IHRvIG5vdyBhbmQgZm9ybWF0IHRoZSBpdCBhY2NvcmRpbmdseS5cbiAqIEBwYXJhbSBkYXRlIFRoZSBkYXRlIHdlIHdhbnQgdG8gY2FsY3VsYXRlIGZyb20uXG4gKiBAcmV0dXJucyBUaGUgZm9ybWF0dGVkIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gcmVsYXRpdmUoZGF0ZTogRGF0ZSkge1xuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBkaWZmU2Vjb25kcyA9IE1hdGgucm91bmQoKGRhdGUuZ2V0VGltZSgpIC0gbm93LmdldFRpbWUoKSkgLyAxMDAwKTtcbiAgY29uc3QgdW5pdHMgPSBbXG4gICAgeyB1bml0OiAneWVhcicsIHNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NSB9LFxuICAgIHsgdW5pdDogJ21vbnRoJywgc2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzAgfSxcbiAgICB7IHVuaXQ6ICdkYXknLCBzZWNvbmRzOiA2MCAqIDYwICogMjQgfSxcbiAgICB7IHVuaXQ6ICdob3VyJywgc2Vjb25kczogNjAgKiA2MCB9LFxuICAgIHsgdW5pdDogJ21pbnV0ZScsIHNlY29uZHM6IDYwIH0sXG4gICAgeyB1bml0OiAnc2Vjb25kJywgc2Vjb25kczogMSB9XG4gIF07XG4gIGNvbnN0IGZvdW5kID0gdW5pdHMuZmluZCh4ID0+IE1hdGguYWJzKGRpZmZTZWNvbmRzKSA+PSB4LnNlY29uZHMpID8/IHVuaXRzW3VuaXRzLmxlbmd0aCAtIDFdO1xuICBjb25zdCB2YWx1ZSA9IE1hdGgucm91bmQoZGlmZlNlY29uZHMgLyBmb3VuZC5zZWNvbmRzKTtcbiAgcmV0dXJuIG5ldyBJbnRsLlJlbGF0aXZlVGltZUZvcm1hdChsb2NhbGUsIHsgbnVtZXJpYzogJ2F1dG8nIH0pLmZvcm1hdCh2YWx1ZSwgZm91bmQudW5pdCBhcyBJbnRsLlJlbGF0aXZlVGltZUZvcm1hdFVuaXQpO1xufVxuXG5cbi8vIENvZGUgdG8gcHJvY2VzcyBydWxlcyBhbmQgZGlzcGxheS5cblxubGV0IHJ1bGUgPSAnJztcbmNvbnN0IGNvbmRpdGlvbnM6IFJlY29yZDxzdHJpbmcsIChkOiBEYXRlKSA9PiBzdHJpbmc+ID0ge307XG5cbi8qKlxuKiBBZGQgYSBydWxlIHRvIHRoZSBzeXN0ZW0uXG4qIEBwYXJhbSB7c3RyaW5nfSBjb25kaXRpb24gVGhlIGNvbmRpdGlvbiB0byBsaXN0ZW4gZm9yXG4qIEBwYXJhbSB7KGQ6IERhdGUpID0+IHN0cmluZ30gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGNhbGwgdG8gdHJpZ2dlciBzYWlkIGNvbmRpdGlvblxuKi9cbmZ1bmN0aW9uIGFkZFJ1bGUoY29uZGl0aW9uOiBzdHJpbmcsIGNhbGxiYWNrOiAoZDogRGF0ZSkgPT4gc3RyaW5nKSB7XG4gIGNvbnN0IGNvbmRpdGlvbmVkX3J1bGUgPSBgJHtjb25kaXRpb259fGA7XG4gIGlmICghcnVsZS5pbmNsdWRlcyhjb25kaXRpb25lZF9ydWxlKSkgcnVsZSArPSBjb25kaXRpb25lZF9ydWxlO1xuICBjb25kaXRpb25zW2NvbmRpdGlvbl0gPSBjYWxsYmFjaztcbn1cblxuLyoqXG4gKiBEaXNwbGF5IGEgdGltZXN0YW1wIGluIHRoZSB2aWV3ZXJzIGxvY2FsIHRpbWUuIEtpbmRhIGxpa2UgZGlzY29yZCB0aW1lc3RhbXBzLlxuICpcbiAqIFRpbWVzdGFtcCB1c2VkIGlzIGluIGVwb2NoLCBhbHRob3VnaCBhbnkgYG51bWJlciAqIDEwMDBgIGFjY2VwdGVkIGJ5IHtAbGluayBEYXRlfSBzaG91bGQgYmUgZmluZS4gSWYgeW91IG5lZWQgYSBjb252ZXJ0ZXIgaSByZWNvbW1lbmQ6IGh0dHBzOi8vd3d3LmVwb2NoY29udmVydGVyLmNvbS9cbiAqXG4gKiAjIE1hcmtkb3duIFVzYWdlXG4gKlxuICogYGBgbWRcbiAqIFJhdyBNYXJrZG93biAgICAgICAtPiBIVE1MIE91dHB1dFxuICogPHQ6MTc0MTEwOTEyODp3PiAgIC0+IFR1ZXNkYXlcbiAqIDx0OjE3NDExMDkxMjg6Vz4gICAtPiBUdWVzZGF5IDE3OjI1XG4gKiA8dDoxNzQxMTA5MTI4OnQ+ICAgLT4gMTc6MjVcbiAqIDx0OjE3NDExMDkxMjg6VD4gICAtPiAxNzoyNToyOFxuICogPHQ6MTc0MTEwOTEyODpkPiAgIC0+IDA0LzAzLzIwMjVcbiAqIDx0OjE3NDExMDkxMjg6RD4gICAtPiAwNCBNYXJjaCAyMDI1XG4gKiA8dDoxNzQxMTA5MTI4OmY+ICAgLT4gMDQgTWFyY2ggMjAyNSBhdCAxNzoyNVxuICogPHQ6MTc0MTEwOTEyODpGPiAgIC0+IFR1ZXNkYXkgMDQgTWFyY2ggMjAyNSBhdCAxNzoyNVxuICogPHQ6MTc0MTEwOTEyODpSPiAgIC0+IHNvbWUgdGltZSBhZ28gKHRoaXMgaXMgZHluYW1pYylcbiAqIDx0OjE3NDExMDkxMjg+ICAgICAtPiAwNCBNYXJjaCAyMDI1IGF0IDE3OjI1IChub25lIGlzIHNhbWUgYXMgJ2YnKVxuICogYDx0OjE3NDExMDkxMjg6Vz5gIC0+IDx0OjE3NDExMDkxMjg6Vz4gKHB1dCBpbiBjb2RlIGJsb2NrcyB0byBpZ25vcmUgdGhlIGZvcm1hdHRpbmcpXG4gKiBgYGBcbiAqXG4gKiBUaGUgb3ZlcmFsbCBmb3JtYXQgaXMgYDx0OlRJTUVTVEFNUDpGT1JNQVQ+YFxuICpcbiAqICMjIERpc2NvcmQtcmVsYXRpb25zaGlwXG4gKiBUaGlzIHN5c3RlbSBydW5zIGV4YWN0bHkgdGhlIHNhbWUgYXMgaXQgZG9lcyBpbiBkaXNjb3JkLCBpZiB5b3UganVzdCBjb3B5IGFuZCBwYXN0ZSB0aGUgYWJvdmUgbGlzdCB0aGV5IHdpbGwgZm9ybWF0IGluIGRpc2NvcmQgYXMgZXhwZWN0ZWQuIFRoZSBvbmx5IG9uZXMgdG8gbm90IGZvcm1hdCBjb3JyZWN0IGFyZSBhcyBmb2xsb3dzOlxuICogLSBgd2BcbiAqIC0gYFdgXG4gKlxuICogIyBQYXJhbWV0ZXJzXG4gKlxuICogQHBhcmFtIGV4dHJhX3J1bGVzIEFsbG93IGZvciB0aGUgaW50cm9kdWN0aW9uIG9mIGV2ZW4gbW9yZSBydWxlcyB0aGFuIG5vdCBvcmlnaW5hbCBpbmNsdWRlZC5cbiAqICAgICAtIFJ1bGVzIGNhbiBiZSBhbnkgbGVuZ3RoLiBIb3dldmVyIHRyeSB0byBrZWVwIGl0IHNpbXBsZS5cbiAqICAgICAtIFRoZSBzdHJpbmcgcmV0dXJuZWQgaXMgdGhlIGZpbmFsIGZvcm0uXG4gKiAgICAgLSBCdWlsdC1pbiBydWxlcyBjYW4gYmUgb3ZlcndyaXR0ZW4uIEV4Y2VwdCBmb3IgdGhlIGJsYW5rIHJ1bGUgd2hpY2ggYWx3YXlzIHJldHVybnMgdGhlIGBmYCBydWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFya2VkTG9jYWxUaW1lKGV4dHJhX3J1bGVzPzogUmVjb3JkPHN0cmluZywgKGQ6IERhdGUpID0+IHN0cmluZz4pOiBNYXJrZWRFeHRlbnNpb24ge1xuICBhZGRSdWxlKCd3JywgZCA9PiBmbXRQYXJ0cyhkLCB7IHdlZWtkYXk6ICdsb25nJyB9KSk7XG4gIGFkZFJ1bGUoJ1cnLCBkID0+IHtcbiAgICBjb25zdCBkYXkgPSBmbXRQYXJ0cyhkLCB7IHdlZWtkYXk6ICdsb25nJyB9KTtcbiAgICBjb25zdCB0aW1lID0gZm10UGFydHMoZCwgeyBob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnLCBob3VyMTI6IGZhbHNlIH0pO1xuICAgIHJldHVybiBgJHtkYXl9ICR7dGltZX1gO1xuICB9KTtcbiAgYWRkUnVsZSgndCcsIGQgPT4gZm10UGFydHMoZCwgeyBob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnLCBob3VyMTI6IGZhbHNlIH0pKTtcbiAgYWRkUnVsZSgnVCcsIGQgPT4ge1xuICAgIGNvbnN0IGhoID0gZm10UGFydHMoZCwgeyBob3VyOiAnMi1kaWdpdCcsIGhvdXIxMjogZmFsc2UgfSk7XG4gICAgY29uc3QgbW0gPSBmbXRQYXJ0cyhkLCB7IG1pbnV0ZTogJzItZGlnaXQnIH0pO1xuICAgIGNvbnN0IHNzID0gdHdvRGlnaXQoZC5nZXRTZWNvbmRzKCkpO1xuICAgIHJldHVybiBgJHtoaH06JHttbX06JHtzc31gO1xuICB9KTtcbiAgYWRkUnVsZSgnZCcsIGQgPT4gZm10UGFydHMoZCwgeyBkYXk6ICcyLWRpZ2l0JywgbW9udGg6ICcyLWRpZ2l0JywgeWVhcjogJ251bWVyaWMnIH0pKTtcbiAgYWRkUnVsZSgnRCcsIGQgPT4gZm10UGFydHMoZCwgeyBkYXk6ICcyLWRpZ2l0JywgbW9udGg6ICdsb25nJywgeWVhcjogJ251bWVyaWMnIH0pKTtcbiAgYWRkUnVsZSgnZicsIGQgPT4ge1xuICAgIGNvbnN0IGRhdGVQYXJ0ID0gZm10UGFydHMoZCwgeyBkYXk6ICcyLWRpZ2l0JywgbW9udGg6ICdsb25nJywgeWVhcjogJ251bWVyaWMnIH0pO1xuICAgIGNvbnN0IHRpbWVQYXJ0ID0gZm10UGFydHMoZCwgeyBob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnLCBob3VyMTI6IGZhbHNlIH0pO1xuICAgIHJldHVybiBgJHtkYXRlUGFydH0gYXQgJHt0aW1lUGFydH1gO1xuICB9KTtcbiAgYWRkUnVsZSgnRicsIGQgPT4ge1xuICAgIGNvbnN0IHdlZWtkYXkgPSBmbXRQYXJ0cyhkLCB7IHdlZWtkYXk6ICdsb25nJyB9KTtcbiAgICBjb25zdCBkYXRlUGFydCA9IGZtdFBhcnRzKGQsIHsgZGF5OiAnMi1kaWdpdCcsIG1vbnRoOiAnbG9uZycsIHllYXI6ICdudW1lcmljJyB9KTtcbiAgICBjb25zdCB0aW1lUGFydCA9IGZtdFBhcnRzKGQsIHsgaG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0JywgaG91cjEyOiBmYWxzZSB9KTtcbiAgICByZXR1cm4gYCR7d2Vla2RheX0gJHtkYXRlUGFydH0gYXQgJHt0aW1lUGFydH1gO1xuICB9KTtcbiAgYWRkUnVsZSgnUicsIGQgPT4gcmVsYXRpdmUoZCkpO1xuICBPYmplY3QuZW50cmllcyhleHRyYV9ydWxlcyA/PyB7fSkuZm9yRWFjaCgoW3J1bGUsIGNhbGxiYWNrXSkgPT4ge1xuICAgIGlmIChydWxlLmxlbmd0aCA+IDEpIHtcbiAgICAgIGNvbnNvbGUud2FybihgSWdub3JpbmcgcnVsZSBcIiR7cnVsZX1cIiBmb3IgbWFya2VkTG9jYWxUaW1lIGJlY2F1c2UgdGhlIGxlbmd0aCBjYW4gb25seSBiZSBvbmUgY2hhciBsb25nLmApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhZGRSdWxlKHJ1bGUsIGNhbGxiYWNrKTtcbiAgfSk7XG4gIGNvbnNvbGUubG9nKHJ1bGUpO1xuXG4gIC8qKlxuICAgKiBGb3JtYXRzIGEgdGltZXN0YW1wIHVzaW5nIHNwZWNpZmllZCBmb3JtYXQgcnVsZVxuICAgKiBAcGFyYW0gdGltZSBVbml4IHRpbWVzdGFtcCBpbiBzZWNvbmRzXG4gICAqIEBwYXJhbSBmb3JtYXQgRm9ybWF0IHJ1bGUgdG8gYXBwbHlcbiAgICogQHJldHVybnMgRm9ybWF0dGVkIHRpbWUgc3RyaW5nXG4gICAqL1xuICBjb25zdCBmb3JtYXRfdGltZSA9ICh0aW1lOiBEYXRlLCBmb3JtYXQ6IHN0cmluZykgPT4gY29uZGl0aW9uc1tmb3JtYXRdID8gY29uZGl0aW9uc1tmb3JtYXRdKHRpbWUpIDogY29uZGl0aW9ucy5mKHRpbWUpO1xuXG4gIHJldHVybiB7XG4gICAgZXh0ZW5zaW9uczogW3tcbiAgICAgIG5hbWU6ICdsb2NhbHRpbWUnLFxuICAgICAgbGV2ZWw6ICdpbmxpbmUnLFxuICAgICAgc3RhcnQoc3JjKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gc3JjLm1hdGNoKC88dDovKT8uaW5kZXg7XG4gICAgICAgIHJldHVybiBzdGFydCA9PT0gdW5kZWZpbmVkIHx8IChzdGFydCA+IDAgJiYgc3JjW3N0YXJ0IC0gMV0gPT09ICdgJykgPyB1bmRlZmluZWQgOiBzdGFydDtcbiAgICAgIH0sXG4gICAgICB0b2tlbml6ZXIoc3JjLCBfKSB7XG4gICAgICAgIGNvbnN0IHJlZ2V4ID0gUmVnRXhwKGBePHQ6KFxcXFxkKikoOigke3J1bGV9KSk/PmApO1xuICAgICAgICBjb25zdCBtYXRjaCA9IHJlZ2V4LmV4ZWMoc3JjKTtcblxuICAgICAgICByZXR1cm4gKG1hdGNoKSA/IHtcbiAgICAgICAgICB0eXBlOiAnbG9jYWx0aW1lJyxcbiAgICAgICAgICByYXc6IG1hdGNoWzBdLFxuICAgICAgICAgIHRpbWU6IG5ldyBEYXRlKE51bWJlcihtYXRjaFsxXSkgKiAxMDAwKSxcbiAgICAgICAgICBmb3JtYXQ6IG1hdGNoWzNdID09IHVuZGVmaW5lZCA/ICdmJyA6IG1hdGNoWzNdLFxuICAgICAgICB9IDogdW5kZWZpbmVkXG4gICAgICB9LFxuICAgICAgcmVuZGVyZXIodG9rZW4pIHtcbiAgICAgICAgcmV0dXJuIGA8Y29kZT4ke2Zvcm1hdF90aW1lKHRva2VuLnRpbWUsIHRva2VuLmZvcm1hdCl9PC9jb2RlPmA7XG4gICAgICB9LFxuICAgIH1dXG4gIH1cbn1cbiIKICBdLAogICJtYXBwaW5ncyI6ICI7QUEwQk8sU0FBUyxlQUFlLEdBQW9CO0FBQUEsRUFDakQsT0FBTztBQUFBLElBQ0wsWUFBWSxDQUFDO0FBQUEsTUFDWCxNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxLQUFLLENBQUMsS0FBSztBQUFBLFFBQ1QsT0FBTyxJQUFJLE1BQU0sMkJBQTJCLEdBQUc7QUFBQTtBQUFBLE1BRWpELFNBQVMsQ0FBQyxLQUFpQztBQUFBLFFBQ3pDLE1BQU0sT0FBTztBQUFBLFFBQ2IsTUFBTSxRQUFRLEtBQUssS0FBSyxHQUFHO0FBQUEsUUFFM0IsSUFBSSxDQUFDO0FBQUEsVUFBTztBQUFBLFFBQ1osT0FBTztBQUFBLFVBQ0wsTUFBTTtBQUFBLFVBQ04sS0FBSyxNQUFNO0FBQUEsVUFDWCxNQUFNLEtBQUssTUFBTSxhQUFhLE1BQU0sRUFBRTtBQUFBLFVBQ3RDLE9BQU8sTUFBTTtBQUFBLFVBQ2IsT0FBTyxNQUFNLEdBQUc7QUFBQSxRQUNsQjtBQUFBO0FBQUEsTUFFRixhQUFhLENBQUMsTUFBTTtBQUFBLE1BQ3BCLFFBQVEsQ0FBQyxHQUFHO0FBQUEsUUFDVixNQUFNLFFBQVE7QUFBQSxRQUNkLElBQUksUUFBUTtBQUFBLFFBQ1osUUFBUSxNQUFNO0FBQUEsZUFDUDtBQUFBLFlBQ0gsUUFBUTtBQUFBLFlBQ1I7QUFBQSxlQUNHO0FBQUEsWUFDSCxRQUFRO0FBQUEsWUFDUjtBQUFBO0FB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QUN4RztBQUFBLElBQ0Y7QUFBQSxJQUNBLFFBQVEsT0FBTSxRQUFRO0FBQUEsR0FDdkI7QUFBQSxFQUNELFFBQVEsSUFBSSxJQUFJO0FBQUEsRUFRaEIsTUFBTSxjQUFjLENBQUMsTUFBWSxXQUFtQixXQUFXLFVBQVUsV0FBVyxRQUFRLElBQUksSUFBSSxXQUFXLEVBQUUsSUFBSTtBQUFBLEVBRXJILE9BQU87QUFBQSxJQUNMLFlBQVksQ0FBQztBQUFBLE1BQ1gsTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsS0FBSyxDQUFDLEtBQUs7QUFBQSxRQUNULE1BQU0sUUFBUSxJQUFJLE1BQU0sS0FBSyxHQUFHO0FBQUEsUUFDaEMsT0FBTyxVQUFVLGFBQWMsUUFBUSxLQUFLLElBQUksUUFBUSxPQUFPLE1BQU8sWUFBWTtBQUFBO0FBQUEsTUFFcEYsU0FBUyxDQUFDLEtBQUssR0FBRztBQUFBLFFBQ2hCLE1BQU0sUUFBUSxPQUFPLGdCQUFnQixVQUFVO0FBQUEsUUFDL0MsTUFBTSxRQUFRLE1BQU0sS0FBSyxHQUFHO0FBQUEsUUFFNUIsT0FBUSxRQUFTO0FBQUEsVUFDZixNQUFNO0FBQUEsVUFDTixLQUFLLE1BQU07QUFBQSxVQUNYLE1BQU0sSUFBSSxLQUFLLE9BQU8sTUFBTSxFQUFFLElBQUksSUFBSTtBQUFBLFVBQ3RDLFFBQVEsTUFBTSxNQUFNLFlBQVksTUFBTSxNQUFNO0FBQUEsUUFDOUMsSUFBSTtBQUFBO0FBQUEsTUFFTixRQUFRLENBQUMsT0FBTztBQUFBLFFBQ2QsT0FBTyxTQUFTLFlBQVksTUFBTSxNQUFNLE1BQU0sTUFBTTtBQUFBO0FBQUEsSUFFeEQsQ0FBQztBQUFBLEVBQ0g7QUFBQTsiLAogICJkZWJ1Z0lkIjogIjQ1NzlCQUNDQzI2NkNBNTU2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
