// ReWake Service Worker v3.0
const CACHE_NAME = 'rewake-v3';

// 캐시할 파일 목록
const CACHE_FILES = [
  '/rewake/',
  '/rewake/index.html',
  '/rewake/manifest.json',
  '/rewake/icon-192.png',
  '/rewake/icon-512.png',
];

// 설치 — 핵심 파일 캐시
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_FILES).catch(err => {
        console.warn('캐시 일부 실패 (무시):', err);
      });
    })
  );
  self.skipWaiting();
});

// 활성화 — 구 캐시 삭제
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// 네트워크 요청 — 캐시 우선, 실패 시 네트워크
self.addEventListener('fetch', event => {
  // Firebase, Cloudinary, Google Fonts는 캐시하지 않음
  const url = event.request.url;
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('cloudinary') ||
    url.includes('fonts.googleapis') ||
    url.includes('gstatic.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // HTML 파일만 캐시 업데이트
        if (event.request.destination === 'document') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // 오프라인 시 index.html 반환
      if (event.request.destination === 'document') {
        return caches.match('/rewake/index.html');
      }
    })
  );
});
