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
export {
  markedAlignment
};

//# debugId=530CC0B2333EF0AA64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vbWFya2VkQWxpZ25tZW50LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCB0eXBlIHsgTWFya2VkRXh0ZW5zaW9uLCBUb2tlbiB9IGZyb20gXCJtYXJrZWRcIjtcblxuaW50ZXJmYWNlIEFsaWdubWVudFRva2VuIHtcbiAgdHlwZTogXCJhbGlnbm1lbnRcIjtcbiAgbGV2ZWw/OiBudW1iZXI7XG4gIGFsaWduPzogc3RyaW5nO1xuICB0ZXh0OiBUb2tlbltdO1xuICByYXc6IHN0cmluZztcbn1cblxuLyoqXG4gKiBDdXN0b20gZXh0ZW5zaW9uIHRvIGFsaWduIGNvbnRlbnQgaW4gYSBkaWZmZXJlbnQgd2F5IHRoYW4gb24gdGhlIGxlZnQuXG4gKlxuICogIyBNYXJrZG93biBVc2FnZVxuICogYGBgbWRcbiAqICMgIXIgVGhpcyBpcyBhIGhlYWRpbmcgb24gdGhlIHJpZ2h0LlxuICogIWMgVGhpcyB0ZXh0IGlzIG5vdyBjZW50ZXJlZFxuICogYGBgXG4gKlxuICogT25seSBgIWNgIGFuZCBgIXJgIGFyZSBzdXBwb3J0ZWQsIGFueXRoaW5nIGVsc2Ugd2lsbCBqdXN0IGJlIGxlZnQgdG8gdGhlIG5leHQgZXh0ZW5zaW9uIHRvIHNvcnQgb3V0LlxuICpcbiAqIFRoaXMgb25seSBhZmZlY3RzIHRoZSBwb3NpdGlvbiwgc3R5bGluZyB3aWxsIGFsc28gd29yayBhcyBleHBlY3RlZFxuICogYGBgbWRcbiAqICMgIXIgU28gdGhpcyB3b3VsZCBiZSBhIGhlYWRpbmcgb24gdGhlICpyaWdodCogd2l0aCAqaXRhbGljKiB0ZXh0XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmtlZEFsaWdubWVudCgpOiBNYXJrZWRFeHRlbnNpb24ge1xuICByZXR1cm4ge1xuICAgIGV4dGVuc2lvbnM6IFt7XG4gICAgICBuYW1lOiBcImFsaWdubWVudFwiLFxuICAgICAgbGV2ZWw6IFwiYmxvY2tcIixcbiAgICAgIHN0YXJ0KHNyYykge1xuICAgICAgICByZXR1cm4gc3JjLm1hdGNoKC9eKD86I3sxLDZ9XFxzKyk/IShbY3JdKVxccysvKT8uaW5kZXg7XG4gICAgICB9LFxuICAgICAgdG9rZW5pemVyKHNyYyk6IEFsaWdubWVudFRva2VuIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgcnVsZSA9IC9eKFsjIF0qKSEoW14gXSopKC4qKS87XG4gICAgICAgIGNvbnN0IG1hdGNoID0gcnVsZS5leGVjKHNyYyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB0eXBlOiBcImFsaWdubWVudFwiLFxuICAgICAgICAgIHJhdzogbWF0Y2hbMF0sXG4gICAgICAgICAgdGV4dDogdGhpcy5sZXhlci5pbmxpbmVUb2tlbnMobWF0Y2hbM10pLFxuICAgICAgICAgIGFsaWduOiBtYXRjaFsyXSxcbiAgICAgICAgICBsZXZlbDogbWF0Y2hbMV0ubGVuZ3RoXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBjaGlsZFRva2VuczogWyd0ZXh0J10sXG4gICAgICByZW5kZXJlcih0KSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdCBhcyBBbGlnbm1lbnRUb2tlbjtcbiAgICAgICAgbGV0IGFsaWduID0gJyc7XG4gICAgICAgIHN3aXRjaCAodG9rZW4uYWxpZ24pIHtcbiAgICAgICAgICBjYXNlICdjJzpcbiAgICAgICAgICAgIGFsaWduID0gJ2NlbnRlcic7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdyJzpcbiAgICAgICAgICAgIGFsaWduID0gJ3JpZ2h0JztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4ubGV2ZWwhID4gMCkge1xuICAgICAgICAgIHJldHVybiBgPGgke3Rva2VuLmxldmVsfSBzdHlsZT1cInRleHQtYWxpZ246ICR7YWxpZ259O1wiPiR7dGhpcy5wYXJzZXIucGFyc2VJbmxpbmUodG9rZW4udGV4dCl9PC9oJHt0b2tlbi5sZXZlbH0+XFxuYDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBgPHAgc3R5bGU9XCJ0ZXh0LWFsaWduOiAke2FsaWdufTtcIj4ke3RoaXMucGFyc2VyLnBhcnNlSW5saW5lKHRva2VuLnRleHQpfTwvcD5cXG5gO1xuICAgICAgfSxcbiAgICB9XVxuICB9O1xufVxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjtBQTBCTyxTQUFTLGVBQWUsR0FBb0I7QUFBQSxFQUNqRCxPQUFPO0FBQUEsSUFDTCxZQUFZLENBQUM7QUFBQSxNQUNYLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLEtBQUssQ0FBQyxLQUFLO0FBQUEsUUFDVCxPQUFPLElBQUksTUFBTSwyQkFBMkIsR0FBRztBQUFBO0FBQUEsTUFFakQsU0FBUyxDQUFDLEtBQWlDO0FBQUEsUUFDekMsTUFBTSxPQUFPO0FBQUEsUUFDYixNQUFNLFFBQVEsS0FBSyxLQUFLLEdBQUc7QUFBQSxRQUUzQixJQUFJLENBQUM7QUFBQSxVQUFPO0FBQUEsUUFDWixPQUFPO0FBQUEsVUFDTCxNQUFNO0FBQUEsVUFDTixLQUFLLE1BQU07QUFBQSxVQUNYLE1BQU0sS0FBSyxNQUFNLGFBQWEsTUFBTSxFQUFFO0FBQUEsVUFDdEMsT0FBTyxNQUFNO0FBQUEsVUFDYixPQUFPLE1BQU0sR0FBRztBQUFBLFFBQ2xCO0FBQUE7QUFBQSxNQUVGLGFBQWEsQ0FBQyxNQUFNO0FBQUEsTUFDcEIsUUFBUSxDQUFDLEdBQUc7QUFBQSxRQUNWLE1BQU0sUUFBUTtBQUFBLFFBQ2QsSUFBSSxRQUFRO0FBQUEsUUFDWixRQUFRLE1BQU07QUFBQSxlQUNQO0FBQUEsWUFDSCxRQUFRO0FBQUEsWUFDUjtBQUFBLGVBQ0c7QUFBQSxZQUNILFFBQVE7QUFBQSxZQUNSO0FBQUE7QUFBQSxZQUNPO0FBQUE7QUFBQSxRQUdYLElBQUksTUFBTSxRQUFTLEdBQUc7QUFBQSxVQUNwQixPQUFPLEtBQUssTUFBTSw0QkFBNEIsV0FBVyxLQUFLLE9BQU8sWUFBWSxNQUFNLElBQUksT0FBTyxNQUFNO0FBQUE7QUFBQSxRQUMxRztBQUFBLFFBRUEsT0FBTyx5QkFBeUIsV0FBVyxLQUFLLE9BQU8sWUFBWSxNQUFNLElBQUk7QUFBQTtBQUFBO0FBQUEsSUFFakYsQ0FBQztBQUFBLEVBQ0g7QUFBQTsiLAogICJkZWJ1Z0lkIjogIjUzMENDMEIyMzMzRUYwQUE2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
