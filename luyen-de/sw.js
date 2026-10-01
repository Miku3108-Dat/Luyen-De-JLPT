// Service worker for Luyen De N2 - app-shell offline cache + on-demand audio cache.
// Scoped to ./luyen-de/ only, so it never intercepts the main N2 roadmap app's requests.
var SHELL_CACHE = "n2luyende-shell-v1";
var AUDIO_CACHE = "n2luyende-audio-v1";
var SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function(cache){
      return cache.addAll(SHELL_FILES);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        if (key !== SHELL_CACHE && key !== AUDIO_CACHE) return caches.delete(key);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function isAudioRequest(url){
  return /\/audio\/CD[12]\/.*\.mp3$/i.test(url);
}

self.addEventListener("fetch", function(event){
  var req = event.request;
  if (req.method !== "GET") return;
  var url = req.url;

  if (isAudioRequest(url)){
    event.respondWith(
      caches.open(AUDIO_CACHE).then(function(cache){
        return cache.match(req).then(function(cached){
          if (cached) return cached;
          return fetch(req).then(function(resp){
            if (resp && resp.ok) cache.put(req, resp.clone());
            return resp;
          }).catch(function(){ return cached; });
        });
      })
    );
    return;
  }

  if (req.mode === "navigate" || SHELL_FILES.some(function(f){ return url.indexOf(f.replace("./", "")) !== -1; })){
    event.respondWith(
      fetch(req).then(function(resp){
        if (resp && resp.ok){
          var copy = resp.clone();
          caches.open(SHELL_CACHE).then(function(cache){ cache.put(req, copy); });
        }
        return resp;
      }).catch(function(){
        return caches.match(req).then(function(cached){ return cached || caches.match("./index.html"); });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function(cached){
      return cached || fetch(req);
    })
  );
});
