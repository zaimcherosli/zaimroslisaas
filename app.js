/* ==========================================================================
   ZAIM ROSLI PORTAL — APP JS LOGIC (ENGLISH)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  highlightActiveNavLink();
  initMobileDrawerNav();
  initAreaFocusMenu();
  initLivePropertiesSync();
  initCountUpAnimations();
});

// 1. Highlight Active Nav Link based on Current Page URL
function highlightActiveNavLink() {
  const path = window.location.pathname.toLowerCase();
  let currentFile = (path.split('/').pop() || 'index.html').replace(/\.html$/, '');
  if (!currentFile) currentFile = 'index';
  const navLinks = document.querySelectorAll('.nav-link, .mobile-drawer-link');
  
  navLinks.forEach(link => {
    const rawHref = link.getAttribute('href') || '';
    let href = rawHref.toLowerCase().replace(/^\//, '').replace(/\.html$/, '');
    if (!href) href = 'index';
    
    if (href === currentFile || (currentFile === 'index' && href === 'index')) {
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
function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|\/|-)\S/g, function(a) { return a.toUpperCase(); });
}

function createPropertyCardHTML(item) {
  window.__PROP_MAP = window.__PROP_MAP || {};
  if (item && (item.slug || item.id)) {
    window.__PROP_MAP[item.slug || item.id] = item;
  }
  if (!item) return '';
  const badgeClass = item.status === 'sale' ? 'badge-sale' : 'badge-rent';
  const badgeLabel = item.status === 'sale' ? 'FOR SALE' : 'FOR RENT';
  const cardImg = Array.isArray(item.images) && item.images.length > 0 
    ? item.images[0] 
    : (typeof item.image === 'string' ? item.image.split(',')[0].trim() : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80');

  const bedsVal = item.bedsPlus > 0 ? `${item.beds}+${item.bedsPlus}` : item.beds;
  const bathsVal = item.bathsPlus > 0 ? `${item.baths}+${item.bathsPlus}` : item.baths;
  const commTypes = ['Factory', 'Industrial Land', 'Commercial Land', 'Commercial Space', 'Office Space', 'Shop / Office', 'Land', 'Kilang', 'Tanah Industri', 'Kedai / Pejabat', 'Ruang Komersial', 'Tanah', 'Tanah Komersial'];
  const isCommercial = commTypes.includes(item.type) || (item.type && (item.type.toLowerCase().includes('tanah') || item.type.toLowerCase().includes('land') || item.type.toLowerCase().includes('shop') || item.type.toLowerCase().includes('office') || item.type.toLowerCase().includes('factory') || item.type.toLowerCase().includes('kilang')));
  const isPureLand = ['Land', 'Commercial Land', 'Industrial Land', 'Tanah', 'Tanah Komersial', 'Tanah Industri', 'Tanah Lot', 'Pertanian', 'Agricultural Land'].includes(item.type) || ((!item.type || item.type.toLowerCase().includes('tanah') || item.type.toLowerCase().includes('land')) && (!item.size || item.size === 0 || item.size === '0') && (!item.beds || item.beds === 0));

  const cleanLandText = (item.landSize || '').replace(/\s*\([^)]*\)/g, '').trim();
  const hasLand = cleanLandText && cleanLandText !== '-' && cleanLandText !== '0';
  const hasSize = (item.size && parseFloat(item.size) > 0) && !isPureLand;
  const hasBeds = !isPureLand && item.beds > 0;
  const hasBaths = !isPureLand && item.baths > 0;

  const formattedSize = hasSize ? ((typeof item.size === 'number') ? item.size.toLocaleString('en-US') : item.size) : null;

  let specsHTML = '';

  if (isPureLand || (hasLand && !hasBeds && !hasBaths && !hasSize)) {
    specsHTML = `
      <div class="property-specs-pills">
        <span class="spec-pill" style="font-weight: 800; color: #0f172a;">Land Area: ${cleanLandText || '-'}</span>
      </div>
    `;
  } else if (isCommercial && !hasLand && !hasBeds && !hasBaths && hasSize) {
    specsHTML = `
      <div class="property-specs-pills">
        <span class="spec-pill" style="font-weight: 800; color: #0f172a;">Built-up: ${formattedSize} sqft</span>
      </div>
    `;
  } else if (isCommercial) {
    const pills = [];
    if (hasBeds) pills.push(`<span class="spec-pill">${bedsVal} Rooms</span>`);
    if (hasBaths) pills.push(`<span class="spec-pill">${bathsVal} Baths</span>`);
    if (formattedSize) pills.push(`<span class="spec-pill">BU ${formattedSize} sqft</span>`);
    if (hasLand) pills.push(`<span class="spec-pill">LS ${cleanLandText}</span>`);
    specsHTML = `
      <div class="property-specs-pills">
        ${pills.join('<span class="spec-bullet">•</span>')}
      </div>
    `;
  } else {
    const pills = [];
    if (hasBeds) pills.push(`<span class="spec-pill">${bedsVal} Beds</span>`);
    if (hasBaths) pills.push(`<span class="spec-pill">${bathsVal} Baths</span>`);
    if (formattedSize) pills.push(`<span class="spec-pill">${formattedSize} sqft</span>`);
    if (hasLand) pills.push(`<span class="spec-pill">LS ${cleanLandText}</span>`);
    specsHTML = `
      <div class="property-specs-pills">
        ${pills.length > 0 ? pills.join('<span class="spec-bullet">•</span>') : `<span class="spec-pill">${item.type || 'Residential'}</span>`}
      </div>
    `;
  }

  const detailUrl = `/property/${item.slug || item.id}`;
  const cleanTitle = toTitleCase(item.title || 'Property Listing');
  const priceDisplay = (item.priceStr || 'RM 0').replace(/\/\s*bln\b/gi, '/ month').replace(/\/\s*bulan\b/gi, '/ month');

  return `
    <div class="property-card">
      <a href="${detailUrl}" class="property-thumb-wrap" aria-label="View details for ${cleanTitle}">
        <img src="${cardImg}" class="property-thumb" alt="${cleanTitle}" referrerpolicy="no-referrer" onerror="this.src='https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'">
        <span class="property-badge ${badgeClass}">${badgeLabel}</span>
        <span class="property-region-badge">${item.region || 'Selangor'}</span>
      </a>
      <div class="property-content">
        <div class="property-price">${priceDisplay}</div>
        <h3 class="property-title"><a href="${detailUrl}" style="color: inherit; text-decoration: none;">${cleanTitle}</a></h3>
        <div class="property-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${(item.location || '').replace(/^\+\s*/, '')}</span>
        </div>
        <div class="property-specs-container">
          ${specsHTML}
        </div>
        <div class="property-card-actions">
          <a href="${detailUrl}" class="btn-details">View Details →</a>
          <button onclick="shareProperty(event, '${item.slug || item.id}', '${cleanTitle.replace(/'/g, "\\'")}', '${item.image || ''}')" class="btn-share" title="Share Property" aria-label="Share Property">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}
