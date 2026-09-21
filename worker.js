// nonbiz-land-tax-api — PIN 기반 기기 간 동기화 Worker
// KV 바인딩: NONBIZ_LAND_TAX_SYNC

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

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
