/**
 * Cloudflare Pages Function: /api/properties
 * Same-Origin Edge Gateway for Property Listings
 * Proxies to Cloudflare Worker KV / R2 with resilient fallback
 */

const WORKER_ENDPOINT = 'https://zaimrosli-worker.huzaimrosli.workers.dev/api/properties';
const ADMIN_API_KEY = 'zr_admin_sec_2026_x89p';

export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };

  try {
    const url = new URL(context.request.url);
    const workerUrl = `${WORKER_ENDPOINT}?t=${Date.now()}`;
    
    const resp = await fetch(workerUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ZaimRosli-Pages-Edge-Proxy/1.0'
      }
    });

    if (resp.ok) {
      const data = await resp.text();
      return new Response(data, {
        status: 200,
        headers: corsHeaders
      });
    }

    throw new Error(`Worker responded with status ${resp.status}`);
  } catch (err) {
    // Fallback: try reading from asset if available
    try {
      const assetUrl = new URL('/properties-data.js', context.request.url);
      const assetRes = await context.env.ASSETS.fetch(assetUrl);
      if (assetRes.ok) {
        const jsText = await assetRes.text();
        const match = jsText.match(/const PROPERTIES_DATA = (\[[\s\S]*?\]);/);
        if (match) {
          return new Response(match[1], {
            status: 200,
            headers: corsHeaders
          });
        }
      }
    } catch(eFallback) {}

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
    'Content-Type': 'application/json'
  };

  try {
    const body = await context.request.text();
    const authHeader = context.request.headers.get('Authorization') || `Bearer ${ADMIN_API_KEY}`;
    const adminKeyHeader = context.request.headers.get('X-Admin-Key') || ADMIN_API_KEY;

    const resp = await fetch(WORKER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Admin-Key': adminKeyHeader
      },
      body: body
    });

    const result = await resp.text();
    return new Response(result, {
      status: resp.status,
      headers: corsHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
      'Access-Control-Max-Age': '86400'
    }
  });
}
