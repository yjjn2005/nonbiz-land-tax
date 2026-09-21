// nonbiz-land-tax-api — PIN 기반 기기 간 동기화 + 법제처 판례/조세심판원 검색 프록시
// KV 바인딩: NONBIZ_LAND_TAX_SYNC

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 법제처 국가법령정보 Open API — 조세심판원 재결례(ttSpecialDecc), 법원 판례(prec)
const LAW_OC = 'yjjn2005';
const LAW_SEARCH_BASE = 'https://www.law.go.kr/DRF/lawSearch.do';
const ALLOWED_LAW_TARGETS = new Set(['ttSpecialDecc', 'prec', 'expc']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // ---- 판례/조세심판원 검색 프록시 ----
    if (url.pathname === '/legal-search') {
      const target = url.searchParams.get('target');
      const query = url.searchParams.get('query') || '';
      const display = Math.min(Number(url.searchParams.get('display')) || 10, 20);

      if (!ALLOWED_LAW_TARGETS.has(target)) {
        return new Response(JSON.stringify({ error: 'invalid target' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
      if (!query.trim()) {
        return new Response(JSON.stringify({ error: 'query required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      const upstream = new URL(LAW_SEARCH_BASE);
      upstream.searchParams.set('OC', LAW_OC);
      upstream.searchParams.set('target', target);
      upstream.searchParams.set('type', 'JSON');
      upstream.searchParams.set('query', query);
      upstream.searchParams.set('display', String(display));

      try {
        const res = await fetch(upstream.toString());
        const text = await res.text();
        return new Response(text, {
          status: res.status,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'upstream fetch failed' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
    }

    // ---- PIN 기반 기기 간 동기화 ----
    const match = url.pathname.match(/^\/sync\/([A-Za-z0-9]{4,8})$/);
    if (!match) {
      return new Response(JSON.stringify({ error: 'invalid path' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
    const pin = match[1];
    const key = `pin:${pin}`;

    if (request.method === 'GET') {
      const stored = await env.NONBIZ_LAND_TAX_SYNC.get(key);
      if (!stored) {
        return new Response(JSON.stringify({ error: 'not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
      return new Response(stored, {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    if (request.method === 'POST') {
      const body = await request.text();
      try {
        JSON.parse(body);
      } catch {
        return new Response(JSON.stringify({ error: 'invalid json' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
      await env.NONBIZ_LAND_TAX_SYNC.put(key, body);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  },
};
