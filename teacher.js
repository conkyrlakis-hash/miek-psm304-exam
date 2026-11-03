(function () {
  var M = window.MIEK, KEY = 'miek304_teacher_token';
  var rows = [], total = 30, sortKey = 'last_name', sortDir = 1;
  var COLS = [
    { k: 'last_name', t: 'Επώνυμο' }, { k: 'first_name', t: 'Όνομα' }, { k: 'email', t: 'Email' },
    { k: 'attempts', t: 'Προσπάθειες' }, { k: 'best_score', t: 'Καλύτερος βαθμός' }, { k: 'last_attempt', t: 'Τελευταία προσπάθεια' }
  ];

  function msg(ok, text) { M.showMsg(M.$('msg'), ok, text); }

  function show(on) { M.$('loginBox').hidden = on; M.$('panel').hidden = !on; }

  function load() {
    M.$('msg').hidden = true;
    return M.api('miek_psm304_teacher_results', { p_token: M.getToken(KEY) }).then(function (r) {
      rows = r.students; total = r.total; show(true); draw();
    }).catch(function (e) { M.clearToken(KEY); show(false); msg(false, e.message); });
  }

  function cmp(a, b) {
    var x = a[sortKey], y = b[sortKey];
    if (x === null || x === undefined) x = (typeof y === 'number') ? -1 : '';
    if (y === null || y === undefined) y = (typeof x === 'number') ? -1 : '';
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * sortDir;
    return String(x).toLowerCase().localeCompare(String(y).toLowerCase(), 'el') * sortDir;
  }

  function draw() {
    rows.sort(cmp);
    var h = '<tr>';
    COLS.forEach(function (c) {
      h += '<th class="sort" data-k="' + c.k + '">' + c.t + (sortKey === c.k ? (sortDir > 0 ? ' ▲' : ' ▼') : '') + '</th>';
    });
    h += '</tr>';
    rows.forEach(function (r) {
      h += '<tr><td>' + M.esc(r.last_name) + '</td><td>' + M.esc(r.first_name) + '</td><td>' + M.esc(r.email) + '</td><td>' +
        r.attempts + '</td><td>' + (r.best_score === null ? '–' : r.best_score + ' / ' + total) + '</td><td>' +
        M.esc(M.fmtDate(r.last_attempt)) + '</td></tr>';
    });
    M.$('tbl').innerHTML = h;
    M.$('count').textContent = 'Φοιτητές: ' + rows.length;
    Array.prototype.forEach.call(M.$('tbl').querySelectorAll('th.sort'), function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-k');
        if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = 1; }
        draw();
      });
    });
  }

  function csvCell(v) { return '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"'; }

  M.$('csv').addEventListener('click', function () {
    var lines = [COLS.map(function (c) { return csvCell(c.t); }).concat([csvCell('Στα 100')]).join(';')];
    rows.forEach(function (r) {
      lines.push([r.last_name, r.first_name, r.email, r.attempts, r.best_score === null ? '' : r.best_score,
        M.fmtDate(r.last_attempt), r.best_score === null ? '' : Math.round(r.best_score * 100 / total)].map(csvCell).join(';'));
    });
    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'psm304-apotelesmata.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });

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
