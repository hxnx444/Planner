/* Lock-In Diary: a pastel pixel diary for Nov-Dec 2026. No dependencies. Data lives in localStorage on this device. */
(function () {
'use strict';
var KEY = 'lockin-diary-v1';
var PAL = window.PX_PAL, ICONS = window.PX_ICONS;

/* ---------------------------------------------------------------- pixel icons */
var pxCache = {};
function px(name, size, over) {
  size = size || 20;
  var rows = ICONS[name]; if (!rows) return '';
  var ck = name + '|' + size + '|' + (over ? JSON.stringify(over) : '');
  if (pxCache[ck]) return pxCache[ck];
  var w = rows[0].length, h = rows.length, pal = Object.assign({}, PAL, over || {}), out = '', r, c, ch, s;
  for (r = 0; r < h; r++) {
    c = 0;
    while (c < w) {
      ch = rows[r][c];
      if (ch === '.' || !pal[ch]) { c++; continue; }
      s = c; while (c < w && rows[r][c] === ch) c++;
      out += '<rect x="' + s + '" y="' + r + '" width="' + (c - s) + '" height="1" fill="' + pal[ch] + '"/>';
    }
  }
  var m = Math.max(w, h);
  var svg = '<svg class="px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + Math.round(size * w / m) + '" height="' + Math.round(size * h / m) + '" shape-rendering="crispEdges" aria-hidden="true">' + out + '</svg>';
  pxCache[ck] = svg; return svg;
}
var OFF = { k: '#F8DCE8', p: '#C9B8D6', w: '#F8DCE8' };
function hearts(n, total, count, size) {
  count = count || 10; size = size || 14;
  var f = total ? Math.round(n / total * count) : 0, o = '';
  if (total && n > 0 && f === 0) f = 1;
  for (var i = 0; i < count; i++) o += px('heart', size, i < f ? null : OFF);
  return '<span class="hearts" aria-hidden="true">' + o + '</span>';
}
(function setHeartUrl() {
  var svg = px('heart', 18, { k: '#F4B6D2', w: '#FFF8F0' }).replace(' class="px"', '');
  document.documentElement.style.setProperty('--heart', 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")');
})();

/* ---------------------------------------------------------------- dates */
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var MON3 = MONTHS.map(function (m) { return m.slice(0, 3); });
var WDAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']; // index 0 = Monday
var WD3 = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
var pad = function (n) { return (n < 10 ? '0' : '') + n; };
var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
var parseYmd = function (s) { return new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); };
var addDays = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };
var dayNum = function (d) { return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
var dow = function (d) { return (d.getDay() + 6) % 7; };
var mondayOf = function (d) { return addDays(d, -dow(d)); };
var START = new Date(2026, 9, 26), NWEEKS = 10;
var LAST = addDays(START, NWEEKS * 7 - 7);

/* ---------------------------------------------------------------- state */
var PRAYERS = [['fajr','Fajr'],['dhuhr','Dhuhr'],['asr','Asr'],['maghrib','Maghrib'],['isha','Isha']];
var CATS = { deen: ['Faith','moon'], study: ['Study + career','book'], body: ['Body','dumbbell'], mind: ['Mind','cloud'] };
function defaults() {
  return {
    v: 1, name: 'Nonnie', coverDay: '', lastBackup: '',
    habits: [
      { id: 'fajr', n: 'Fajr', c: 'deen', e: 1 }, { id: 'dhuhr', n: 'Dhuhr', c: 'deen', e: 1 }, { id: 'asr', n: 'Asr', c: 'deen', e: 1 },
      { id: 'maghrib', n: 'Maghrib', c: 'deen', e: 1 }, { id: 'isha', n: 'Isha', c: 'deen', e: 1 },
      { id: 'quran', n: 'Quran', c: 'deen', e: 0 }, { id: 'reading', n: 'Reading', c: 'deen', e: 0 },
      { id: 'study', n: 'Focused study', c: 'study', e: 0 }, { id: 'career', n: 'Career / income action', c: 'study', e: 0 }, { id: 'skill', n: 'Skill development', c: 'study', e: 0 },
      { id: 'move', n: 'Workout or movement', c: 'body', e: 0 }, { id: 'water', n: 'Hydration', c: 'body', e: 1 },
      { id: 'morning', n: 'Morning routine', c: 'body', e: 0 }, { id: 'night', n: 'Night routine', c: 'body', e: 0 },
      { id: 'quiet', n: 'Quiet time / breathing', c: 'mind', e: 1 }, { id: 'confidence', n: 'Confidence action', c: 'mind', e: 0 }, { id: 'scroll', n: 'Less scrolling', c: 'mind', e: 0 }
    ],
    log: {}, tasks: {}, weeks: {},
    workouts: {
      plan: [
        { t: 'gentle', n: 'Easy walk + stretching', d: '15 to 20 minutes at a comfortable pace, then gentle stretches.' },
        { t: 'steady', n: 'Light strength', d: '20 minutes: squats, wall push-ups, glute bridges. Stop while it still feels easy.' },
        { t: 'rest', n: 'Rest day', d: 'Nothing to do. Resting is part of getting stronger.' },
        { t: 'gentle', n: 'Mobility + breathing', d: 'Slow stretching or a short yoga flow, 15 to 20 minutes.' },
        { t: 'steady', n: 'Light strength', d: '20 minutes, same easy circuit. Fewer reps on a tired day.' },
        { t: 'gentle', n: 'Easy walk outside', d: 'Short and slow is fine. Fresh air counts.' },
        { t: 'rest', n: 'Rest day', d: 'Reset for the week ahead.' }
      ],
      recovery: [{ id: 'r1', t: 'Rest day' }, { id: 'r2', t: 'Gentle walk or stretching' }, { id: 'r3', t: 'Extra sleep' }, { id: 'r4', t: 'Listen to my body' }]
    },
    uni: { next: '', courses: [], deadlines: [], backlog: [] },
    career: {
      next: '',
      projects: [{ id: 'c1', t: 'Maze agent project (Flask + JS)', s: 'building' }],
      skills: [{ id: 'c2', t: 'IBM SkillsBuild: next course', c: 0 }],
      portfolio: [{ id: 'c3', t: 'Pick 2 or 3 projects to feature', c: 0 }, { id: 'c4', t: 'Write a short README for each', c: 0 }],
      apps: [],
      income: [{ id: 'c5', t: 'Canva template packs on Gumroad: next pack idea', c: 0 }]
    },
    care: {
      hair: [{ id: 'h1', t: 'Hair wash', days: [2, 6] }, { id: 'h2', t: 'Scalp care or hair mask', days: [6] }],
      notes: []
    },
    qr: { stopped: '', books: [], notes: '' },
    money: { cur: 'EGP', goal: '', saved: '', inc: [], notes: '' }
  };
}
var st = load();
function ensure(o) {
  var d = defaults();
  Object.keys(d).forEach(function (k) { if (o[k] === undefined) o[k] = d[k]; });
  ['uni','career','care','qr','money','workouts'].forEach(function (k) {
    Object.keys(d[k]).forEach(function (kk) { if (o[k][kk] === undefined) o[k][kk] = d[k][kk]; });
  });
  if (!Array.isArray(o.habits)) o.habits = d.habits;
  if (!o.workouts.plan || o.workouts.plan.length !== 7) o.workouts.plan = d.workouts.plan;
  return o;
}
function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) return ensure(JSON.parse(raw));
  } catch (e) {}
  return defaults();
}
var saveTimer = null, warnedFull = false;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, 300);
}
function writeNow() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(st)); }
  catch (e) { if (!warnedFull) { warnedFull = true; toast('Could not save on this device. Export a backup.'); } }
}
window.addEventListener('pagehide', writeNow);
document.addEventListener('visibilitychange', function () { if (document.hidden) writeNow(); });
if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) {} }

