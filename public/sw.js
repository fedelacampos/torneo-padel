// Service worker mínimo: permite instalar la app y muestra una página básica sin conexión.
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => new Response(
      "<meta name=viewport content='width=device-width'><body style='font-family:sans-serif;padding:2rem'><h2>Sin conexión</h2><p>Revisá tu internet y volvé a intentar.</p>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } })));
  }
});
