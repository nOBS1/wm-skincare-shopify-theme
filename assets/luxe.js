/* ==========================================================================
   LUXE INTERACTION LAYER — merged from the Verepoetry concept build
   Pairs with assets/luxe.css + snippets/luxe-overlays.liquid
   Everything degrades gracefully when markup is absent.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------- helpers ---------------- */
  var toastTimer;
  function toast(msg) {
    var t = $('#lxToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  function lockScroll(on) { document.body.classList.toggle('lx-lock', on); }

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function route(path) {
    var root = window.Shopify && window.Shopify.routes && window.Shopify.routes.root || '/';
    return root.replace(/\/?$/, '/') + path.replace(/^\//, '');
  }

  function money(cents, currency) {
    var cur = currency || document.body.getAttribute('data-currency') || 'USD';
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en', {
        style: 'currency',
        currency: cur
      }).format(cents / 100);
    } catch (e) {
      return '$' + (cents / 100).toFixed(2);
    }
  }

  var WISH_KEY = 'lx-wishlist';
  function getWish() {
    try { return JSON.parse(localStorage.getItem(WISH_KEY)) || {}; } catch (e) { return {}; }
  }
  function setWish(w) {
    try { localStorage.setItem(WISH_KEY, JSON.stringify(w)); } catch (e) {}
  }

  /* ---------------- reveal the page as soon as its DOM is ready ---------------- */
  function dismissPreloader() {
    var pre = $('#lxPreloader');
    document.body.classList.add('lx-loaded');
    if (pre) { pre.classList.add('done'); pre.hidden = true; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dismissPreloader);
  else dismissPreloader();

  /* ---------------- custom cursor ---------------- */
  if (window.matchMedia('(pointer:fine)').matches && document.body.classList.contains('lx-cursor-enabled')) {
    document.body.classList.add('lx-has-cursor');
    var dot = $('.lx-cursor-dot'), ring = $('.lx-cursor-ring');
    if (dot && ring) {
      var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
      addEventListener('mousemove', function (e) {
        mx = e.clientX; my = e.clientY;
        dot.style.left = mx + 'px'; dot.style.top = my + 'px';
      });
      (function loop() {
        rx += (mx - rx) * .16; ry += (my - ry) * .16;
        ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
        requestAnimationFrame(loop);
      })();
      document.addEventListener('mouseover', function (e) {
        if (e.target.closest('a, button, .product-card, input, select, [data-lx-hover]')) ring.classList.add('hovering');
      });
      document.addEventListener('mouseout', function (e) {
        if (e.target.closest('a, button, .product-card, input, select, [data-lx-hover]')) ring.classList.remove('hovering');
      });
    }
  }

  /* ---------------- close helpers ---------------- */
  var cartDrawer = $('#lxCart'), qvWrap = $('#lxQv'), searchOverlay = $('#lxSearch'), dim = $('#lxDim');
  var activeOverlay = null, returnFocus = null;

  function closeAll(restoreFocus) {
    if (restoreFocus !== false && returnFocus && returnFocus.isConnected) returnFocus.focus();
    [cartDrawer, qvWrap, searchOverlay].forEach(function (overlay) {
      if (!overlay) return;
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.inert = true;
    });
    activeOverlay = null;
    if (dim) dim.classList.remove('on');
    lockScroll(false);
  }

  function openOverlay(overlay, focusTarget) {
    if (!overlay) return;
    var trigger = activeOverlay ? returnFocus : document.activeElement;
    closeAll(false);
    returnFocus = trigger;
    activeOverlay = overlay;
    overlay.inert = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    if (overlay === cartDrawer && dim) dim.classList.add('on');
    lockScroll(true);
    requestAnimationFrame(function () {
      if (activeOverlay !== overlay) return;
      var target = focusTarget || $('button, input, select, a[href]', overlay) || overlay;
      target.focus();
    });
  }

  addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (activeOverlay) { e.preventDefault(); closeAll(); }
      closeMega();
    }
    if (e.key !== 'Tab' || !activeOverlay) return;
    var focusable = $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]', activeOverlay)
      .filter(function (el) { return !el.hidden && el.getClientRects().length; });
    if (!focusable.length) { e.preventDefault(); activeOverlay.focus(); return; }
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && (document.activeElement === first || !activeOverlay.contains(document.activeElement))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !activeOverlay.contains(document.activeElement))) {
      e.preventDefault(); first.focus();
    }
  });
  if (dim) dim.addEventListener('click', closeAll);

  /* ---------------- mega menu ---------------- */
  var mega = $('#lxMega');
  var navBtns = $$('.header-nav .nav-link[data-mega]');
  var megaPanels = mega ? $$('.lx-mega-panel', mega) : [];
  var megaTimer;

  function openPanel(key) {
    if (!mega) return;
    megaPanels.forEach(function (p) { p.classList.toggle('active', p.getAttribute('data-mega') === key); });
    mega.classList.add('open');
  }
  function closeMega() {
    if (mega) mega.classList.remove('open');
  }
  navBtns.forEach(function (b) {
    b.addEventListener('mouseenter', function () {
      clearTimeout(megaTimer);
      openPanel(b.getAttribute('data-mega'));
    });
    b.addEventListener('click', function () { openPanel(b.getAttribute('data-mega')); });
    b.addEventListener('mouseleave', function () {
      megaTimer = setTimeout(closeMega, 120);
    });
  });
  if (mega) {
    mega.addEventListener('mouseenter', function () { clearTimeout(megaTimer); });
    mega.addEventListener('mouseleave', closeMega);
  }
  var siteHeader = $('.site-header');
  if (siteHeader) siteHeader.addEventListener('mouseleave', closeMega);

  /* ---------------- cart drawer (real Cart API) ---------------- */
  var cartCount = $('.header-cart .cart-count');
  var shipThreshold = cartDrawer ? parseFloat(cartDrawer.getAttribute('data-threshold') || '0') : 0;
  var cartBusy = false;

  function requestJSON(path, options) {
    return fetch(route(path), options).then(function (response) {
      return response.json().catch(function () {
        throw new Error('The store is temporarily unavailable. Please try again.');
      }).then(function (data) {
        if (!response.ok) {
          var message = data.description || data.message;
          if (!message && data.errors) message = typeof data.errors === 'string' ? data.errors : Object.values(data.errors).join('. ');
          throw new Error(message || 'Your bag could not be updated. Please try again.');
        }
        return data;
      });
    });
  }

  function setCartBusy(busy) {
    cartBusy = busy;
    if (cartDrawer) cartDrawer.setAttribute('aria-busy', String(busy));
    $$('#lxCartItems button, [data-lx-add], #lxQvAdd').forEach(function (button) {
      if (busy) {
        button.setAttribute('data-lx-was-disabled', String(button.disabled));
        button.disabled = true;
      } else if (button.hasAttribute('data-lx-was-disabled')) {
        button.disabled = button.getAttribute('data-lx-was-disabled') === 'true';
        button.removeAttribute('data-lx-was-disabled');
      }
    });
  }

  function clearCartError() {
    var error = $('#lxCartError');
    if (error) { error.textContent = ''; error.hidden = true; }
  }

  function showCartError(error) {
    var message = error && error.message || 'Your bag could not be updated. Please try again.';
    var box = $('#lxCartError');
    if (box) { box.textContent = message; box.hidden = false; }
    toast(message);
  }

  function fetchCart() {
    return requestJSON('cart.js', { headers: { 'Accept': 'application/json' } });
  }

  function cartAdd(id, qty) {
    return requestJSON('cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [{ id: id, quantity: qty }] })
    }).then(fetchCart);
  }

  function cartChange(key, qty) {
    return requestJSON('cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    });
  }

  function renderCart(cart) {
    if (!cartDrawer || !cart || !Array.isArray(cart.items)) return;

    // badge
    var n = cart.item_count || 0;
    if (cartCount) {
      cartCount.textContent = n;
      cartCount.classList.toggle('on', n > 0);
      cartCount.classList.remove('bump');
      void cartCount.offsetWidth;
      if (n > 0) cartCount.classList.add('bump');
    }
    var headCount = $('#lxCartHeadCount');
    if (headCount) headCount.textContent = n;

    // items
    var box = $('#lxCartItems');
    if (box) {
      if (!cart.items || !cart.items.length) {
        box.innerHTML = '<div class="lx-cart-empty"><span>Your bag is empty</span>' +
          '<a class="btn btn-outline" href="' + escapeHTML(route('collections/all')) + '">Start Shopping</a></div>';
      } else {
        box.innerHTML = cart.items.map(function (it) {
          var img = it.image
            ? '<img src="' + escapeHTML(it.image) + '" alt="' + escapeHTML(it.product_title) + '" loading="lazy">'
            : '';
          return '<div class="lx-cart-item" data-key="' + escapeHTML(it.key) + '">' +
            '<a class="lx-ci-media" href="' + escapeHTML(it.url) + '">' + img + '</a>' +
            '<div class="lx-ci-info">' +
              '<h5>' + escapeHTML(it.product_title) + '</h5>' +
              '<p class="lx-ci-meta">' + escapeHTML(it.variant_title && it.variant_title !== 'Default Title' ? it.variant_title : 'Full Size') + '</p>' +
              '<button class="lx-ci-remove" data-remove type="button">Remove</button>' +
              '<div class="lx-ci-row">' +
                '<div class="lx-qty">' +
                  '<button data-dec type="button" aria-label="Decrease">−</button>' +
                  '<span>' + it.quantity + '</span>' +
                  '<button data-inc type="button" aria-label="Increase">+</button>' +
                '</div>' +
                '<span class="lx-ci-price">' + money(it.final_line_price, cart.currency) + '</span>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }

    // totals + shipping progress
    var totalEl = $('#lxCartTotal');
    if (totalEl) totalEl.textContent = money(cart.total_price, cart.currency);
    var bar = $('#lxShipBar'), msg = $('#lxShipMsg');
    var total = (cart.total_price || 0) / 100;
    if (bar && shipThreshold > 0) bar.style.width = Math.min(100, total / shipThreshold * 100) + '%';
    if (msg && shipThreshold > 0) {
      msg.textContent = total >= shipThreshold
        ? 'Free shipping unlocked — enjoy'
        : money(Math.max(0, shipThreshold - total) * 100, cart.currency) + ' away from free shipping';
    }
  }

  function openCart() {
    if (!cartDrawer) return;
    openOverlay(cartDrawer);
    fetchCart().then(renderCart).catch(showCartError);
  }

  // header triggers
  var cartBtn = $('[data-lx-cart]');
  if (cartBtn) cartBtn.addEventListener('click', function (e) { e.preventDefault(); openCart(); });
  var cartClose = $('#lxCartClose');
  if (cartClose) cartClose.addEventListener('click', closeAll);

  // drawer item events (delegate)
  var cartItemsBox = $('#lxCartItems');
  if (cartItemsBox) {
    cartItemsBox.addEventListener('click', function (e) {
      var inc = e.target.closest('[data-inc]');
      var dec = e.target.closest('[data-dec]');
      var rem = e.target.closest('[data-remove]');
      var row = e.target.closest('.lx-cart-item');
      if (!row || (!inc && !dec && !rem) || cartBusy) return;
      var key = row.getAttribute('data-key');
      var currentQty = parseInt(row.querySelector('.lx-qty span').textContent, 10) || 1;

      var nextQty = inc ? Math.min(99, currentQty + 1) : dec ? currentQty - 1 : 0;
      clearCartError();
      setCartBusy(true);
      cartChange(key, nextQty).then(function (cart) {
        renderCart(cart);
        if (rem) toast('REMOVED FROM BAG');
      }).catch(showCartError).finally(function () { setCartBusy(false); });
    });
  }

  // quick add buttons on product cards
  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-lx-add]');
    if (!add) return;
    e.preventDefault();
    if (add.disabled || cartBusy) return;
    var id = parseInt(add.getAttribute('data-lx-add'), 10);
    var qty = 1;
    var originalLabel = add.textContent;
    clearCartError();
    setCartBusy(true);
    add.textContent = 'Adding…';
    cartAdd(id, qty).then(function (cart) {
      renderCart(cart);
      toast('ADDED TO YOUR BAG');
    }).catch(showCartError).finally(function () {
      add.textContent = originalLabel;
      setCartBusy(false);
    });
  });

  /* ---------------- wishlist (localStorage) ---------------- */
  function syncWishButtons() {
    var w = getWish();
    $$('.lx-wish').forEach(function (b) {
      var id = b.getAttribute('data-wish');
      var on = !!w[id];
      b.classList.toggle('on', on);
      b.textContent = on ? '♥' : '♡';
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.lx-wish');
    if (!b) return;
    e.preventDefault();
    var w = getWish();
    var id = b.getAttribute('data-wish');
    var title = b.getAttribute('data-title') || 'Item';
    if (w[id]) { delete w[id]; toast('REMOVED FROM WISHLIST'); }
    else { w[id] = title; toast('SAVED TO WISHLIST'); }
    setWish(w);
    syncWishButtons();
  });
  var wishBtn = $('[data-lx-wish]');
  if (wishBtn) {
    wishBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var w = getWish();
      var names = Object.keys(w);
      if (!names.length) { toast('WISHLIST IS EMPTY — TAP ♡ ON A PRODUCT'); return; }
      toast('WISHLIST (' + names.length + ') — ' + names.map(function (k) { return w[k].toUpperCase(); }).join(' · '));
    });
  }
  document.addEventListener('DOMContentLoaded', syncWishButtons);
  syncWishButtons();

  /* ---------------- quick view ---------------- */
  var qvState = { product: null, variantId: null, qty: 1 };

  function qvSetQty(n) {
    qvState.qty = Math.max(1, Math.min(9, n));
    var el = $('#lxQvQty');
    if (el) el.textContent = qvState.qty;
  }

  function openQuickView(id) {
    var script = $('script[data-lx-product="' + id + '"]');
    if (!script || !qvWrap) return;
    var p;
    try { p = JSON.parse(script.textContent); } catch (e) { return; }
    qvState.product = p;
    qvState.variantId = p.default_variant;
    qvSetQty(1);

    var img = $('#lxQvImg');
    var thumbs = $('#lxQvThumbs');
    if (img) {
      if (p.images && p.images.length) {
        img.src = p.images[0];
        img.alt = p.title;
        img.style.display = '';
      } else {
        img.style.display = 'none';
      }
    }
    if (thumbs) {
      thumbs.innerHTML = (p.images && p.images.length > 1)
        ? p.images.map(function (src, i) {
            return '<button class="lx-qv-thumb' + (i === 0 ? ' on' : '') + '" data-idx="' + i + '" type="button" aria-label="View product image ' + (i + 1) + '" aria-pressed="' + (i === 0) + '">' +
              '<img src="' + escapeHTML(src) + '" alt=""></button>';
          }).join('')
        : '';
    }
    var cat = $('#lxQvCat');
    if (cat) cat.textContent = p.type || p.vendor || 'Collection';
    var name = $('#lxQvName');
    if (name) name.textContent = p.title;
    var price = $('#lxQvPrice');
    if (price) {
      price.innerHTML = escapeHTML(p.price) + (p.compare ? '<s>' + escapeHTML(p.compare) + '</s>' : '');
    }
    var link = $('#lxQvLink');
    if (link) { link.href = p.url; link.style.display = ''; }

    // variants
    var vBox = $('#lxQvVariants');
    if (vBox) {
      if (!p.only_default && p.variants && p.variants.length > 1) {
        vBox.innerHTML = '<p class="lx-qv-label">Select</p><div class="lx-qv-variants">' +
          p.variants.map(function (v) {
            var cls = 'lx-qv-variant' + (v.id === p.default_variant ? ' active' : '') + (v.available ? '' : ' unavailable');
            return '<button class="' + cls + '" data-variant="' + v.id + '" type="button" ' +
              (v.available ? '' : 'disabled') + '>' + escapeHTML(v.title) + '</button>';
          }).join('') + '</div>';
        vBox.style.display = '';
      } else {
        vBox.innerHTML = '';
        vBox.style.display = 'none';
      }
    }
    var addBtn = $('#lxQvAdd');
    if (addBtn) {
      addBtn.textContent = p.available ? 'Add to Bag' : 'Sold Out';
      addBtn.disabled = !p.available;
    }

    openOverlay(qvWrap);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lx-qv]');
    if (!b) return;
    e.preventDefault();
    openQuickView(b.getAttribute('data-lx-qv'));
  });
  var qvClose = $('#lxQvClose');
  if (qvClose) qvClose.addEventListener('click', closeAll);
  if (qvWrap) qvWrap.addEventListener('click', function (e) { if (e.target === qvWrap) closeAll(); });

  var thumbsBox = $('#lxQvThumbs');
  if (thumbsBox) {
    thumbsBox.addEventListener('click', function (e) {
      var t = e.target.closest('.lx-qv-thumb');
      if (!t || !qvState.product) return;
      var idx = parseInt(t.getAttribute('data-idx'), 10);
      var img = $('#lxQvImg');
      if (img && qvState.product.images[idx]) img.src = qvState.product.images[idx];
      $$('.lx-qv-thumb', thumbsBox).forEach(function (x) {
        x.classList.toggle('on', x === t);
        x.setAttribute('aria-pressed', String(x === t));
      });
    });
  }

  var variantsBox = $('#lxQvVariants');
  if (variantsBox) {
    variantsBox.addEventListener('click', function (e) {
      var b = e.target.closest('.lx-qv-variant');
      if (!b || b.disabled) return;
      qvState.variantId = parseInt(b.getAttribute('data-variant'), 10);
      $$('.lx-qv-variant', variantsBox).forEach(function (x) { x.classList.toggle('active', x === b); });
      var selected = qvState.product.variants.find(function (v) { return v.id === qvState.variantId; });
      var price = $('#lxQvPrice');
      if (selected && price) price.textContent = selected.price;
    });
  }

  var qvMinus = $('#lxQvMinus'), qvPlus = $('#lxQvPlus');
  if (qvMinus) qvMinus.addEventListener('click', function () { qvSetQty(qvState.qty - 1); });
  if (qvPlus) qvPlus.addEventListener('click', function () { qvSetQty(qvState.qty + 1); });

  var qvAdd = $('#lxQvAdd');
  if (qvAdd) {
    qvAdd.addEventListener('click', function () {
      var p = qvState.product;
      if (!p || !p.available || !qvState.variantId || cartBusy || qvAdd.disabled) return;
      clearCartError();
      setCartBusy(true);
      qvAdd.textContent = 'Adding…';
      cartAdd(qvState.variantId, qvState.qty).then(function (cart) {
        renderCart(cart);
        if (cartDrawer) openOverlay(cartDrawer);
        else closeAll();
        toast('ADDED TO YOUR BAG');
      }).catch(showCartError).finally(function () {
        qvAdd.textContent = 'Add to Bag';
        setCartBusy(false);
      });
    });
  }

  /* ---------------- search overlay (predictive) ---------------- */
  var searchBtn = $('[data-lx-search]');
  var searchInput = $('#lxSearchInput');
  var searchResults = $('#lxSearchResults');

  function openSearch() {
    if (!searchOverlay) return;
    openOverlay(searchOverlay, searchInput);
    renderSearch(searchInput ? searchInput.value.trim() : '');
  }
  if (searchBtn) searchBtn.addEventListener('click', function (e) { e.preventDefault(); openSearch(); });
  var searchClose = $('.lx-search-close');
  if (searchClose) searchClose.addEventListener('click', closeAll);

  var searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      var q = searchInput.value.trim();
      searchTimer = setTimeout(function () { renderSearch(q); }, 250);
    });
  }

  function renderSearch(q) {
    if (!searchResults) return;
    if (!q) {
      searchResults.innerHTML = '<p class="lx-search-empty">Type to search the collection</p>';
      return;
    }
    searchResults.innerHTML = '<p class="lx-search-empty">Searching…</p>';
    requestJSON('search/suggest.json?q=' + encodeURIComponent(q) +
      '&resources[type]=product&resources[limit]=8&resources[options][fields]=title,product_type,vendor')
      .then(function (data) {
        if (searchInput && searchInput.value.trim() !== q) return;
        var products = (data.resources && data.resources.results && data.resources.results.products) || [];
        if (!products.length) {
          searchResults.innerHTML = '<p class="lx-search-empty">No results for “' + escapeHTML(q) + '”</p>';
          return;
        }
        searchResults.innerHTML = '<div class="lx-sr-grid">' + products.map(function (p) {
          var img = p.featured_image && p.featured_image.url
            ? '<img src="' + escapeHTML(p.featured_image.url) + '" alt="' + escapeHTML(p.title) + '" loading="lazy">'
            : '';
          /* suggest.json returns price in cents (subunits); price_decimal is a "29.00" string */
          var cents = p.price_decimal
            ? Math.round(parseFloat(p.price_decimal) * 100)
            : p.price;
          return '<a class="lx-sr-item" href="' + escapeHTML(p.url) + '">' +
            '<div class="lx-sr-media">' + img + '</div>' +
            '<h5>' + escapeHTML(p.title) + '</h5>' +
            '<p>' + money(cents) + '</p>' +
          '</a>';
        }).join('') + '</div>';
      })
      .catch(function () {
        if (searchInput && searchInput.value.trim() !== q) return;
        searchResults.innerHTML = '<p class="lx-search-empty">Search is unavailable right now</p>';
      });
  }

  /* ---------------- parallax + reveal ---------------- */
  function parallax() {
    $$('[data-lx-parallax]').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      var off = (r.top + r.height / 2 - innerHeight / 2) * parseFloat(el.getAttribute('data-lx-parallax'));
      el.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0)';
    });
  }
  addEventListener('scroll', parallax, { passive: true });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    $$('.lx-reveal').forEach(function (el) { io.observe(el); });
  } else {
    $$('.lx-reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------- testimonials carousel ---------------- */
  $$('.lx-rv-carousel').forEach(function (car) {
    var track = $('.lx-rv-track', car);
    var slides = $$('.lx-rv-slide', car);
    var dotsBox = $('.lx-rv-dots', car);
    if (!track || !slides.length) return;

    if (dotsBox) {
      dotsBox.innerHTML = slides.map(function (_, i) {
        return '<button class="lx-rv-dot' + (i === 0 ? ' on' : '') + '" data-i="' + i + '" type="button" aria-label="Review ' + (i + 1) + '"></button>';
      }).join('');
    }

    var idx = 0, timer;
    function go(i) {
      idx = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + idx * 100 + '%)';
      $$('.lx-rv-dot', dotsBox).forEach(function (d) {
        d.classList.toggle('on', parseInt(d.getAttribute('data-i'), 10) === idx);
      });
    }
    function auto() {
      clearInterval(timer);
      if (car.getAttribute('data-autoplay') !== 'off') {
        timer = setInterval(function () { go(idx + 1); }, 5000);
      }
    }
    var prev = $('.lx-rv-prev', car), next = $('.lx-rv-next', car);
    if (prev) prev.addEventListener('click', function () { go(idx - 1); auto(); });
    if (next) next.addEventListener('click', function () { go(idx + 1); auto(); });
    if (dotsBox) {
      dotsBox.addEventListener('click', function (e) {
        var d = e.target.closest('.lx-rv-dot');
        if (d) { go(parseInt(d.getAttribute('data-i'), 10)); auto(); }
      });
    }
    car.addEventListener('mouseenter', function () { clearInterval(timer); });
    car.addEventListener('mouseleave', auto);
    auto();
  });
})();
