// Cloudflare Pages Function: Live Traffic & Lead Tracker Beacon Engine for Zaim Rosli Portal
function getSupabaseConfig(env) {
  const url = (env && env.SUPABASE_URL) || 'https://csrzhidtzqxfbapsenhu.supabase.co';
  const key = (env && env.SUPABASE_SERVICE_ROLE_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcnpoaWR0enF4ZmJhcHNlbmh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0OTM3OTYsImV4cCI6MjEwMTA2OTc5Nn0.NnHFURbQTvsdgGbm1d_PC-hkOgQFQIHKTMQaS2n44SU';
  return { url, key };
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
  };
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost(context) {
  try {
    const { url: SUPABASE_URL, key: SUPABASE_SERVICE_ROLE_KEY } = getSupabaseConfig(context.env);
    const body = await context.request.json().catch(() => ({}));
    const {
      event_type = 'page_view',
      page_path = '/',
      page_title = '',
      target_id = '',
      target_title = '',
      referrer = '',
      device_type = 'desktop',
      session_id = 'anon'
    } = body;

    // Filter out bots / spam crawlers
    const userAgent = context.request.headers.get('user-agent') || '';
    if (/bot|crawl|spider|slurp|facebookexternalhit|bingbot|googlebot|headlesschrome/i.test(userAgent)) {
      return new Response(JSON.stringify({ success: true, ignored: 'bot' }), {
        headers: corsHeaders()
      });
    }

    // Geolocation from Cloudflare Edge Headers
    const country = context.request.headers.get('cf-ipcountry') || (context.request.cf && context.request.cf.country) || 'MY';
    const city = (context.request.cf && context.request.cf.city) || '';
    const region = (context.request.cf && context.request.cf.region) || '';

    // Isolated Action Type for Zaim Rosli Portal
    const actionType = `TRAFFIC_ZR_${event_type.toUpperCase()}`;
    const details = JSON.stringify({
      path: page_path,
      title: page_title,
      target_id: target_id,
      target_title: target_title,
      referrer: referrer,
      device: device_type,
      country: country,
      city: city,
      region: region,
      user_agent: userAgent.substring(0, 150),
      site: 'zaimrosli.my'
    });

    // 1. Insert into activity_logs table
    await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_email: session_id,
        action_type: actionType,
        details: details,
        target_id: target_id || page_path,
        created_at: new Date().toISOString()
      })
    });

    return new Response(JSON.stringify({ success: true, recorded: actionType }), {
      status: 200,
      headers: corsHeaders()
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders()
    });
  }
}
