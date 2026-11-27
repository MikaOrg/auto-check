/* =====================================================================
   Service Worker: macht die App offline-fähig und spielt Updates ein.

   Alle Dateien der App werden auf dem iPad gespeichert, die App startet immer
   aus diesem Speicher – auch ohne Internet.

   UPDATES: Bei jeder Änderung an der App hier die VERSION erhöhen.
   Das iPad merkt beim nächsten Start, dass sich diese Datei geändert hat, lädt
   ALLE Dateien der neuen Version komplett herunter und schaltet erst dann um.
   So werden nie alte und neue Dateien gemischt. Die neue Version ist ab dem
   übernächsten Start zu sehen (bzw. nach dem Schließen und erneuten Öffnen der App).

   Kommt eine neue Datei zur App dazu, muss sie unten in APP_FILES ergänzt werden.
   ===================================================================== */

const VERSION = '1.0.0';
const CACHE_NAME = `autocheck-${VERSION}`;

const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/main.js',
  './js/config.js',
  './js/helpers.js',
  './js/storage.js',
  './js/security.js',
  './js/session.js',
  './js/router.js',
  './js/dialog.js',
  './js/email.js',
  './js/backup.js',
  './js/draft.js',
  './js/logout.js',
  './js/screens/pin-pad.js',
  './js/screens/login.js',
  './js/screens/vehicle.js',
  './js/screens/checklist.js',
  './js/screens/done.js',
  './js/screens/admin-login.js',
  './js/screens/admin.js',
  './js/screens/admin-employees.js',
  './js/screens/admin-checklists.js',
  './js/screens/admin-vehicles.js',
  './js/screens/admin-email.js',
  './js/screens/admin-backup.js'
];

// Installation: alle Dateien der neuen Version frisch vom Server holen.
// Schlägt eine fehl, wird die Installation verworfen und die alte Version bleibt aktiv.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// Aktivierung: Dateien älterer Versionen löschen.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

// Anfragen: immer aus dem Speicher dieser Version antworten, nur Unbekanntes aus dem Netz holen.
// Anfragen an andere Server (z. B. den Mail-Dienst) werden nicht angefasst.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const isOwnFile = new URL(request.url).origin === self.location.origin;
  if (request.method !== 'GET' || !isOwnFile) return;

  event.respondWith(
    caches.open(CACHE_NAME)
      .then((cache) => cache.match(request, { ignoreSearch: true }))
      .then((cachedResponse) => cachedResponse || fetch(request))
  );
});
