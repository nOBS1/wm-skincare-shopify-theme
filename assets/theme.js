// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.header-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', nav.classList.contains('is-open'));
    });
  }

  // Scroll-triggered fade-in animations — exclude hero (LCP element) to avoid LCP delay
  const animateEls = document.querySelectorAll('.section:not(.hero), .brand-story-grid, .testimonial-card, .product-card');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
    animateEls.forEach(el => {
      el.classList.add('animate-on-scroll');
      observer.observe(el);
    });
  }

  // Smooth header background on scroll
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('is-scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  // Product variant selection: sync selects -> hidden id input, price, button state
  const productForm = document.querySelector('.product-form');
  const variantJson = document.querySelector('[data-variant-json]');
  if (productForm && variantJson) {
    let variants = [];
    try { variants = JSON.parse(variantJson.textContent); } catch (e) { /* leave empty */ }
    const selects = Array.from(productForm.querySelectorAll('.variant-select'));
    const idInput = productForm.querySelector('input[name="id"]');
    const addBtn = productForm.querySelector('.btn-add');
    const priceEl = document.querySelector('.price-current');
    const compareEl = document.querySelector('.price-compare');
    const statusEl = document.querySelector('.price-status');

    const syncVariant = (updateUrl) => {
      const selected = selects.map(s => s.value);
      const match = variants.find(v => v.options.every((opt, i) => opt === selected[i]));
      if (!match) {
        if (addBtn) { addBtn.disabled = true; addBtn.textContent = 'Unavailable'; }
        if (statusEl) statusEl.hidden = false;
        return;
      }
      if (idInput) idInput.value = match.id;
      if (addBtn) {
        addBtn.disabled = !match.available;
        addBtn.textContent = match.available ? 'Add to Cart' : 'Sold Out';
      }
      if (priceEl) priceEl.textContent = match.price;
      if (compareEl) {
        compareEl.hidden = !match.compare_at_price;
        if (match.compare_at_price) compareEl.textContent = match.compare_at_price;
      }
      if (statusEl) statusEl.hidden = match.available;
      if (updateUrl) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', match.id);
        history.replaceState({}, '', url);
      }
    };

    if (selects.length && variants.length) {
      selects.forEach(s => s.addEventListener('change', () => syncVariant(true)));
      syncVariant(false); // sync state on load without touching the URL
    }
  }

  // Article TOC: build from h2/h3 in the body, assign stable anchor ids (GEO: deep-linkable sections)
  const tocBox = document.querySelector('[data-article-toc]');
  const articleBody = document.querySelector('.article-body');
  if (tocBox && articleBody) {
    const tocList = tocBox.querySelector('[data-toc-list]');
    const headings = articleBody.querySelectorAll('h2, h3');
    if (tocList && headings.length >= 2) {
      const used = new Set();
      headings.forEach(h => {
        if (!h.id) {
          const base = h.textContent.trim().toLowerCase()
            .replace(/[^\w一-鿿]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'section';
          let id = base, n = 2;
          while (used.has(id) || document.getElementById(id)) id = base + '-' + n++;
          h.id = id;
        }
        used.add(h.id);
        const li = document.createElement('li');
        if (h.tagName === 'H3') li.classList.add('toc-h3');
        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        li.appendChild(a);
        tocList.appendChild(li);
      });
      tocBox.hidden = false;
    }
  }
});
