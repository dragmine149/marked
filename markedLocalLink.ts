import { PostedMarkedExtension } from "./marked";

/**
* Replace the normal markdown link provided by marked.js with a custom link that allows execution of a custom function before redirection.
* @param callback What to do upon clicking this link. NOTE: If this does not return true, the default (link redirect) will be done as well.
* @param site Your site host (new URL(location).host). Designed for when running on localhost:8080.
*/
export function markedLocalLink(callback: (url: URL) => boolean = (_) => false, site = window.location.host): PostedMarkedExtension {
  const currentUrl = new URL(location.href);

  /**
   * @this HTMLAnchorElement The `a` tag referenced
   * @param event The event details
   * @returns
   */
  function clickListener(this: HTMLAnchorElement, event: PointerEvent) {
    // pass to callback function
    // console.log("link info: ", link.dataset.dest);
    // console.log("link info: ", link.dataset);

    // bypass everything in order for ctrl/shift click.
    if (event.ctrlKey || event.shiftKey || event.metaKey || event.altKey || event.button === 1)
      return true;

    console.log("link info: ", this.href);
    const result = callback(new URL(this.href));

    // if we don't get a true result, assume something bad happened.
    if (result !== true) {
      console.log('Callback failed, auto redirect to original location.');
      // window.location.href = link.dataset.dest;
      return true;
    }

    event.preventDefault();
    return false;
  }

  return {
    postprocess(obj) {
      obj.querySelectorAll('a[callback]').forEach(l => {
        const link = l as HTMLAnchorElement;

        // remove the previous listener just in case stuff breaks...
        link.removeEventListener('click', clickListener);

        // add our own custom listener.
        link.addEventListener('click', clickListener);
      });
    },

    renderer: {
      link({ href, title, text }) {
        // checks for a valid url, if nothing is valid return false to allow the fallback (previous) to work.
        let url;
        try {
          if (!href) return false; // if href is empty, return null
          url = new URL(href, currentUrl); // convert relative URLs to absolute
        } catch {
          console.error('Invalid URL:', href);
          return false;
        }

        const local = url.host === currentUrl.host ||
          url.host.includes("localhost") || // for running local server
          url.host === site; // for running local server with links to your actual site.

        // console.log('Local:', local);

        // make the new url.
        return `<a href="${href}"${title ? ` title="${title}"` : ''}${local ? ' callback' : ''}>${text}</a>`;
      },
    },
  };
}
