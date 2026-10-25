// Skill explorer: select a skill to see the projects and notes behind it, in a panel under the pills.
// Skills are matched against the `skills:` list in each project's / post's front matter.
// Pills with nothing related stay plain. Selecting the same pill again (or Esc) closes the panel.
(function () {
  var section = document.getElementById('skills');
  var dataEl = document.getElementById('sk-data');
  if (!section || !dataEl) return;

  var data;
  try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var active = null;      // currently selected pill

  function norm(s) { return String(s).trim().toLowerCase(); }
  function related(list, skill) {
    return list.filter(function (x) {
      return (x.skills || []).some(function (s) { return norm(s) === norm(skill); });
    });
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  // ----- panel (built once, placed under the skill groups) -----
  var panel = el('div', 'sk-panel');
  panel.id = 'sk-panel';
  var clip = el('div', 'sk-clip');
  var body = el('div', 'sk-body');
  var head = el('div', 'sk-head');
  var nameEl = el('h3', 'sk-name');
  var countEl = el('span', 'sk-count');
  var clearBtn = el('button', 'sk-clear', 'Clear');
  clearBtn.type = 'button';
  head.appendChild(nameEl); head.appendChild(countEl); head.appendChild(clearBtn);
  var projGroup = el('div', 'sk-group');
  projGroup.appendChild(el('p', 'sk-label', 'Projects'));
  var projGrid = el('div', 'sk-grid');
  projGroup.appendChild(projGrid);
  var noteGroup = el('div', 'sk-group');
  noteGroup.appendChild(el('p', 'sk-label', 'Notes'));
  var noteList = el('ul', 'sk-notes');
  noteGroup.appendChild(noteList);
  body.appendChild(head); body.appendChild(projGroup); body.appendChild(noteGroup);
  clip.appendChild(body); panel.appendChild(clip);
  var status = el('p', 'sr-only');
  status.setAttribute('role', 'status');

  var wrap = section.querySelector('.wrap') || section;
  var anchor = wrap.querySelector('.split');
  if (anchor) { anchor.insertAdjacentElement('afterend', panel); } else { wrap.appendChild(panel); }
  panel.insertAdjacentElement('beforebegin', status);

  function projectCard(p, i) {
    var c = el('article', 'sk-card');
    c.style.setProperty('--i', i);
    var bar = el('div', 'sk-bar');
    bar.setAttribute('aria-hidden', 'true');
    for (var d = 0; d < 3; d++) bar.appendChild(el('span', 'dot'));
    bar.appendChild(el('span', 'sk-path', '~/projects/' + p.slug));
    var inner = el('div', 'sk-card-body');
    var h = el('h4');
    var a = el('a', null, p.title);
    a.href = p.url;
    h.appendChild(a);
    inner.appendChild(h);
    inner.appendChild(el('p', 'sk-desc', p.desc));
    c.appendChild(bar); c.appendChild(inner);
    return c;
  }

  function noteRow(n, i) {
    var li = el('li');
    li.style.setProperty('--i', i);
    var a = el('a', 'sk-note');
    a.href = n.url;
    a.appendChild(el('span', 'sk-date', n.date));
    a.appendChild(el('span', 'sk-ntitle', n.title));
    var arrow = el('span', 'sk-arrow', '\u2192');
    arrow.setAttribute('aria-hidden', 'true');
    a.appendChild(arrow);
    li.appendChild(a);
    return li;
  }

  function render(skill) {
    var p = related(data.projects, skill), n = related(data.notes, skill);
    nameEl.textContent = skill;
    var parts = [];
    if (p.length) parts.push(plural(p.length, 'project'));
    if (n.length) parts.push(plural(n.length, 'note'));
    countEl.textContent = parts.join(' \u00B7 ');
    projGrid.textContent = ''; noteList.textContent = '';
    p.forEach(function (x, i) { projGrid.appendChild(projectCard(x, i)); });
    n.forEach(function (x, i) { noteList.appendChild(noteRow(x, i)); });
    projGroup.hidden = !p.length;
    noteGroup.hidden = !n.length;
    status.textContent = skill + ': ' + parts.join(', ') + ' shown below.';
    // restart the entrance animation
    body.classList.remove('is-in');
    void body.offsetWidth;
    body.classList.add('is-in');
  }

  function revealPanel() {
    window.setTimeout(function () {
      var r = panel.getBoundingClientRect();
      var over = r.bottom - (window.innerHeight - 24);
      if (over > 0) window.scrollBy({ top: Math.min(over, r.top - 90), behavior: reduceMotion ? 'auto' : 'smooth' });
    }, reduceMotion ? 0 : 420);
  }

  function select(btn) {
    if (active) { active.setAttribute('aria-pressed', 'false'); }
    active = btn;
    btn.setAttribute('aria-pressed', 'true');
    render(btn.getAttribute('data-skill'));
    var wasOpen = panel.classList.contains('is-open');
    panel.classList.add('is-open');
    if (!wasOpen) revealPanel();
  }

  function clear(returnFocus) {
    if (!active) return;
    var btn = active;
    active.setAttribute('aria-pressed', 'false');
    active = null;
    panel.classList.remove('is-open');
    status.textContent = '';
    if (returnFocus) btn.focus({ preventScroll: true });
  }

  // ----- upgrade the pills that have something related -----
  var any = false;
  Array.prototype.forEach.call(section.querySelectorAll('.skill-pill'), function (pill) {
    var name = pill.textContent.trim();
    var p = related(data.projects, name).length, n = related(data.notes, name).length;
    if (!p && !n) return;
    any = true;
    var btn = el('button', pill.className + ' is-linked', name);
    btn.type = 'button';
    btn.setAttribute('data-skill', name);
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-controls', 'sk-panel');
    var badge = el('span', 'sk-badge', String(p + n));
    badge.setAttribute('aria-hidden', 'true');
    btn.appendChild(badge);
    btn.setAttribute('aria-label', name + ', ' + plural(p, 'project') + ', ' + plural(n, 'note'));
    btn.addEventListener('click', function () {
      if (active === btn) clear(false); else select(btn);
    });
    pill.replaceWith(btn);
  });

  var heading = section.querySelector('h2');
  if (any && heading) heading.insertAdjacentElement('afterend', el('p', 'sk-hint', 'Select a skill to see the projects and notes behind it.'));

  clearBtn.addEventListener('click', function () { clear(true); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && active && section.contains(document.activeElement)) clear(true);
  });
})();
