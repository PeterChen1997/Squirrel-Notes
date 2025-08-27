const CACHE_NAME = 'squirrel-notes-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/knowledge',
  '/manifest.json',
  '/favicon.ico',
  // 添加其他静态资源
];

// 安装事件
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
});

// 激活事件
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 网络请求拦截
self.addEventListener('fetch', (event) => {
  console.log('Service Worker: Fetch', event.request.url);
  
  // 只处理同源请求
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // 如果在缓存中找到响应，则返回缓存的版本
          if (response) {
            console.log('Service Worker: Found in cache', event.request.url);
            return response;
          }
          
          // 否则，发起网络请求
          return fetch(event.request)
            .then((response) => {
              // 检查是否是有效的响应
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // 克隆响应
              const responseToCache = response.clone();
              
              // 将响应添加到缓存
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch((error) => {
              console.error('Service Worker: Fetch failed', error);
              
              // 如果网络请求失败，尝试提供离线页面
              if (event.request.destination === 'document') {
                return caches.match('/');
              }
              
              throw error;
            });
        })
    );
  }
});

// 推送通知事件（可选）
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push Received');
  
  const options = {
    body: event.data ? event.data.text() : '松鼠随记有新消息',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('松鼠随记', options)
  );
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click Received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 后台同步事件（可选）
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background Sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // 执行后台同步逻辑
      doBackgroundSync()
    );
  }
});

function doBackgroundSync() {
  // 这里可以添加离线数据同步逻辑
  return Promise.resolve();
}
