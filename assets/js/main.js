// mobile nav toggle
(function(){
  var btn = document.getElementById('nav-toggle');
  var nav = document.getElementById('site-nav');
  if (!btn || !nav) return;

  function closeNav(){
    nav.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', function(){
    var open = nav.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  nav.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeNav();
  });

  window.addEventListener('resize', function(){
    if (window.innerWidth > 768) closeNav();
  });
})();

// theme toggle
(function(){
  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', function(){
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch(e) {}
  });
})();

// year in footer
var yearEl = document.getElementById('year');
if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

// scroll reveal
var revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(function(el){ io.observe(el); });
}


// copy button on every code block
(function(){
  var blocks = document.querySelectorAll('div.highlighter-rouge');
  if (!blocks.length) return;

  function copyText(text){
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // fallback for older browsers / http
    return new Promise(function(resolve, reject){
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); }
      catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  blocks.forEach(function(block){
    var code = block.querySelector('pre code') || block.querySelector('pre');
    if (!code) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.addEventListener('click', function(){
      copyText(code.innerText.replace(/\n$/, '')).then(function(){
        btn.textContent = 'copied';
        btn.classList.add('is-done');
        setTimeout(function(){ btn.textContent = 'copy'; btn.classList.remove('is-done'); }, 1500);
      }, function(){
        btn.textContent = 'press Ctrl+C';
      });
    });
    block.appendChild(btn);
  });
})();