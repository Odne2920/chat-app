const CACHE_NAME="hrn-cache-v1.0.01013";
const FILES_TO_CACHE=[
"./index.html?v=16",
"./assets/logic.js?v=16",
"./assets/branding/app/icon-192x192-maskable.png?v=16",
"./assets/branding/app/icon-192x192-not-maskable.png?v=16",
"./assets/branding/app/icon-256x256-maskable.png?v=16",
"./assets/branding/app/icon-256x256-not-maskable.png?v=16",
"./assets/branding/app/icon-512x512-maskable.png?v=16",
"./assets/branding/app/icon-512x512-not-maskable.png?v=16",
"./assets/avatars/1.webp?v=16",
"./assets/avatars/2.webp?v=16",
"./assets/avatars/3.webp?v=16",
"./assets/avatars/4.webp?v=16",
"./assets/avatars/5.webp?v=16"
];

async function cacheMissingFiles(){
const cache=await caches.open(CACHE_NAME);
for(const file of FILES_TO_CACHE){
if(!(await cache.match(file))){
try{
const res=await fetch(file,{cache:"no-store"});
if(res.ok)await cache.put(file,res.clone());
}catch(e){}
}
}
}

self.addEventListener("install",e=>{
self.skipWaiting();
e.waitUntil(cacheMissingFiles());
});

self.addEventListener("activate",e=>{
self.clients.claim();
e.waitUntil(
caches.keys().then(keys=>
Promise.all(keys.map(k=>k!==CACHE_NAME&&caches.delete(k)))
)
);
});

self.addEventListener("fetch",e=>{
const req=e.request;
const url=new URL(req.url);

if(req.method==="GET" && url.search.includes("cache=1-hrn")){
e.respondWith(
caches.open(CACHE_NAME).then(async cache=>{
const match=await cache.match(req);
if(match)return match;
try{
const res=await fetch(req);
if(res.ok)cache.put(req,res.clone());
return res;
}catch(err){
return match;
}
})
);
return;
}

if(req.mode==="navigate"){
e.respondWith(
fetch(req).catch(()=>caches.match("./index.html?v=16"))
);
return;
}

e.respondWith(
caches.match(req).then(res=>res||fetch(req))
);
});
