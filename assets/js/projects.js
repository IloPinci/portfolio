// Project windows: preview videos play on their own while the card is on screen.
// - Each clip starts downloading shortly before its card scrolls into view.
// - Clips pause when scrolled off screen (saves battery / CPU) and resume when they return.
// - Visitors who prefer reduced motion get no autoplay; for them the clip plays on hover / keyboard focus instead.
// - If a clip fails to load, the static placeholder simply stays visible.
(function () {
  var cards = document.querySelectorAll('.pwin');
  if (!cards.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    video.addEventListener('playing', function () { card.classList.add('is-playing'); });
    video.addEventListener('error', function () { card.classList.remove('is-playing'); });

    if (hasIO) {
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) { if (e.isIntersecting) { warm(); obs.unobserve(card); } });
      }, { rootMargin: '300px' }).observe(card);
    }

    if (hasIO && !reduceMotion) {
      // Always-on preview while the card is visible.
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? play() : video.pause(); });
      }, { threshold: 0.25 }).observe(card);
    } else {
      // Reduced motion (or very old browser): only on a deliberate hover / focus.
      card.addEventListener('mouseenter', play);
      card.addEventListener('focusin', play);
      card.addEventListener('mouseleave', function () { video.pause(); card.classList.remove('is-playing'); });
      card.addEventListener('focusout', function (e) {
        if (!card.contains(e.relatedTarget)) { video.pause(); card.classList.remove('is-playing'); }
      });
    }
  });
})();