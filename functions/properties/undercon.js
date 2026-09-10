export async function onRequest(context) {
  const url = new URL(context.request.url);
  const assetUrl = new URL('/properties.html', url.origin);
  const response = await context.env.ASSETS.fetch(assetUrl);
  if (!response.ok) return response;

  try {
    let html = await response.text();
    const canonicalUrl = `${url.origin}/properties/undercon`;
    const title = 'Projek Rumah Baru Undercon di Selangor & KL — Zaim Rosli (REN39575)';
    const description = 'Senarai kompilasi projek perumahan baru undercon, RUMAWIP, rumah teres pemaju, dan kondominium di Selangor, Kuala Lumpur & Putrajaya.';

    // Inject unique canonical and meta tags
    html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
    html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${canonicalUrl}">`);
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${description}">`);
    html = html.replace(/<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${canonicalUrl}">`);
    html = html.replace(/<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${title}">`);
    html = html.replace(/<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${description}">`);

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
