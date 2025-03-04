# marked
Files that i use for my website, extends how `marked.js` works

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

### markedLocalTime.js
This requires the installation of [dayjs](https://day.js.org/) as well.

## Usage
```js
// ...

let marked = new Marked();
marked.use(`EXTENSION`); // replace extension with filename (no extension)
marked.parse('...');

// ...
```


### markedCenterText.js
Puts text on heading lines to the center or right side of the object.

Usage Examples:
```md
# !c Heading
text
## !r sub heading
```

`!c` Centers it, `!r` puts it on the right.

### markedImprovedImage.js
Wraps an image inside a div with the `img` class for styling. Also allows data to be gathered from a different server instead.

Recommended css:
```css
// Forces the image to scroll horizontally instead of having the whole blog scroll horizontally.
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

### markedLocalTime.js
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

## More Examples
More examples can be viewed on my website: https://dragmine149.github.io in either the blog section or the project section.
