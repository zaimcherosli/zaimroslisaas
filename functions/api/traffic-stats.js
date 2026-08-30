// Cloudflare Pages Function: Real-Time Traffic & Lead Analytics Aggregator API for Zaim Rosli Portal
function getSupabaseConfig(env) {
  const url = (env && env.SUPABASE_URL) || 'https://csrzhidtzqxfbapsenhu.supabase.co';
  const key = (env && env.SUPABASE_SERVICE_ROLE_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcnpoaWR0enF4ZmJhcHNlbmh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0OTM3OTYsImV4cCI6MjEwMTA2OTc5Nn0.NnHFURbQTvsdgGbm1d_PC-hkOgQFQIHKTMQaS2n44SU';
  return { url, key };
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
  };
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestGet(context) {
  try {
    const { url: SUPABASE_URL, key: SUPABASE_SERVICE_ROLE_KEY } = getSupabaseConfig(context && context.env);
    
    // 1. Fetch traffic events from activity_logs
    const logsRes = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs?action_type=like.TRAFFIC_*&order=created_at.desc&limit=1500`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    const events = logsRes.ok ? await logsRes.json() : [];

    // 2. Compute timestamps for today (Malaysia UTC+8)
    const now = new Date();
    const myTzOffsetMs = 8 * 60 * 60 * 1000;
    const nowMy = new Date(now.getTime() + myTzOffsetMs);
    const todayStrMy = nowMy.toISOString().split('T')[0];

    // Aggregations
    const allVisitors = new Set();
    const todayVisitors = new Set();
    let totalPageviews = 0;
    let todayPageviews = 0;
    let totalWhatsappClicks = 0;
    let todayWhatsappClicks = 0;

    const pageCountMap = {};
    const countryCountMap = {};
    const deviceCountMap = { mobile: 0, desktop: 0, tablet: 0 };
    const recentActivities = [];

    const COUNTRY_NAMES = {
      'MY': 'Malaysia',
      'SG': 'Singapore',
      'ID': 'Indonesia',
      'TH': 'Thailand',
      'VN': 'Vietnam',
      'PH': 'Philippines',
      'BN': 'Brunei',
      'CN': 'China',
      'HK': 'Hong Kong',
      'TW': 'Taiwan',
      'JP': 'Japan',
      'KR': 'South Korea',
      'IN': 'India',
      'AU': 'Australia',
      'NZ': 'New Zealand',
      'US': 'United States',
      'GB': 'United Kingdom',
      'DE': 'Germany',
      'FR': 'France',
      'NL': 'Netherlands',
      'AE': 'United Arab Emirates',
      'SA': 'Saudi Arabia',
      'QA': 'Qatar',
      'CA': 'Canada'
    };

    for (const item of events) {
      const sessionId = item.user_email || 'anon';
      const action = item.action_type || '';
      const createdAt = item.created_at || '';
      
      const itemDateMy = new Date(new Date(createdAt).getTime() + myTzOffsetMs).toISOString().split('T')[0];
      const isToday = itemDateMy === todayStrMy;

      allVisitors.add(sessionId);
      if (isToday) todayVisitors.add(sessionId);

      let parsedDetails = {};
      try {
        parsedDetails = typeof item.details === 'string' ? JSON.parse(item.details) : (item.details || {});
      } catch (e) {
        parsedDetails = {};
      }

      // Pageviews count
      if (action === 'TRAFFIC_PAGE_VIEW') {
        totalPageviews++;
        if (isToday) todayPageviews++;

        const p = parsedDetails.path || item.target_id || '/';
        pageCountMap[p] = (pageCountMap[p] || 0) + 1;
      }

      // WhatsApp Conversion clicks
      if (action === 'TRAFFIC_WHATSAPP_CLICK') {
        totalWhatsappClicks++;
        if (isToday) todayWhatsappClicks++;
      }

      // Device breakdown
      const dev = (parsedDetails.device || 'desktop').toLowerCase();
      if (deviceCountMap[dev] !== undefined) {
        deviceCountMap[dev]++;
      } else {
        deviceCountMap.desktop++;
      }

      // Country breakdown
      const rawC = (parsedDetails.country || 'MY').toUpperCase();
      const countryName = COUNTRY_NAMES[rawC] || rawC;
      countryCountMap[countryName] = (countryCountMap[countryName] || 0) + 1;

      // Keep recent 25 activities
      if (recentActivities.length < 25) {
        recentActivities.push({
          id: item.id,
          type: action,
          path: parsedDetails.path || item.target_id || '/',
          title: parsedDetails.title || parsedDetails.target_title || 'Website Visitor',
          country: countryName,
          city: parsedDetails.city || '',
          device: dev,
          created_at: createdAt
        });
      }
    }

    // Top visited pages
    const topPages = Object.entries(pageCountMap)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Top Countries with percentage
    const totalEvents = events.length || 1;
    const topCountries = Object.entries(countryCountMap)
      .map(([country, count]) => ({
        country,
        count,
        pct: Math.round((count / totalEvents) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Device percentages
    const totalDev = (deviceCountMap.mobile + deviceCountMap.desktop + deviceCountMap.tablet) || 1;
    const deviceBreakdown = {
      mobile_pct: Math.round((deviceCountMap.mobile / totalDev) * 100),
      desktop_pct: Math.round((deviceCountMap.desktop / totalDev) * 100),
      tablet_pct: Math.round((deviceCountMap.tablet / totalDev) * 100)
    };

    return new Response(JSON.stringify({
      success: true,
      stats: {
        total_visitors: allVisitors.size,
        today_visitors: todayVisitors.size,
        total_pageviews: totalPageviews,
        today_pageviews: todayPageviews,
        total_whatsapp_clicks: totalWhatsappClicks,
        today_whatsapp_clicks: todayWhatsappClicks,
        device_breakdown: deviceBreakdown,
        top_pages: topPages,
        top_countries: topCountries,
        recent_activities: recentActivities
      }
    }), {
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
