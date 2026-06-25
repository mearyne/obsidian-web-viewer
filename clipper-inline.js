/* Obsidian Web Viewer – Web Clipper (inline, no external deps) */
/* SERVER and DEFAULT_FOLDER are injected by /api/clip-bookmarklet */
(function () {
  'use strict';

  var SERVER = '__SERVER__';
  var DEFAULT_FOLDER = '__FOLDER__';

  var prev = document.getElementById('owv-clip-overlay');
  if (prev) { prev.remove(); }

  function todayStr() {
    var d = new Date(), pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function safeName(t) {
    return t.replace(/[/\\:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  function matchLabel(savePath, labels) {
    for (var i = 0; i < labels.length; i++) {
      var lp = labels[i].path;
      var prefix = lp.endsWith('/') ? lp : lp + '/';
      if (savePath === lp || savePath.startsWith(prefix)) return labels[i].label;
    }
    return '';
  }

  function applyLabel(baseTitle, label) {
    return label ? baseTitle + ' (' + label + ')' : baseTitle;
  }

  function showPopup(clipperLabels) {
    var rawTitle = document.title.trim() || 'Clipped Page';
    var pageUrl = location.href;
    var today = todayStr();
    var excerpt = pageUrl;
    var defaultPath = DEFAULT_FOLDER + '/' + today + ' ' + safeName(rawTitle) + '.md';
    var initialLabel = matchLabel(defaultPath, clipperLabels);
    var displayTitle = applyLabel(rawTitle, initialLabel);

    var overlay = document.createElement('div');
    overlay.id = 'owv-clip-overlay';

    var style = document.createElement('style');
    style.textContent = '#owv-clip-overlay{all:initial;position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.65);display:flex;align-items:flex-end;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}#owv-clip-sheet{all:initial;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#1e2124;color:#e2e4e7;width:100%;max-width:680px;max-height:88vh;border-radius:16px 16px 0 0;display:flex;flex-direction:column;box-shadow:0 -8px 40px rgba(0,0,0,.5);box-sizing:border-box;}#owv-clip-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;}#owv-clip-badge{font-size:14px;font-weight:600;color:#8b9eb7;}#owv-clip-close{all:initial;font-family:inherit;cursor:pointer;font-size:22px;color:#8b9eb7;line-height:1;padding:0 4px;}#owv-clip-fields{padding:0 16px 10px;display:flex;flex-direction:column;gap:8px;}.owv-field{display:flex;flex-direction:column;gap:3px;}.owv-field label{font-size:11px;color:#8b9eb7;}.owv-field input{all:initial;font-family:inherit;background:#2a2f35;border:1px solid #3a4048;border-radius:8px;color:#e2e4e7;font-size:14px;padding:8px 10px;width:100%;box-sizing:border-box;}.owv-field input:focus{outline:none;border-color:#5b8dd9;}#owv-clip-preview{flex:1;overflow-y:auto;margin:0 16px;background:#16191c;border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.65;color:#b0bac6;white-space:pre-wrap;word-break:break-word;min-height:60px;}#owv-clip-status{padding:6px 16px;font-size:13px;color:#8b9eb7;min-height:22px;text-align:center;}#owv-clip-footer{padding:10px 16px 20px;display:flex;gap:8px;}#owv-clip-cancel{all:initial;font-family:inherit;background:#2a2f35;border-radius:8px;color:#e2e4e7;font-size:15px;padding:11px 18px;cursor:pointer;}#owv-clip-save{all:initial;font-family:inherit;flex:1;background:#4a7fd4;border-radius:8px;color:#fff;font-size:15px;font-weight:600;padding:11px;cursor:pointer;text-align:center;}#owv-clip-save:disabled{background:#3a4048;color:#8b9eb7;}';

    var sheet = document.createElement('div');
    sheet.id = 'owv-clip-sheet';
    sheet.innerHTML = '<div id="owv-clip-header"><span id="owv-clip-badge">📎 Web Clipper</span><button id="owv-clip-close">×</button></div><div id="owv-clip-fields"><div class="owv-field"><label>제목</label><input id="owv-clip-title" type="text" autocomplete="off" /></div><div class="owv-field"><label>저장 경로</label><input id="owv-clip-path" type="text" autocomplete="off" /></div></div><div id="owv-clip-preview"></div><div id="owv-clip-status"></div><div id="owv-clip-footer"><button id="owv-clip-cancel">취소</button><button id="owv-clip-save">Vault에 저장</button></div>';

    overlay.appendChild(style);
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    var titleInput = document.getElementById('owv-clip-title');
    var pathInput = document.getElementById('owv-clip-path');
    var preview = document.getElementById('owv-clip-preview');
    var status = document.getElementById('owv-clip-status');
    var saveBtn = document.getElementById('owv-clip-save');

    titleInput.value = displayTitle;
    pathInput.value = defaultPath;
    preview.textContent = excerpt;

    var activeLabel = initialLabel;

    titleInput.addEventListener('input', function () {
      var t = safeName(titleInput.value.trim() || rawTitle);
      pathInput.value = DEFAULT_FOLDER + '/' + today + ' ' + t + '.md';
      var newLabel = matchLabel(pathInput.value, clipperLabels);
      activeLabel = newLabel;
    });

    pathInput.addEventListener('input', function () {
      var newLabel = matchLabel(pathInput.value, clipperLabels);
      if (newLabel !== activeLabel) {
        var base = titleInput.value.replace(/ \([^)]*\)$/, '').trim() || rawTitle;
        titleInput.value = applyLabel(base, newLabel);
        activeLabel = newLabel;
      }
    });

    function close() { overlay.remove(); }

    document.getElementById('owv-clip-close').addEventListener('click', close);
    document.getElementById('owv-clip-cancel').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    saveBtn.addEventListener('click', function () {
      var saveTitle = titleInput.value.trim() || displayTitle;
      var savePath = pathInput.value.trim() || defaultPath;
      var content = '---\ntitle: "' + saveTitle.replace(/"/g, '\\"') + '"\nurl: ' + pageUrl + '\ndate: ' + today + '\n---\n\n[' + saveTitle + '](' + pageUrl + ')';
      saveBtn.disabled = true;
      saveBtn.textContent = '저장 중…';
      status.textContent = '';
      fetch(SERVER + '/api/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: savePath, content: content }),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.j.error || 'HTTP error');
          status.textContent = '✓ 저장 완료: ' + r.j.path;
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

  fetch(SERVER + '/api/settings', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (s) { showPopup(Array.isArray(s.clipperLabels) ? s.clipperLabels : []); })
    .catch(function () { showPopup([]); });
})();