window.createPropertyCardHTML = createPropertyCardHTML;
window.initMobileDrawerNav = initMobileDrawerNav;

// Global Malaysian REN Property Share Summary Generator
window.generatePropertyShareSummary = function(prop, targetUrl) {
  if (!prop) return '';

  const isSale = (prop.status || 'sale').toLowerCase() === 'sale';
  const statusHeader = isSale ? '*WTS / UNTUK DIJUAL (FOR SALE)*' : '*WTL / UNTUK DISEWA (FOR RENT)*';
  
  let priceDisplay = 'RM 0';
  if (prop.price != null && !isNaN(Number(prop.price)) && Number(prop.price) > 0) {
    priceDisplay = isSale ? 'RM ' + Number(prop.price).toLocaleString('en-US') : 'RM ' + Number(prop.price).toLocaleString('en-US') + ' / bulan';
  } else if (prop.priceStr) {
    priceDisplay = prop.priceStr;
  }
  
  const askingLine = isSale ? `*Harga Tawaran (Asking Price):* ${priceDisplay}` : `*Kadar Sewa (Rental Rate):* ${priceDisplay}`;
  const title = prop.title || 'Hartanah Pilihan';
  const loc = prop.location || prop.region || 'Selangor';
  const region = prop.region || 'Selangor';
  const type = prop.type || prop.category || 'Kediaman';
  
  const details = [];
  if (loc) {
    const cleanLoc = loc.replace(/^\+\s*/, '').trim();
    const locWithRegion = region && !cleanLoc.toLowerCase().includes(region.toLowerCase()) ? `${cleanLoc} (${region})` : cleanLoc;
    details.push(`- Lokasi: ${locWithRegion}`);
  }
  if (type) {
    const typeLabel = (prop.category && prop.category !== type && !type.includes(prop.category)) ? `${type} (${prop.category})` : type;
    details.push(`- Jenis: ${typeLabel}`);
  }
  if (prop.size && Number(prop.size) > 0) {
    details.push(`- Saiz Binaan (Built-up): ${Number(prop.size).toLocaleString('en-US')} sqft`);
  }
  if (prop.landSize && prop.landSize !== '-' && prop.landSize !== '0') {
    details.push(`- Saiz Tanah (Land Area): ${prop.landSize}`);
  }
  
  const roomParts = [];
  if (prop.beds > 0) roomParts.push(`${prop.beds}${prop.bedsPlus > 0 ? '+' + prop.bedsPlus : ''} Bilik Tidur`);
  if (prop.baths > 0) roomParts.push(`${prop.baths}${prop.bathsPlus > 0 ? '+' + prop.bathsPlus : ''} Bilik Air`);
  if (roomParts.length > 0) details.push(`- Bilik: ${roomParts.join(' & ')}`);

  if (prop.tenure && prop.tenure !== '-') {
    const lot = (prop.lotType && prop.lotType !== '-') ? ` (${prop.lotType === 'Rezab Melayu' ? 'Malay Reserve' : prop.lotType})` : '';
    details.push(`- Pegangan: ${prop.tenure}${lot}`);
  }

  const url = targetUrl || `https://zaimrosli.my/property/${prop.slug || prop.id}`;

  return `${statusHeader}
${askingLine}

*${title}*

*MAKLUMAT HARTANAH (PROPERTY DETAILS):*
${details.join('\n')}

*Maklumat lanjut, gambar penuh & temujanji:*
${url}`;
};

