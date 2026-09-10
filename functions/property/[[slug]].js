export async function onRequest(context) {
  const url = new URL(context.request.url);

  let targetSlug = '';
  let agentCode = null;

  if (Array.isArray(context.params.slug)) {
    targetSlug = (context.params.slug[0] || '').toLowerCase().trim();
    if (context.params.slug.length > 1) {
      agentCode = (context.params.slug[1] || '').toLowerCase().trim();
    }
  } else if (typeof context.params.slug === 'string') {
    targetSlug = context.params.slug.toLowerCase().trim();
  }

  // Also check query param fallback
  if (!agentCode && url.searchParams.get('ref')) {
    agentCode = url.searchParams.get('ref').toLowerCase().trim();
  }
  
  if (!targetSlug) {
    return Response.redirect(`${url.origin}/properties`, 301);
  }

  // 1. Fetch live property inventory (Cloudflare Worker KV with local fallback)
  let properties = [];
  try {
    const apiRes = await fetch('https://zaimrosli-worker.huzaimrosli.workers.dev/api/properties?t=' + Date.now(), {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (apiRes.ok) {
      properties = await apiRes.json();
    }
  } catch (err) {}

  // Fallback: If Worker KV is empty or unreachable, parse properties-data.js from Pages ASSETS
  if (!Array.isArray(properties) || properties.length === 0) {
    try {
      const dataAssetUrl = new URL('/properties-data.js', url.origin);
      const dataRes = await context.env.ASSETS.fetch(dataAssetUrl);
      if (dataRes.ok) {
        const text = await dataRes.text();
        const jsonMatch = text.match(/window\.PROPERTIES_DATA\s*=\s*(\[[\s\S]*?\]);/);
        if (jsonMatch && jsonMatch[1]) {
          properties = JSON.parse(jsonMatch[1]);
        }
      }
    } catch (fallbackErr) {}
  }

  // 2. Find target property by slug, id, or normalized title slug
  const prop = properties.find(p => {
    if (!p) return false;
    const pSlug = (p.slug || '').toLowerCase().trim();
    const pId = (p.id || '').toLowerCase().trim();
    if (pSlug === targetSlug || pId === targetSlug) return true;
    if (p.title) {
      const genSlug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (genSlug === targetSlug) return true;
    }
    return false;
  });

  // 3. If property does not exist, return genuine HTTP 404 with noindex
  if (!prop) {
    return new Response(`<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Hartanah Tidak Dijumpai | Zaim Rosli (REN39575)</title>
  <meta name="robots" content="noindex, follow">
  <link rel="stylesheet" href="/styles.css?v=21">
</head>
<body style="background:#0f172a; color:#ffffff; font-family:sans-serif; text-align:center; padding:80px 20px;">
  <div style="max-width:600px; margin:0 auto; background:#1e293b; padding:40px 30px; border-radius:16px; border:1px solid #334155;">
    <div style="font-size:3.5rem; font-weight:800; color:#f59e0b; margin-bottom:12px;">404</div>
    <h1 style="font-size:1.6rem; font-weight:700; margin-bottom:16px; color:#ffffff;">Hartanah Tidak Dijumpai</h1>
    <p style="color:#94a3b8; font-size:1rem; line-height:1.6; margin-bottom:28px;">
      Maaf, listing hartanah ini mungkin telah dipadam, tidak lagi aktif atau telah berjaya dijual/disewa.
    </p>
    <a href="/properties" style="display:inline-flex; align-items:center; gap:8px; background:#f59e0b; color:#0f172a; font-weight:800; padding:14px 28px; border-radius:10px; text-decoration:none;">
      <span>Lihat Senarai Hartanah Semasa</span>
      <span>→</span>
    </a>
  </div>
</body>
</html>`, {
      status: 404,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300'
      }
    });
  }

  // 4. Fetch base property-detail.html template
  const assetUrl = new URL('/property-detail.html', url.origin);
  const response = await context.env.ASSETS.fetch(assetUrl);
  if (!response.ok) return response;

  try {
    const rawTitle = prop.title || 'Property Listing';
    const isSale = (prop.status || 'sale').toLowerCase() === 'sale';
    let priceDisplay = prop.priceStr;
    if (!priceDisplay && prop.price != null && !isNaN(Number(prop.price)) && Number(prop.price) > 0) {
      priceDisplay = isSale ? `RM ${Number(prop.price).toLocaleString('en-US')}` : `RM ${Number(prop.price).toLocaleString('en-US')} / month`;
    }
    priceDisplay = (priceDisplay || (prop.price ? `RM ${Number(prop.price).toLocaleString('en-US')}` : 'RM 0'))
      .replace(/\/\s*(mo|month|bln|bulan|mth)\b/gi, '/ month');
    if (!isSale && !/\/\s*month\b/i.test(priceDisplay) && priceDisplay !== 'RM 0' && priceDisplay !== '-') {
      priceDisplay += ' / month';
    }
    const priceStr = priceDisplay.replace(/"/g, '&quot;');
    const loc = (prop.location || prop.region || 'Selangor').replace(/^\+\s*/, '').replace(/"/g, '&quot;');
    const region = (prop.region || 'Selangor').replace(/"/g, '&quot;');
    const type = (prop.type || prop.category || 'Property').replace(/"/g, '&quot;');
    const statusTag = isSale ? '[UNTUK DIJUAL]' : '[UNTUK DISEWA]';

    // Clean title for SEO & Social Previews
    let cleanTitle = rawTitle.replace(/^(WTS|WTL|FOR SALE|FOR RENT|UNTUK DIJUAL|UNTUK DISEWA|TO LET)[\s\/:–-]*/gi, '').trim();
    cleanTitle = cleanTitle.replace(/^(WTS|WTL|FOR SALE|FOR RENT|UNTUK DIJUAL|UNTUK DISEWA|TO LET)[\s\/:–-]*/gi, '').trim();
    cleanTitle = cleanTitle.replace(/\s*[([]?\s*(for\s+rent|for\s+sale|untuk\s+disewa|untuk\s+dijual|to\s+let)\s*[)\]]?\s*$/gi, '').trim();
    cleanTitle = cleanTitle.replace(/\s+for\s+(rent|sale)\s+@/gi, ' @');
    cleanTitle = cleanTitle.replace(/\s+untuk\s+(disewa|dijual)\s+@/gi, ' @');
    cleanTitle = cleanTitle.replace(/^[-–—|:\s]+/, '').trim();
    cleanTitle = cleanTitle.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    if (!cleanTitle) cleanTitle = rawTitle;

    const actionPrefix = isSale ? 'Untuk Dijual' : 'Sewa';
    const suffixHook = isSale ? 'Direct Agent REN39575' : 'Gambar & Info Penuh';

    let pageTitle = '';
    const lowerClean = cleanTitle.toLowerCase();
    if (lowerClean.startsWith('sewa') || lowerClean.startsWith('untuk dijual') || lowerClean.startsWith('for rent') || lowerClean.startsWith('for sale') || lowerClean.includes('for rent') || lowerClean.includes('for sale')) {
      pageTitle = `${cleanTitle} | ${priceStr} • ${suffixHook}`;
    } else {
      pageTitle = `${actionPrefix}: ${cleanTitle} | ${priceStr} • ${suffixHook}`;
    }

    const socialTitle = `${statusTag} ${priceStr} — ${cleanTitle}`.replace(/"/g, '&quot;');

    const specsList = [];
    if (loc) specsList.push(`Lokasi: ${loc}`);
    if (type) specsList.push(`Jenis: ${type}`);
    if (prop.size && Number(prop.size) > 0) specsList.push(`Binaan: ${Number(prop.size).toLocaleString('en-US')} sqft`);
    if (prop.landSize && prop.landSize !== '-' && prop.landSize !== '0') specsList.push(`Tanah: ${prop.landSize}`);
    const roomParts = [];
    if (prop.beds > 0) roomParts.push(`${prop.beds}${prop.bedsPlus > 0 ? '+' + prop.bedsPlus : ''} Bilik`);
    if (prop.baths > 0) roomParts.push(`${prop.baths}${prop.bathsPlus > 0 ? '+' + prop.bathsPlus : ''} Bilik Air`);
    if (roomParts.length > 0) specsList.push(`Bilik: ${roomParts.join(' & ')}`);
    if (prop.tenure && prop.tenure !== '-') specsList.push(`Pegangan: ${prop.tenure}`);

    const actionLabel = isSale ? 'Hartanah Untuk Dijual (For Sale)' : 'Hartanah Untuk Disewa (For Rent)';
    const specSummary = specsList.length > 0 ? specsList.slice(0, 4).join(' • ') : `${loc}, ${region}`;
    const ctaText = isSale 
      ? 'Lihat gambar penuh, pelan lantai & semak kelayakan loan percuma. Hubungi Ejen Berdaftar Zaim Rosli (REN39575) untuk viewing segera.'
      : 'Lihat gambar dalaman penuh, kadar sewa & deposit. Hubungi Ejen Berdaftar Zaim Rosli (REN39575) untuk temujanji viewing segera.';

    const desc = `[${actionLabel}] ${priceStr} — ${cleanTitle}. ${specSummary}. ${ctaText}`.replace(/"/g, '&quot;');
    
    let rawImg = '';
    if (Array.isArray(prop.images) && prop.images.length > 0 && prop.images[0]) {
      rawImg = prop.images[0];
    } else if (prop.image) {
      rawImg = prop.image.split(',')[0].trim();
    }
    if (!rawImg) {
      rawImg = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';
    }
    if (rawImg.startsWith('http:')) rawImg = rawImg.replace('http:', 'https:');
    const img = rawImg.replace(/"/g, '&quot;');

    // STRICT CANONICAL CONSOLIDATION FOR MAXIMUM SEO POWER:
    // Even if accessed via /property/slug/azman, canonical points to main listing URL!
    const canonicalSlug = prop.slug || targetSlug;
    const canonicalUrl = `https://zaimrosli.my/property/${canonicalSlug}`;

    // Schema.org RealEstateListing JSON-LD
    let validDatePosted = null;
    const rawDate = prop.datePosted || prop.createdAt || prop.created_at;
    if (rawDate) {
      const parsedDate = new Date(rawDate);
      if (!isNaN(parsedDate.getTime())) {
        validDatePosted = parsedDate.toISOString().split('T')[0];
      }
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      "name": pageTitle,
      "description": desc,
      "url": canonicalUrl,
      "image": img,
      ...(validDatePosted ? { "datePosted": validDatePosted } : {}),
      "offers": {
        "@type": "Offer",
        "price": (prop.price && !isNaN(Number(prop.price))) ? Number(prop.price) : 0,
        "priceCurrency": "MYR",
        "availability": "https://schema.org/InStock",
        "businessFunction": isSale ? "https://schema.org/Sell" : "https://schema.org/LeaseOut",
        "validFrom": validDatePosted || undefined
      },
      "address": {
        "@type": "PostalAddress",
        "addressLocality": prop.location || "Selangor",
        "addressRegion": prop.region || "Selangor",
        "addressCountry": "MY"
      },
      "broker": {
        "@type": "RealEstateAgent",
        "name": "Zaim Rosli",
        "identifier": "REN39575",
        "telephone": "+60108118559",
        "url": "https://zaimrosli.my"
      }
    };

    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://zaimrosli.my/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Properties",
          "item": "https://zaimrosli.my/properties"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": rawTitle,
          "item": canonicalUrl
        }
      ]
    };

    const dynamicSeoBlock = `<!-- SEO_BLOCK_START -->
  <title>${pageTitle}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:site_name" content="Zaim Rosli Real Estate Portal">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${socialTitle}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${img}">
  <meta property="og:image:secure_url" content="${img}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${rawTitle.replace(/"/g, '&quot;')}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${socialTitle}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${img}">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
  <!-- SEO_BLOCK_END -->`;

    let html = await response.text();

    if (html.includes('<!-- SEO_BLOCK_START -->') && html.includes('<!-- SEO_BLOCK_END -->')) {
      const sIdx = html.indexOf('<!-- SEO_BLOCK_START -->');
      const eIdx = html.indexOf('<!-- SEO_BLOCK_END -->') + '<!-- SEO_BLOCK_END -->'.length;
      html = html.substring(0, sIdx) + dynamicSeoBlock + html.substring(eIdx);
    } else {
      html = html.replace('<head>', '<head>\n' + dynamicSeoBlock);
    }

    if (agentCode) {
      const partnerInjection = `<script>window.COA_PARTNER_CODE = "${agentCode}";</script>`;
      html = html.replace('</head>', `${partnerInjection}\n</head>`);
    }

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=600'
      }
    });
  } catch (err) {
    return response;
  }
}
