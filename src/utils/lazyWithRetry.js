import { lazy } from 'react';

/**
 * Wraps dynamic component imports with automatic error recovery for stale chunks and new deployment rollouts.
 * If Vite build hashes change on deployment, fetching old chunk hashes returns 404.
 * This helper retries seamlessly or performs a safe one-time window reload to sync with the latest build.
 */
export function lazyWithRetry(componentImport, retriesLeft = 2, interval = 800) {
  return lazy(() =>
    new Promise((resolve, reject) => {
      const attempt = (retries) => {
        componentImport()
          .then((module) => {
            sessionStorage.removeItem('foody_chunk_retry_in_progress');
            resolve(module);
          })
          .catch((error) => {
            const isChunkLoadFailed =
              error?.name === 'ChunkLoadError' ||
              /loading chunk|failed to fetch dynamically imported module|importing a module script failed/i.test(
                error?.message || ''
              );

            if (retries > 0) {
              setTimeout(() => {
                attempt(retries - 1);
              }, interval);
            } else if (isChunkLoadFailed) {
              const alreadyRetried = sessionStorage.getItem('foody_chunk_retry_in_progress');
              if (!alreadyRetried && typeof window !== 'undefined') {
                sessionStorage.setItem('foody_chunk_retry_in_progress', 'true');
                console.warn('⚠️ Stale bundle chunk detected. Auto-refreshing to load latest application version...');
                window.location.reload();
              } else {
                reject(error);
              }
            } else {
              reject(error);
            }
          });
      };

      attempt(retriesLeft);
    })
  );
}
