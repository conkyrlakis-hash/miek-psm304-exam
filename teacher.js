(function () {
  var M = window.MIEK, KEY = 'miek304_teacher_token';
  var rows = [], total = 30, sortKey = 'rank', sortDir = 1;
  var COLS = [
    { k: 'rank', t: 'Σειρά' }, { k: 'last_name', t: 'Επώνυμο' }, { k: 'first_name', t: 'Όνομα' }, { k: 'email', t: 'Email' },
    { k: 'attempts', t: 'Προσπάθειες' }, { k: 'best_score', t: 'Καλύτερος βαθμός' }, { k: 'out100', t: 'Στα 100' }, { k: 'last_attempt', t: 'Τελευταία προσπάθεια' }
  ];

  function msg(ok, text) { M.showMsg(M.$('msg'), ok, text); }

  function show(on) { M.$('loginBox').hidden = on; M.$('panel').hidden = !on; }

  function fetchResults() {
    var token = M.getToken(KEY);
    return Promise.all([
      M.api('miek_psm304_teacher_results', { p_token: token }),
      M.api('miek_psm304_me', { p_token: token })
    ]).then(function (res) {
      var r = res[0], mine = String(res[1].email || '').trim().toLowerCase();
      total = r.total;
      // the teacher's own trial run is not a student result
      rows = M.rank(r.students.filter(function (s) { return String(s.email || '').trim().toLowerCase() !== mine; }), total);
      return rows;
    });
  }

  // Only a dead session or a wrong account logs her out; a network blip must not.
  function isAuthError(e) { return /έληξε|δικαίωμα/.test((e && e.message) || ''); }

  function load() {
    M.$('msg').hidden = true;
    return fetchResults().then(function () { show(true); draw(); }).catch(function (e) {
      if (isAuthError(e)) { M.clearToken(KEY); show(false); }
      msg(false, e.message);
    });
  }

  // students with no score always stay at the bottom, whichever way the column sorts
  function cmp(a, b) {
    var x = a[sortKey], y = b[sortKey];
    var xn = x === null || x === undefined, yn = y === null || y === undefined;
    if (xn || yn) return xn && yn ? a.pos - b.pos : (xn ? 1 : -1);
    if (typeof x === 'number' && typeof y === 'number') return ((x - y) * sortDir) || (a.pos - b.pos);
    return (String(x).toLowerCase().localeCompare(String(y).toLowerCase(), 'el') * sortDir) || (a.pos - b.pos);
  }

  function draw() {
    rows.sort(cmp);
    var h = '<tr>';
    COLS.forEach(function (c) {
      h += '<th class="sort" data-k="' + c.k + '">' + c.t + (sortKey === c.k ? (sortDir > 0 ? ' ▲' : ' ▼') : '') + '</th>';
    });
    h += '</tr>';
    rows.forEach(function (r) {
      var low = r.fail ? ' class="low"' : '';
      h += '<tr><td>' + (r.rank === null ? '–' : r.rank) + '</td><td>' + M.esc(r.last_name) + '</td><td>' + M.esc(r.first_name) + '</td><td>' + M.esc(r.email) + '</td><td>' +
        r.attempts + '</td><td' + low + '>' + (r.best_score === null ? '–' : r.best_score + ' / ' + total) + '</td><td' + low + '>' +
        (r.out100 === null ? '–' : r.out100) + '</td><td>' + M.esc(M.fmtDate(r.last_attempt)) + '</td></tr>';
    });
    M.$('tbl').innerHTML = h;
    M.$('count').textContent = 'Φοιτητές: ' + rows.length;
    Array.prototype.forEach.call(M.$('tbl').querySelectorAll('th.sort'), function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-k');
        if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = (k === 'best_score' || k === 'out100') ? -1 : 1; }
        draw();
      });
    });
  }

  // Each export asks the server for fresh results. If that fails she sees the error, never old numbers.
  function runExport(btn, build) {
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Περιμένετε...';
    M.$('msg').hidden = true;
    fetchResults()
      .then(function (list) {
        sortKey = 'rank'; sortDir = 1; draw();
        return build(M.rank(list, total), total);
      })
      .catch(function (e) {
        if (isAuthError(e)) { M.clearToken(KEY); show(false); }
        msg(false, (e && e.message) || 'Δεν έγινε η εξαγωγή. Δοκιμάστε ξανά.');
      })
      .then(function () { btn.disabled = false; btn.textContent = label; });
  }

  M.$('pdf').addEventListener('click', function () { runExport(M.$('pdf'), window.MIEK_EXPORT.pdf); });
  M.$('xlsx').addEventListener('click', function () { runExport(M.$('xlsx'), window.MIEK_EXPORT.xlsx); });

  M.$('refresh').addEventListener('click', load);
  M.$('out').addEventListener('click', function () { M.clearToken(KEY); show(false); });

  M.$('lf').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = M.$('email').value.trim(), pw = M.$('pw').value;
    if (!email || !pw) return msg(false, 'Συμπληρώστε email και κωδικό.');
    M.login(email, pw)
      .then(function (t) { M.setToken(t, KEY); return load(); })
      .catch(function (err) { msg(false, err.message); });
  });

  M.$('rf').addEventListener('submit', function (e) {
    e.preventDefault();
    var em = M.$('remail').value.trim(), pw = M.$('rpw').value;
    if (!em || pw.length < 6) return msg(false, 'Βάλτε το email του φοιτητή και νέο κωδικό (τουλάχιστον 6 χαρακτήρες).');
    M.api('miek_psm304_teacher_reset_password', { p_token: M.getToken(KEY), p_student_email: em, p_new_password: pw })
      .then(function () { msg(true, 'Ο κωδικός άλλαξε. Δώστε τον νέο κωδικό στον φοιτητή.'); M.$('rpw').value = ''; })
      .catch(function (err) { msg(false, err.message); });
  });

  if (M.getToken(KEY)) load(); else show(false);
})();
