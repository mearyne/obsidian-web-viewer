/* Obsidian Web Viewer – Web Clipper (inline, no external deps) */
/* SERVER and DEFAULT_FOLDER are injected by /api/clip-bookmarklet */
(function () {
  'use strict';

  var SERVER = '__SERVER__';
  var DEFAULT_FOLDER = '__FOLDER__';

  var prev = document.getElementById('owv-clip-toast');
  if (prev) { prev.remove(); }

  function todayStr() {
    var d = new Date(), pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function safeName(t) {
    return t.replace(/[/\\:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  function matchRule(pageUrl, rules) {
    for (var i = 0; i < rules.length; i++) {
      var p = rules[i].urlPattern;
      if (!p) continue;
      if (p.includes('*')) {
        var regex = new RegExp(p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*'));
        if (regex.test(pageUrl)) return rules[i];
      } else if (pageUrl.includes(p)) {
        return rules[i];
      }
    }
    return null;
  }

  function buildEmbedContent(title, url, meta, today) {
    var esc = function (s) { return (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"'); };
    var fm = '---\ntitle: "' + esc(title) + '"\nurl: ' + url + '\ndate: ' + today + '\n---\n\n';
    var block = meta
      ? '```embed\ntitle: "' + esc(meta.title || title) + '"\ndescription: "' + esc(meta.description || '') + '"\nimage: "' + esc(meta.image || '') + '"\nfavicon: "' + esc(meta.favicon || '') + '"\nurl: "' + esc(url) + '"\n```'
      : '```embed\nstatus: "loading"\nurl: "' + esc(url) + '"\n```';
    return fm + block;
  }

  function showToast(msg, color) {
    var el = document.getElementById('owv-clip-toast');
    if (!el) return;
    el.textContent = msg;
    el.style.background = color || '#2a2f35';
  }

  function fallbackSaveByNavigation(savePath, title, pageUrl) {
    var fallbackUrl = SERVER + '/api/clip-url?path=' + encodeURIComponent(savePath)
      + '&title=' + encodeURIComponent(title)
      + '&url=' + encodeURIComponent(pageUrl);
    var popup = window.open(fallbackUrl, '_blank', 'width=420,height=240');
    if (popup) {
      try { popup.opener = null; } catch (e) {}
      showToast('브라우저가 직접 저장을 막아 새 창으로 저장합니다.', '#4a3f2d');
      return true;
    }
    location.href = fallbackUrl;
    return true;
  }

  function clip(rules) {
    var rawTitle = document.title.trim() || 'Clipped Page';
    var pageUrl = location.href;
    var today = todayStr();
    var rule = matchRule(pageUrl, rules);
    var folder = (rule && rule.savePath) || DEFAULT_FOLDER;
    var baseTitle = safeName(rawTitle);
    var displayTitle = (rule && rule.label) ? baseTitle + ' (' + rule.label + ')' : baseTitle;
    var savePath = folder + '/' + today + ' ' + safeName(displayTitle) + '.md';

    var esc = function (s) { return (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"'); };
    var loadingContent = '---\ntitle: "' + esc(displayTitle) + '"\nurl: ' + pageUrl + '\ndate: ' + today + '\n---\n\n'
      + '```embed\nstatus: "loading"\nurl: "' + esc(pageUrl) + '"\n```';

    fetch(SERVER + '/api/clip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: savePath, content: loadingContent }),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.j.error || 'HTTP error');
        var savedPath = r.j.path || savePath;
        showToast('✓ 저장됨: ' + savedPath, '#2d4a2d');
        setTimeout(function () {
          var el = document.getElementById('owv-clip-toast');
          if (el) el.remove();
        }, 2500);

        fetch(SERVER + '/api/url-meta?url=' + encodeURIComponent(pageUrl))
          .then(function (r) { return r.ok ? r.json() : null; })
          .catch(function () { return null; })
          .then(function (meta) {
            if (!meta) return;
            var updatedContent = buildEmbedContent(displayTitle, pageUrl, meta, today);
            fetch(SERVER + '/api/clip', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: savedPath, content: updatedContent, overwrite: true }),
            }).catch(function () {});
          });
      })
      .catch(function (e) {
        if (e && e.message === 'Failed to fetch' && fallbackSaveByNavigation(savePath, displayTitle, pageUrl)) return;
        showToast('✗ 저장 실패: ' + e.message, '#4a2d2d');
      });
  }

  // 토스트 UI 먼저 표시
  var toast = document.createElement('div');
  toast.id = 'owv-clip-toast';
  toast.style.cssText = 'all:initial;position:fixed;top:16px;right:16px;z-index:2147483647;background:#2a2f35;color:#e2e4e7;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;padding:10px 16px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.5);max-width:360px;word-break:break-all;';
  toast.textContent = '📎 저장 중…';
  document.body.appendChild(toast);

  fetch(SERVER + '/api/settings', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (s) { clip(Array.isArray(s.clipperRules) ? s.clipperRules : []); })
    .catch(function () { clip([]); });
})();
