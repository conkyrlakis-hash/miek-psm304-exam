/* Results exports for the teacher page: ranking, PDF (jsPDF) and Excel (ExcelJS). Both use the same layout.
   The heavy libraries in vendor/ load only when a button is pressed, and only on the teacher page. */
(function () {
  var M = window.MIEK;
  var BLUE = '3B4A9F', GREEN = '8CC63F', RED = 'C62828', OK = '2F7D1D', STRIPE = 'F3F5FB', LINE = 'D9DEEA', INK = '1B2133', MUTED = '5B6478';
  var COURSE = 'ΜΙΕΕΚ · PSM 304 Διαχείριση Λειτουργιών Εφοδιαστικής Αλυσίδας';
  var SUB = 'Ενδιάμεσο διαγώνισμα · Αποτελέσματα · Εκπαιδεύτρια: Ελένη Μιχαηλίδου';
  var HEAD = ['Σειρά', 'Επώνυμο', 'Όνομα', 'Email', 'Προσπάθειες', 'Βαθμός', 'Στα 100', 'Τελευταία προσπάθεια'];

  /* Highest score first. Ties share a rank and go by surname, then name. No score = bottom of the list, no rank.
     Below 50% is decided on the exact score: 15 / 30 is exactly 50% and is not red. */
  function rank(list, total) {
    var a = list.map(function (s) {
      var has = s.best_score !== null && s.best_score !== undefined;
      return Object.assign({}, s, {
        best_score: has ? s.best_score : null,
        out100: has ? Math.round(s.best_score * 100 / total) : null,
        fail: has && s.best_score * 2 < total
      });
    });
    function name(x, y) {
      return String(x.last_name).localeCompare(String(y.last_name), 'el', { sensitivity: 'base' }) ||
        String(x.first_name).localeCompare(String(y.first_name), 'el', { sensitivity: 'base' });
    }
    a.sort(function (x, y) {
      if (x.best_score === null || y.best_score === null) {
        if (x.best_score === null && y.best_score === null) return name(x, y);
        return x.best_score === null ? 1 : -1;
      }
      return (y.best_score - x.best_score) || name(x, y);
    });
    var r = 0, prev = null;
    a.forEach(function (s, i) {
      s.pos = i;
      if (s.best_score === null) { s.rank = null; return; }
      if (s.best_score !== prev) { r = i + 1; prev = s.best_score; }
      s.rank = r;
    });
    return a;
  }
  M.rank = rank;

  function nicosiaParts(d) {
    var p = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Nicosia', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }

  function nicosiaNow() {
    var p = nicosiaParts(new Date());
    return { text: p.day + '/' + p.month + '/' + p.year + ' ' + p.hour + ':' + p.minute, iso: p.year + '-' + p.month + '-' + p.day };
  }

  function dateTime(iso) {
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d.getTime())) return '–';
    var p = nicosiaParts(d);
    return p.day + '/' + p.month + '/' + p.year + ' ' + p.hour + ':' + p.minute;
  }

  /* What each student answered: the same wording on screen, in the PDF and in Excel. */
  var A = {
    NOT_SUBMITTED: 'Ξεκίνησε, δεν υποβλήθηκε. Δεν υπάρχουν απαντήσεις, γιατί αποθηκεύονται μόνο με την υποβολή.',
    LETTER_NOTE: 'Τα γράμματα είναι αυτά που είδε ο φοιτητής σε αυτή την προσπάθεια, γιατί οι επιλογές ανακατεύονται σε κάθε προσπάθεια. Ώρα Κύπρου.',
    // same rule as the results table: the best score among attempts submitted on time
    best: function (list) {
      var b = {};
      list.forEach(function (a) { if (a.counts && (b[a.email] === undefined || a.score > b[a.email])) b[a.email] = a.score; });
      return b;
    },
    holdsBest: function (a, best) { return a.counts && a.score === best[a.email]; },
    word: function (x) { return x.ok ? 'Σωστό' : (x.chosen === null || x.chosen === undefined ? 'Χωρίς απάντηση' : 'Λάθος'); },
    option: function (letter, text) { return text === null || text === undefined ? '–' : letter + '. ' + text; },
    head: function (a, best) {
      var t = 'Προσπάθεια ' + a.n + '  ·  Έναρξη: ' + dateTime(a.started_at);
      if (a.status !== 'submitted') return t;
      t += '  ·  Υποβολή: ' + dateTime(a.submitted_at) + '  ·  Βαθμός: ' + a.score + ' / ' + a.total + '  ·  Στα 100: ' + Math.round(a.score * 100 / a.total);
      if (A.holdsBest(a, best)) return t + '  ·  Καλύτερος βαθμός';
      return a.counts ? t : t + '  ·  Εκτός χρόνου, δεν μετράει';
    }
  };
  M.answers = A;

  function summary(list, total) {
    var sat = list.filter(function (s) { return s.best_score !== null; });
    var low = sat.filter(function (s) { return s.fail; }).length;
    var avg = sat.length ? Math.round(sat.reduce(function (t, s) { return t + s.best_score * 100 / total; }, 0) / sat.length) : null;
    return 'Φοιτητές: ' + list.length + '   ·   Με βαθμό: ' + sat.length + '   ·   Κάτω από 50%: ' + low +
      '   ·   Μέσος όρος: ' + (avg === null ? '–' : avg + ' / 100');
  }

  function loadScript(src) {
    return new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = function () { no(new Error('Δεν φορτώθηκε το αρχείο εξαγωγής. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.')); };
      document.head.appendChild(s);
    });
  }
  var loaded = {};
  function need(src) { return loaded[src] || (loaded[src] = loadScript(src).catch(function (e) { delete loaded[src]; throw e; })); }

  function saveBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
  }

  function hex(c) { return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }

  function pdf(list, total) {
    return need('vendor/jspdf.umd.min.js')
      .then(function () { return need('vendor/jspdf.plugin.autotable.min.js'); })
      .then(function () { return need('vendor/fonts.js'); })
      .then(function () {
        var now = nicosiaNow();
        var doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
        doc.addFileToVFS('NotoSans-Regular.ttf', window.MIEK_FONTS.regular);
        doc.addFont('NotoSans-Regular.ttf', 'Noto', 'normal');
        doc.addFileToVFS('NotoSans-Bold.ttf', window.MIEK_FONTS.bold);
        doc.addFont('NotoSans-Bold.ttf', 'Noto', 'bold');
        doc.setProperties({ title: 'PSM 304 Αποτελέσματα ' + now.text, author: 'ΜΙΕΕΚ', subject: 'Ενδιάμεσο διαγώνισμα' });

        var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), mx = 12;
        doc.setFillColor.apply(doc, hex(BLUE)); doc.rect(0, 0, W, 23, 'F');
        doc.setFillColor.apply(doc, hex(GREEN)); doc.rect(0, 23, W, 1.6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('Noto', 'bold'); doc.setFontSize(14); doc.text(COURSE, mx, 10.5);
        doc.setFont('Noto', 'normal'); doc.setFontSize(10); doc.text(SUB, mx, 17.5);

        doc.setTextColor.apply(doc, hex(INK));
        doc.setFont('Noto', 'bold'); doc.setFontSize(10); doc.text(summary(list, total), mx, 32);
        doc.setFont('Noto', 'normal'); doc.setFontSize(9); doc.setTextColor.apply(doc, hex(MUTED));
        doc.text('Εξαγωγή: ' + now.text, W - mx, 32, { align: 'right' });

        var body = list.map(function (s) {
          return [s.rank === null ? '–' : s.rank, s.last_name, s.first_name, s.email, s.attempts,
            s.best_score === null ? '–' : s.best_score + ' / ' + total, s.out100 === null ? '–' : s.out100, M.fmtDate(s.last_attempt) || '–'];
        });
        if (!body.length) body = [[{ content: 'Δεν υπάρχουν φοιτητές ακόμα.', colSpan: 8, styles: { halign: 'center', textColor: hex(MUTED) } }]];

        doc.autoTable({
          startY: 36,
          margin: { left: mx, right: mx, top: 14, bottom: 14 },
          head: [HEAD],
          body: body,
          theme: 'grid',
          showHead: 'everyPage',
          styles: { font: 'Noto', fontStyle: 'normal', fontSize: 10, cellPadding: { top: 2.1, bottom: 2.1, left: 2.4, right: 2.4 }, textColor: hex(INK), lineColor: hex(LINE), lineWidth: 0.2, valign: 'middle', overflow: 'linebreak' },
          headStyles: { font: 'Noto', fontStyle: 'bold', fontSize: 9.5, fillColor: hex(BLUE), textColor: [255, 255, 255], halign: 'center' },
          alternateRowStyles: { fillColor: hex(STRIPE) },
          columnStyles: {
            0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 49 },
            2: { cellWidth: 42 },
            3: { cellWidth: 70 },
            4: { cellWidth: 28, halign: 'center' },
            5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
            6: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
            7: { cellWidth: 30, halign: 'center' }
          },
          didParseCell: function (d) {
            if (d.section === 'body' && (d.column.index === 5 || d.column.index === 6) && list[d.row.index] && list[d.row.index].fail) {
              d.cell.styles.fillColor = hex(RED);
              d.cell.styles.textColor = [255, 255, 255];
              d.cell.styles.fontStyle = 'bold';
            }
          }
        });
        var pages = doc.internal.getNumberOfPages();
        for (var p = 1; p <= pages; p++) {
          doc.setPage(p);
          doc.setFont('Noto', 'normal'); doc.setFontSize(8); doc.setTextColor.apply(doc, hex(MUTED));
          doc.text('Κόκκινο: βαθμός κάτω από 50%', mx, H - 7);
          doc.text('Σελίδα ' + p + ' / ' + pages, W - mx, H - 7, { align: 'right' });
        }
        saveBlob(doc.output('blob'), now.iso + '_PSM304_Apotelesmata.pdf');
      });
  }

  function xlsx(list, total) {
    return need('vendor/exceljs.min.js').then(function () {
      var now = nicosiaNow();
      var wb = new window.ExcelJS.Workbook();
      wb.creator = 'ΜΙΕΕΚ';
      var ws = wb.addWorksheet('Αποτελέσματα', {
        views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '5:5',
          margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
        headerFooter: { oddFooter: '&LΚόκκινο: βαθμός κάτω από 50%&RΣελίδα &P / &N' }
      });
      ws.columns = [{ width: 8 }, { width: 26 }, { width: 22 }, { width: 38 }, { width: 13 }, { width: 11 }, { width: 10 }, { width: 15 }];
      var FONT = 'Calibri';
      function argb(c) { return { argb: 'FF' + c }; }
      function fill(c) { return { type: 'pattern', pattern: 'solid', fgColor: argb(c) }; }
      function band(row, text, h, font, color, align) {
        ws.mergeCells(row, 1, row, 8);
        var c = ws.getCell(row, 1);
        c.value = text; c.font = font; c.alignment = { vertical: 'middle', horizontal: align || 'left', indent: 1 };
        if (color) for (var i = 1; i <= 8; i++) ws.getCell(row, i).fill = fill(color);
        ws.getRow(row).height = h;
      }
      band(1, COURSE, 27, { name: FONT, size: 15, bold: true, color: argb('FFFFFF') }, BLUE);
      band(2, SUB, 20, { name: FONT, size: 11, color: argb('FFFFFF') }, BLUE);
      band(3, '', 5, { name: FONT, size: 2 }, GREEN);

      ws.mergeCells(4, 1, 4, 6);
      ws.getCell(4, 1).value = summary(list, total);
      ws.getCell(4, 1).font = { name: FONT, size: 11, bold: true, color: argb(INK) };
      ws.getCell(4, 1).alignment = { vertical: 'middle', indent: 1 };
      ws.mergeCells(4, 7, 4, 8);
      ws.getCell(4, 7).value = 'Εξαγωγή: ' + now.text;
      ws.getCell(4, 7).font = { name: FONT, size: 10, color: argb(MUTED) };
      ws.getCell(4, 7).alignment = { vertical: 'middle', horizontal: 'right' };
      ws.getRow(4).height = 26;

      var border = { top: { style: 'thin', color: argb(LINE) }, left: { style: 'thin', color: argb(LINE) }, bottom: { style: 'thin', color: argb(LINE) }, right: { style: 'thin', color: argb(LINE) } };
      HEAD.forEach(function (t, i) {
        var c = ws.getCell(5, i + 1);
        c.value = t; c.fill = fill(BLUE); c.border = border;
        c.font = { name: FONT, size: 11, bold: true, color: argb('FFFFFF') };
        c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
      ws.getRow(5).height = 32;

      var scoreFmt = '0" / ' + total + '"', r = 6;
      list.forEach(function (s, i) {
        var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(M.fmtDate(s.last_attempt) || '');
        // text, never a formula, so a name can't run as one; the date is a real Excel date shown day first
        var vals = [s.rank === null ? '–' : s.rank, s.last_name, s.first_name, s.email, s.attempts,
          s.best_score === null ? '–' : s.best_score, s.out100 === null ? '–' : s.out100,
          m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : '–'];
        vals.forEach(function (v, k) {
          var c = ws.getCell(r, k + 1);
          c.value = v; c.border = border;
          c.font = { name: FONT, size: 11, bold: k === 0 || k === 5 || k === 6, color: argb(INK) };
          c.alignment = { vertical: 'middle', horizontal: (k >= 1 && k <= 3) ? 'left' : 'center', indent: (k >= 1 && k <= 3) ? 1 : 0, shrinkToFit: k === 3, wrapText: k === 1 || k === 2 };
          if (i % 2) c.fill = fill(STRIPE);
        });
        if (s.best_score !== null) ws.getCell(r, 6).numFmt = scoreFmt;
        if (m) ws.getCell(r, 8).numFmt = 'dd/mm/yyyy';
        if (s.fail) {
          [6, 7].forEach(function (k) {
            var c = ws.getCell(r, k);
            c.fill = fill(RED);
            c.font = { name: FONT, size: 11, bold: true, color: argb('FFFFFF') };
          });
        }
        // a very long name wraps, as in the PDF; Excel will not grow a row by itself once its height is set
        var lines = Math.max(Math.ceil(String(s.last_name).length / 24), Math.ceil(String(s.first_name).length / 20), 1);
        ws.getRow(r).height = lines > 1 ? 15 * lines + 6 : 21;
        r++;
      });
      if (!list.length) {
        ws.mergeCells(6, 1, 6, 8);
        ws.getCell(6, 1).value = 'Δεν υπάρχουν φοιτητές ακόμα.';
        ws.getCell(6, 1).alignment = { horizontal: 'center' };
        ws.getCell(6, 1).font = { name: FONT, size: 11, color: argb(MUTED) };
      } else {
        ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: r - 1, column: 8 } };
      }
      return wb.xlsx.writeBuffer().then(function (buf) {
        saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), now.iso + '_PSM304_Apotelesmata.xlsx');
      });
    });
  }

  /* One student: every attempt on its own page, question by question. */
  function answersPdf(student, list) {
    return need('vendor/jspdf.umd.min.js')
      .then(function () { return need('vendor/jspdf.plugin.autotable.min.js'); })
      .then(function () { return need('vendor/fonts.js'); })
      .then(function () {
        var now = nicosiaNow(), best = A.best(list);
        var who = student.last_name + ' ' + student.first_name;
        var doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
        doc.addFileToVFS('NotoSans-Regular.ttf', window.MIEK_FONTS.regular);
        doc.addFont('NotoSans-Regular.ttf', 'Noto', 'normal');
        doc.addFileToVFS('NotoSans-Bold.ttf', window.MIEK_FONTS.bold);
        doc.addFont('NotoSans-Bold.ttf', 'Noto', 'bold');
        doc.setProperties({ title: 'PSM 304 Απαντήσεις ' + who, author: 'ΜΙΕΕΚ', subject: 'Ενδιάμεσο διαγώνισμα' });
        var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), mx = 12;

        list.forEach(function (a, i) {
          if (i) doc.addPage();
          doc.setFillColor.apply(doc, hex(BLUE)); doc.rect(0, 0, W, 23, 'F');
          doc.setFillColor.apply(doc, hex(GREEN)); doc.rect(0, 23, W, 1.6, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('Noto', 'bold'); doc.setFontSize(14); doc.text(COURSE, mx, 10.5);
          doc.setFont('Noto', 'normal'); doc.setFontSize(10); doc.text('Ενδιάμεσο διαγώνισμα · Απαντήσεις φοιτητή · Εκπαιδεύτρια: Ελένη Μιχαηλίδου', mx, 17.5);
          doc.setTextColor.apply(doc, hex(INK));
          doc.setFont('Noto', 'bold'); doc.setFontSize(11); doc.text(who + '  ·  ' + student.email, mx, 31);
          doc.setFontSize(9.5); doc.text(A.head(a, best), mx, 37);
          if (a.status !== 'submitted') {
            doc.setFont('Noto', 'normal'); doc.setFontSize(10); doc.setTextColor.apply(doc, hex(MUTED));
            doc.text(A.NOT_SUBMITTED, mx, 45);
            return;
          }
          doc.autoTable({
            startY: 41,
            margin: { left: mx, right: mx, top: 14, bottom: 14 },
            head: [['#', 'Ερώτηση', 'Απάντηση φοιτητή', 'Σωστή απάντηση', 'Αποτέλεσμα']],
            body: a.items.map(function (x) { return [x.n, x.q || '–', A.option(x.chosen_letter, x.chosen), A.option(x.correct_letter, x.correct), A.word(x)]; }),
            theme: 'grid',
            showHead: 'everyPage',
            rowPageBreak: 'avoid',
            styles: { font: 'Noto', fontStyle: 'normal', fontSize: 8.5, cellPadding: 1.6, textColor: hex(INK), lineColor: hex(LINE), lineWidth: 0.2, valign: 'top', overflow: 'linebreak' },
            headStyles: { font: 'Noto', fontStyle: 'bold', fontSize: 9, fillColor: hex(BLUE), textColor: [255, 255, 255], halign: 'center' },
            alternateRowStyles: { fillColor: hex(STRIPE) },
            columnStyles: {
              0: { cellWidth: 9, halign: 'center', fontStyle: 'bold' },
              1: { cellWidth: 104 },
              2: { cellWidth: 65 },
              3: { cellWidth: 65 },
              4: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
            },
            didParseCell: function (d) {
              if (d.section === 'body' && d.column.index === 4) d.cell.styles.textColor = hex(a.items[d.row.index].ok ? OK : RED);
            }
          });
        });
        var pages = doc.internal.getNumberOfPages();
        for (var p = 1; p <= pages; p++) {
          doc.setPage(p);
          doc.setFont('Noto', 'normal'); doc.setFontSize(7.5); doc.setTextColor.apply(doc, hex(MUTED));
          doc.text(A.LETTER_NOTE, mx, H - 7);
          doc.text('Εξαγωγή: ' + now.text + '   ·   Σελίδα ' + p + ' / ' + pages, W - mx, H - 7, { align: 'right' });
        }
        saveBlob(doc.output('blob'), now.iso + '_PSM304_Apantiseis_' + String(student.last_name).replace(/[\\\/:*?"<>|\s]+/g, '-') + '.pdf');
      });
  }

  /* All students: one row per answer, so she can filter by student, question or result. */
  function answersXlsx(list) {
    return need('vendor/exceljs.min.js').then(function () {
      var now = nicosiaNow(), best = A.best(list);
      var HEADS = ['Επώνυμο', 'Όνομα', 'Email', 'Προσπάθεια', 'Έναρξη', 'Υποβολή', 'Βαθμός', 'Καλύτερος βαθμός', 'Αρ. ερώτησης', 'Κωδικός', 'Ερώτηση', 'Απάντηση φοιτητή', 'Σωστή απάντηση', 'Αποτέλεσμα'];
      var WIDTHS = [20, 16, 30, 11, 17, 17, 9, 11, 9, 10, 60, 42, 42, 15];
      var LAST = HEADS.length, FONT = 'Calibri';
      var wb = new window.ExcelJS.Workbook();
      wb.creator = 'ΜΙΕΕΚ';
      var ws = wb.addWorksheet('Απαντήσεις', {
        views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '5:5' }
      });
      ws.columns = WIDTHS.map(function (w) { return { width: w }; });
      function argb(c) { return { argb: 'FF' + c }; }
      function fill(c) { return { type: 'pattern', pattern: 'solid', fgColor: argb(c) }; }
      function band(row, text, h, font, color) {
        ws.mergeCells(row, 1, row, LAST);
        var c = ws.getCell(row, 1);
        c.value = text; c.font = font; c.alignment = { vertical: 'middle', indent: 1 };
        if (color) for (var i = 1; i <= LAST; i++) ws.getCell(row, i).fill = fill(color);
        ws.getRow(row).height = h;
      }
      band(1, COURSE, 27, { name: FONT, size: 15, bold: true, color: argb('FFFFFF') }, BLUE);
      band(2, 'Ενδιάμεσο διαγώνισμα · Όλες οι απαντήσεις · Εκπαιδεύτρια: Ελένη Μιχαηλίδου', 20, { name: FONT, size: 11, color: argb('FFFFFF') }, BLUE);
      band(3, '', 5, { name: FONT, size: 2 }, GREEN);
      band(4, 'Εξαγωγή: ' + now.text + '   ·   Προσπάθειες: ' + list.length + '   ·   ' + A.LETTER_NOTE, 24, { name: FONT, size: 10, color: argb(MUTED) });

      var border = { top: { style: 'thin', color: argb(LINE) }, left: { style: 'thin', color: argb(LINE) }, bottom: { style: 'thin', color: argb(LINE) }, right: { style: 'thin', color: argb(LINE) } };
      HEADS.forEach(function (t, i) {
        var c = ws.getCell(5, i + 1);
        c.value = t; c.fill = fill(BLUE); c.border = border;
        c.font = { name: FONT, size: 11, bold: true, color: argb('FFFFFF') };
        c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
      ws.getRow(5).height = 32;

      var r = 6;
      function put(vals, ok) {
        vals.forEach(function (v, k) {
          var c = ws.getCell(r, k + 1);
          c.value = v; c.border = border;
          c.font = { name: FONT, size: 10, color: argb(INK) };
          c.alignment = { vertical: 'top', wrapText: true };
        });
        var last = ws.getCell(r, LAST);
        last.font = { name: FONT, size: 10, bold: true, color: argb(ok ? OK : RED) };
        // Excel will not grow a row by itself once its height is set, so it is worked out from the longest text
        var lines = 1;
        vals.forEach(function (v, k) { lines = Math.max(lines, Math.ceil(String(v).length / (WIDTHS[k] * 1.05))); });
        ws.getRow(r).height = 13.5 * lines + 3;
        r++;
      }
      list.forEach(function (a) {
        var who = [a.last_name, a.first_name, a.email, a.n, dateTime(a.started_at)];
        if (a.status !== 'submitted') {
          put(who.concat(['–', '–', 'Όχι', '–', '–', A.NOT_SUBMITTED, '–', '–', 'Δεν υποβλήθηκε']), false);
          return;
        }
        var top = A.holdsBest(a, best) ? 'Ναι' : 'Όχι';
        a.items.forEach(function (x) {
          put(who.concat([dateTime(a.submitted_at), a.score + ' / ' + a.total, top, x.n, x.id, x.q || '–', A.option(x.chosen_letter, x.chosen), A.option(x.correct_letter, x.correct), A.word(x)]), x.ok);
        });
      });
      if (r > 6) ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: r - 1, column: LAST } };
      return wb.xlsx.writeBuffer().then(function (buf) {
        saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), now.iso + '_PSM304_Apantiseis-olon.xlsx');
      });
    });
  }

  window.MIEK_EXPORT = { pdf: pdf, xlsx: xlsx, answersPdf: answersPdf, answersXlsx: answersXlsx };
})();
