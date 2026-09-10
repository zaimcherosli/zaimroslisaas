export async function onRequest(context) {
  const url = new URL(context.request.url);
  const assetUrl = new URL('/coa.html', url.origin);
  const response = await context.env.ASSETS.fetch(assetUrl);
  if (!response.ok) return response;

  let html = await response.text();
  const injection = `<script>window.COA_ADMIN_ENTRY = true; window.COA_STOREFRONT_AGENT = "admin";</script>`;
  html = html.replace('</head>', `${injection}\n</head>`);

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-cache, no-store, must-revalidate'
    }
  });
}
