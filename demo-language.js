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
  const modes = ['ko', 'en', 'alternate'];
  let mode = 'ko';
  let language = 'ko';
  try {
    const saved = localStorage.getItem(key);
    if (modes.includes(saved)) mode = saved;
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
    if (!modes.includes(next)) return;
    // A menu choice selects the repeat mode. Automatic tour transitions change
    // only the current language and leave the selected/saved mode intact.
    if (persist) mode = next;
    language = next === 'en' ? 'en' : 'ko';
    document.documentElement.lang = language;
    document.title = translate(pageTitle);
    choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.demoLanguage === mode)));
    apply();
    if (persist) {
      try { localStorage.setItem(key, mode); } catch (_) { /* No storage required. */ }
    }
    window.dispatchEvent(new CustomEvent('power-tbm:languagechange', { detail: { language, restartPlayback } }));
  }

  window.PowerTBMLanguage = { get: () => language, getMode: () => mode, set, apply, translate };
  choices.forEach(button => button.addEventListener('click', () => set(button.dataset.demoLanguage)));
  set(mode, { persist: false });
})();
