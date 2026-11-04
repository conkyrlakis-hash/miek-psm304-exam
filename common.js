/* Old address: send anyone who arrives on it to the course link. */
if (location.hostname.endsWith('github.io')) {
  location.replace('https://psm304-supply-chain.pages.dev' + location.pathname.replace('/miek-psm304-exam', '') + location.search);
}

/* Shared helpers: API (Supabase RPC or mock), token, dates, modal. */
(function () {
  var CFG = {
    URL: 'https://cgiibcoeezlmehzowidg.supabase.co',
    KEY: 'sb_publishable_kpJdz2KQoJU0t8vAYCE_4w_qr4HB0R1'
  };
  var MOCK = false;

  function api(fn, args) {
    args = args || {};
    return fetch(CFG.URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'apikey': CFG.KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) {
        if (!r.ok) throw new Error((j && j.message) || 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.');
        return j;
      });
    }, function () {
      throw new Error('Δεν υπάρχει σύνδεση με τον διακομιστή. Δοκιμάστε ξανά.');
    });
  }

  // login RPC returns {token} or {error}: never an HTTP error, so the server can count wrong passwords
  function login(email, pw) {
    return api('miek_psm304_login', { p_email: email, p_password: pw }).then(function (r) {
      if (!r || !r.token) throw new Error((r && r.error) || 'Λάθος email ή κωδικός. Μετά από 5 λάθη ο λογαριασμός κλειδώνει για 15 λεπτά.');
      return r.token;
    });
  }

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', { timeZone: 'Europe/Nicosia', day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function getToken(key) { return localStorage.getItem(key || 'miek304_token'); }
  function setToken(t, key) { localStorage.setItem(key || 'miek304_token', t); }
  function clearToken(key) { localStorage.removeItem(key || 'miek304_token'); }
  function logout() {
    clearToken(); localStorage.removeItem('miek304_exam'); localStorage.removeItem('miek304_result');
    location.href = 'login.html';
  }
  function requireLogin() {
    if (!getToken()) { location.href = 'login.html'; return false; }
    return true;
  }
  function showMsg(el, ok, text) {
    el.hidden = false; el.className = 'msg ' + (ok ? 'ok' : 'err'); el.textContent = text;
  }

  /* Popup that closes when you tap outside it. buttons: [{label, cls, onClick}] */
  function modal(title, html, buttons) {
    var ov = document.createElement('div');
    ov.className = 'overlay';
    var box = document.createElement('div');
    box.className = 'modal';
    box.setAttribute('role', 'dialog');
    box.innerHTML = '<h3>' + esc(title) + '</h3><div>' + html + '</div><div class="row" style="margin-top:14px"></div>';
    var row = box.lastChild;
    function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
    (buttons || [{ label: 'Εντάξει' }]).forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = b.label; btn.className = b.cls || '';
      btn.addEventListener('click', function () { close(); if (b.onClick) b.onClick(); });
      row.appendChild(btn);
    });
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    ov.appendChild(box);
    document.body.appendChild(ov);
    return close;
  }


  window.MIEK = { api: api, login: login, $: $, esc: esc, fmtDate: fmtDate, getToken: getToken, setToken: setToken,
    clearToken: clearToken, logout: logout, requireLogin: requireLogin, showMsg: showMsg, modal: modal, MOCK: MOCK };
})();