function getp(path) {
  var p = path.split('.'), o = st;
  for (var i = 0; i < p.length; i++) { if (o == null) return undefined; o = o[p[i]]; }
  return o;
}
function setp(path, v) {
  var p = path.split('.'), o = st, i;
  for (i = 0; i < p.length - 1; i++) { if (typeof o[p[i]] !== 'object' || o[p[i]] === null) o[p[i]] = {}; o = o[p[i]]; }
  var last = p[p.length - 1];
  if (v === '' || v === false || v == null) delete o[last]; else o[last] = v;
  save();
}
function uid() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function L(k) { return st.log[k] || {}; }
function habDone(k, id) { var h = L(k).h; return !!(h && h[id]); }

/* ---------------------------------------------------------------- toast */
var toastTimer;
function toast(msg) {
  var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2300);
}

/* ---------------------------------------------------------------- navigation */
var NAV = [
  ['today', 'Today', 'diary'], ['week', 'Weekly Planner', 'calendar'], ['salah', 'Salah', 'moon'], ['uni', 'University', 'book'],
  ['career', 'Career', 'laptop'], ['workouts', 'Workouts', 'dumbbell'], ['care', 'Self-Care', 'mirror'],
  ['quran', 'Quran & Reading', 'readbook'], ['well', 'Wellbeing', 'cloud'], ['money', 'Money', 'coin']
];
var DOCK = ['today', 'week', 'salah', 'workouts'];
var route = 'today';
function parseRoute() { var m = (location.hash || '').match(/^#\/([a-z]+)/); var r = m && m[1]; return NAV.some(function (n) { return n[0] === r; }) ? r : 'today'; }
function navLabel(r) { for (var i = 0; i < NAV.length; i++) if (NAV[i][0] === r) return NAV[i][1]; return ''; }
function buildNav() {
  var s = '', i, n;
  for (i = 0; i < NAV.length; i++) { n = NAV[i]; s += '<a href="#/' + n[0] + '" data-r="' + n[0] + '">' + px(n[2], 24) + '<span>' + n[1] + '</span></a>'; }
  document.getElementById('snav').innerHTML = s;
  var d = '';
  DOCK.forEach(function (r) {
    var n = NAV.filter(function (x) { return x[0] === r; })[0];
    d += '<a href="#/' + r + '" data-r="' + r + '" aria-label="' + n[1] + '">' + px(n[2], 22) + '<span>' + (r === 'week' ? 'Week' : n[1]) + '</span></a>';
  });
  d += '<button type="button" data-act="more" aria-label="All sections" aria-haspopup="dialog">' + px('bow', 24) + '<span>More</span></button>';
  document.getElementById('dock').innerHTML = d;
}
function markNav() {
  var els = document.querySelectorAll('[data-r]');
  for (var i = 0; i < els.length; i++) { if (els[i].dataset.r === route) els[i].setAttribute('aria-current', 'page'); else els[i].removeAttribute('aria-current'); }
}

/* ---------------------------------------------------------------- shared widgets */
function card(title, icon, body, o) {
  o = o || {};
  return '<section class="card ' + (o.cls || '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + '><span class="pp"></span><div class="ctitle">' + (icon ? px(icon, 24) : '') + '<h2>' + title + '</h2>' + (o.aside ? '<div class="aside">' + o.aside + '</div>' : '') + '</div>' + body + '</section>';
}
function pagehead(title, sub, icon, right) {
  return '<div class="pagehead">' + (icon ? '<span aria-hidden="true">' + px(icon, 46) + '</span>' : '') + '<div class="lead"><h1 class="h1">' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (right || '') + '</div>';
}
function sparkRow() { return '<div class="spark-row" aria-hidden="true">' + px('sparkle', 14) + px('heart', 14) + px('star', 16) + px('heart', 14) + px('sparkle', 14) + '</div>'; }
function field(path, ph, o) { o = o || {}; return '<input class="field" type="' + (o.type || 'text') + '" data-bind="' + path + '" value="' + E(getp(path) || '') + '" placeholder="' + E(ph || '') + '" autocomplete="off" enterkeyhint="done"' + (o.label ? ' aria-label="' + E(o.label) + '"' : '') + '>'; }
function area(path, ph, o) { o = o || {}; return '<textarea class="' + (o.cls || 'box') + '" data-bind="' + path + '" placeholder="' + E(ph || '') + '" rows="' + (o.rows || 3) + '">' + E(getp(path) || '') + '</textarea>'; }
function line(path, ph, label) { return '<textarea class="tl" rows="1" data-bind="' + path + '" data-line="1" placeholder="' + E(ph || '') + '" aria-label="' + E(label || ph || 'Write here') + '">' + E(getp(path) || '') + '</textarea>'; }
function checkBound(path, label) { return '<input class="chk" type="checkbox" data-bindc="' + path + '"' + (getp(path) ? ' checked' : '') + ' aria-label="' + E(label || 'Done') + '">'; }

/* generic editable list. items live at st[path]; cfg: check, fields, add, empty */
function listBlock(path, cfg) {
  var items = getp(path) || [], rows = '';
  var arr = items.slice();
  if (cfg.sort) arr.sort(function (a, b) { var x = a[cfg.sort] || '9999', y = b[cfg.sort] || '9999'; return x < y ? -1 : x > y ? 1 : 0; });
  if (cfg.newest) arr.sort(function (a, b) { return (b.d || '') < (a.d || '') ? -1 : (b.d || '') > (a.d || '') ? 1 : 0; });
  arr.forEach(function (it) {
    var meta = '', main = '';
    (cfg.fields || []).forEach(function (f) {
      var base = 'data-list="' + path + '" data-id="' + it.id + '" data-f="' + f.f + '"';
      if (f.type === 'select') {
        meta += '<select class="sel" ' + base + ' aria-label="' + E(f.label || 'Status') + '">' + f.opts.map(function (o) { return '<option value="' + o + '"' + ((it[f.f] || f.opts[0]) === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>';
      } else if (f.type === 'date') {
        meta += '<input class="field" type="date" ' + base + ' value="' + E(it[f.f] || '') + '" aria-label="' + E(f.label || 'Date') + '">';
        if (f.rel && it[f.f]) meta += relChip(it[f.f]);
      } else if (f.type === 'sub') {
        main += '<textarea class="tl small" rows="1" data-line="1" ' + base + ' placeholder="' + E(f.ph || '') + '" aria-label="' + E(f.label || 'Note') + '">' + E(it[f.f] || '') + '</textarea>';
      } else {
        main = '<textarea class="tl" rows="1" data-line="1" ' + base + ' placeholder="' + E(f.ph || '') + '" aria-label="' + E(f.label || 'Text') + '">' + E(it[f.f] || '') + '</textarea>' + main;
      }
    });
    rows += '<div class="rowl' + (cfg.check && it.c ? ' done' : '') + '">' +
      (cfg.check ? '<input class="chk" type="checkbox" data-listc="' + path + '" data-id="' + it.id + '"' + (it.c ? ' checked' : '') + ' aria-label="Done">' : '') +
      '<div class="grow">' + main + (meta ? '<div class="meta">' + meta + '</div>' : '') + '</div>' +
      '<button type="button" class="x" data-act="list-del" data-path="' + path + '" data-id="' + it.id + '" aria-label="Remove">&times;</button></div>';
  });
  if (!arr.length && cfg.empty) rows = '<p class="empty">' + cfg.empty + '</p>';
  return rows + '<div class="addrow"><input class="field" type="text" data-addlist="' + path + '" placeholder="' + E(cfg.add || 'Add one…') + '" autocomplete="off" enterkeyhint="done" aria-label="' + E(cfg.add || 'Add') + '"><button type="button" class="btn sm lav" data-act="list-add" data-path="' + path + '" aria-label="Add">+ Add</button></div>';
}
function relChip(ds) {
  var n = dayNum(parseYmd(ds)) - dayNum(new Date());
  var t = n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 1 ? 'in ' + n + ' days' : n === -1 ? 'yesterday' : Math.abs(n) + ' days ago';
  return '<span class="chip' + (n >= 0 && n <= 3 ? ' gold' : '') + '">' + t + '</span>';
}

/* tasks per date (shared by Today and the weekly planner) */
function taskBlock(k, ph) {
  var arr = st.tasks[k] || [], rows = '';
  arr.forEach(function (t) {
    rows += '<div class="rowl' + (t.c ? ' done' : '') + '"><input class="chk" type="checkbox" data-taskc="' + k + '" data-id="' + t.id + '"' + (t.c ? ' checked' : '') + ' aria-label="Done">' +
      '<div class="grow"><textarea class="tl" rows="1" data-line="1" data-task="' + k + '" data-id="' + t.id + '" aria-label="Task">' + E(t.t) + '</textarea></div>' +
      '<button type="button" class="x" data-act="task-del" data-k="' + k + '" data-id="' + t.id + '" aria-label="Remove task">&times;</button></div>';
  });
  return rows + '<div class="addrow"><input class="field" type="text" data-addtask="' + k + '" placeholder="' + E(ph || 'Add a little task…') + '" autocomplete="off" enterkeyhint="done" aria-label="Add a task"><button type="button" class="btn sm lav" data-act="task-add" data-k="' + k + '" aria-label="Add task">+</button></div>';
}
function taskCount(k) { var a = st.tasks[k] || [], d = 0; a.forEach(function (t) { if (t.c) d++; }); return [d, a.length]; }

/* ---------------------------------------------------------------- week state */
function clampWeek(m) { if (dayNum(m) < dayNum(START)) return START; if (dayNum(m) > dayNum(LAST)) return LAST; return m; }
var weekStart = clampWeek(mondayOf(new Date()));
function wkIndex(m) { return Math.round((dayNum(m) - dayNum(START)) / 7); }

/* ---------------------------------------------------------------- pages */
var P = {};
var GREET = [
  'Small steps still count. Start with the gentlest one.',
  'You do not have to do everything today. Pick what matters.',
  'Rest is part of the plan, not a break from it.',
  'One page at a time. This diary is on your side.',
  'Be as kind to yourself as you would be to a friend.',
  'Progress, not perfection. A little is plenty.',
  'Drink some water, then choose one small thing.',
  'You showed up. That is already something.',
  'Missed a day? Turn the page, nothing is ruined.',
  'Look how far the last few weeks have taken you.'
];
var editHabits = false;
function greeting() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

function habitSticker(h, k, late) {
  var on = habDone(k, h.id);
  return '<button type="button" class="hab' + (late && L(k).late && L(k).late[h.id] ? ' late' : '') + '" data-act="hab" data-k="' + k + '" data-id="' + h.id + '" aria-pressed="' + on + '">' + px(CATS[h.c] ? CATS[h.c][1] : 'heart', 20) + '<span class="nm">' + E(h.n) + '</span>' + (h.e ? px('star', 12) : '') + '<span class="tk" aria-hidden="true"></span></button>';
}
function habitsCard(k, low) {
  var all = st.habits, ess = all.filter(function (h) { return h.e; }), done = 0, tot = low ? ess.length : all.length, body = '';
  (low ? ess : all).forEach(function (h) { if (habDone(k, h.id)) done++; });
  if (editHabits) {
    body += '<p class="muted small" style="margin:0 0 8px">Rename, mark the essentials (the star), or remove. Essentials are what shows on low-energy days.</p>';
    all.forEach(function (h) {
      body += '<div class="hed"><input class="field" type="text" data-hn="' + h.id + '" value="' + E(h.n) + '" aria-label="Habit name"><button type="button" class="star" data-act="hab-ess" data-id="' + h.id + '" aria-pressed="' + !!h.e + '" aria-label="Essential on low-energy days">' + px('star', 18, h.e ? null : { g: '#F0E6F3', p: '#B9A8C4', w: '#F0E6F3' }) + '</button><button type="button" class="x" data-act="hab-del" data-id="' + h.id + '" aria-label="Remove habit">&times;</button></div>';
    });
    body += '<div class="addrow"><input class="field" type="text" data-addhab="1" placeholder="New habit…" aria-label="New habit name" enterkeyhint="done"><select class="sel" id="newcat" aria-label="Category">' + Object.keys(CATS).map(function (c) { return '<option value="' + c + '">' + CATS[c][0] + '</option>'; }).join('') + '</select><button type="button" class="btn sm lav" data-act="hab-add">+ Add</button></div>';
  } else {
    Object.keys(CATS).forEach(function (c) {
      var hs = (low ? ess : all).filter(function (h) { return h.c === c; });
      if (!hs.length) return;
      body += '<div class="gl">' + px(CATS[c][1], 16) + CATS[c][0] + '</div><div class="habgrid">' + hs.map(function (h) { return habitSticker(h, k); }).join('') + '</div>';
    });
    if (low) {
      var rest = all.filter(function (h) { return !h.e; });
      if (rest.length) body += '<details class="fold" style="margin-top:14px;padding:0 14px;border-radius:16px"><summary style="font-size:20px;min-height:44px">If I feel like more</summary><div class="habgrid" style="padding-bottom:14px">' + rest.map(function (h) { return habitSticker(h, k); }).join('') + '</div></details>';
    }
  }
  var aside = '<button type="button" class="btn sm ghost" data-act="hab-edit" aria-pressed="' + editHabits + '">' + px('pencil', 14) + (editHabits ? 'Done' : 'Edit') + '</button>';
  var head = '<div class="prog" style="margin:0 0 12px">' + hearts(done, tot) + '<span class="n">' + done + ' of ' + tot + '</span></div>';
  return card('Today\'s habits', 'heart', head + body, { aside: aside, id: 'habs' });
}
function movementCard(k, low) {
  var i = dow(parseYmd(k)), w = st.workouts.plan[i], on = habDone(k, 'move');
  var body = '<div class="moveline"><span class="chip ' + w.t + '">' + w.t + '</span><span class="wbig">' + E(w.n) + '</span></div><p class="muted" style="margin:8px 0 12px">' + E(w.d) + '</p>';
  if (low && w.t !== 'rest') body += '<div class="lowbox">Low-energy option: five minutes of slow stretching, or skip it. Both are fine.</div>';
  if (w.t === 'rest') body += '<div class="lowbox">Rest day. Nothing to tick, nothing to catch up on.</div>';
  else body += '<button type="button" class="btn ' + (on ? 'gold' : '') + '" data-act="hab" data-k="' + k + '" data-id="move" aria-pressed="' + on + '" style="margin-top:12px">' + px('heart', 16) + (on ? 'Moved today' : 'Mark as done') + '</button>';
  return card('Today\'s movement', 'dumbbell', body, { cls: 'mist' });
}

P.today = function () {
  var now = new Date(), k = ymd(now), l = L(k), low = l.energy === 'low';
  var toNY =dayNum(new Date(2027, 0, 1)) - dayNum(now);
  var wi = wkIndex(mondayOf(now)), inProg = dayNum(now) >= dayNum(START) && wi < NWEEKS;
  var greetLine = GREET[(dayNum(now)) % GREET.length];
  var hero = '<section class="card hero layer pinkl tape"><span class="pp"></span><div class="dateflag"><span class="m">' + MON3[now.getMonth()] + '</span><span class="d">' + now.getDate() + '</span><span class="w">' + WD3[dow(now)] + '</span></div>' +
    '<div><p class="eyebrow">' + WDAYS[dow(now)] + ', ' + MONTHS[now.getMonth()] + ' ' + now.getDate() + '</p><h1>' + greeting() + ', ' + E(st.name || 'friend') + '</h1><p class="sub">' + greetLine + '</p><div class="chips">' +
    (toNY > 0 ? '<span class="chip pink">' + toNY + ' days to 2027</span>' : '') + (inProg ? '<span class="chip">Week ' + (wi + 1) + ' of ' + NWEEKS + '</span>' : '') + '</div></div><span class="bowc" aria-hidden="true">' + px('bow', 64) + '</span></section>';
  var energy = card('How is my energy?', 'flower',
    '<div class="energy" role="group" aria-label="Energy today">' + [['low', 'Low', 'cloud'], ['ok', 'Okay', 'flower'], ['glow', 'Glowing', 'star']].map(function (e) {
      return '<button type="button" class="eb" data-act="energy" data-v="' + e[0] + '" aria-pressed="' + (l.energy === e[0]) + '">' + px(e[2], 30) + e[1] + '</button>';
    }).join('') + '</div>' + (low ? '<div class="lowbox">Low-energy day. Only the essentials: pray, drink water, one tiny thing, rest. That counts as a full day.</div>' : ''));
  var pri = '', i;
  for (i = 0; i < 3; i++) pri += '<div class="rowl">' + checkBound('log.' + k + '.pd.' + i, 'Priority ' + (i + 1) + ' done') + '<div class="grow">' + line('log.' + k + '.pr.' + i, i === 0 ? 'The one that matters most' : 'Another small thing', 'Priority ' + (i + 1)) + '</div></div>';
  var pcard = card('My three priorities', 'star', (low ? '<p class="muted small" style="margin:-4px 0 6px">One is plenty today.</p>' : '') + pri, { cls: 'rose' });
  var tcard = card('Today\'s little plan', 'calendar', taskBlock(k), { aside: '<a class="btn sm ghost" href="#/week">Week</a>' });
  return '<div class="page-today">' + hero + '<div class="cols c21" style="margin-top:22px"><div class="stack" style="gap:22px">' + pcard + habitsCard(k, low) + '</div><div class="stack" style="gap:22px">' + energy + movementCard(k, low) + tcard + '</div></div>' + sparkRow() + '</div>';
};

P.week = function () {
  var m = weekStart, wkKey = ymd(m), wi = wkIndex(m), now = new Date(), tk = ymd(now), days = '', done = 0, tot = 0, i;
  for (i = 0; i < 7; i++) { var c = taskCount(ymd(addDays(m, i))); done += c[0]; tot += c[1]; }
  var thisWk = wkKey === ymd(mondayOf(now));
  var head = pagehead('Weekly Planner', 'Seven little pages. Plan lightly, adjust freely.', 'calendar');
  var nav = '<div class="wk"><button type="button" class="btn icon ghost" data-act="wk" data-v="-1" aria-label="Previous week"' + (wi <= 0 ? ' disabled style="opacity:.4"' : '') + '>&lsaquo;</button>' +
    '<div class="lbl"><span>Week ' + (wi + 1) + ' of ' + NWEEKS + '</span><b>' + MON3[m.getMonth()] + ' ' + m.getDate() + ' to ' + MON3[addDays(m, 6).getMonth()] + ' ' + addDays(m, 6).getDate() + '</b></div>' +
    '<button type="button" class="btn icon ghost" data-act="wk" data-v="1" aria-label="Next week"' + (wi >= NWEEKS - 1 ? ' disabled style="opacity:.4"' : '') + '>&rsaquo;</button>' +
    (thisWk ? '' : '<button type="button" class="btn sm" data-act="wk" data-v="now">This week</button>') + '</div>';
  var prog = '<div class="prog">' + hearts(done, tot) + '<span class="n">' + (tot ? done + ' of ' + tot + ' tasks' : 'No tasks yet') + '</span></div>';
  var pri = '';
  for (i = 0; i < 3; i++) pri += '<div class="rowl">' + checkBound('weeks.' + wkKey + '.pd.' + i, 'Weekly priority ' + (i + 1) + ' done') + '<div class="grow">' + line('weeks.' + wkKey + '.pr.' + i, 'Weekly priority ' + (i + 1), 'Weekly priority ' + (i + 1)) + '</div></div>';
  for (i = 0; i < 7; i++) {
    var d = addDays(m, i), k = ymd(d), isT = k === tk, c2 = taskCount(k), wo = st.workouts.plan[i], seg = '';
    for (var s = 0; s < 5; s++) seg += '<i class="' + (c2[1] && s < Math.round(c2[0] / c2[1] * 5) ? 'on' : '') + '"></i>';
    days += '<div class="day' + (i >= 5 ? ' we' : '') + (isT ? ' today' : '') + '"><div class="dh"><span class="dnum">' + d.getDate() + '</span><span class="dnm">' + WD3[i] + '<small>' + wo.t + '</small></span><span class="dp bar" title="' + c2[0] + ' of ' + c2[1] + '" aria-label="' + c2[0] + ' of ' + c2[1] + ' tasks done">' + seg + '</span></div><div class="db">' + taskBlock(k, 'Add task…') + '</div></div>';
  }
  var ref = '';
  ['What went well?', 'What felt difficult?', 'What did I learn about myself this week?', 'What is my main focus next week?'].forEach(function (q, qi) { ref += '<div class="q">' + q + '</div>' + area('weeks.' + wkKey + '.ref.' + qi, '', { rows: 2 }); });
  return '<div class="stack" style="gap:22px">' + head + nav + prog +
    card('Weekly priorities', 'star', pri, { cls: 'rose layer' }) + '<div class="days">' + days + '</div>' +
    '<details class="fold"><summary>' + px('flower', 22) + 'Weekly check-in</summary>' + ref + '</details></div>';
};

function prayCell(k, id) {
  var l = L(k), on = l.h && l.h[id], late = on && l.late && l.late[id];
  return late ? 'late' : on ? 'done' : '';
}
P.salah = function () {
  var now = new Date(), tk = ymd(now), m = weekStart, i, n = 0, tot = 0;
  var ids = PRAYERS.filter(function (p) { return st.habits.some(function (h) { return h.id === p[0]; }); });
  var today = '<div class="pgrid">' + ids.map(function (p) {
    var s = prayCell(tk, p[0]);
    return '<button type="button" class="pbtn ' + s + '" data-act="pray" data-k="' + tk + '" data-id="' + p[0] + '" aria-label="' + p[1] + ': ' + (s || 'not yet') + '">' + px(s ? 'heart' : 'moon', 30, s ? null : null) + p[1] + '<small>' + (s === 'late' ? 'prayed late' : s === 'done' ? 'done' : 'tap') + '</small></button>';
  }).join('') + '</div><p class="muted small" style="margin:12px 0 0">Tap once for done, twice for prayed late, three times to clear.</p>';
  var head = '<tr><th></th>';
  for (i = 0; i < 7; i++) { var d = addDays(m, i); head += '<th class="' + (ymd(d) === tk ? 'td' : '') + '">' + WD3[i] + '<br>' + d.getDate() + '</th>'; }
  head += '</tr>';
  var body = ids.map(function (p) {
    var r = '<tr><td>' + p[1] + '</td>';
    for (var j = 0; j < 7; j++) {
      var k = ymd(addDays(m, j)), s = prayCell(k, p[0]); tot++; if (s) n++;
      r += '<td><button type="button" class="pc ' + s + '" data-act="pray" data-k="' + k + '" data-id="' + p[0] + '" aria-label="' + p[1] + ' ' + WD3[j] + ' ' + addDays(m, j).getDate() + ': ' + (s || 'not yet') + '">' + (s ? px('heart', 16, s === 'late' ? { k: '#DCD2FA' } : null) : '') + '</button></td>';
    }
    return r + '</tr>';
  }).join('');
  var wi = wkIndex(m);
  var nav = '<div class="wk"><button type="button" class="btn icon ghost" data-act="wk" data-v="-1" aria-label="Previous week"' + (wi <= 0 ? ' disabled style="opacity:.4"' : '') + '>&lsaquo;</button><div class="lbl"><span>Week ' + (wi + 1) + '</span><b>' + MON3[m.getMonth()] + ' ' + m.getDate() + ' to ' + MON3[addDays(m, 6).getMonth()] + ' ' + addDays(m, 6).getDate() + '</b></div><button type="button" class="btn icon ghost" data-act="wk" data-v="1" aria-label="Next week"' + (wi >= NWEEKS - 1 ? ' disabled style="opacity:.4"' : '') + '>&rsaquo;</button></div>';
  return '<div class="stack" style="gap:22px">' + pagehead('Salah', 'Every prayer counts, including the ones you made up late.', 'moon') +
    card('Today', 'moon', today, { cls: 'rose layer' }) +
    card('This week', 'calendar', nav + '<div class="prog" style="margin:12px 0 8px">' + hearts(n, tot) + '<span class="n">' + n + ' of ' + tot + '</span></div><table class="wtab"><thead>' + head + '</thead><tbody>' + body + '</tbody></table><div class="legend"><span><i style="background:var(--candy)"></i>done</span><span><i style="background:var(--lav)"></i>prayed late</span></div>') + sparkRow() + '</div>';
};

P.uni = function () {
  return '<div class="stack" style="gap:22px">' + pagehead('University', 'Deadlines, catch-up and one next step.', 'book') + '<div class="cols c2">' +
    card('My courses', 'book', listBlock('uni.courses', { fields: [{ f: 't', ph: 'Course name', label: 'Course' }, { f: 'n', type: 'sub', ph: 'Note: topic, exam day, doctor…', label: 'Note' }], add: 'Add a course…', empty: 'Add your courses when you are ready.' }), { cls: 'rose' }) +
    card('Deadlines + exams', 'calendar', listBlock('uni.deadlines', { check: true, sort: 'd', fields: [{ f: 't', ph: 'What is due?', label: 'Deadline' }, { f: 'd', type: 'date', rel: true, label: 'Due date' }], add: 'Add a deadline…', empty: 'Nothing due. Enjoy it.' }), { cls: 'mist' }) +
    card('Catch-up list', 'heart', listBlock('uni.backlog', { check: true, fields: [{ f: 't', ph: 'Lecture or assignment to catch up on', label: 'Backlog item' }], add: 'Add something to catch up on…', empty: 'No backlog right now.' })) +
    card('My next study step', 'star', '<p class="muted small" style="margin:-4px 0 8px">Just the very next small action.</p>' + area('uni.next', 'e.g. Watch lecture 4 for 20 minutes', { rows: 3 }), { cls: 'rose' }) +
    '</div></div>';
};
var STAT_PROJ = ['idea', 'building', 'shipped'], STAT_APP = ['idea', 'applied', 'waiting', 'interview', 'done'];
P.career = function () {
  return '<div class="stack" style="gap:22px">' + pagehead('Career', 'Skills, projects and income, one next step at a time.', 'laptop') +
    card('AI / CS next step', 'laptop', area('career.next', 'The very next thing to do on a project', { rows: 3 }), { cls: 'rose layer' }) + '<div class="cols c2">' +
    card('Projects', 'laptop', listBlock('career.projects', { fields: [{ f: 't', ph: 'Project', label: 'Project' }, { f: 's', type: 'select', opts: STAT_PROJ, label: 'Status' }], add: 'Add a project…', empty: 'No projects yet.' })) +
    card('Skills to build', 'star', listBlock('career.skills', { check: true, fields: [{ f: 't', ph: 'Course, skill or tutorial', label: 'Skill' }], add: 'Add a skill…' }), { cls: 'mist' }) +
    card('Portfolio', 'flower', listBlock('career.portfolio', { check: true, fields: [{ f: 't', ph: 'Portfolio improvement', label: 'Portfolio item' }], add: 'Add an improvement…' })) +
    card('Jobs + internships', 'diary', listBlock('career.apps', { fields: [{ f: 't', ph: 'Role or company', label: 'Opportunity' }, { f: 's', type: 'select', opts: STAT_APP, label: 'Status' }], add: 'Add an opportunity…', empty: 'Nothing here yet. One application is a good start.' }), { cls: 'rose' }) +
    card('Income ideas', 'coin', listBlock('career.income', { check: true, fields: [{ f: 't', ph: 'Idea or action', label: 'Income idea' }], add: 'Add an idea…' })) +
    '</div></div>';
};

P.workouts = function () {
  var now = new Date(), k = ymd(now), plan = st.workouts.plan, rows = '', i, m = mondayOf(now), moved = 0;
  for (i = 0; i < 7; i++) { if (habDone(ymd(addDays(m, i)), 'move')) moved++; }
  plan.forEach(function (w, di) {
    rows += '<div class="wrow"><span class="dn">' + WD3[di] + '</span><div class="wb"><div class="seg" role="group" aria-label="' + WDAYS[di] + ' type">' +
      ['rest', 'gentle', 'steady'].map(function (t) { return '<button type="button" data-act="wtype" data-i="' + di + '" data-v="' + t + '" aria-pressed="' + (w.t === t) + '">' + t + '</button>'; }).join('') + '</div>' +
      '<input class="field" type="text" data-wn="' + di + '" value="' + E(w.n) + '" aria-label="' + WDAYS[di] + ' workout"><textarea class="tl small" rows="1" data-line="1" data-wd="' + di + '" aria-label="' + WDAYS[di] + ' details">' + E(w.d) + '</textarea></div></div>';
  });
  return '<div class="stack" style="gap:22px">' + pagehead('Workouts', 'Move at the pace of your energy. Rest is part of the plan.', 'dumbbell') + '<div class="cols c21">' +
    '<div class="stack" style="gap:22px">' + movementCard(k, L(k).energy === 'low') + card('My week', 'calendar', '<p class="muted small" style="margin:-4px 0 4px">Pick rest, gentle or steady for each day and change it any time. Adjust to how you feel and to your care team\'s advice.</p>' + rows) + '</div>' +
    '<div class="stack" style="gap:22px">' + card('This week', 'heart', '<div class="prog">' + hearts(moved, 4, 5) + '<span class="n">' + moved + ' moving days</span></div><p class="muted small" style="margin:10px 0 0">Two or three good days beat seven exhausting ones.</p>', { cls: 'rose layer' }) +
    card('Recovery options', 'cloud', listBlock('workouts.recovery', { fields: [{ f: 't', ph: 'Recovery option', label: 'Recovery option' }], add: 'Add one…' }), { cls: 'mist' }) + '</div></div></div>';
};

P.care = function () {
  var now = new Date(), k = ymd(now), di = dow(now), l = L(k), sk = l.skin || {};
  function step(key, label) { return '<div class="rowl">' + checkBound('log.' + k + '.skin.' + key, label) + '<div class="grow" style="padding-top:6px">' + label + '</div></div>'; }
  var skin = '<div class="cols c2" style="gap:14px"><div><div class="gl">' + px('flower', 16) + 'Morning</div>' + step('am0', 'Cleanse') + step('am1', 'Moisturize') + step('am2', 'Sunscreen') + '</div><div><div class="gl">' + px('moon', 16) + 'Night</div>' + step('pm0', 'Cleanse') + step('pm1', 'Moisturize') + '</div></div>';
  var todays = (st.care.hair || []).filter(function (h) { return (h.days || []).indexOf(di) > -1; });
  var tdy = todays.length ? todays.map(function (h) { return '<div class="rowl">' + checkBound('log.' + k + '.hair.' + h.id, h.t + ' done') + '<div class="grow" style="padding-top:6px"><b>' + E(h.t) + '</b> today</div></div>'; }).join('') : '<p class="empty">No hair care planned today.</p>';
  var hairRows = (st.care.hair || []).map(function (h) {
    return '<div class="rowl" style="flex-wrap:wrap"><div class="grow" style="flex:1 1 200px"><textarea class="tl" rows="1" data-line="1" data-list="care.hair" data-id="' + h.id + '" data-f="t" aria-label="Reminder">' + E(h.t) + '</textarea><div class="seg days7" role="group" aria-label="Days">' +
      WD3.map(function (d, j) { return '<button type="button" data-act="hairday" data-id="' + h.id + '" data-d="' + j + '" aria-pressed="' + ((h.days || []).indexOf(j) > -1) + '">' + d.slice(0, 2) + '</button>'; }).join('') + '</div></div><button type="button" class="x" data-act="list-del" data-path="care.hair" data-id="' + h.id + '" aria-label="Remove">&times;</button></div>';
  }).join('') + '<div class="addrow"><input class="field" type="text" data-addlist="care.hair" placeholder="Add a reminder…" aria-label="Add a hair-care reminder"><button type="button" class="btn sm lav" data-act="list-add" data-path="care.hair" aria-label="Add">+ Add</button></div>';
  return '<div class="stack" style="gap:22px">' + pagehead('Self-Care', 'A few gentle basics. Never a project.', 'mirror') + '<div class="cols c2">' +
    card('Skincare today', 'mirror', skin, { cls: 'rose layer' }) + card('Hair care today', 'flower', tdy, { cls: 'mist' }) +
    card('Hair-care reminders', 'flower', '<p class="muted small" style="margin:-4px 0 8px">Choose the days, and they show up here and nowhere else.</p>' + hairRows) +
    card('Concerns + reactions', 'heart', '<p class="muted small" style="margin:-4px 0 8px">Note anything new or any reaction to a product, with the date.</p>' + listBlock('care.notes', { newest: true, fields: [{ f: 't', ph: 'What I noticed', label: 'Note' }, { f: 'd', type: 'date', label: 'Date' }], add: 'Add a note…', empty: 'Nothing to note. Good.' })) + '</div></div>';
};

P.quran = function () {
  var k = ymd(new Date()), st2 = st.habits.filter(function (h) { return h.id === 'quran' || h.id === 'reading'; });
  var today = '<div class="habgrid">' + st2.map(function (h) { return habitSticker(h, k); }).join('') + '</div>';
  return '<div class="stack" style="gap:22px">' + pagehead('Quran & Reading', 'A little every day is a lovely rhythm.', 'readbook') + '<div class="cols c2">' +
    card('Today', 'readbook', today, { cls: 'rose layer' }) +
    card('Where I stopped', 'star', '<p class="muted small" style="margin:-4px 0 8px">Surah and ayah, or page.</p>' + field('qr.stopped', 'e.g. Surah, ayah / page', { label: 'Where I stopped' }), { cls: 'mist' }) +
    card('Currently reading', 'book', listBlock('qr.books', { fields: [{ f: 't', ph: 'Book title', label: 'Book' }, { f: 's', type: 'select', opts: ['reading', 'paused', 'finished'], label: 'Status' }], add: 'Add a book…', empty: 'Add something you want to read.' })) +
    card('Little notes', 'flower', area('qr.notes', 'A line I liked, a thought, something to remember…', { rows: 5 })) + '</div></div>';
};

var breathTimer = null, breathSecs = 0;
P.well = function () {
  var now = new Date(), k = ymd(now), bars = '', i;
  for (i = 13; i >= 0; i--) {
    var d = addDays(now, -i), e = L(ymd(d)).energy, cl = e === 'low' ? 'l' : e === 'ok' ? 'o' : e === 'glow' ? 'g' : 'n';
    bars += '<div class="eb2"><div class="bb ' + cl + '" title="' + (e || 'not set') + '"></div><small>' + d.getDate() + '</small></div>';
  }
  var l = L(k);
  var breathe = '<div class="breath" id="breath"><div class="bheart">' + px('heart', 64) + '</div><div class="bsay" id="bsay" aria-live="polite">One minute, whenever you like.</div><div class="actions"><button type="button" class="btn" data-act="breath">Start breathing</button><button type="button" class="btn ghost" data-act="hab" data-k="' + k + '" data-id="quiet" aria-pressed="' + habDone(k, 'quiet') + '">' + (habDone(k, 'quiet') ? 'Quiet time done' : 'Mark quiet time done') + '</button></div></div>';
  return '<div class="stack" style="gap:22px">' + pagehead('Wellbeing', 'Check in with yourself, softly.', 'cloud') + '<div class="cols c2">' +
    card('Breathe', 'cloud', breathe, { cls: 'mist layer' }) +
    card('My energy, last 14 days', 'flower', '<div class="ebars" aria-label="Energy chart">' + bars + '</div><div class="legend" style="margin-top:8px"><span><i style="background:var(--lav)"></i>low</span><span><i style="background:var(--candy)"></i>okay</span><span><i style="background:var(--gold)"></i>glowing</span></div><p class="muted small" style="margin:10px 0 0">Set today\'s energy on the Today page. Patterns help you plan, not judge.</p>') +
    card('One small confidence action', 'star', area('log.' + k + '.conf', 'What is one brave little thing I can do today?', { rows: 2 }) + '<div class="rowl" style="margin-top:8px">' + checkBound('log.' + k + '.confd', 'Confidence action done') + '<div class="grow" style="padding-top:6px">I did it</div></div>', { cls: 'rose' }) +
    card('Kind words to myself', 'heart', area('log.' + k + '.kind', 'What would I say to a friend feeling like I do?', { rows: 3 })) +
    card('Today, in two lines', 'flower', '<div class="q" style="margin-top:0">One thing I am grateful for</div>' + line('log.' + k + '.grat', '', 'Grateful for') + '<div class="q">One thing I did well</div>' + line('log.' + k + '.well', '', 'Did well') + '<div class="q">Tomorrow\'s first step</div>' + line('log.' + k + '.next', '', 'Tomorrow first step'), { cls: 'mist' }) +
    '</div></div>';
};

function fmtMoney(n) { return (Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
P.money = function () {
  var inc = st.money.inc || [], cur = st.money.cur || 'EGP', nov = 0, dec = 0, all = 0, today = ymd(new Date());
  inc.forEach(function (x) { var a = parseFloat(x.a) || 0; all += a; if ((x.d || '').slice(0, 7) === '2026-11') nov += a; if ((x.d || '').slice(0, 7) === '2026-12') dec += a; });
  var rows = inc.slice().sort(function (a, b) { return (b.d || '') < (a.d || '') ? -1 : 1; }).map(function (x) {
    return '<div class="rowl"><div class="grow"><textarea class="tl" rows="1" data-line="1" data-list="money.inc" data-id="' + x.id + '" data-f="t" aria-label="Source">' + E(x.t || '') + '</textarea><div class="meta"><input class="field" type="number" inputmode="decimal" style="width:130px" data-list="money.inc" data-id="' + x.id + '" data-f="a" value="' + E(x.a || '') + '" placeholder="Amount" aria-label="Amount"><input class="field" type="date" data-list="money.inc" data-id="' + x.id + '" data-f="d" value="' + E(x.d || '') + '" aria-label="Date"></div></div><button type="button" class="x" data-act="list-del" data-path="money.inc" data-id="' + x.id + '" aria-label="Remove">&times;</button></div>';
  }).join('') || '<p class="empty">Nothing logged yet. The first one will be exciting.</p>';
  var goal = parseFloat(st.money.goal) || 0, saved = parseFloat(st.money.saved) || 0, pct = goal ? Math.min(100, Math.round(saved / goal * 100)) : 0;
  return '<div class="stack" style="gap:22px">' + pagehead('Money', 'Income and savings, kept simple and private on this device.', 'coin') + '<div class="cols c2">' +
    card('Income log', 'coin', '<div class="tot" style="margin-bottom:12px"><div><b>' + fmtMoney(nov) + '</b><span>Nov ' + E(cur) + '</span></div><div><b>' + fmtMoney(dec) + '</b><span>Dec ' + E(cur) + '</span></div><div><b>' + fmtMoney(all) + '</b><span>Total ' + E(cur) + '</span></div></div>' + rows +
      '<div class="arow add"><input class="field" type="text" id="minc-t" placeholder="Source, e.g. template sale" aria-label="Source"><input class="field" type="number" inputmode="decimal" id="minc-a" placeholder="Amount" aria-label="Amount"><button type="button" class="btn sm lav" data-act="inc-add">+ Add</button></div>', { cls: 'rose layer' }) +
    '<div class="stack" style="gap:22px">' + card('Savings goal', 'star', '<div class="arow" style="grid-template-columns:1fr 1fr 90px"><label class="small muted">Goal<input class="field" type="number" inputmode="decimal" data-bind="money.goal" value="' + E(st.money.goal || '') + '" aria-label="Savings goal"></label><label class="small muted">Saved so far<input class="field" type="number" inputmode="decimal" data-bind="money.saved" value="' + E(st.money.saved || '') + '" aria-label="Saved so far"></label><label class="small muted">Currency<input class="field" type="text" data-bind="money.cur" value="' + E(cur) + '" maxlength="4" aria-label="Currency"></label></div>' +
      '<div class="prog" style="margin-top:14px">' + hearts(saved, goal || 1) + '<span class="n">' + (goal ? pct + '%' : 'Set a goal') + '</span></div>', { cls: 'mist' }) +
    card('Money notes', 'flower', area('money.notes', 'Ideas, reminders, things to look into…', { rows: 4 })) + '</div></div></div>';
};

/* ---------------------------------------------------------------- render */
var pageEl, afterRender = null;
function autogrow(el) { el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; }
function render(opts) {
  opts = opts || {};
  var y = window.scrollY;
  pageEl.innerHTML = P[route]();
  var tas = pageEl.querySelectorAll('textarea[data-line]');
  for (var i = 0; i < tas.length; i++) autogrow(tas[i]);
  document.title = (route === 'today' ? 'Lock-In Diary' : navLabel(route) + ' · Lock-In Diary');
  markNav();
  if (opts.keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
  if (afterRender) { var f = afterRender; afterRender = null; f(); }
}
function go() { stopBreath(); route = parseRoute(); render(); }
window.addEventListener('hashchange', go);

/* ---------------------------------------------------------------- events */
function findItem(path, id) { var a = getp(path) || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
function addTask(k) {
  var inp = pageEl.querySelector('input[data-addtask="' + k + '"]'); if (!inp) return;
  var t = inp.value.trim(); if (!t) { inp.focus(); return; }
  (st.tasks[k] = st.tasks[k] || []).push({ id: uid(), t: t, c: 0 }); save();
  afterRender = function () { var n = pageEl.querySelector('input[data-addtask="' + k + '"]'); if (n) n.focus(); };
  render({ keepScroll: true });
}
function addListItem(path) {
  var inp = pageEl.querySelector('input[data-addlist="' + path + '"]'); if (!inp) return;
  var t = inp.value.trim(); if (!t) { inp.focus(); return; }
  var arr = getp(path); if (!Array.isArray(arr)) { setp(path, []); arr = getp(path); }
  var it = { id: uid(), t: t };
  if (path === 'care.notes') it.d = ymd(new Date());
  if (path === 'care.hair') it.days = [];
  arr.push(it); save();
  afterRender = function () { var n = pageEl.querySelector('input[data-addlist="' + path + '"]'); if (n) n.focus(); };
  render({ keepScroll: true });
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-act]'); if (!b) return;
  var a = b.dataset.act, k, id, v, h;
  switch (a) {
    case 'hab': k = b.dataset.k; id = b.dataset.id; v = !habDone(k, id); setp('log.' + k + '.h.' + id, v ? true : false); setp('log.' + k + '.late.' + id, false); render({ keepScroll: true }); break;
    case 'pray': k = b.dataset.k; id = b.dataset.id; var s = prayCell(k, id);
      if (s === '') { setp('log.' + k + '.h.' + id, true); }
      else if (s === 'done') { setp('log.' + k + '.late.' + id, true); }
      else { setp('log.' + k + '.h.' + id, false); setp('log.' + k + '.late.' + id, false); }
      render({ keepScroll: true }); break;
    case 'energy': k = ymd(new Date()); v = b.dataset.v; setp('log.' + k + '.energy', L(k).energy === v ? '' : v); render({ keepScroll: true }); break;
    case 'task-add': addTask(b.dataset.k); break;
    case 'task-del': var ta = st.tasks[b.dataset.k] || []; st.tasks[b.dataset.k] = ta.filter(function (t) { return t.id !== b.dataset.id; }); save(); render({ keepScroll: true }); break;
    case 'list-add': addListItem(b.dataset.path); break;
    case 'list-del': var arr = getp(b.dataset.path) || []; setp(b.dataset.path, arr.filter(function (x) { return x.id !== b.dataset.id; })); render({ keepScroll: true }); break;
    case 'wk': v = b.dataset.v; weekStart = v === 'now' ? clampWeek(mondayOf(new Date())) : clampWeek(addDays(weekStart, 7 * parseInt(v, 10))); render(); break;
    case 'hab-edit': editHabits = !editHabits; render({ keepScroll: true }); break;
    case 'hab-ess': h = st.habits.filter(function (x) { return x.id === b.dataset.id; })[0]; if (h) { h.e = h.e ? 0 : 1; save(); render({ keepScroll: true }); } break;
    case 'hab-del': st.habits = st.habits.filter(function (x) { return x.id !== b.dataset.id; }); save(); render({ keepScroll: true }); break;
    case 'hab-add': addHabit(); break;
    case 'wtype': st.workouts.plan[+b.dataset.i].t = b.dataset.v; save(); render({ keepScroll: true }); break;
    case 'hairday': h = findItem('care.hair', b.dataset.id); if (h) { var dd = +b.dataset.d; h.days = h.days || []; var ix = h.days.indexOf(dd); if (ix > -1) h.days.splice(ix, 1); else h.days.push(dd); save(); render({ keepScroll: true }); } break;
    case 'inc-add': var t = document.getElementById('minc-t'), am = document.getElementById('minc-a');
      if (!t.value.trim() && !am.value) { t.focus(); break; }
      st.money.inc.push({ id: uid(), t: t.value.trim(), a: am.value, d: ymd(new Date()) }); save(); render({ keepScroll: true }); break;
    case 'breath': toggleBreath(); break;
    case 'more': openSheet('more'); break;
    case 'backup': openSheet('backup'); break;
    case 'close': closeSheet(); break;
    case 'export': exportData(); break;
    case 'cover': showCover(); break;
  }
});
function addHabit() {
  var i = pageEl.querySelector('input[data-addhab]'), c = document.getElementById('newcat'), n = i.value.trim();
  if (!n) { i.focus(); return; }
  st.habits.push({ id: uid(), n: n, c: c.value, e: 0 }); save();
  afterRender = function () { var q = pageEl.querySelector('input[data-addhab]'); if (q) q.focus(); };
  render({ keepScroll: true });
}
document.addEventListener('keydown', function (e) {
  var t = e.target;
  if (e.key === 'Enter') {
    if (t.dataset.addtask) { e.preventDefault(); addTask(t.dataset.addtask); }
    else if (t.dataset.addlist) { e.preventDefault(); addListItem(t.dataset.addlist); }
    else if (t.dataset.addhab) { e.preventDefault(); addHabit(); }
    else if (t.tagName === 'TEXTAREA' && t.dataset.line) { e.preventDefault(); t.blur(); }
  }
  if (e.key === 'Escape') closeSheet();
});
document.addEventListener('input', function (e) {
  var t = e.target, p;
  if (t.tagName === 'TEXTAREA' && t.dataset.line) autogrow(t);
  if (t.dataset.bind) { setp(t.dataset.bind, t.type === 'number' ? t.value : t.value); return; }
  if (t.dataset.task) { var a = st.tasks[t.dataset.task] || []; for (var i = 0; i < a.length; i++) if (a[i].id === t.dataset.id) a[i].t = t.value; save(); return; }
  if (t.dataset.list) { var it = findItem(t.dataset.list, t.dataset.id); if (it) { it[t.dataset.f] = t.value; save(); } return; }
  if (t.dataset.hn) { var h = st.habits.filter(function (x) { return x.id === t.dataset.hn; })[0]; if (h) { h.n = t.value; save(); } return; }
  if (t.dataset.wn !== undefined) { st.workouts.plan[+t.dataset.wn].n = t.value; save(); return; }
  if (t.dataset.wd !== undefined) { st.workouts.plan[+t.dataset.wd].d = t.value; save(); return; }
  if (t.id === 'nameinp') { st.name = t.value; save(); }
});
document.addEventListener('change', function (e) {
  var t = e.target;
  if (t.dataset.bindc) { setp(t.dataset.bindc, t.checked ? true : false); return; }
  if (t.dataset.taskc) { var a = st.tasks[t.dataset.taskc] || []; for (var i = 0; i < a.length; i++) if (a[i].id === t.dataset.id) a[i].c = t.checked ? 1 : 0; save(); render({ keepScroll: true }); return; }
  if (t.dataset.listc) { var it = findItem(t.dataset.listc, t.dataset.id); if (it) { it.c = t.checked ? 1 : 0; save(); render({ keepScroll: true }); } return; }
  if (t.dataset.list && t.type === 'date') { var it2 = findItem(t.dataset.list, t.dataset.id); if (it2) { it2[t.dataset.f] = t.value; save(); render({ keepScroll: true }); } return; }
  if (t.dataset.list && t.tagName === 'SELECT') { var it3 = findItem(t.dataset.list, t.dataset.id); if (it3) { it3[t.dataset.f] = t.value; save(); } return; }
  if (t.id === 'importfile') importFile(t.files && t.files[0]);
});

/* ---------------------------------------------------------------- breathing */
function stopBreath() { clearInterval(breathTimer); breathTimer = null; }
function toggleBreath() {
  var box = document.getElementById('breath'), say = document.getElementById('bsay'), btn = box.querySelector('[data-act=breath]');
  if (breathTimer) { stopBreath(); box.className = 'breath'; say.textContent = 'Lovely. Whenever you are ready again.'; btn.textContent = 'Start breathing'; return; }
  breathSecs = 0; btn.textContent = 'Stop';
  var step = function () {
    var ph = breathSecs % 2 === 0;
    box.className = 'breath ' + (ph ? 'in' : 'out'); say.textContent = ph ? 'Breathe in…' : 'Breathe out…'; breathSecs++;
    if (breathSecs > 14) { stopBreath(); box.className = 'breath'; say.textContent = 'Well done. Mark your quiet time if you like.'; btn.textContent = 'Start breathing'; }
  };
  step(); breathTimer = setInterval(step, 4000);
}

/* ---------------------------------------------------------------- sheets: more, backup */
var sheetEl;
function openSheet(kind) {
  var h = '';
  if (kind === 'more') {
    h = '<h2>All sections</h2><div class="moregrid">' + NAV.map(function (n) { return '<a href="#/' + n[0] + '" data-r="' + n[0] + '" data-act="close">' + px(n[2], 30) + n[1] + '</a>'; }).join('') + '</div><div class="actions"><button type="button" class="btn ghost" data-act="backup">Backup + settings</button><button type="button" class="btn" data-act="close">Close</button></div>';
  } else {
    var due = !st.lastBackup || (dayNum(new Date()) - dayNum(parseYmd(st.lastBackup)) > 14);
    h = '<h2>Backup + settings</h2><p class="muted" style="margin:6px 0 14px">Everything saves on this device by itself. Export a backup now and then, so it is safe if you change devices.</p>' +
      '<label class="small muted">My name<input class="field" id="nameinp" type="text" value="' + E(st.name || '') + '" autocomplete="off"></label>' +
      '<div class="actions" style="margin-top:14px"><button type="button" class="btn gold" data-act="export">' + px('down', 16) + 'Export backup</button>' +
      '<label class="btn ghost" tabindex="0" for="importfile">' + px('up', 16) + 'Import backup</label><input id="importfile" type="file" accept="application/json,.json" class="sr"></div>' +
      '<p class="muted small" style="margin:6px 0">' + (st.lastBackup ? 'Last backup: ' + st.lastBackup + '.' : 'No backup yet.') + (due ? ' A fresh one would be nice.' : '') + '</p><div id="importbox"></div>' +
      '<div class="actions" style="margin-top:12px"><button type="button" class="btn ghost" data-act="cover">Show the cover</button><button type="button" class="btn" data-act="close">Close</button></div>';
  }
  sheetEl.innerHTML = '<div class="panel" role="dialog" aria-modal="true" aria-label="' + (kind === 'more' ? 'All sections' : 'Backup and settings') + '">' + h + '</div>';
  sheetEl.hidden = false;
  var f = sheetEl.querySelector('a,button,input'); if (f) f.focus();
}
function closeSheet() { if (sheetEl && !sheetEl.hidden) { sheetEl.hidden = true; sheetEl.innerHTML = ''; render({ keepScroll: true }); } }
function exportData() {
  writeNow();
  var blob = new Blob([JSON.stringify(st, null, 2)], { type: 'application/json' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'lockin-diary-backup-' + ymd(new Date()) + '.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  st.lastBackup = ymd(new Date()); save(); toast('Backup saved to your downloads');
}
var pendingImport = null;
function importFile(f) {
  if (!f) return;
  var r = new FileReader();
  r.onload = function () {
    var box = document.getElementById('importbox');
    try {
      var o = JSON.parse(r.result);
      if (!o || typeof o !== 'object' || (!Array.isArray(o.habits) && typeof o.log !== 'object')) throw new Error('shape');
      pendingImport = o;
      box.innerHTML = '<div class="note" style="margin-top:8px">Replace what is on this device with this backup? The current version is kept as a safety copy.<div class="actions" style="margin-bottom:0"><button type="button" class="btn gold sm" id="doimport">Yes, import</button><button type="button" class="btn ghost sm" id="noimport">Cancel</button></div></div>';
    } catch (e) { box.innerHTML = '<div class="note" style="margin-top:8px">That file does not look like a Lock-In Diary backup.</div>'; }
  };
  r.readAsText(f);
}
document.addEventListener('click', function (e) {
  if (e.target.id === 'doimport' && pendingImport) {
    try { localStorage.setItem(KEY + '-prev', JSON.stringify(st)); } catch (x) {}
    st = ensure(pendingImport); pendingImport = null; writeNow(); closeSheet(); render(); toast('Backup imported');
  } else if (e.target.id === 'noimport') { pendingImport = null; document.getElementById('importbox').innerHTML = ''; }
});
document.addEventListener('click', function (e) { if (e.target === sheetEl) closeSheet(); });

/* ---------------------------------------------------------------- cover */
function coverHtml() {
  return '<div class="wrapc"><div class="cvr" id="cvr"><span class="bowtop" aria-hidden="true">' + px('bow', 110) + '</span>' +
    '<div class="face"><span class="twk" style="top:20px;right:24px" aria-hidden="true">' + px('sparkle', 18) + '</span><span class="twk" style="bottom:26px;left:70px" aria-hidden="true">' + px('star', 18) + '</span><span class="twk" style="bottom:70px;right:20px" aria-hidden="true">' + px('sparkle', 14) + '</span>' +
    '<div class="plate"><span aria-hidden="true">' + px('flower', 34) + '</span><h1>Lock-In<br>Diary</h1><span class="when">Nov · Dec 2026</span><span aria-hidden="true" style="display:flex;gap:6px">' + px('heart', 16) + px('star', 18) + px('heart', 16) + '</span></div></div></div>' +
    '<button type="button" class="btn gold open" id="opendiary">' + px('star', 18) + 'Open my diary</button></div>';
}
function showCover() {
  closeSheetSilent();
  var c = document.getElementById('cover'); c.innerHTML = coverHtml(); c.className = 'cover'; c.hidden = false;
  document.getElementById('opendiary').focus();
}
function closeSheetSilent() { if (sheetEl) { sheetEl.hidden = true; sheetEl.innerHTML = ''; } }
document.addEventListener('click', function (e) {
  if (e.target.closest && e.target.closest('#opendiary')) {
    var c = document.getElementById('cover'), reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    st.coverDay = ymd(new Date()); save();
    if (reduce) { c.hidden = true; c.innerHTML = ''; return; }
    c.classList.add('opening'); setTimeout(function () { c.hidden = true; c.innerHTML = ''; c.className = 'cover'; }, 950);
  }
});

/* ---------------------------------------------------------------- start */
pageEl = document.getElementById('page'); sheetEl = document.getElementById('sheet');
buildNav();
document.getElementById('sbrand').innerHTML = px('bow', 44) + '<span><span class="t">Lock-In<br>Diary</span><span class="s">Nov · Dec 2026</span></span>';
document.getElementById('mbrand').innerHTML = px('bow', 34) + '<span class="t">Lock-In Diary</span>';
var sf = document.getElementById('sfoot');
sf.innerHTML = '<button type="button" class="btn sm ghost" data-act="backup">' + px('down', 14) + 'Backup</button>' + px('flower', 34);
document.getElementById('mbackup').innerHTML = px('down', 14) + 'Backup';
var brs = document.querySelectorAll('.brand'); for (var bi = 0; bi < brs.length; bi++) brs[bi].setAttribute('data-act', 'cover');
route = parseRoute(); render();
if (st.coverDay !== ymd(new Date())) showCover();
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}
})();
