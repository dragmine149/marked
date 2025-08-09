let __links = {};

/**
 * @this HTMLAnchorElement The `a` tag referenced
 * @param {PointerEvent} event The event details
 * @returns
 */
function clickListener(event) {
  // pass to callback function
  // console.log("link info: ", link.dataset.dest);
  // console.log("link info: ", link.dataset);

  // bypass everything in order for ctrl/shift click.
  if (event.ctrlKey || event.shiftKey || event.metaKey || event.altKey || event.button === 1)
    return true;

  console.log("link info: ", this.href);
  let result = this.callback(new URL(this.href));

  // if we don't get a true result, assume something bad happened.
  if (result !== true) {
    console.log('Callback failed, auto redirect to original location.');
    // window.location.href = link.dataset.dest;
    return true;
  }

  event.preventDefault();
  return false;
}

/**
* Replaces the normal markdown link provided by marked.js with a custom link that allows execution of a custom function before redirection.
* @param {(url: URL) => boolean} callback What to do upon clicking this link. NOTE: If this does not return true, the default (link redirect) will be done as well.
* @param {string} site Your site host (new URL(location).host). Designed for when running on localhost:8080.
*/
function markedLocalLink(callback = (url) => false, site = window.location.host) {
  let currentUrl = new URL(location.href);

  return {
    hooks: {

      // this gets called after everything is done
      postprocess(html) {

        // requestAnimationFrame makes us wait until the document has been rendered.
        // this is important, because if we don't wait we will just be working with a string which we can't really do.
        requestAnimationFrame(() => {
          document.querySelectorAll('a[callback]').forEach(
            /** @param {HTMLAnchorElement} link*/
            link => {
              link.callback = callback;

              // remove the previous listener just in case stuff breaks...
              link.removeEventListener('click', clickListener);

              // add our own custom listener.
              link.addEventListener('click', clickListener);
            });
        });

        // we don't care about the html, hence we can just throw it back.
        return html;
      }
    },

    renderer: {
      link(tokens) {
        let { href, title, text } = tokens;

        // get and compare the urls.
        // let url = new URL(href);

        // checks for a valid url, if nothing is valid return false to allow the fallback (previous) to work.
        let url;
        try {
          if (!href) return false; // if href is empty, return null
          url = new URL(href, currentUrl); // convert relative URLs to absolute
        } catch (e) {
          console.error('Invalid URL:', href);
          return false;
        }

        let local = url.host === currentUrl.host ||
          url.host.includes("localhost") || // for running local server
          url.host === site; // for running local server with links to your actual site.

        // console.log('Local:', local);

        // make the new url.
        return `<a href="${href}"${title ? ` title="${title}"` : ''}${local ? ' callback' : ''}>${text}</a>`;
      },
    },
  };
}
