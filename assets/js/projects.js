// Project windows: play the preview video on hover / keyboard focus.
// - Video files are only requested on first interaction (no page-load cost).
// - Touch devices have no hover, so the video plays while the card is mostly on screen.
// - Visitors who prefer reduced motion never get autoplayed video.
// - If a video fails to load, the static placeholder simply stays visible.
(function () {
  var cards = document.querySelectorAll('.pwin');
  if (!cards.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var noHover = window.matchMedia('(hover: none)').matches;

  cards.forEach(function (card) {
    var video = card.querySelector('video');
    if (!video) return;

    function play() {
      if (reduceMotion) return;
      if (!video.getAttribute('src')) video.src = video.getAttribute('data-src');
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

    if (noHover && 'IntersectionObserver' in window) {
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