// Global Share Function with Canonical /property/{slug} URL & Rich Summary
window.shareProperty = async function(e, propOrSlug, maybeTitle, maybeImageUrl) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  let prop = null;
  let slugOrId = '';

  if (propOrSlug && typeof propOrSlug === 'object') {
    prop = propOrSlug;
    slugOrId = prop.slug || prop.id;
  } else if (typeof propOrSlug === 'string') {
    slugOrId = propOrSlug;
    if (window.__PROP_MAP && window.__PROP_MAP[slugOrId]) {
      prop = window.__PROP_MAP[slugOrId];
    }
    if (!prop && window.__CURRENT_DETAIL_PROP__) {
      prop = window.__CURRENT_DETAIL_PROP__;
    }
    if (!prop && typeof currentProperties !== 'undefined' && Array.isArray(currentProperties)) {
      prop = currentProperties.find(p => p.slug === slugOrId || p.id === slugOrId);
    }
    if (!prop && typeof PROPERTIES_DATA !== 'undefined' && Array.isArray(PROPERTIES_DATA)) {
      prop = PROPERTIES_DATA.find(p => p.slug === slugOrId || p.id === slugOrId);
    }
    if (!prop) {
      try {
        const stored = localStorage.getItem('ZAIM_ROSLI_PROPERTIES');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            prop = parsed.find(p => p.slug === slugOrId || p.id === slugOrId);
          }
        }
      } catch(err) {}
    }
  }

  if (!prop) {
    prop = { slug: slugOrId, title: maybeTitle, image: maybeImageUrl };
  }

  const url = window.location.origin + '/property/' + (prop.slug || prop.id || slugOrId);
  const shareText = window.generatePropertyShareSummary(prop, url);

  if (navigator.share) {
    navigator.share({
      title: prop.title || 'Property Listing',
      text: shareText
    }).catch((err) => {
      if (err && err.name !== 'AbortError') {
        copyTextToClipboard(shareText);
      }
    });
  } else {
    copyTextToClipboard(shareText);
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Maklumat & pautan listing lengkap telah disalin ke clipboard! Sedia untuk dipaste terus ke WhatsApp.');
      }).catch(() => {
        prompt('Salin maklumat listing ini:', text);
      });
    } else {
      prompt('Salin maklumat listing ini:', text);
    }
  }
};

