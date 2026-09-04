// Asset Management App - CORS proxy for price fetching
//
// 無料の公開CORSプロキシ（allorigins.win / codetabs.com）が頻繁にダウン・
// ブロックされるため、自前のCloudflare Workerで代替する。
//
// デプロイ方法:
// 1. https://dash.cloudflare.com/ で無料アカウントを作成
// 2. 左メニュー「Workers & Pages」→「Create」→「Create Worker」
// 3. 適当な名前（例: asset-app-proxy）を付けてデプロイ
// 4. 「Edit code」を開き、このファイルの中身を全部貼り付けて「Deploy」
// 5. 発行されたURL（例: https://asset-app-proxy.xxxx.workers.dev）を控える
//
// 使い方: https://<worker-url>/?url=<エンコード済みの取得先URL>

const ALLOWED_HOSTS = [
    'query1.finance.yahoo.com',
    'query2.finance.yahoo.com',
    'finance.yahoo.co.jp',
    'minkabu.jp',
];

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
    async fetch(request) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const requestUrl = new URL(request.url);
        const target = requestUrl.searchParams.get('url');

        if (!target) {
            return new Response('Missing url parameter', { status: 400, headers: CORS_HEADERS });
        }

        let targetUrl;
        try {
            targetUrl = new URL(target);
        } catch {
            return new Response('Invalid url parameter', { status: 400, headers: CORS_HEADERS });
        }

        if (!ALLOWED_HOSTS.includes(targetUrl.hostname)) {
            return new Response('Host not allowed', { status: 403, headers: CORS_HEADERS });
        }

        const upstream = await fetch(targetUrl.toString(), {
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        const body = await upstream.arrayBuffer();
        return new Response(body, {
            status: upstream.status,
            headers: {
                ...CORS_HEADERS,
                'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
            },
        });
    },
};
