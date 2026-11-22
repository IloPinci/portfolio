// Cursor-reactive background grid.
// The accent-coloured grid layer (.grid-bg::after) is revealed through a soft circle that follows the pointer.
(function () {
  var grid = document.querySelector('.grid-bg');
  if (!grid) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tx = 0, ty = 0;      // target (pointer)
  var x = 0, y = 0;        // what is drawn
  var seen = false;
  var raf = 0;

  function paint() {
    grid.style.setProperty('--mx', x + 'px');
    grid.style.setProperty('--my', y + 'px');
  }

  function tick() {
    raf = 0;
    var dx = tx - x, dy = ty - y;
    if (reduce || (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5)) {
      x = tx; y = ty; paint();
      return;
    }
    x += dx * 0.18;
    y += dy * 0.18;
    paint();
    raf = requestAnimationFrame(tick);
  }

  function onMove(e) {
    var p = e.touches ? e.touches[0] : e;
    tx = p.clientX; ty = p.clientY;
    if (!seen) { x = tx; y = ty; seen = true; }   // first move: appear under the cursor, no sweep from the corner
    grid.style.setProperty('--go', '1');
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function onLeave() { grid.style.setProperty('--go', '0'); }

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('touchstart', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchend', onLeave, { passive: true });
  document.documentElement.addEventListener('mouseleave', onLeave);
})();