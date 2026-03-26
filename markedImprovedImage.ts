import { MarkedExtension } from "marked"

/**
 * Surrounds every image in a div with the class `img` to allow for parent-related css.
 *
 * # Example
 * `![A picture of the uncommitted files i have from running the command `git status`. Contains files in many folders.](Blog/Assets/2025-02-07/Screenshot_20250207_194811.png`
 * turns to
 * ```html
 * <div>
 *   <img src="url" alt="text">
 * </div>
 * ```
 *
 * @param useRemote The server to use to retrieve the images. By default no remote is this local server.
 *    Can be really useful on github-related servers to save build size.
 * @returns
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
