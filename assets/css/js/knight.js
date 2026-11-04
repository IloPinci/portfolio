(function () {
  var egg = document.querySelector('.knight-egg');
  if (!egg) return;

  var btn = document.getElementById('knight-btn');
  var pop = document.getElementById('knight-pop');
  var rating = document.getElementById('kp-rating');
  var sub = document.getElementById('kp-sub');
  var user = egg.dataset.user;
  var loaded = false;

  function load() {
    if (loaded) return;
    loaded = true;
    fetch('https://lichess.org/api/user/' + encodeURIComponent(user))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var p = d.perfs && d.perfs.puzzle;
        if (p && p.rating) {
          rating.textContent = p.rating;
          sub.textContent = p.games + ' puzzles solved · @' + user;
        } else {
          rating.textContent = '?';
          sub.textContent = 'No puzzle rating yet';
        }
      })
      .catch(function () {
        loaded = false; // allow retry on next open
        rating.textContent = '?';
        sub.textContent = 'Could not reach Lichess';
      });
  }

  function setOpen(open) {
    pop.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    egg.classList.toggle('open', open);
    if (open) load();
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(pop.hidden);
  });
  document.addEventListener('click', function (e) {
    if (!pop.hidden && !egg.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !pop.hidden) { setOpen(false); btn.focus(); }
  });
})();