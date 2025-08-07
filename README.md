# marked
Files that i use for my website, extends how `marked.js` works. These files might update at anytime without warning. I'll however try to not break everything during an update.

## Installation
Clone
```sh
$ git clone git@github.com:dragmine149/marked.git
```
or submodule
```sh
$ git submodule add git@github.com:dragmine149/marked.git marked
```
this repo.

## Setup
Most files will work as-is. however the files listed below needs some more things before the can work.

### [markedLocalTime.js](./markedLocalTime.js)
This requires the installation of [dayjs](https://day.js.org/) and some extensions. The below code contains everything that is needed to make sure it works properly.
```html
<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.13/dayjs.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.13/plugin/relativeTime.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.13/plugin/localizedFormat.js"></script>
<script>
  dayjs.extend(dayjs_plugin_relativeTime);
  dayjs.extend(dayjs_plugin_localizedFormat);
  dayjs.locale('en'); // NOTE: This can be changed out for your locale of choice.
</script>
```
Alternatively,
```ts
import dayjs from "dayjs";
import relativeTime from 'dayjs/plugin/relativeTime';
import localisedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(relativeTime);
dayjs.extend(localisedFormat);
dayjs.locale('en');
````

## Usage
```js
// ...

let marked = new Marked();
marked.use(`${filename}()`); // replace filename with filename and remove `
marked.parse('...');

// ...
```

Example:
```ts
marked.use(markedCenterText());
```

### [markedCenterText.js](./markedCenterText.js)
Puts text on heading lines to the center or right side of the object.

Usage Examples:
```md
# !c Heading
text
## !r sub heading
```

`!c` Centers it, `!r` puts it on the right.

### [markedImprovedImage.js](./markedImprovedImage.js)
Wraps an image inside a div with the `img` class for styling. Also allows data to be gathered from a different server instead.

Recommended css:
```css
/** Forces the image to scroll horizontally instead of having the whole blog scroll horizontally. */
div.img {
  width: 100%;
  overflow: auto;
}
```

To get the image from a different server
```js
// Note: This will apply to EVERYTHING in the parsed markdown file unless another `imager` render overrides this.
marked.use(markedImprovedImage(`SERVER_URL (str)`));
```

### [markedLocalTime.js](./markedLocalTime.js)
Display a time in the user local time zone. The time used is that of epoch (s). Recommended converter here: https://www.epochconverter.com/

Usage:
```md
<t:TIME:f>
```
where:
- `<t:` is the start.
- `TIME` is the epoch time (in seconds)
- `:f>` is the format (only the `f` though)

Usage Examples:
```md
<t:1741109128:w>
<t:1741109128:W>
<t:1741109128:t>
<t:1741109128:T>
<t:1741109128:d>
<t:1741109128:D>
<t:1741109128:f>
<t:1741109128:F>
<t:1741109128:R>
<t:1741109128>
`<t:1741109128:W>`
```
Outputs (note, this is based off UTC time, the real results will be different based on user):

- `Tuesday`
- `Tuesday 17:25`
- `17:25`
- `17:25:28`
- `04/03/2025`
- `04 March 2025`
- `04 March 2025 at 17:25`
- `Tuesday 04 March 2025 at 17:25`
- `some time ago` (this is dynamic, hence harder to show)
- `04 March 2025 at 17:25` (none is same as 'f')
- `<t:1741109128:W>` (put in code blocks to ignore the formatting)

#### Optional parameter
There is an optional `dayjs` argument. By default we use the parsed dayjs object and only fall back to the `globalThis.dayjs` if one is not found.

### [markedLocalLink.js](./markedLocalLink.js)

#### WARNING: This could cause some confusion with how the link works. Please proceduce with caution!

Allows links that direct to your own site to run custom js functions instead of redirecting.

This takes affect on all links that link to either:
- The site host `new URL(location).host`
- `localhost` (any port)
- The site passed in as the parameter.

The markdown input is much the same, just provide a link how you would normally do. The output is slightly different due to how we have to manage the js (explained later).

Example usage
```js
marked.use(markedLocalLink((url) => {
  alert(url);
  return true;
}), "example.org");
```

To explain the above example. As long as the link clicked follows one of the three rules above, the user will get alerted instead of redirected. This can be useful in (say my website for example), where you don't want the user
to reload the page.

Documentation-ish:
```ts
// callback types, gives a URL object and excepts a boolean object.
(url: URL): boolean
```
You can do whatever once you have the url. However **you must return true**. As a failsafe / fallback mechnisum, any result that is not exactly `true` will automatically cause the link to redirect like it would normally do.
This might cause some unexpected behaviours as your code will still run yet the page will get redirected. This failsafe is also in place for if a custom callback was not provided (as false is returned by default).

#### Known issues (kinda):
`SHIFT`/`CTRL`/`CMD`/`RIGHT` `CLICK`ing links won't work as excepted as you overwrite the link. Due to the return data i have to process them so will get around to fixing them at some point.

## More Examples
More examples can be viewed on my website: https://dragmine149.github.io in either the blog section or the project section.
