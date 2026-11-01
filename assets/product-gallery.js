(function () {
  'use strict';

  function initGallery(gallery) {
    if (gallery.dataset.galleryReady) return;
    var track = gallery.querySelector('[data-gallery-track]');
    var slides = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-slide]'));
    var controls = gallery.querySelector('[data-gallery-controls]');
    if (!track || slides.length < 2 || !controls) return;
    gallery.dataset.galleryReady = 'true';
    var thumbs = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-thumb]'));
    var previous = gallery.querySelector('[data-gallery-prev]');
    var next = gallery.querySelector('[data-gallery-next]');
    var status = gallery.querySelector('[data-gallery-status]');
    var active = 0;
    var queued = false;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function sync() {
      var trackRect = track.getBoundingClientRect();
      var distance = Infinity;
      slides.forEach(function (slide, index) {
        var delta = Math.abs(slide.getBoundingClientRect().left - trackRect.left);
        if (delta < distance) { distance = delta; active = index; }
      });
      thumbs.forEach(function (thumb, index) {
        if (index === active) thumb.setAttribute('aria-current', 'true');
        else thumb.removeAttribute('aria-current');
      });
      previous.disabled = active === 0;
      next.disabled = active === slides.length - 1;
      status.textContent = (active + 1) + ' / ' + slides.length;
      queued = false;
    }

    function goTo(index) {
      index = Math.max(0, Math.min(slides.length - 1, index));
      var delta = slides[index].getBoundingClientRect().left - track.getBoundingClientRect().left;
      track.scrollBy({ left: delta, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function (event) {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        goTo(Number(thumb.dataset.galleryThumb));
      });
    });
    previous.addEventListener('click', function () { goTo(active - 1); });
    next.addEventListener('click', function () { goTo(active + 1); });
    track.addEventListener('keydown', function (event) {
      if (event.target !== track) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(active - 1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); goTo(active + 1); }
      else if (event.key === 'Home') { event.preventDefault(); goTo(0); }
      else if (event.key === 'End') { event.preventDefault(); goTo(slides.length - 1); }
    });
    track.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(sync);
    }, { passive: true });
    controls.hidden = false;
    sync();
  }

  function init(root) {
    root.querySelectorAll('[data-product-gallery]').forEach(initGallery);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); });
  else init(document);
  document.addEventListener('shopify:section:load', function (event) { init(event.target); });
})();
