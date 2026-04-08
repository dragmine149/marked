import { MarkedExtension } from "marked"

/**
 * Surrounds every image in a div with the class `img` to allow for parent-related css.
 *
 * # Markdown Usage
 *
 * N/A. The markdown is the same.
 *
 * ## Example
 * ```md
 * ![A picture of the uncommitted files i have from running the command `git status`. Contains files in many folders.](Blog/Assets/2025-02-07/Screenshot_20250207_194811.png
 * ```
 * turns to
 * ```html
 * <div class="img">
 *   <img src="url" alt="text">
 * </div>
 * ```
 *
 * # Recommend css
 *
 * Personally, i recommend adding the following css.
 * ```css
 * // Forces the image to scroll horizontally instead of having the whole container scroll horizontally.
 * div.img {
 *   width: 100%;
 *   overflow: auto;
 * }
 * ```
 * The above css is what i originally created this for, as it's easier than just guessing. This is not added automatically as css styling should be left to external work.
 *
 * # Parameters
 *
 * @param useRemote The server to use to retrieve the images.
 *    Can be really useful on github-related servers to save build size.
 *    Changes a request to `https://{your-server-url}/path/to/file` to `https://{use-remote-url}/path/to/file`
 */
export function markedImprovedImage(useRemote?: URL): MarkedExtension {
  return {
    renderer: {
      image({ href, text, title }) {
        return `
        <div class="img">
          <img src="${useRemote ? `${useRemote}/${href}` : href}", alt="${text}" title="${title}"">
        </div>
        `
      }
    }
  }
}
