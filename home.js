(function () {
  var M = window.MIEK;
  if (!M.requireLogin()) return;
  var me = null;

  M.$('logout').addEventListener('click', M.logout);

  function pct(score, total) { return Math.round(score * 100 / total); }

  function render(d) {
    me = d;
    M.$('hello').textContent = 'Γεια σας, ' + d.first_name + ' ' + d.last_name;
    if (d.best_score === null || d.best_score === undefined) {
      M.$('best').textContent = '–';
      M.$('best100').textContent = 'Δεν έχετε υποβάλει ακόμα διαγώνισμα.';
    } else {
      M.$('best').textContent = d.best_score + ' / ' + d.total;
      M.$('best100').textContent = pct(d.best_score, d.total) + ' / 100';
    }
    M.$('window').textContent = 'Από ' + M.fmtDate(d.opens_at) + ' έως ' + M.fmtDate(d.closes_at) +
      (d.is_open ? ' (ανοιχτό τώρα)' : ' (κλειστό αυτή τη στιγμή)');
    var box = M.$('attempts');
    if (!d.attempts.length) {
      box.innerHTML = '<span class="sub">Δεν υπάρχουν προσπάθειες ακόμα.</span>';
    } else {
      var h = '<table><tr><th>Ημερομηνία</th><th>Βαθμός</th><th>Στα 100</th>' + (d.review_open ? '<th></th>' : '') + '</tr>';
      d.attempts.forEach(function (a) {
        h += '<tr><td>' + M.esc(M.fmtDate(a.date)) + '</td><td>' + a.score + ' / ' + a.total + '</td><td>' + pct(a.score, a.total) + '</td>' +
          (d.review_open ? '<td><a class="btn" href="review.html?id=' + encodeURIComponent(a.id) + '">Δείτε τα λάθη σας</a></td>' : '') + '</tr>';
      });
      box.innerHTML = h + '</table>';
    }
    var noLeft = d.attempts_left !== null && d.attempts_left <= 0;
    M.$('left').textContent = d.attempts_left === null ? '' : 'Προσπάθειες που απομένουν: ' + d.attempts_left;
    M.$('start').disabled = !d.is_open || noLeft;
    M.$('tlink').hidden = !d.is_teacher;
    if (localStorage.getItem('miek304_exam')) M.$('resume').hidden = false;
  }

  M.$('resume').addEventListener('click', function () { location.href = 'exam.html'; });

  M.$('start').addEventListener('click', function () {
    var hasOpen = !!localStorage.getItem('miek304_exam');
    var text = '<p>Θα εμφανιστούν 30 ερωτήσεις, μία κάθε φορά.' +
      (hasOpen ? ' Το διαγώνισμα που είχατε ξεκινήσει θα ακυρωθεί.' : '') + '</p>';
    M.modal('Έναρξη διαγωνίσματος', text, [
      { label: 'Άκυρο', cls: 'ghost' },
      { label: 'Έναρξη', cls: 'green', onClick: begin }
    ]);
  });

  function begin() {
    var b = M.$('start'); b.disabled = true;
    M.api('miek_psm304_start', { p_token: M.getToken() }).then(function (r) {
      localStorage.removeItem('miek304_result');
      localStorage.setItem('miek304_exam', JSON.stringify({
        attempt_id: r.attempt_id, questions: r.questions,
        answers: r.questions.map(function () { return null; }), idx: 0, view: 'q'
      }));
      location.href = 'exam.html';
    }).catch(function (e) {
      b.disabled = false;
      var el = M.$('err'); M.showMsg(el, false, e.message);
    });
  }

  M.api('miek_psm304_me', { p_token: M.getToken() }).then(render).catch(function (e) {
    if (/έληξε/.test(e.message)) { M.clearToken(); location.href = 'login.html'; return; }
    M.showMsg(M.$('err'), false, e.message);
  });
})();
