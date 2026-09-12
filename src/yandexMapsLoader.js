const SCRIPT_ID = 'hayhome-yandex-maps-script';
const LOAD_TIMEOUT = 10000;

let gen = 0;
let pending = null;
let loadedLocale = null;

function removeScript() {
  const el = document.getElementById(SCRIPT_ID);
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function resetGlobal() {
  removeScript();
  window.ymaps3 = undefined;
  loadedLocale = null;
}

export function loadYandexMaps(key, locale, timeout = LOAD_TIMEOUT) {
  if (!key || !locale) return Promise.reject({ code: 'no-key' });
  if (loadedLocale === locale && window.ymaps3) return Promise.resolve(window.ymaps3);
  if (pending && pending.locale === locale) return pending.promise;
  if (loadedLocale !== locale) resetGlobal();

  const myGen = ++gen;
  const entry = { locale };
  entry.promise = new Promise((resolve, reject) => {
    removeScript();
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(key)}&lang=${locale}`;
    script.async = true;

    const timer = setTimeout(() => {
      cleanup();
      removeScript();
      reject({ code: 'timeout' });
    }, timeout);

    function cleanup() {
      clearTimeout(timer);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    }

    async function onLoad() {
      if (!window.ymaps3) {
        cleanup();
        reject({ code: 'script-error' });
        return;
      }
      try {
        await window.ymaps3.ready;
      } catch {
        cleanup();
        reject({ code: 'script-error' });
        return;
      }
      cleanup();
      if (gen !== myGen) {
        reject({ code: 'superseded' });
        return;
      }
      loadedLocale = locale;
      resolve(window.ymaps3);
    }

    function onError() {
      cleanup();
      removeScript();
      reject({ code: 'script-error' });
    }

    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);
    document.head.appendChild(script);
  }).finally(() => {
    if (pending === entry) pending = null;
  });

  pending = entry;
  return entry.promise;
}

export function unloadYandexMaps() {
  gen++;
  pending = null;
  resetGlobal();
}
