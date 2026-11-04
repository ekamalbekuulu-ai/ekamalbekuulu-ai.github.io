/* =========================================================================
 * Yon ying · 实验室（小游戏 + 小工具）
 * 只做新增，不改动页面原有功能与样式。
 *
 * 开源引用（详见页面底部「许可证」区块）：
 *  - 2048 规则参考：Gabriele Cirulli 的 2048（MIT）
 *  - 扫雷/贪吃蛇：经典玩法，代码为本项目自行实现
 *  - 二维码：qrcode-generator by Kazuhiko Arase（MIT），已本地内置
 * 其余工具均为浏览器原生能力（Canvas / Web Crypto）实现，无第三方运行时依赖。
 * ========================================================================= */
(function () {
  'use strict';

  /* ---------------- 通用小工具 ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* ---------------- 标签切换 ---------------- */
  function tabify(bar, panels) {
    var tabs = $$('.lab-tab', bar);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tab.getAttribute('data-target');
        tabs.forEach(function (t) { t.classList.toggle('on', t === tab); });
        panels.forEach(function (p) { p.classList.toggle('on', p.id === id); });
        if (typeof tab.__onShow === 'function') tab.__onShow();
      });
    });
  }

  /* ---------------- 工具导航：格子 → 进入 → 返回 ---------------- */
  function initToolNav() {
    var grid = document.getElementById('lab-tools-grid');
    var stage = document.getElementById('lab-tools-body');
    var back = document.getElementById('lab-tools-back');
    if (!grid || !stage) return;

    var cells = $$('.tool-cell', grid);
    var panels = $$('.lab-panel', stage);

    function show(id, push) {
      var found = false;
      panels.forEach(function (p) {
        var hit = p.id === id;
        p.classList.toggle('on', hit);
        if (hit) found = true;
      });
      if (!found) return false;
      grid.hidden = true;
      grid.style.display = 'none';
      stage.classList.add('in-tool');
      try {
        if (push !== false) history.replaceState(null, '', '#tools/' + id.replace(/^lab-/, ''));
      } catch (e) { /* 无痕模式等 */ }
      stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }

    function showGrid() {
      grid.hidden = false;
      grid.style.display = '';
      stage.classList.remove('in-tool');
      panels.forEach(function (p) { p.classList.remove('on'); });
      try { history.replaceState(null, '', '#tools'); } catch (e) { /* ignore */ }
    }

    cells.forEach(function (cell) {
      cell.addEventListener('click', function () {
        show(cell.getAttribute('data-target'));
      });
    });

    if (back) back.addEventListener('click', showGrid);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && stage.classList.contains('in-tool')) showGrid();
    });

    // 支持直接打开 #tools/xxx
    var m = /^#tools\/([\w-]+)$/.exec(location.hash);
    if (m) show('lab-' + m[1], false);
  }

  /* =======================================================================
   * 小游戏
   * ===================================================================== */
  var Games = {
    /* ---------- 2048 ---------- */
    init2048: function (root) {
      var size = 4;
      var board, score, best = 0, over;
      try { best = Number(localStorage.getItem('yy2048best')) || 0; } catch (e) { best = 0; }

      var wrap = el('div', 'g2048');
      var head = el('div', 'g-head');
      var scoreBox = el('div', 'g-score');
      var bestBox = el('div', 'g-score');
      var restart = el('button', 'lab-btn', '重新开始');
      scoreBox.innerHTML = '<span>得分</span><b>0</b>';
      bestBox.innerHTML = '<span>最高</span><b>' + best + '</b>';
      head.append(scoreBox, bestBox, restart);
      var grid = el('div', 'g2048-grid');
      wrap.append(head, grid);
      root.append(wrap);

      function empty() {
        var out = [];
        for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (!board[r][c]) out.push([r, c]);
        return out;
      }
      function addTile() {
        var cells = empty();
        if (!cells.length) return;
        var pick = cells[Math.floor(Math.random() * cells.length)];
        board[pick[0]][pick[1]] = Math.random() < 0.9 ? 2 : 4;
      }
      function reset() {
        board = [];
        for (var r = 0; r < size; r++) board.push([0, 0, 0, 0]);
        score = 0; over = false;
        addTile(); addTile();
        draw();
      }
      function draw() {
        grid.innerHTML = '';
        for (var r = 0; r < size; r++) {
          for (var c = 0; c < size; c++) {
            var v = board[r][c];
            var cell = el('div', 'g2048-cell' + (v ? ' v' + Math.min(v, 2048) : ''), v ? String(v) : '');
            grid.append(cell);
          }
        }
        $('b', scoreBox).textContent = String(score);
        if (score > best) {
          best = score;
          $('b', bestBox).textContent = String(best);
          try { localStorage.setItem('yy2048best', String(best)); } catch (e) {}
        }
      }
      function slide(line) {
        var arr = line.filter(function (x) { return x; });
        for (var i = 0; i < arr.length - 1; i++) {
          if (arr[i] === arr[i + 1]) { arr[i] *= 2; score += arr[i]; arr.splice(i + 1, 1); }
        }
        while (arr.length < size) arr.push(0);
        return arr;
      }
      function move(dir) {
        if (over) return;
        var before = JSON.stringify(board);
        for (var i = 0; i < size; i++) {
          var line = [];
          for (var j = 0; j < size; j++) {
            line.push(dir === 'left' || dir === 'right' ? board[i][j] : board[j][i]);
          }
          if (dir === 'right' || dir === 'down') line.reverse();
          line = slide(line);
          if (dir === 'right' || dir === 'down') line.reverse();
          for (var k = 0; k < size; k++) {
            if (dir === 'left' || dir === 'right') board[i][k] = line[k];
            else board[k][i] = line[k];
          }
        }
        if (JSON.stringify(board) !== before) { addTile(); draw(); checkOver(); }
      }
      function checkOver() {
        if (empty().length) return;
        for (var r = 0; r < size; r++) {
          for (var c = 0; c < size; c++) {
            var v = board[r][c];
            if (c + 1 < size && board[r][c + 1] === v) return;
            if (r + 1 < size && board[r + 1][c] === v) return;
          }
        }
        over = true;
        head.append(el('div', 'g-over', '没有可移动的格子了，点「重新开始」再来一局'));
      }

      document.addEventListener('keydown', function (e) {
        if (!root.closest('.lab-panel').classList.contains('on')) return;
        var map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
        if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
      });

      var sx = 0, sy = 0;
      grid.addEventListener('touchstart', function (e) {
        sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      }, { passive: true });
      grid.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - sx;
        var dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
        move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
      }, { passive: true });

      restart.addEventListener('click', function () {
        var old = $('.g-over', head);
        if (old) old.remove();
        reset();
      });
      reset();
    },

    /* ---------- 贪吃蛇 ---------- */
    initSnake: function (root) {
      var cols = 16, rows = 16, cell = 18;
      var canvas = el('canvas');
      canvas.width = cols * cell; canvas.height = rows * cell;
      canvas.className = 'g-canvas';
      var info = el('div', 'g-head');
      var scoreEl = el('div', 'g-score');
      scoreEl.innerHTML = '<span>得分</span><b>0</b>';
      var btn = el('button', 'lab-btn', '开始 / 重来');
      info.append(scoreEl, btn);

      var wrap = el('div');
      wrap.append(canvas, info);
      root.append(wrap);

      var snake, dir, food, timer, score, dead;
      var ctx = canvas.getContext('2d');

      function reset() {
        snake = [[8, 8], [7, 8], [6, 8]];
        dir = { x: 1, y: 0 };
        score = 0; dead = false;
        placeFood();
        paint();
        $('b', scoreEl).textContent = '0';
      }
      function placeFood() {
        do {
          food = [Math.floor(Math.random() * cols), Math.floor(Math.random() * rows)];
        } while (snake.some(function (s) { return s[0] === food[0] && s[1] === food[1]; }));
      }
      function paint() {
        ctx.fillStyle = '#f2f2f7';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff3b30';
        ctx.fillRect(food[0] * cell + 2, food[1] * cell + 2, cell - 4, cell - 4);
        snake.forEach(function (s, i) {
          ctx.fillStyle = i === 0 ? '#007aff' : '#5ac8fa';
          ctx.fillRect(s[0] * cell + 1, s[1] * cell + 1, cell - 2, cell - 2);
        });
        if (dead) {
          ctx.fillStyle = 'rgba(0,0,0,.55)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#fff';
          ctx.font = '16px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('撞到了，得分 ' + score, canvas.width / 2, canvas.height / 2);
        }
      }
      function step() {
        if (dead) return;
        var head = [snake[0][0] + dir.x, snake[0][1] + dir.y];
        if (head[0] < 0 || head[1] < 0 || head[0] >= cols || head[1] >= rows ||
            snake.some(function (s) { return s[0] === head[0] && s[1] === head[1]; })) {
          dead = true;
          clearInterval(timer); timer = null;
          paint();
          return;
        }
        snake.unshift(head);
        if (head[0] === food[0] && head[1] === food[1]) {
          score += 1;
          $('b', scoreEl).textContent = String(score);
          placeFood();
        } else {
          snake.pop();
        }
        paint();
      }
      function start() {
        if (timer) clearInterval(timer);
        reset();
        timer = setInterval(step, 130);
      }
      document.addEventListener('keydown', function (e) {
        if (!root.closest('.lab-panel').classList.contains('on')) return;
        var m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        var d = m[e.key];
        if (!d) return;
        e.preventDefault();
        if (dir.x === -d[0] && dir.y === -d[1]) return;
        dir = { x: d[0], y: d[1] };
      });

      var sx = 0, sy = 0;
      canvas.addEventListener('touchstart', function (e) {
        sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      }, { passive: true });
      canvas.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - sx;
        var dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
        var nd = Math.abs(dx) > Math.abs(dy)
          ? { x: dx > 0 ? 1 : -1, y: 0 }
          : { x: 0, y: dy > 0 ? 1 : -1 };
        if (dir.x === -nd.x && dir.y === -nd.y) return;
        dir = nd;
      }, { passive: true });

      btn.addEventListener('click', start);
      reset();
    },

    /* ---------- 扫雷 ---------- */
    initMine: function (root) {
      var cols = 9, rows = 9, mines = 10;
      var head = el('div', 'g-head');
      var status = el('div', 'g-score');
      status.innerHTML = '<span>剩余雷</span><b>10</b>';
      var btn = el('button', 'lab-btn', '重新开局');
      head.append(status, btn);
      var grid = el('div', 'mine-grid');
      grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
      root.append(head, grid);

      var cells, flags, revealed, dead, started;

      function idx(r, c) { return r * cols + c; }

      function reset() {
        cells = []; flags = 0; revealed = 0; dead = false; started = false;
        for (var i = 0; i < cols * rows; i++) cells.push({ mine: false, open: false, flag: false, n: 0 });
        // 布雷（首点安全在 open 里处理）
        var placed = 0;
        while (placed < mines) {
          var p = Math.floor(Math.random() * cols * rows);
          if (!cells[p].mine) { cells[p].mine = true; placed += 1; }
        }
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            var n = 0;
            for (var dr = -1; dr <= 1; dr++) {
              for (var dc = -1; dc <= 1; dc++) {
                var rr = r + dr, cc = c + dc;
                if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && cells[idx(rr, cc)].mine) n += 1;
              }
            }
            cells[idx(r, c)].n = n;
          }
        }
        $('b', status).textContent = String(mines);
        render();
      }

      function render() {
        grid.innerHTML = '';
        cells.forEach(function (cell, i) {
          var b = el('button', 'mine-cell' + (cell.open ? ' open' : '') + (cell.open && cell.mine ? ' boom' : ''));
          if (cell.open) {
            if (cell.mine) b.textContent = '✳';
            else if (cell.n > 0) { b.textContent = String(cell.n); b.classList.add('n' + cell.n); }
          } else if (cell.flag) {
            b.textContent = '⚑';
            b.classList.add('flag');
          }
          b.addEventListener('contextmenu', function (e) { e.preventDefault(); toggleFlag(i); });
          var lp;
          b.addEventListener('touchstart', function () { lp = setTimeout(function () { toggleFlag(i); }, 420); }, { passive: true });
          b.addEventListener('touchend', function () { clearTimeout(lp); });
          b.addEventListener('click', function () { open(i); });
          grid.append(b);
        });
      }

      function toggleFlag(i) {
        if (dead || cells[i].open) return;
        cells[i].flag = !cells[i].flag;
        flags += cells[i].flag ? 1 : -1;
        $('b', status).textContent = String(Math.max(0, mines - flags));
        render();
      }

      function open(i) {
        if (dead || cells[i].open || cells[i].flag) return;
        if (!started) {
          started = true;
          if (cells[i].mine) {
            // 首点不踩雷：把雷挪到别处
            var free = cells.findIndex(function (c2, k) { return !c2.mine && k !== i; });
            cells[i].mine = false;
            if (free >= 0) cells[free].mine = true;
            reset0();
            return;
          }
        }
        reveal(i);
        checkWin();
      }

      function reset0() {
        // 重算数字，保持已开格状态
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            var n = 0;
            for (var dr = -1; dr <= 1; dr++) {
              for (var dc = -1; dc <= 1; dc++) {
                var rr = r + dr, cc = c + dc;
                if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && cells[idx(rr, cc)].mine) n += 1;
              }
            }
            cells[idx(r, c)].n = n;
          }
        }
        render();
      }

      function reveal(i) {
        var stack = [i];
        while (stack.length) {
          var k = stack.pop();
          var cell = cells[k];
          if (!cell || cell.open || cell.flag) continue;
          cell.open = true;
          revealed += 1;
          if (cell.mine) { dead = true; break; }
          if (cell.n === 0) {
            var r = Math.floor(k / cols), c = k % cols;
            for (var dr = -1; dr <= 1; dr++) {
              for (var dc = -1; dc <= 1; dc++) {
                var rr = r + dr, cc = c + dc;
                if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) stack.push(idx(rr, cc));
              }
            }
          }
        }
        render();
        if (dead) {
          cells.forEach(function (c2) { if (c2.mine) c2.open = true; });
          render();
          head.append(el('div', 'g-over', '踩到雷了，点「重新开局」再来'));
        }
      }

      function checkWin() {
        if (dead) return;
        if (revealed >= cols * rows - mines) {
          head.append(el('div', 'g-over', '全部排完，你赢了'));
          dead = true;
        }
      }

      btn.addEventListener('click', function () {
        var old = $$('.g-over', head);
        old.forEach(function (n) { n.remove(); });
        reset();
      });
      reset();
    }
  };

  /* =======================================================================
   * 小工具
   * ===================================================================== */
  var Tools = {
    /* 图片格式转换 */
    initImage: function (root) {
      var input = el('input');
      input.type = 'file'; input.accept = 'image/*';
      input.className = 'lab-file';
      var fmt = el('select', 'lab-select');
      ['image/png', 'image/jpeg', 'image/webp'].forEach(function (t) {
        var o = el('option', null, t.replace('image/', '').toUpperCase());
        o.value = t; fmt.append(o);
      });
      var quality = el('input');
      quality.type = 'range'; quality.min = '0.3'; quality.max = '1'; quality.step = '0.05'; quality.value = '0.9';
      quality.className = 'lab-range';
      var out = el('div', 'lab-row');
      var info = el('p', 'lab-hint', '选一张图片，选输出格式，然后下载。');

      root.append(
        field('图片', input),
        field('输出格式', fmt),
        field('质量（JPEG / WebP 有效）', quality),
        info,
        out
      );

      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        out.innerHTML = '';
        if (!f) return;
        var img = new Image();
        img.onload = function () {
          var cv = document.createElement('canvas');
          cv.width = img.naturalWidth; cv.height = img.naturalHeight;
          var ctx = cv.getContext('2d');
          if (fmt.value === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); }
          ctx.drawImage(img, 0, 0);
          cv.toBlob(function (blob) {
            if (!blob) { info.textContent = '这个浏览器不支持该格式，换一个试试。'; return; }
            var url = URL.createObjectURL(blob);
            info.textContent = '原始 ' + Math.round(f.size / 1024) + ' KB → 输出 ' + Math.round(blob.size / 1024) + ' KB';
            var a = el('a', 'lab-btn', '下载转换后的图片');
            a.href = url;
            a.download = 'converted.' + fmt.value.split('/')[1];
            var preview = el('img', 'lab-preview');
            preview.src = url;
            out.append(a, preview);
          }, fmt.value, Number(quality.value));
        };
        img.src = URL.createObjectURL(f);
      });
      function field(label, node) {
        var w = el('label', 'lab-field');
        w.append(el('span', null, label), node);
        return w;
      }
    },

    /* Base64 */
    initBase64: function (root) {
      var ta = el('textarea', 'lab-ta');
      ta.rows = 6; ta.placeholder = '输入文本或 Base64';
      var out = el('textarea', 'lab-ta');
      out.rows = 6; out.readOnly = true;
      var row = el('div', 'lab-row');
      var enc = el('button', 'lab-btn', '编码');
      var dec = el('button', 'lab-btn ghost', '解码');
      row.append(enc, dec);
      root.append(ta, row, out);

      enc.addEventListener('click', function () {
        try {
          var bytes = new TextEncoder().encode(ta.value);
          var bin = '';
          for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          out.value = btoa(bin);
        } catch (e) { out.value = '编码失败：' + e.message; }
      });
      dec.addEventListener('click', function () {
        try {
          var bin2 = atob(ta.value.trim());
          var arr = new Uint8Array(bin2.length);
          for (var i = 0; i < bin2.length; i++) arr[i] = bin2.charCodeAt(i);
          out.value = new TextDecoder().decode(arr);
        } catch (e) { out.value = '解码失败：不是合法的 Base64'; }
      });
    },

    /* JSON */
    initJson: function (root) {
      var ta = el('textarea', 'lab-ta');
      ta.rows = 8; ta.placeholder = '粘贴 JSON';
      var out = el('textarea', 'lab-ta');
      out.rows = 8; out.readOnly = true;
      var row = el('div', 'lab-row');
      var pretty = el('button', 'lab-btn', '格式化');
      var minify = el('button', 'lab-btn ghost', '压缩');
      row.append(pretty, minify);
      root.append(ta, row, out);

      function run(min) {
        try {
          var obj = JSON.parse(ta.value);
          out.value = min ? JSON.stringify(obj) : JSON.stringify(obj, null, 2);
        } catch (e) {
          out.value = '解析失败：' + e.message;
        }
      }
      pretty.addEventListener('click', function () { run(false); });
      minify.addEventListener('click', function () { run(true); });
    },

    /* 二维码 */
    initQr: function (root) {
      var input = el('input', 'lab-input');
      input.placeholder = '输入文字或网址';
      var size = el('select', 'lab-select');
      [180, 240, 320].forEach(function (n) { var o = el('option', null, n + ' px'); o.value = String(n); size.append(o); });
      var btn = el('button', 'lab-btn', '生成');
      var row = el('div', 'lab-row'); row.append(btn);
      var box = el('div', 'lab-qr');
      root.append(input, field('尺寸', size), row, box);

      btn.addEventListener('click', function () {
        var text = input.value.trim();
        box.innerHTML = '';
        if (!text) { box.append(el('p', 'lab-hint', '先输入点内容')); return; }
        if (typeof qrcode !== 'function') { box.append(el('p', 'lab-hint', '二维码组件加载失败')); return; }
        try {
          var px = Number(size.value);
          var qr = qrcode(0, 'M');
          qr.addData(text);
          qr.make();
          var mods = qr.getModuleCount();
          var cell = Math.max(2, Math.floor(px / mods));
          var cv = document.createElement('canvas');
          cv.width = cv.height = mods * cell;
          var ctx = cv.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.fillStyle = '#000';
          for (var r = 0; r < mods; r++) {
            for (var c = 0; c < mods; c++) {
              if (qr.isDark(r, c)) ctx.fillRect(c * cell, r * cell, cell, cell);
            }
          }
          cv.className = 'lab-qr-img';
          var a = el('a', 'lab-btn', '下载 PNG');
          a.href = cv.toDataURL('image/png');
          a.download = 'qrcode.png';
          box.append(cv, a);
        } catch (e) {
          box.append(el('p', 'lab-hint', '生成失败：' + e.message));
        }
      });
      function field(label, node) {
        var w = el('label', 'lab-field');
        w.append(el('span', null, label), node);
        return w;
      }
    },

    /* 时间戳 */
    initTime: function (root) {
      var now = el('p', 'lab-hint');
      var ts = el('input', 'lab-input');
      var out = el('div', 'lab-hint');
      var row = el('div', 'lab-row');
      var toDate = el('button', 'lab-btn', '时间戳 → 日期');
      var toTs = el('button', 'lab-btn ghost', '日期 → 时间戳');
      row.append(toDate, toTs);
      var dateInput = el('input', 'lab-input');
      dateInput.type = 'datetime-local';
      root.append(now, field('Unix 时间戳（秒）', ts), row, field('日期时间', dateInput), out);

      function tick() {
        var d = new Date();
        now.textContent = '当前时间戳（秒）：' + Math.floor(d.getTime() / 1000) + '　|　' + d.toLocaleString('zh-CN');
      }
      tick(); setInterval(tick, 1000);

      toDate.addEventListener('click', function () {
        var n = Number(ts.value.trim());
        if (!n) { out.textContent = '请输入数字时间戳'; return; }
        var ms = String(ts.value.trim()).length > 10 ? n : n * 1000;
        var d = new Date(ms);
        out.textContent = d.toLocaleString('zh-CN') + '　（' + d.toISOString() + '）';
      });
      toTs.addEventListener('click', function () {
        if (!dateInput.value) { out.textContent = '先选一个日期时间'; return; }
        var d = new Date(dateInput.value);
        out.textContent = '时间戳（秒）：' + Math.floor(d.getTime() / 1000) + '　毫秒：' + d.getTime();
      });
      function field(label, node) {
        var w = el('label', 'lab-field');
        w.append(el('span', null, label), node);
        return w;
      }
    },

    /* 颜色 */
    initColor: function (root) {
      var hex = el('input', 'lab-input'); hex.value = '#007aff';
      var swatch = el('div', 'lab-swatch');
      swatch.style.background = hex.value;
      var out = el('div', 'lab-hint');
      root.append(field('HEX', hex), swatch, out);

      function update() {
        var v = hex.value.trim();
        if (!/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) { out.textContent = '请输入 3 或 6 位 HEX，例如 #007aff'; return; }
        if (v[0] !== '#') v = '#' + v;
        if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
        swatch.style.background = v;
        var r = parseInt(v.slice(1, 3), 16), g = parseInt(v.slice(3, 5), 16), b = parseInt(v.slice(5, 7), 16);
        var rn = r / 255, gn = g / 255, bn = b / 255;
        var mx = Math.max(rn, gn, bn), mn = Math.min(rn, gn, bn);
        var l = (mx + mn) / 2, h = 0, s = 0;
        if (mx !== mn) {
          var d = mx - mn;
          s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
          if (mx === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0));
          else if (mx === gn) h = (bn - rn) / d + 2;
          else h = (rn - gn) / d + 4;
          h /= 6;
        }
        out.innerHTML = '';
        out.append(
          el('div', null, 'RGB：rgb(' + r + ', ' + g + ', ' + b + ')'),
          el('div', null, 'HSL：hsl(' + Math.round(h * 360) + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%)')
        );
      }
      hex.addEventListener('input', update);
      update();
      function field(label, node) {
        var w = el('label', 'lab-field');
        w.append(el('span', null, label), node);
        return w;
      }
    },

    /* 文本 / URL */
    initText: function (root) {
      var ta = el('textarea', 'lab-ta');
      ta.rows = 5; ta.placeholder = '输入文本';
      var out = el('textarea', 'lab-ta');
      out.rows = 5; out.readOnly = true;
      var row = el('div', 'lab-row');
      var upper = el('button', 'lab-btn', '全大写');
      var lower = el('button', 'lab-btn ghost', '全小写');
      var urlEnc = el('button', 'lab-btn ghost', 'URL 编码');
      var urlDec = el('button', 'lab-btn ghost', 'URL 解码');
      row.append(upper, lower, urlEnc, urlDec);
      root.append(ta, row, out);

      upper.addEventListener('click', function () { out.value = ta.value.toUpperCase(); });
      lower.addEventListener('click', function () { out.value = ta.value.toLowerCase(); });
      urlEnc.addEventListener('click', function () { out.value = encodeURIComponent(ta.value); });
      urlDec.addEventListener('click', function () {
        try { out.value = decodeURIComponent(ta.value); }
        catch (e) { out.value = '解码失败：不是合法的 URL 编码'; }
      });
    },

    /* 哈希 */
    initHash: function (root) {
      var ta = el('textarea', 'lab-ta');
      ta.rows = 5; ta.placeholder = '输入要计算哈希的文本';
      var algo = el('select', 'lab-select');
      ['SHA-256', 'SHA-1', 'MD5'].forEach(function (a) { var o = el('option', null, a); o.value = a; algo.append(o); });
      var btn = el('button', 'lab-btn', '计算');
      var row = el('div', 'lab-row'); row.append(btn);
      var out = el('textarea', 'lab-ta');
      out.rows = 3; out.readOnly = true;
      root.append(ta, field('算法', algo), row, out);

      btn.addEventListener('click', function () {
        var text = ta.value;
        if (algo.value === 'MD5') { out.value = md5(text); return; }
        var name = algo.value === 'SHA-1' ? 'SHA-1' : 'SHA-256';
        if (!window.crypto || !window.crypto.subtle) { out.value = '这个浏览器不支持 Web Crypto，换个浏览器试试'; return; }
        crypto.subtle.digest(name, new TextEncoder().encode(text)).then(function (buf) {
          out.value = Array.prototype.map.call(new Uint8Array(buf), function (b) {
            return ('0' + b.toString(16)).slice(-2);
          }).join('');
        }).catch(function () { out.value = '计算失败'; });
      });
      function field(label, node) {
        var w = el('label', 'lab-field');
        w.append(el('span', null, label), node);
        return w;
      }
    },

    /* 图片 → PDF */
    initImg2Pdf: function (root) {
      var input = el('input');
      input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
      input.className = 'lab-file';
      var pageSize = el('select', 'lab-select');
      [['fit', '跟随图片尺寸'], ['a4', 'A4 纸张（居中）']].forEach(function (p) {
        var o = el('option', null, p[1]); o.value = p[0]; pageSize.append(o);
      });
      var row = el('div', 'lab-row');
      var btn = el('button', 'lab-btn', '生成 PDF');
      row.append(btn);
      var info = el('p', 'lab-hint', '可以一次选多张图片，按顺序合成一个 PDF。');
      var list = el('div', 'lab-hint');
      root.append(field('图片（可多选）', input), field('页面尺寸', pageSize), row, info, list);

      input.addEventListener('change', function () {
        var files = Array.prototype.slice.call(input.files || []);
        list.textContent = files.length ? '已选 ' + files.length + ' 张：' + files.map(function (f) { return f.name; }).join('、') : '';
      });

      btn.addEventListener('click', async function () {
        var files = Array.prototype.slice.call(input.files || []);
        if (!files.length) { info.textContent = '先选几张图片'; return; }
        if (!window.PDFLib) { info.textContent = 'PDF 组件还没加载完，稍等一下再试'; return; }
        btn.disabled = true; info.textContent = '正在生成…';
        try {
          var pdf = await PDFLib.PDFDocument.create();
          for (var i = 0; i < files.length; i++) {
            var buf = await files[i].arrayBuffer();
            var isPng = /png$/i.test(files[i].type) || /\.png$/i.test(files[i].name);
            var img = isPng ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
            var w = img.width, h = img.height;
            if (pageSize.value === 'a4') {
              var page = pdf.addPage([595.28, 841.89]);
              var scale = Math.min(595.28 / w, 841.89 / h);
              page.drawImage(img, {
                x: (595.28 - w * scale) / 2,
                y: (841.89 - h * scale) / 2,
                width: w * scale,
                height: h * scale
              });
            } else {
              var p2 = pdf.addPage([w, h]);
              p2.drawImage(img, { x: 0, y: 0, width: w, height: h });
            }
          }
          var bytes = await pdf.save();
          var blob = new Blob([bytes], { type: 'application/pdf' });
          var url = URL.createObjectURL(blob);
          var a = el('a', 'lab-btn', '下载 PDF（' + files.length + ' 页）');
          a.href = url; a.download = 'images.pdf';
          info.textContent = '生成完成，共 ' + files.length + ' 页，' + Math.round(blob.size / 1024) + ' KB';
          list.innerHTML = ''; list.append(a);
        } catch (e) {
          info.textContent = '生成失败：' + (e && e.message ? e.message : '图片格式可能不受支持');
        }
        btn.disabled = false;
      });
      function field(label, node) {
        var w = el('label', 'lab-field');
        w.append(el('span', null, label), node);
        return w;
      }
    },

    /* PDF 合并 */
    initPdfMerge: function (root) {
      var input = el('input');
      input.type = 'file'; input.accept = 'application/pdf'; input.multiple = true;
      input.className = 'lab-file';
      var row = el('div', 'lab-row');
      var btn = el('button', 'lab-btn', '合并 PDF');
      row.append(btn);
      var info = el('p', 'lab-hint', '选择多个 PDF，按选择顺序合并成一个。');
      var list = el('div', 'lab-hint');
      root.append(field('PDF 文件（可多选）', input), row, info, list);

      input.addEventListener('change', function () {
        var files = Array.prototype.slice.call(input.files || []);
        list.textContent = files.length ? '已选 ' + files.length + ' 个：' + files.map(function (f) { return f.name; }).join('、') : '';
      });

      btn.addEventListener('click', async function () {
        var files = Array.prototype.slice.call(input.files || []);
        if (files.length < 2) { info.textContent = '至少选两个 PDF 才能合并'; return; }
        if (!window.PDFLib) { info.textContent = 'PDF 组件还没加载完，稍等一下再试'; return; }
        btn.disabled = true; info.textContent = '正在合并…';
        try {
          var out = await PDFLib.PDFDocument.create();
          for (var i = 0; i < files.length; i++) {
            var buf = await files[i].arrayBuffer();
            var src = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
            var pages = await out.copyPages(src, src.getPageIndices());
            pages.forEach(function (p) { out.addPage(p); });
          }
          var bytes = await out.save();
          var blob = new Blob([bytes], { type: 'application/pdf' });
          var url = URL.createObjectURL(blob);
          var a = el('a', 'lab-btn', '下载合并后的 PDF');
          a.href = url; a.download = 'merged.pdf';
          info.textContent = '合并完成，共 ' + out.getPageCount() + ' 页，' + Math.round(blob.size / 1024) + ' KB';
          list.innerHTML = ''; list.append(a);
        } catch (e) {
          info.textContent = '合并失败：' + (e && e.message ? e.message : '文件可能已加密');
        }
        btn.disabled = false;
      });
      function field(label, node) {
        var w = el('label', 'lab-field');
        w.append(el('span', null, label), node);
        return w;
      }
    }  };

  /* ---------------- MD5（自行实现，无第三方依赖） ---------------- */
  function md5(str) {
    function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
    function ad(a, b) { return (a + b) & 0xffffffff; }
    var utf8 = unescape(encodeURIComponent(str));
    var len = utf8.length;
    var words = [];
    for (var i = 0; i < len; i++) words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << ((i % 4) * 8);
    words[len >> 2] |= 0x80 << ((len % 4) * 8);
    words[(((len + 8) >> 6) << 4) + 14] = len * 8;
    var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    var S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    var K = [];
    for (var k = 0; k < 64; k++) K[k] = Math.floor(Math.abs(Math.sin(k + 1)) * 4294967296) | 0;
    for (var off = 0; off < words.length; off += 16) {
      var oa = a, ob = b, oc = c, od = d;
      for (var i2 = 0; i2 < 64; i2++) {
        var f, g;
        if (i2 < 16) { f = (b & c) | (~b & d); g = i2; }
        else if (i2 < 32) { f = (d & b) | (~d & c); g = (5 * i2 + 1) % 16; }
        else if (i2 < 48) { f = b ^ c ^ d; g = (3 * i2 + 5) % 16; }
        else { f = c ^ (b | ~d); g = (7 * i2) % 16; }
        var tmp = d;
        d = c;
        c = b;
        var s4 = S[(i2 >> 4) * 4 + (i2 % 4)];
        b = ad(b, rl(ad(ad(a, f), ad(K[i2], words[off + g] || 0)), s4));
        a = tmp;
      }
      a = ad(a, oa); b = ad(b, ob); c = ad(c, oc); d = ad(d, od);
    }
    return [a, b, c, d].map(function (n) {
      var s = '';
      for (var i3 = 0; i3 < 4; i3++) s += ('0' + ((n >> (i3 * 8)) & 0xff).toString(16)).slice(-2);
      return s;
    }).join('');
  }

  /* =======================================================================
   * 挂载
   * ===================================================================== */
  function boot() {
    var gamesRoot = document.getElementById('lab-games-body');
    var toolsRoot = document.getElementById('lab-tools-body');
    if (!gamesRoot && !toolsRoot) return;

    // 导航最先启动：任何一个工具初始化失败，都不能连累格子和点击
    safe('工具导航', initToolNav);

    if (gamesRoot) {
      safe('2048', function () { Games.init2048(panel('#lab-g2048')); });
      safe('贪吃蛇', function () { Games.initSnake(panel('#lab-snake')); });
    }
    if (toolsRoot) {
      safe('图片转换', function () { Tools.initImage(panel('#lab-image')); });
      safe('图片转PDF', function () { Tools.initImg2Pdf(panel('#lab-img2pdf')); });
      safe('PDF合并', function () { Tools.initPdfMerge(panel('#lab-pdfmerge')); });
      safe('Base64', function () { Tools.initBase64(panel('#lab-base64')); });
      safe('JSON', function () { Tools.initJson(panel('#lab-json')); });
      safe('二维码', function () { Tools.initQr(panel('#lab-qr')); });
      safe('时间戳', function () { Tools.initTime(panel('#lab-time')); });
      safe('颜色', function () { Tools.initColor(panel('#lab-color')); });
      safe('文本', function () { Tools.initText(panel('#lab-text')); });
      safe('哈希', function () { Tools.initHash(panel('#lab-hash')); });
    }

    var gbar = document.getElementById('lab-games-tabs');
    if (gbar) safe('小游戏切换', function () { tabify(gbar, $$('#lab-games-body .lab-panel')); });

    function safe(name, fn) {
      try { fn(); }
      catch (e) { if (window.console) console.error('[lab] ' + name + ' 初始化失败：', e); }
    }

    function panel(sel) {
      var n = document.querySelector(sel);
      if (!n) {
        var tmp = el('div');
        return tmp;
      }
      return n;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
