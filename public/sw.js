/**
 * Service Worker - Bite Note
 * バージョン: 1.0.0
 *
 * 機能:
 * - 静的アセットのキャッシュ（Cache-First戦略）
 * - API レスポンスのキャッシュ（Network-First戦略）
 * - オフライン対応
 * - 自動更新機能
 */

// キャッシュ名（バージョン管理）
const CACHE_VERSION = '1.1.0';
const STATIC_CACHE = `bite-note-static-v${CACHE_VERSION}`;
const API_CACHE = `bite-note-api-v${CACHE_VERSION}`;
const IMAGE_CACHE = `bite-note-images-v${CACHE_VERSION}`;
const OFFLINE_CACHE = `bite-note-offline-v${CACHE_VERSION}`;

// キャッシュするファイルのリスト
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  // アイコン
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// キャッシュサイズ制限
const MAX_API_CACHE_SIZE = 50; // API レスポンス
const MAX_IMAGE_CACHE_SIZE = 100; // 画像

// キャッシュの有効期限（ミリ秒）
const API_CACHE_EXPIRATION = 6 * 60 * 60 * 1000; // 6時間
const IMAGE_CACHE_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7日間

/**
 * インストールイベント
 * - 静的アセットを事前キャッシュ
 * - 即座にアクティブ化
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...', CACHE_VERSION);

  event.waitUntil(
    (async () => {
      try {
        // 静的アセットをキャッシュ
        const staticCache = await caches.open(STATIC_CACHE);
        await staticCache.addAll(STATIC_ASSETS);
        console.log('[SW] Static assets cached successfully');

        // オフラインページをキャッシュ
        const offlineCache = await caches.open(OFFLINE_CACHE);
        await offlineCache.add('/offline.html');
        console.log('[SW] Offline page cached successfully');

        // 即座にアクティブ化（古いService Workerを待たない）
        await self.skipWaiting();
      } catch (error) {
        console.error('[SW] Installation failed:', error);
      }
    })()
  );
});

/**
 * アクティベートイベント
 * - 古いキャッシュを削除
 * - クライアントを即座に制御
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...', CACHE_VERSION);

  event.waitUntil(
    (async () => {
      try {
        // 古いキャッシュを削除
        const cacheNames = await caches.keys();
        const currentCaches = [STATIC_CACHE, API_CACHE, IMAGE_CACHE, OFFLINE_CACHE];

        await Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );

        // クライアントを即座に制御
        await self.clients.claim();
        console.log('[SW] Service Worker activated successfully');

        // 全クライアントに更新通知
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: CACHE_VERSION,
          });
        });
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

/**
 * フェッチイベント
 * - リクエストに応じたキャッシュ戦略を適用
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 同一オリジンのリクエストのみ処理
  if (url.origin !== location.origin) {
    // 外部API（天気・潮汐等）はNetwork-First
    if (isAPIRequest(url)) {
      event.respondWith(networkFirstStrategy(request, API_CACHE));
      return;
    }
    // その他の外部リソースはそのまま
    return;
  }

  // ナビゲーションリクエスト（HTML）
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // 静的アセット（JS, CSS, フォント等）
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // 画像
  if (isImageRequest(url)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // その他はNetwork-First
  event.respondWith(networkFirstStrategy(request, API_CACHE));
});

/**
 * メッセージイベント
 * - クライアントからのコマンドを処理
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    // 即座に新しいService Workerをアクティブ化
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    // キャッシュをクリア
    event.waitUntil(
      (async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        console.log('[SW] All caches cleared');
      })()
    );
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    // バージョン情報を返す
    event.ports[0].postMessage({
      type: 'VERSION_INFO',
      version: CACHE_VERSION,
    });
  }
});

/**
 * キャッシュ戦略: Cache-First
 * キャッシュを優先、なければネットワーク
 */
