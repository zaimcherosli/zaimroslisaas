export async function onRequest(context) {
  const url = new URL(context.request.url);

  let agentCode = null;
  if (Array.isArray(context.params.agent)) {
    agentCode = (context.params.agent[0] || '').toLowerCase().trim();
  } else if (typeof context.params.agent === 'string') {
    agentCode = context.params.agent.toLowerCase().trim();
  }

  // Also support query param fallback
  if (!agentCode && url.searchParams.get('ref')) {
    agentCode = url.searchParams.get('ref').toLowerCase().trim();
  }

  const assetUrl = new URL('/coa.html', url.origin);
  const response = await context.env.ASSETS.fetch(assetUrl);
  if (!response.ok) return response;

  let html = await response.text();

  if (agentCode === 'admin') {
    const adminInjection = `<script>window.COA_ADMIN_ENTRY = true; window.COA_STOREFRONT_AGENT = "admin";</script>`;
    html = html.replace('</head>', `${adminInjection}\n</head>`);
  } else if (agentCode) {
    const partnerInjection = `<script>window.COA_STOREFRONT_AGENT = "${agentCode}";</script>`;
    html = html.replace('</head>', `${partnerInjection}\n</head>`);
  }

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': agentCode === 'admin' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=120'
    }
  });
}
