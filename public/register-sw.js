if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // The online app still works when service-worker registration is unavailable.
  });
}
