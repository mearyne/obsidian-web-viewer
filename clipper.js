/* Obsidian Web Viewer – Web Clipper (loaded by bookmarklet) */
(function () {
  'use strict';

  // Capture current script src before any async code
  var _scriptSrc = (document.currentScript && document.currentScript.src) || '';
  var SERVER = '';
  var DEFAULT_FOLDER = 'Clippings';
  try {
    var _url = new URL(_scriptSrc);
    SERVER = _url.origin;
    DEFAULT_FOLDER = _url.searchParams.get('folder') || 'Clippings';
  } catch (e) {}

  if (!SERVER) {
    alert('[Web Clipper] 서버 URL을 확인할 수 없습니다. 북마클릿을 다시 설치해주세요.');
    return;
  }

  // Remove previous instance if re-triggered
  var prev = document.getElementById('owv-clip-overlay');
  if (prev) { prev.remove(); }

  // ── HTML → Markdown ────────────────────────────────────────────────────
  function escMd(text) {
    return text.replace(/[*_[\]`\\]/g, '\\$&');
  }

  function nodeToMd(node) {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      return escMd(node.textContent);
    }
    if (node.nodeType !== 1 /* ELEMENT_NODE */) return '';

    var tag = node.tagName.toLowerCase();
    var kids = function () {
      return Array.prototype.map.call(node.childNodes, nodeToMd).join('');
    };
    var block = function (s) { return '\n\n' + s.trim() + '\n\n'; };

    switch (tag) {
      case 'script': case 'style': case 'noscript': case 'iframe':
      case 'button': case 'nav': case 'footer': case 'form':
        return '';
      case 'h1': return block('# ' + kids().trim());
      case 'h2': return block('## ' + kids().trim());
      case 'h3': return block('### ' + kids().trim());
      case 'h4': return block('#### ' + kids().trim());
      case 'h5': return block('##### ' + kids().trim());
      case 'h6': return block('###### ' + kids().trim());
      case 'p': return block(kids());
      case 'br': return '  \n';
      case 'hr': return block('---');
      case 'strong': case 'b': return '**' + kids() + '**';
      case 'em': case 'i': return '*' + kids() + '*';
      case 's': case 'del': case 'strike': return '~~' + kids() + '~~';
      case 'code':
        if (node.parentNode && node.parentNode.tagName === 'PRE') return node.textContent;
        return '`' + node.textContent.replace(/`/g, "'") + '`';
      case 'pre': return block('```\n' + node.textContent.trim() + '\n```');
      case 'blockquote':
        return block(kids().trim().split('\n').map(function (l) { return '> ' + l; }).join('\n'));
      case 'a': {
        var href = node.getAttribute('href') || '';
        var text = kids().trim();
        if (!href || href.charAt(0) === '#') return text;
        if (!text) return href;
        return '[' + text + '](' + href + ')';
      }
      case 'img': {
        var src = node.getAttribute('src') || '';
        var alt = node.getAttribute('alt') || '';
        return src ? '![' + alt + '](' + src + ')' : '';
      }
      case 'ul': {
        var lis = Array.prototype.filter.call(node.childNodes, function (n) {
          return n.nodeType === 1 && n.tagName === 'LI';
        });
        if (!lis.length) return block(kids());
        return block(lis.map(function (li) {
          return '- ' + Array.prototype.map.call(li.childNodes, nodeToMd).join('').trim();
        }).join('\n'));
      }
      case 'ol': {
        var olis = Array.prototype.filter.call(node.childNodes, function (n) {
          return n.nodeType === 1 && n.tagName === 'LI';
        });
        if (!olis.length) return block(kids());
        return block(olis.map(function (li, i) {
          return (i + 1) + '. ' + Array.prototype.map.call(li.childNodes, nodeToMd).join('').trim();
        }).join('\n'));
      }
      case 'li': return kids();
      case 'table': {
        var rows = node.querySelectorAll('tr');
        if (!rows.length) return '';
        var toRow = function (tr) {
          var cells = tr.querySelectorAll('th, td');
          return '| ' + Array.prototype.map.call(cells, function (c) {
            return c.textContent.trim().replace(/\|/g, '\\|');
          }).join(' | ') + ' |';
        };
        var headerRow = toRow(rows[0]);
        var sepRow = '| ' + Array.prototype.map.call(
          rows[0].querySelectorAll('th, td'),
          function () { return '---'; }
        ).join(' | ') + ' |';
        var bodyRows = Array.prototype.slice.call(rows, 1).map(toRow).join('\n');
        return block([headerRow, sepRow, bodyRows].filter(Boolean).join('\n'));
      }
      default: return kids();
    }
  }

  function htmlToMarkdown(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    var md = nodeToMd(div);
    return md.replace(/\n{3,}/g, '\n\n').trim();
  }

  // ── Content extraction ─────────────────────────────────────────────────
  function extractArticle() {
    if (window.Readability) {
      try {
        var clone = document.cloneNode(true);
        var article = new window.Readability(clone).parse();
        if (article && article.content) return article;
      } catch (e) {}
    }
    // Fallback: try semantic selectors
    var selectors = ['article', '[role="main"]', 'main', '.post-content',
      '.article-content', '.entry-content', '.content', '#content', '#main'];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && el.textContent.trim().length > 200) {
        return { title: document.title, content: el.innerHTML, excerpt: '' };
      }
    }
    return { title: document.title, content: document.body.innerHTML, excerpt: '' };
  }

  // ── Date helper ────────────────────────────────────────────────────────
  function todayStr() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function safeName(title) {
    return title.replace(/[/\\:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  // ── Popup UI ───────────────────────────────────────────────────────────
  function showPopup(article) {
    var title = (article.title || document.title).trim() || 'Clipped Page';
    var pageUrl = location.href;
    var today = todayStr();
    var md = htmlToMarkdown(article.content || '');
    var defaultPath = DEFAULT_FOLDER + '/' + today + ' ' + safeName(title) + '.md';

    var buildContent = function (t) {
      return '---\ntitle: "' + t.replace(/"/g, '\\"') + '"\nurl: ' + pageUrl + '\ndate: ' + today + '\n---\n\n' + md;
    };

    var overlay = document.createElement('div');
    overlay.id = 'owv-clip-overlay';

    var sheet = document.createElement('div');
    sheet.id = 'owv-clip-sheet';

    sheet.innerHTML = [
      '<div id="owv-clip-header">',
      '  <span id="owv-clip-badge">📎 Web Clipper</span>',
      '  <button id="owv-clip-close" aria-label="닫기">×</button>',
      '</div>',
      '<div id="owv-clip-fields">',
      '  <div class="owv-field">',
      '    <label for="owv-clip-title">제목</label>',
      '    <input id="owv-clip-title" type="text" autocomplete="off" />',
      '  </div>',
      '  <div class="owv-field">',
      '    <label for="owv-clip-path">저장 경로</label>',
      '    <input id="owv-clip-path" type="text" autocomplete="off" />',
      '  </div>',
      '</div>',
      '<div id="owv-clip-preview"></div>',
      '<div id="owv-clip-status"></div>',
      '<div id="owv-clip-footer">',
      '  <button id="owv-clip-cancel">취소</button>',
      '  <button id="owv-clip-save">Vault에 저장</button>',
      '</div>',
    ].join('');

    var style = document.createElement('style');
    style.textContent = [
      '#owv-clip-overlay{all:initial;position:fixed;inset:0;z-index:2147483647;',
      'background:rgba(0,0,0,.65);display:flex;align-items:flex-end;',
      'justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',

      '#owv-clip-sheet{all:initial;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      'background:#1e2124;color:#e2e4e7;width:100%;max-width:680px;max-height:88vh;',
      'border-radius:16px 16px 0 0;display:flex;flex-direction:column;',
      'box-shadow:0 -8px 40px rgba(0,0,0,.5);box-sizing:border-box;}',

      '#owv-clip-header{display:flex;align-items:center;justify-content:space-between;',
      'padding:14px 16px 10px;}',
      '#owv-clip-badge{font-size:14px;font-weight:600;color:#8b9eb7;}',
      '#owv-clip-close{all:initial;font-family:inherit;cursor:pointer;font-size:22px;',
      'color:#8b9eb7;line-height:1;padding:0 2px;}',
      '#owv-clip-close:active{color:#e2e4e7;}',

      '#owv-clip-fields{padding:0 16px 10px;display:flex;flex-direction:column;gap:8px;}',
      '.owv-field{display:flex;flex-direction:column;gap:3px;}',
      '.owv-field label{font-size:11px;color:#8b9eb7;}',
      '.owv-field input{all:initial;font-family:inherit;background:#2a2f35;',
      'border:1px solid #3a4048;border-radius:8px;color:#e2e4e7;font-size:14px;',
      'padding:8px 10px;width:100%;box-sizing:border-box;}',
      '.owv-field input:focus{outline:none;border-color:#5b8dd9;}',

      '#owv-clip-preview{flex:1;overflow-y:auto;margin:0 16px;',
      'background:#16191c;border-radius:8px;padding:10px 12px;',
      'font-size:12px;line-height:1.65;color:#b0bac6;',
      'white-space:pre-wrap;word-break:break-word;',
      'font-family:ui-monospace,SFMono-Regular,Consolas,monospace;min-height:80px;}',

      '#owv-clip-status{padding:6px 16px;font-size:13px;color:#8b9eb7;min-height:22px;text-align:center;}',

      '#owv-clip-footer{padding:10px 16px 20px;display:flex;gap:8px;}',
      '#owv-clip-cancel{all:initial;font-family:inherit;background:#2a2f35;border:none;',
      'border-radius:8px;color:#e2e4e7;font-size:15px;padding:11px 18px;cursor:pointer;}',
      '#owv-clip-cancel:active{background:#363c44;}',
      '#owv-clip-save{all:initial;font-family:inherit;flex:1;background:#4a7fd4;border:none;',
      'border-radius:8px;color:#fff;font-size:15px;font-weight:600;padding:11px;',
      'cursor:pointer;text-align:center;}',
      '#owv-clip-save:active{background:#3a6fc4;}',
      '#owv-clip-save:disabled{background:#3a4048;color:#8b9eb7;cursor:default;}',
    ].join('');

    overlay.appendChild(style);
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    var titleInput = document.getElementById('owv-clip-title');
    var pathInput = document.getElementById('owv-clip-path');
    var preview = document.getElementById('owv-clip-preview');
    var status = document.getElementById('owv-clip-status');
    var saveBtn = document.getElementById('owv-clip-save');

    titleInput.value = title;
    pathInput.value = defaultPath;
    preview.textContent = buildContent(title).slice(0, 4000) +
      (md.length > 3500 ? '\n\n…(미리보기 생략)' : '');

    titleInput.addEventListener('input', function () {
      var t = titleInput.value.trim() || title;
      pathInput.value = DEFAULT_FOLDER + '/' + today + ' ' + safeName(t) + '.md';
    });

    function close() {
      overlay.remove();
    }

    document.getElementById('owv-clip-close').addEventListener('click', close);
    document.getElementById('owv-clip-cancel').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    saveBtn.addEventListener('click', function () {
      var saveTitle = titleInput.value.trim() || title;
      var savePath = pathInput.value.trim() || defaultPath;
      var content = buildContent(saveTitle);

      saveBtn.disabled = true;
      saveBtn.textContent = '저장 중…';
      status.textContent = '';
      status.style.color = '#8b9eb7';

      fetch(SERVER + '/api/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: savePath, content: content }),
      })
        .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, json: j }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.json.error || 'HTTP error');
          status.textContent = '✓ 저장 완료: ' + r.json.path;
          status.style.color = '#4caf7d';
          saveBtn.textContent = '저장됨 ✓';
          setTimeout(close, 1800);
        })
        .catch(function (e) {
          status.textContent = '저장 실패: ' + e.message;
          status.style.color = '#e05a5a';
          saveBtn.disabled = false;
          saveBtn.textContent = 'Vault에 저장';
        });
    });
  }

  // ── Bootstrap: load Readability then extract ───────────────────────────
  function run() {
    var article = extractArticle();
    showPopup(article);
  }

  if (window.Readability) {
    run();
  } else {
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/@mozilla/readability@0.5.0/Readability.js';
    s.onload = run;
    s.onerror = run; // fallback extraction still works
    document.head.appendChild(s);
  }
})();
