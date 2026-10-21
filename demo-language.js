(() => {
  'use strict';
  const key = 'power-tbm-demo-language';
  const english = window.PowerTBMEnglish || {};
  const textSources = new WeakMap();
  const attributeSources = new WeakMap();
  const attributes = ['aria-label', 'title', 'alt', 'placeholder'];
  const excluded = 'script, style, noscript, textarea, [data-language-fixed], #subtitleLine, #subtitleBubble';
  const choices = [...document.querySelectorAll('[data-demo-language]')];
  const pageTitle = document.title;
  let language = 'ko';
  try {
    if (localStorage.getItem(key) === 'en') language = 'en';
  } catch (_) { /* Language selection also works without storage. */ }

  function translate(source) {
    const text = source.trim();
    return language === 'en' && Object.prototype.hasOwnProperty.call(english, text)
      ? source.replace(text, () => english[text]) : source;
  }

  function apply(root = document.body) {
    if (!root || root.closest?.(excluded)) return;
    // Translate only on a language or scene change. Keep the existing elements,
    // emphasis, animations and media players; never rebuild the screen.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest(excluded)) continue;
      const previous = textSources.get(node);
      const source = previous && node.nodeValue === previous.rendered ? previous.source : node.nodeValue;
      if (!Object.prototype.hasOwnProperty.call(english, source.trim())) continue;
      const rendered = translate(source);
      textSources.set(node, { source, rendered });
      if (node.nodeValue !== rendered) node.nodeValue = rendered;
    }
    const elements = [root, ...root.querySelectorAll('[aria-label], [title], [alt], [placeholder]')];
    elements.forEach(element => {
      if (element.closest(excluded)) return;
      const saved = attributeSources.get(element) || {};
      attributes.forEach(name => {
        const value = element.getAttribute(name);
        if (value == null) return;
        const previous = saved[name];
        const source = previous && value === previous.rendered ? previous.source : value;
        if (!Object.prototype.hasOwnProperty.call(english, source.trim())) return;
        const rendered = translate(source);
        saved[name] = { source, rendered };
        if (value !== rendered) element.setAttribute(name, rendered);
      });
      attributeSources.set(element, saved);
    });
  }

  function set(next, { persist = true, restartPlayback = true } = {}) {
    if (next !== 'ko' && next !== 'en') return;
    language = next;
    document.documentElement.lang = language;
    document.title = translate(pageTitle);
    choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.demoLanguage === language)));
    apply();
    if (persist) {
      try { localStorage.setItem(key, language); } catch (_) { /* No storage required. */ }
    }
    window.dispatchEvent(new CustomEvent('power-tbm:languagechange', { detail: { language, restartPlayback } }));
  }

  window.PowerTBMLanguage = { get: () => language, set, apply, translate };
  choices.forEach(button => button.addEventListener('click', () => set(button.dataset.demoLanguage)));
  set(language, { persist: false });
})();
