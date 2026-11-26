// Keeps the attendance scanner loadable when the school Wi-Fi drops.
// Network first (so deploys show up immediately), cached copy as fallback. Supabase API calls are never cached.
const CACHE='lsc-offline-v1';
const HOSTS=['esm.sh','cdn.jsdelivr.net'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./student.html','./assets/lsc-glass-logo.png']).catch(()=>{})).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.hostname.endsWith('.supabase.co'))return;
  if(url.origin!==self.location.origin&&!HOSTS.includes(url.hostname))return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const res=await Promise.race([fetch(req),new Promise((_,rej)=>setTimeout(()=>rej(new Error('slow')),6000))]);
      if(res&&(res.ok||res.type==='opaque'))cache.put(req,res.clone());
      return res;
    }catch(err){
      const hit=(await cache.match(req))||(await cache.match(req,{ignoreSearch:true}));
      if(hit)return hit;
      throw err;
    }
  })());
});