// 4. Formatting Utilities
function formatCurrency(val) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(val);
}

// 5. Real Estate Financial & Legal Calculation Utilities
function calcSPALegalFee(price) {
  if (!price || price <= 0) return 0;
  if (price <= 500000) return Math.max(500, price * 0.0125);
  if (price <= 7000000) return 500000 * 0.0125 + (price - 500000) * 0.01;
  return 500000 * 0.0125 + 6500000 * 0.01 + (price - 7000000) * 0.0075;
}

function calcMOTStampDuty(price) {
  if (!price || price <= 0) return 0;
  if (price <= 100000) return price * 0.01;
  if (price <= 500000) return 1000 + (price - 100000) * 0.02;
  if (price <= 1000000) return 1000 + 8000 + (price - 500000) * 0.03;
  return 1000 + 8000 + 15000 + (price - 1000000) * 0.04;
}

function calcLoanLegalFee(loanAmount) {
  return calcSPALegalFee(loanAmount);
}

function calcLoanStampDuty(loanAmount) {
  return loanAmount * 0.005;
}

function calcValuationFee(price) {
  if (!price || price <= 0) return 0;
  if (price <= 100000) return Math.max(300, price * 0.0025);
  if (price <= 2000000) return 100000 * 0.0025 + (price - 100000) * 0.002;
  return 100000 * 0.0025 + 1900000 * 0.002 + (price - 2000000) * 0.001;
}

window.calcSPALegalFee = calcSPALegalFee;
window.calcMOTStampDuty = calcMOTStampDuty;
window.calcLoanLegalFee = calcLoanLegalFee;
window.calcLoanStampDuty = calcLoanStampDuty;
window.calcValuationFee = calcValuationFee;


// Live Cloudflare KV Synchronizer for All Public Pages (Real-Time Mobile & Desktop Sync)
(function initLivePropertiesSync() {
  function syncFromStorage() {
  try {
    const local = localStorage.getItem('ZAIM_ROSLI_PROPERTIES');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        window.PROPERTIES_DATA = parsed;
      }
    }
  } catch (e) {}

  const endpoints = [
    '/api/properties?t=' + Date.now(),
    'https://zaimrosli-worker.huzaimrosli.workers.dev/api/properties?t=' + Date.now()
  ];

  async function fetchLiveKV() {
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            window.PROPERTIES_DATA = data;
            localStorage.setItem('ZAIM_ROSLI_PROPERTIES', JSON.stringify(data));
            window.dispatchEvent(new CustomEvent('properties-updated'));
            return;
          }
        }
      } catch(e) {}
    }
  }

  fetchLiveKV().catch(err => console.log('Live KV sync skipped:', err));
}

  // 1. Initial fast local load + network fetch
  syncFromStorage();
  fetchLiveKV();

  // 2. Real-time auto-sync when user returns to app/tab on mobile or desktop
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchLiveKV();
    }
  });
  window.addEventListener('focus', fetchLiveKV);
})();

