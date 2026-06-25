/* Obsidian Web Viewer – Web Clipper (inline, no external deps) */
/* SERVER and DEFAULT_FOLDER are injected by /api/clip-bookmarklet */
(function () {
  'use strict';

  var SERVER = '__SERVER__';
  var DEFAULT_FOLDER = '__FOLDER__';

  function extractArticle() {
    if (window.Readability) {
      try {
        var clone = document.cloneNode(true);
        var article = new window.Readability(clone).parse();
        if (article && article.content) return article;
      } catch (e) {}
    }
    var selectors = ['article', '[role="main"]', 'main', '.post-content', '.article-content', '.entry-content', '.content', '#content', '#main'];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && el.textContent.trim().length > 200) return { title: document.title, content: el.innerHTML, excerpt: '' };
    }
    return { title: document.title, content: document.body.innerHTML, excerpt: '' };
  }

  function todayStr() {
    var d = new Date(), pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function safeName(t) {
    return t.replace(/[/\\:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  var article = extractArticle();
  var title = (article.title || document.title).trim() || 'Clipped Page';
  var pageUrl = location.href;
  var today = todayStr();
  var defaultPath = DEFAULT_FOLDER + '/' + today + ' ' + safeName(title) + '.md';

  var data = {
    title: title,
    url: pageUrl,
    html: article.content || '',
    folder: DEFAULT_FOLDER,
    path: defaultPath,
    excerpt: (article.excerpt || article.textContent || '').trim().slice(0, 600)
  };

  try {
    var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    window.open(SERVER + '/#clip=' + encoded, '_blank');
  } catch (e) {
    window.open(SERVER, '_blank');
  }
})();