async function cacheFirstStrategy(request, cacheName) {
  try {
    // キャッシュを確認
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
      // キャッシュの有効期限をチェック
      const expiration = cacheName === IMAGE_CACHE ? IMAGE_CACHE_EXPIRATION : API_CACHE_EXPIRATION;
      const isCacheValid = await checkCacheExpiration(cached, expiration);

      if (isCacheValid) {
        console.log('[SW] Cache hit (valid):', request.url);
        return cached;
      } else {
        console.log('[SW] Cache expired, fetching fresh:', request.url);
        // 有効期限切れなのでキャッシュを削除
        await cache.delete(request);
      }
    }

    // キャッシュになければネットワークから取得
    console.log('[SW] Cache miss, fetching:', request.url);
    const response = await fetch(request);

    // 成功したらキャッシュに保存（タイムスタンプ付き）
    if (response && response.status === 200) {
      await cacheWithExpiration(cache, request, response.clone());

      // キャッシュサイズを制限
      if (cacheName === IMAGE_CACHE) {
        await limitCacheSize(cacheName, MAX_IMAGE_CACHE_SIZE);
      }
    }

    return response;
  } catch (error) {
    console.error('[SW] Cache-First strategy failed:', error);

    // 画像の場合はフォールバック画像を返す
    if (isImageRequest(new URL(request.url))) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ccc" width="100" height="100"/></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }

    throw error;
  }
}

/**
 * キャッシュ戦略: Network-First
 * ネットワークを優先、失敗したらキャッシュ
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    // ネットワークから取得
    const response = await fetch(request);

    // 成功したらキャッシュに保存（タイムスタンプ付き）
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      await cacheWithExpiration(cache, request, response.clone());

      // キャッシュサイズを制限
      await limitCacheSize(cacheName, MAX_API_CACHE_SIZE);

      console.log('[SW] Network response cached:', request.url);
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    // ネットワークが失敗したらキャッシュを使用
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
      // キャッシュの有効期限をチェック
      const expiration = API_CACHE_EXPIRATION;
      const isCacheValid = await checkCacheExpiration(cached, expiration);

      if (isCacheValid) {
        console.log('[SW] Serving from cache (offline, valid):', request.url);
        return cached;
      } else {
        console.log('[SW] Cache expired (offline):', request.url);
        // オフライン時は期限切れでもキャッシュを返す（UX優先）
        return cached;
      }
    }

    throw error;
  }
}

/**
 * ナビゲーション戦略
 * HTML ページのリクエストを処理
 */
async function navigationStrategy(request) {
  try {
    // ネットワークから取得
    const response = await fetch(request);

    if (response && response.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Navigation failed, serving offline page');

    // オフライン時はオフラインページを返す
    const cache = await caches.open(OFFLINE_CACHE);
    const offlinePage = await cache.match('/offline.html');

    if (offlinePage) {
      return offlinePage;
    }

    // オフラインページもなければエラー
    return new Response('オフラインです', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/**
 * キャッシュサイズを制限
 */
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxSize) {
    // 古いエントリを削除（FIFO）
    const deleteCount = keys.length - maxSize;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[SW] Cache trimmed: ${cacheName} (removed ${deleteCount} entries)`);
  }
}

/**
 * タイムスタンプ付きでキャッシュに保存
 */
async function cacheWithExpiration(cache, request, response) {
  // レスポンスヘッダーにタイムスタンプを追加
  const clonedResponse = response.clone();
  const headers = new Headers(clonedResponse.headers);
  headers.append('sw-cache-timestamp', Date.now().toString());

  const modifiedResponse = new Response(clonedResponse.body, {
    status: clonedResponse.status,
    statusText: clonedResponse.statusText,
    headers: headers
  });

  await cache.put(request, modifiedResponse);
}

/**
 * キャッシュの有効期限をチェック
 */
async function checkCacheExpiration(response, expirationMs) {
  const cachedTimestamp = response.headers.get('sw-cache-timestamp');

  if (!cachedTimestamp) {
    // タイムスタンプがない場合は有効とみなす（後方互換性）
    return true;
  }

  const now = Date.now();
  const cacheAge = now - parseInt(cachedTimestamp, 10);

  return cacheAge < expirationMs;
}

/**
 * 静的アセットかどうか判定
 */
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

/**
 * 画像リクエストかどうか判定
 */
function isImageRequest(url) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
  return imageExtensions.some((ext) => url.pathname.endsWith(ext));
}

/**
 * API リクエストかどうか判定
 */
function isAPIRequest(url) {
  // 外部APIのドメインパターン
  const apiDomains = [
    'api.open-meteo.com', // 天気API
    'api.tidesandcurrents.noaa.gov', // 潮汐API
  ];

  return apiDomains.some((domain) => url.hostname.includes(domain));
}

console.log('[SW] Service Worker loaded successfully', CACHE_VERSION);
