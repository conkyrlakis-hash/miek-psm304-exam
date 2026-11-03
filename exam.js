(function () {
  var M = window.MIEK;
  if (!M.requireLogin()) return;
  var raw = localStorage.getItem('miek304_exam');
  if (!raw) { location.href = 'home.html'; return; }
  var S = JSON.parse(raw);
  var total = S.questions.length;
  var view = M.$('view');
  var LET = ['Α', 'Β', 'Γ', 'Δ'];

  function save() { localStorage.setItem('miek304_exam', JSON.stringify(S)); }
  function unanswered() { return S.answers.filter(function (a) { return a === null; }).length; }

  function renderQuestion() {
    var q = S.questions[S.idx];
    var h = '<div class="progress">Ερώτηση ' + (S.idx + 1) + ' / ' + total + '</div>' +
      '<div class="bar"><i style="width:' + Math.round((S.idx + 1) * 100 / total) + '%"></i></div>' +
      '<div class="qtext">' + M.esc(q.q) + '</div><div id="opts">';
    q.options.forEach(function (o, i) {
      h += '<button type="button" class="opt' + (S.answers[S.idx] === i ? ' sel' : '') + '" data-i="' + i + '">' +
        '<span class="l">' + LET[i] + '</span><span>' + M.esc(o) + '</span></button>';
    });
    h += '</div><div class="row" style="margin-top:14px">' +
      '<button id="back" class="ghost"' + (S.idx === 0 ? ' disabled' : '') + '>Πίσω</button>' +
      '<button id="next">' + (S.idx === total - 1 ? 'Επισκόπηση' : 'Επόμενη') + '</button></div>' +
      '<div class="row" style="margin-top:10px"><button id="ov" class="ghost">Επισκόπηση όλων των ερωτήσεων</button></div>';
    view.innerHTML = h;
    Array.prototype.forEach.call(view.querySelectorAll('.opt'), function (b) {
      b.addEventListener('click', function () {
        S.answers[S.idx] = parseInt(b.getAttribute('data-i'), 10); save(); renderQuestion();
      });
    });
    M.$('back').addEventListener('click', function () { if (S.idx > 0) { S.idx--; save(); renderQuestion(); } });
    M.$('next').addEventListener('click', function () {
      if (S.idx < total - 1) { S.idx++; save(); renderQuestion(); } else { S.view = 'overview'; save(); renderOverview(); }
    });
    M.$('ov').addEventListener('click', function () { S.view = 'overview'; save(); renderOverview(); });
    window.scrollTo(0, 0);
  }

  function renderOverview() {
    var un = unanswered();
    var h = '<h1>Επισκόπηση</h1><p class="sub">Πατήστε έναν αριθμό για να πάτε στην ερώτηση. Πράσινο = απαντημένη.</p><div class="grid">';
    for (var i = 0; i < total; i++) {
      h += '<button type="button" data-n="' + i + '" class="' + (S.answers[i] === null ? '' : 'done') + '">' + (i + 1) + '</button>';
    }
    h += '</div><p><strong>Απαντημένες: ' + (total - un) + ' / ' + total + '</strong>' +
      (un ? '<br><span style="color:var(--err)">Αναπάντητες: ' + un + '</span>' : '') + '</p>' +
      '<div class="row"><button id="backq" class="ghost">Πίσω στις ερωτήσεις</button>' +
      '<button id="submit" class="green">Υποβολή διαγωνίσματος</button></div>';
    view.innerHTML = h;
    Array.prototype.forEach.call(view.querySelectorAll('.grid button'), function (b) {
      b.addEventListener('click', function () { S.idx = parseInt(b.getAttribute('data-n'), 10); S.view = 'q'; save(); renderQuestion(); });
    });
    M.$('backq').addEventListener('click', function () { S.view = 'q'; save(); renderQuestion(); });
    M.$('submit').addEventListener('click', confirmSubmit);
    window.scrollTo(0, 0);
  }

  function confirmSubmit() {
    var un = unanswered();
    var text = un
      ? '<p><strong>Προσοχή: έχετε ' + un + ' αναπάντητες ερωτήσεις.</strong> Οι αναπάντητες μετράνε ως λάθος.</p><p>Θέλετε να υποβάλετε τώρα;</p>'
      : '<p>Έχετε απαντήσει σε όλες τις ερωτήσεις. Μετά την υποβολή δεν μπορείτε να αλλάξετε απαντήσεις.</p>';
    M.modal('Υποβολή διαγωνίσματος', text, [
      { label: 'Επιστροφή', cls: 'ghost' },
      { label: 'Υποβολή', cls: 'green', onClick: doSubmit }
    ]);
  }

  function doSubmit() {
    var b = M.$('submit'); if (b) b.disabled = true;
    M.api('miek_psm304_submit', { p_token: M.getToken(), p_attempt_id: S.attempt_id, p_answers: S.answers })
      .then(function (r) {
        localStorage.setItem('miek304_result', JSON.stringify(r));
        localStorage.removeItem('miek304_exam');
        location.href = 'result.html';
      })
      .catch(function (e) {
        if (b) b.disabled = false;
        M.showMsg(M.$('err'), false, e.message);
        if (/έχει ήδη υποβληθεί|έχει λήξει|Δεν βρέθηκε/.test(e.message)) {
          localStorage.removeItem('miek304_exam');
          M.$('err').innerHTML += ' <a class="link" href="home.html">Αρχική</a>';
        }
      });
  }

  if (S.view === 'overview') renderOverview(); else renderQuestion();
})();
