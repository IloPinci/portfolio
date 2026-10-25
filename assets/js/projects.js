// Project windows: play the preview video on hover / keyboard focus.
// - Each clip starts downloading shortly before its card scrolls into view, so it is
//   already buffered when someone hovers (otherwise a quick hover ends before it loads).
// - Touch devices have no hover, so the clip plays while the card is mostly on screen.
// - Visitors who prefer reduced motion get no autoplay while scrolling. A hover or
//   keyboard focus is a deliberate action, so the preview still plays then.
// - If a clip fails to load, the static placeholder simply stays visible.
(function () {
  var cards = document.querySelectorAll('.pwin');
  if (!cards.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var noHover = window.matchMedia('(hover: none)').matches;
  var hasIO = 'IntersectionObserver' in window;

  cards.forEach(function (card) {
    var video = card.querySelector('video');
    if (!video) return;

    function warm() {
      if (!video.getAttribute('src')) {
        video.preload = 'auto';
        video.src = video.getAttribute('data-src');
      }
    }

    function play() {
      warm();
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }

    function stop() {
      video.pause();
      card.classList.remove('is-playing');
      try { video.currentTime = 0; } catch (e) {}
    }

    video.addEventListener('playing', function () { card.classList.add('is-playing'); });
    video.addEventListener('error', function () { card.classList.remove('is-playing'); });

    if (hasIO) {
      var warmer = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { warm(); obs.unobserve(card); }
        });
      }, { rootMargin: '300px' });
      warmer.observe(card);
    }

    if (noHover && hasIO) {
      if (reduceMotion) return;
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? play() : stop(); });
      }, { threshold: 0.6 }).observe(card);
    } else {
      card.addEventListener('mouseenter', play);
      card.addEventListener('mouseleave', stop);
      card.addEventListener('focusin', play);
      card.addEventListener('focusout', function (e) {
        if (!card.contains(e.relatedTarget)) stop();
      });
    }
  });
})();