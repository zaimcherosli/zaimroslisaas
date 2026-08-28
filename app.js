/* ==========================================================================
   ZAIM ROSLI PORTAL — APP JS LOGIC (ENGLISH)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  highlightActiveNavLink();
  initMobileDrawerNav();
});

// 1. Highlight Active Nav Link based on Current Page URL
function highlightActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link, .mobile-drawer-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// 2. Mobile Drawer Navigation Toggle & Submenu Accordions (PWA Native Style)
function initMobileDrawerNav() {
  const toggleBtns = document.querySelectorAll('.mobile-nav-toggle');
  const overlay = document.querySelector('.mobile-overlay');
  const closeBtns = document.querySelectorAll('.mobile-drawer-close');

  function closeDrawer() {
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  closeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
    });
  });

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeDrawer();
      }
    });
  }

  // Setup accordion toggle for mobile drawer dropdowns
  document.querySelectorAll('.mobile-accordion-header, .mobile-dropdown-toggle').forEach(header => {
    header.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parent = header.closest('.mobile-accordion-item, .mobile-item-dropdown');
      if (parent) {
        const wasActive = parent.classList.contains('active');
        // Close other accordions for sleek native feel
        document.querySelectorAll('.mobile-accordion-item, .mobile-item-dropdown').forEach(item => {
          if (item !== parent) item.classList.remove('active');
        });
        if (wasActive) {
          parent.classList.remove('active');
        } else {
          parent.classList.add('active');
        }
      }
    });
  });

  // Automatically close mobile drawer when any link is clicked & handle same-page hash changes
  document.querySelectorAll('.mobile-drawer a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href) return;

      closeDrawer();

      // If user is already on /calculator and clicks /calculator#dsr or /calculator#legal
      if (window.location.pathname.includes('calculator') && href.includes('#')) {
        const targetHash = href.split('#')[1];
        if (targetHash && typeof window.switchCalcTab === 'function') {
          e.preventDefault();
          window.switchCalcTab(targetHash);
          const targetSection = document.querySelector('.calc-tabs-wrapper') || document.getElementById('panel-' + targetHash);
          if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    });
  });
}

// 3. Property Card Generator HTML String
function createPropertyCardHTML(item) {
  const badgeClass = item.status === 'sale' ? 'badge-sale' : 'badge-rent';
  const badgeLabel = item.status === 'sale' ? 'FOR SALE' : 'FOR RENT';
  const cardImg = Array.isArray(item.images) && item.images.length > 0 
    ? item.images[0] 
    : (typeof item.image === 'string' ? item.image.split(',')[0].trim() : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80');

  const isCommercial = ['Kilang', 'Tanah Industri', 'Kedai / Pejabat', 'Ruang Komersial'].includes(item.type);
  const bedsSpec = (!isCommercial && item.beds > 0) ? `<span class="property-spec-item">🛏️ ${item.beds} Beds</span>` : '';
  const bathsSpec = (item.baths > 0) ? `<span class="property-spec-item">🚿 ${item.baths} Baths</span>` : '';
  const sizeSpec = item.size ? `<span class="property-spec-item">📐 ${item.size} sqft</span>` : '';

  return `
    <div class="property-card">
      <div class="property-thumb-wrap">
        <img src="${cardImg}" class="property-thumb" alt="${item.title}" referrerpolicy="no-referrer" onerror="this.src='https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'">
        <span class="property-badge ${badgeClass}">${badgeLabel}</span>
        <span class="property-region-badge">${item.region}</span>
      </div>
      <div class="property-content">
        <div class="property-price">${item.priceStr}</div>
        <h3 class="property-title">${item.title}</h3>
        <div class="property-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${item.location}
        </div>
        <div class="property-specs-row">
          ${bedsSpec}
          ${bathsSpec}
          ${sizeSpec}
        </div>
        <a href="/property-detail/${item.slug || item.id}" class="btn btn-outline btn-sm" style="margin-top: 16px; width: 100%;">View Details</a>
      </div>
    </div>
  `;
}

// 4. Formatting Utilities
function formatCurrency(val) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(val);
}

// 7. Interactive Number Count-Up Animation on Scroll (IntersectionObserver)
function initCountUpAnimations() {
  const statElements = document.querySelectorAll('.stat-number.count-up');
  if (!statElements.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        obs.unobserve(el);

        const target = parseFloat(el.getAttribute('data-target')) || 0;
        const prefix = el.getAttribute('data-prefix') || '';
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 1800;
        const startTime = performance.now();

        el.textContent = `${prefix}0${suffix}`;

        function updateCount(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentVal = Math.round(easeOut * target);

          el.textContent = `${prefix}${currentVal.toLocaleString()}${suffix}`;

          if (progress < 1) {
            requestAnimationFrame(updateCount);
          } else {
            el.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
          }
        }

        requestAnimationFrame(updateCount);
      }
    });
  }, { threshold: 0.25 });

  statElements.forEach(el => observer.observe(el));
}