// 4. Dynamic Area Focus Navigation Menu from /api/locations & LOCATIONS_CONFIG
async function initAreaFocusMenu() {
  const desktopContainers = document.querySelectorAll('.area-focus-desktop');
  const mobileContainers = document.querySelectorAll('.area-focus-mobile');

  if (desktopContainers.length === 0 && mobileContainers.length === 0) {
    return;
  }

  const RESERVED_LOCATION_SLUGS = new Set([
    'properties', 'for-sale', 'for-rent', 'residential', 'commercial',
    'commercial-industrial', 'admin', 'login', 'api', 'services', 'about',
    'contact', 'faq', 'calculator', 'foreign-buyers', 'testimonials',
    'blog', 'privacy', 'terms', 'areas'
  ]);

  function renderMenu(locations) {
    if (!Array.isArray(locations) || locations.length === 0) return;

    const seenSlugs = new Set();
    const activeLocations = [];

    for (const loc of locations) {
      if (!loc || typeof loc !== 'object') continue;
      if (loc.id === '__SYS_LOCATIONS_DATA__') continue;
      if (loc.active === false) continue; // Default to active unless explicitly disabled
      if (!loc.name || typeof loc.name !== 'string') continue;

      const slug = (loc.slug || '').toLowerCase().trim();
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) continue;
      if (RESERVED_LOCATION_SLUGS.has(slug)) continue;
      if (seenSlugs.has(slug)) continue;

      seenSlugs.add(slug);
      activeLocations.push({
        name: loc.name.trim(),
        slug: slug
      });
    }

    if (activeLocations.length === 0) return;

    // Sort ascending by name
    activeLocations.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    // Render Desktop Navigation
    desktopContainers.forEach(container => {
      container.innerHTML = '';

      const divider = document.createElement('div');
      divider.style.cssText = 'margin: 6px 8px; border-top: 1px solid rgba(255,255,255,0.15);';
      container.appendChild(divider);

      const header = document.createElement('div');
      header.className = 'dropdown-section-header';
      header.style.cssText = 'font-size: 0.72rem; font-weight: 800; color: #fbbf24; padding: 6px 14px 4px; text-transform: uppercase; letter-spacing: 0.8px;';
      header.textContent = 'LOKASI FOKUS';
      container.appendChild(header);

      activeLocations.forEach(loc => {
        const a = document.createElement('a');
        a.href = `/properties/${loc.slug}`;
        a.className = 'dropdown-item';
        a.textContent = `${loc.name} Properties`;
        container.appendChild(a);
      });
    });

    // Render Mobile Drawer Navigation (Stacked Clean Vertically)
    mobileContainers.forEach(container => {
      container.innerHTML = '';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.width = '100%';

      activeLocations.forEach(loc => {
        const a = document.createElement('a');
        a.href = `/properties/${loc.slug}`;
        a.className = 'mobile-sublink';
        a.textContent = `${loc.name} Properties`;
        container.appendChild(a);
      });
    });
  }

  // 1. Synchronous initial render from window.LOCATIONS_CONFIG or localStorage
  try {
    let initialList = [];
    if (window.LOCATIONS_CONFIG && typeof window.LOCATIONS_CONFIG === 'object') {
      initialList = Object.values(window.LOCATIONS_CONFIG);
    }
    const stored = localStorage.getItem('ZAIM_ROSLI_LOCATIONS');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) initialList = parsed;
        else if (parsed && typeof parsed === 'object') initialList = Object.values(parsed);
      } catch (e) {}
    }
    if (initialList.length > 0) {
      renderMenu(initialList);
    }
  } catch (e) {}

  // 2. Background live sync from Cloudflare Worker KV
  try {
    const res = await fetch('https://zaimrosli-worker.huzaimrosli.workers.dev/api/locations?t=' + Date.now(), {
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      let locations = [];
      if (Array.isArray(data)) {
        locations = data;
      } else if (data && typeof data === 'object' && !data.message) {
        locations = Object.values(data);
      }
      if (locations.length > 0) {
        localStorage.setItem('ZAIM_ROSLI_LOCATIONS', JSON.stringify(locations));
        renderMenu(locations);
      }
    }
  } catch (err) {
    // Graceful fallback — core navigation remains intact
  }
}


// 6. Background live properties sync from Cloudflare Worker KV
async function initLivePropertiesSync() {
  try {
    const res = await fetch('https://zaimrosli-worker.huzaimrosli.workers.dev/api/properties?t=' + Date.now(), {
      signal: AbortSignal.timeout(4500)
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        window.PROPERTIES_DATA = data;
        localStorage.setItem('ZAIM_ROSLI_PROPERTIES', JSON.stringify(data));
        window.dispatchEvent(new Event('properties-updated'));
      }
    }
  } catch (err) {
    // Graceful fallback to properties-data.js
  }
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
        const duration = 1800; // 1.8 seconds smooth animation
        const startTime = performance.now();

        // Initial zero state
        el.textContent = `${prefix}0${suffix}`;

        function updateCount(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic: 1 - (1 - t)^3
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
