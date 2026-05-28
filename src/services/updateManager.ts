export async function forceAppUpdate() {
  try {
    console.log("[APP UPDATE] Starting...");

    // limpa caches antigos
    const cacheKeys = await caches.keys();

    await Promise.all(
      cacheKeys.map(key => caches.delete(key))
    );

    console.log("[APP UPDATE] Cache cleared");

    // atualiza service worker
    const registration = await navigator.serviceWorker.getRegistration();

    if (registration) {

      await registration.update();

      if (registration.waiting) {

        registration.waiting.postMessage({
          type: 'SKIP_WAITING'
        });
      }
    }

    // pequena pausa
    await new Promise(resolve => setTimeout(resolve, 1000));

    // recarrega
    window.location.reload();

  } catch (err) {
    console.error("[APP UPDATE ERROR]", err);
  }
}