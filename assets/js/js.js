// Remove a extensão da URL exibida
/*
window.addEventListener("DOMContentLoaded", () => {
  let url = window.location.pathname;

  if (url.endsWith(".html") || url.endsWith(".php")) {
    let novaUrl = url.replace(/\.html$|\.php$/i, "");
    window.history.replaceState(null, "", novaUrl);
  }
});

* */

window.addEventListener("load", function () {
  const loading = document.getElementById("loading");
  setTimeout(() => {
    loading.classList.add("hidden");
  }, 800); // delay para suavidade
});


// == Fast Media Processor (single-file, injectable) ==
// Use: inclua <script> deste código no final do body ou injetar dinamicamente.
// Detecta <img data-fast> e <video data-fast> e aplica otimizações.

(() => {
  // --- Configurações ---
  const MAX_IMAGE_WIDTH = 1200; // largura máxima para redimensionamento
  const IMAGE_QUALITY = 0.78; // para convertToBlob (0..1)
  const IDLE_TIMEOUT = 50; // ms fallback de requestIdleCallback
  const WORKER_TIMEOUT_MS = 15_000; // timeout para resposta do worker

  // --- Helpers de ambientes ---
  const supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
  const supportsCreateImageBitmap = typeof createImageBitmap === 'function';
  const supportsRequestVideoFrameCallback = !!(HTMLVideoElement && HTMLVideoElement.prototype.requestVideoFrameCallback);
  const rcIdle = window.requestIdleCallback || function (cb) { return setTimeout(() => cb({ timeRemaining: () => 50 }), IDLE_TIMEOUT); };
  const rcCancelIdle = window.cancelIdleCallback || clearTimeout;

  // --- Cria Web Worker dinamicamente (retorna Worker) ---
  function createImageWorker() {
    const workerCode = `
      self.onmessage = async (ev) => {
        const msg = ev.data;
        try {
          if (msg.type === 'resize') {
            const { width, height, targetWidth, quality } = msg;
            let imgBitmap = null;
            if (msg.imageBitmap) {
              // imagem já veio como ImageBitmap
              imgBitmap = msg.imageBitmap;
            } else {
              // receber blob e criar bitmap
              const b = msg.blob;
              imgBitmap = await createImageBitmap(b);
            }

            // calcula nova dimensão
            const ratio = Math.min(1, targetWidth / imgBitmap.width);
            const outW = Math.max(1, Math.round(imgBitmap.width * ratio));
            const outH = Math.max(1, Math.round(imgBitmap.height * ratio));

            let off;
            if (typeof OffscreenCanvas !== 'undefined') {
              off = new OffscreenCanvas(outW, outH);
            } else {
              // fallback para canvas em worker (pode não existir) -> tentar usar Offscreen
              off = new OffscreenCanvas(outW, outH);
            }
            const ctx = off.getContext('2d', { willReadFrequently: false });
            ctx.drawImage(imgBitmap, 0, 0, outW, outH);

            // converte para blob (jpeg)
            const blob = await off.convertToBlob({ type: 'image/jpeg', quality: quality });
            // libera bitmap
            if (imgBitmap.close) imgBitmap.close();

            postMessage({ type: 'result', blob }, [ /* blob não transferível em todos navegadores */ ]);
          } else {
            postMessage({ type: 'error', message: 'unknown type' });
          }
        } catch (err) {
          postMessage({ type: 'error', message: err && err.message ? err.message : String(err) });
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const w = new Worker(url);
    // remover URL object quando worker terminar
    w._url = url;
    w.addEventListener('terminate', () => {
      if (w._url) URL.revokeObjectURL(w._url);
    });
    return w;
  }

  // --- Worker manager com timeout ---
  function sendToWorker(worker, msg, transferables = []) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        reject(new Error('worker timeout'));
        // terminate worker to recover
        try { worker.terminate(); } catch (e) {}
      }, WORKER_TIMEOUT_MS);

      function onMsg(e) {
        clearTimeout(t);
        const data = e.data;
        worker.removeEventListener('message', onMsg);
        if (data && data.type === 'result') resolve(data.blob);
        else reject(new Error(data && data.message ? data.message : 'worker error'));
      }
      worker.addEventListener('message', onMsg);
      worker.postMessage(msg, transferables);
    });
  }

  // --- Processamento de imagem: fetch -> createImageBitmap -> worker resize -> retorna blob URL ---
  async function processImageFast(srcUrl, options = {}) {
    options = Object.assign({ targetWidth: MAX_IMAGE_WIDTH, quality: IMAGE_QUALITY }, options);
    // tenta fetch rápido
    const controller = new AbortController();
    const signal = controller.signal;

    // fetch com timeout curto (não bloquear indefinidamente)
    const fetchTimeout = setTimeout(() => controller.abort(), 12_000);

    try {
      const resp = await fetch(srcUrl, { signal });
      clearTimeout(fetchTimeout);
      if (!resp.ok) throw new Error('fetch fail ' + resp.status);

      const blob = await resp.blob();

      // criar imageBitmap se suportado (rápido e eficiente)
      let imageBitmap = null;
      if (supportsCreateImageBitmap) {
        try {
          imageBitmap = await createImageBitmap(blob);
        } catch (e) {
          imageBitmap = null;
        }
      }

      // usa worker para redimensionar
      const worker = createImageWorker();
      try {
        const msg = {
          type: 'resize',
          targetWidth: options.targetWidth,
          quality: options.quality
        };
        // se temos ImageBitmap, transferi-lo
        if (imageBitmap) {
          msg.imageBitmap = imageBitmap;
          // Transfer the bitmap
          const resultBlob = await sendToWorker(worker, msg, [imageBitmap]);
          worker.terminate();
          return resultBlob;
        } else {
          msg.blob = blob;
          const resultBlob = await sendToWorker(worker, msg, []);
          worker.terminate();
          return resultBlob;
        }
      } catch (err) {
        worker.terminate();
        // fallback: retorna original blob (sem redimensionamento)
        console.warn('worker failed, fallback to original blob:', err);
        return blob;
      }
    } catch (err) {
      clearTimeout(fetchTimeout);
      // fetch falhou => retorna null
      console.warn('fetch failed for', srcUrl, err);
      return null;
    }
  }

  // --- Aplica otimização a imagens DOM <img data-fast> ---
  function wireUpImages() {
    const imgs = Array.from(document.querySelectorAll('img[data-fast]'));
    if (!imgs.length) return;

    const io = new IntersectionObserver((entries) => {
      for (const ent of entries) {
        if (ent.isIntersecting) {
          const img = ent.target;
          io.unobserve(img);
          // se já processado, pula
          if (img._fastProcessed) continue;
          img._fastProcessed = true;

          rcIdle(async () => {
            try {
              // placeholder low-res (opcional)
              if (!img.dataset.placeholder && img.dataset.fastPlaceholderUrl) {
                img.src = img.dataset.fastPlaceholderUrl;
              }

              const src = img.dataset.fastSrc || img.src;
              const blob = await processImageFast(src, {
                targetWidth: parseInt(img.dataset.maxWidth || MAX_IMAGE_WIDTH, 10),
                quality: parseFloat(img.dataset.quality || IMAGE_QUALITY)
              });

              if (blob) {
                const objectUrl = URL.createObjectURL(blob);
                // substitui src sem causar layout shift abrupto
                img.onload = () => {
                  // limpa placeholder depois do carregamento
                  if (img.dataset.fastPlaceholderUrl) {
                    delete img.dataset.fastPlaceholderUrl;
                  }
                };
                img.src = objectUrl;

                // opcional: revoga o objectURL após algum tempo
                setTimeout(() => {
                  URL.revokeObjectURL(objectUrl);
                }, 60_000);
              } else {
                // fallback: garante que a imagem original seja definida
                if (img.dataset.fastSrc) img.src = img.dataset.fastSrc;
              }
            } catch (err) {
              console.error('fast image process error', err);
              if (img.dataset.fastSrc) img.src = img.dataset.fastSrc;
            }
          });
        }
      }
    }, { rootMargin: '200px 0px 200px 0px', threshold: 0.01 });

    imgs.forEach(img => {
      // se tiver data-fast-src, usar isso; evita dupla fetch do navegador
      if (img.dataset.fastSrc) {
        // evita preload do navegador definindo src para placeholder leve
        if (!img.dataset.fastPlaceholderUrl) {
          // pequeno SVG inline como placeholder (1x1)
          img.src = img.dataset.fastPlaceholderUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="10" height="10"%3E%3Crect width="10" height="10" fill="%23eee"/%3E%3C/svg%3E';
        }
      }
      io.observe(img);
    });
  }

  // --- Processa vídeos leve: lazy load + poster/frame extraction opcional ---
  function wireUpVideos() {
    const vids = Array.from(document.querySelectorAll('video[data-fast]'));
    if (!vids.length) return;

    const io = new IntersectionObserver((entries) => {
      for (const ent of entries) {
        const video = ent.target;
        if (ent.isIntersecting) {
          io.unobserve(video);
          rcIdle(() => {
            try {
              // set preload minimal to avoid download heavy data until needed
              if (!video.hasAttribute('preload')) video.setAttribute('preload', 'metadata');

              // if data-fast-src set, assign to source but don't autoplay/download full until play
              const src = video.dataset.fastSrc;
              if (src && !video.querySelector('source')) {
                const source = document.createElement('source');
                source.src = src;
                const type = video.dataset.type;
                if (type) source.type = type;
                video.appendChild(source);
                // load metadata only
                try { video.load(); } catch (e) {}
              }

              // optional: generate poster (first frame) quickly for visible UX
              if (video.dataset.fastPoster === 'true') {
                extractVideoPoster(video).then(posterUrl => {
                  if (posterUrl) {
                    video.setAttribute('poster', posterUrl);
                    // revoke later
                    setTimeout(() => URL.revokeObjectURL(posterUrl), 30_000);
                  }
                }).catch(() => {});
              }

              // lazy play on user interaction or visible+clicked
              // do not autoplay to avoid high bandwidth
            } catch (err) {
              console.error('video setup error', err);
            }
          });
        }
      }
    }, { rootMargin: '400px 0px 400px 0px', threshold: 0.01 });

    vids.forEach(v => io.observe(v));
  }

  // --- Extrai rapidamente um frame do vídeo (para poster) ---
  async function extractVideoPoster(video) {
    return new Promise((resolve, reject) => {
      // Só tenta se o navegador suportar drawImage do vídeo
      try {
        const tempVideo = document.createElement('video');
        tempVideo.crossOrigin = video.crossOrigin || 'anonymous';
        const src = video.dataset.fastSrc || (video.querySelector('source') && video.querySelector('source').src) || video.src;
        if (!src) return resolve(null);

        tempVideo.muted = true;
        tempVideo.preload = 'metadata';
        tempVideo.src = src;

        const onError = (e) => {
          cleanup();
          reject(e);
        };

        const cleanup = () => {
          tempVideo.removeEventListener('loadeddata', onLoaded);
          tempVideo.removeEventListener('error', onError);
          try { URL.revokeObjectURL(tempVideo.src); } catch(_) {}
        };

        const makePoster = () => {
          try {
            const w = Math.min(640, tempVideo.videoWidth || 640);
            const h = Math.round((w / (tempVideo.videoWidth || w)) * (tempVideo.videoHeight || w));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
              cleanup();
              if (blob) {
                const url = URL.createObjectURL(blob);
                resolve(url);
              } else reject(new Error('no blob'));
            }, 'image/jpeg', 0.7);
          } catch (err) {
            cleanup();
            reject(err);
          }
        };

        const onLoaded = () => {
          // se possível, captura o primeiro frame imediatamente
          if (tempVideo.readyState >= 2) {
            // Se requestVideoFrameCallback suportado, usa para garantir frame está pronto
            if (supportsRequestVideoFrameCallback && tempVideo.requestVideoFrameCallback) {
              try {
                tempVideo.requestVideoFrameCallback(() => {
                  makePoster();
                });
              } catch (e) {
                makePoster();
              }
            } else {
              // pequena espera para garantir frame
              setTimeout(makePoster, 80);
            }
          } else {
            setTimeout(makePoster, 200);
          }
        };
        tempVideo.addEventListener('loadeddata', onLoaded, { once: true });
        tempVideo.addEventListener('error', onError, { once: true });
        // for some browsers, forcing load
        try { tempVideo.load(); } catch (e) {}
        // kickstart if it's already loaded
        if (tempVideo.readyState >= 2) onLoaded();
        // safety timer
        setTimeout(() => {
          try { cleanup(); } catch (_) {}
          resolve(null);
        }, 6000);
      } catch (err) {
        reject(err);
      }
    });
  }

  // --- Inicialização automática ---
  function initFastMedia() {
    // allow user to opt-out globally via window.__disableFastMedia = true
    if (window.__disableFastMedia) return;
    wireUpImages();
    wireUpVideos();
    // Re-run on DOM changes (e.g., SPA). Uses MutationObserver cheaply.
    const mo = new MutationObserver((list) => {
      let added = false;
      for (const m of list) {
        if (m.addedNodes && m.addedNodes.length) {
          added = true; break;
        }
      }
      if (added) {
        // debounce short
        setTimeout(() => {
          wireUpImages();
          wireUpVideos();
        }, 150);
      }
    });
    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
  }

  // start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFastMedia);
  } else {
    initFastMedia();
  }

  // Expor API mínima para testes e chamadas manuais
  window.FastMedia = {
    processImageFast,
    extractVideoPoster
  };
})();
