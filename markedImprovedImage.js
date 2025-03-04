function markedImprovedImage(useRemote) {
  const renderer = {
    image(tokens) {
      return `
      <div class="img">
        <img src="${useRemote ? `${useRemote}/${tokens.href}` : tokens.href}", alt="${tokens.text}">
      </div>
      `
    }
  }
  return {
    renderer
  }
}
