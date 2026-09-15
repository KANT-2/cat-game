/*
 * One-time retirement worker for browsers that installed an older cat-game PWA.
 * New builds do not register this file. Keep it at the former script URL until
 * existing registrations have had enough time to update and unregister.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter(
              (name) =>
                name === "game-images-v1" ||
                (name.startsWith("workbox-precache") && name.includes("/cat-game/")),
            )
            .map((name) => caches.delete(name)),
        ),
      ),
      self.registration.unregister(),
    ]),
  );
});
