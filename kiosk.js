// Gate kiosk mode for the attendance terminal (student.html). student.js calls window.lscKiosk.*
(function(){
  const $=s=>document.querySelector(s);
  const SOUND_KEY='lsc_kiosk_sound';
  const hist=[],cache=new Map();let ac=null,soundOn=true,resetT=null,lastId=null,fsTried=false,wake=null,built=false;
  try{soundOn=localStorage.getItem(SOUND_KEY)!=='0'}catch(e){}
  function build(){
    if(built)return;built=true;
    const k=document.createElement('div');k.id='kiosk';
    k.innerHTML=
     '<div class="k-top">'+
       '<div class="k-brand"><img src="./assets/lsc-glass-logo.png?v=2" alt=""><div><b>LSC Attendance</b><span>LHS WEEK · GATE SCANNER</span></div></div>'+
       '<span class="k-chip" id="kStation"><i></i><em style="font-style:normal">Checking…</em></span>'+
       '<span class="k-chip" id="kNet"><i></i><em style="font-style:normal">Online</em></span>'+
       '<div class="k-clock"><b id="kClock">--:--:--</b><span id="kDate"></span></div>'+
       '<button type="button" class="k-btn" id="kSound"></button>'+
       '<button type="button" class="k-btn" id="kExit">Exit kiosk</button>'+
     '</div>'+
     '<div class="k-body">'+
       '<div class="k-cam" id="kCam"><div class="k-lock" id="kLock"><div>Scanner locked</div><div style="font:600 16px Poppins,sans-serif;opacity:.85">A Class Mayor, Official or approved volunteer must sign in on this device.</div><a href="./login.html">Open sign-in ↗</a></div></div>'+
       '<div class="k-right"><div class="k-res idle" id="kRes"><div class="k-kind" id="kKind">READY</div><div class="k-photowrap" id="kPW"><img class="k-photo" id="kPhoto" alt=""><div class="k-nophoto" id="kNP">NO PHOTO ON FILE<small>Check the ID carefully</small></div></div><div class="k-name" id="kName">Hold your ID QR to the camera</div><div class="k-sub" id="kSub"></div><div class="k-time" id="kTime"></div><div class="k-note" id="kNote"></div></div><div class="k-hist" id="kHist" aria-label="Last scans"></div></div>'+
     '</div>';
    document.body.append(k);
    const f=document.createElement('div');f.id='kFlash';f.setAttribute('aria-hidden','true');document.body.append(f);
    $('#kExit').onclick=exit;
    $('#kSound').onclick=()=>{soundOn=!soundOn;try{localStorage.setItem(SOUND_KEY,soundOn?'1':'0')}catch(e){}paintSound();if(soundOn){unlock();beep('in')}};
    paintSound();
  }
  function paintSound(){const b=$('#kSound');if(b)b.textContent=soundOn?'🔊 Sound on':'🔇 Sound off';}
  function unlock(){
    try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){}
  }
  function tone(freq,start,dur,type,vol){
    if(!ac)return;
    const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+start;
    o.type=type||'sine';o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||.35,t+.01);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+dur+.02);
  }
  function beep(kind){
    if(!soundOn)return;unlock();
    if(kind==='in'){tone(660,0,.12);tone(880,.13,.18);}
    else if(kind==='out'){tone(880,0,.12);tone(587,.13,.2);}
    else if(kind==='dup'){tone(440,0,.22,'triangle');}
    else if(kind==='queued'){tone(620,0,.1);tone(620,.16,.1);}
    else{tone(180,0,.45,'sawtooth',.28);}
  }
  const LABEL={in:'TIME IN',out:'TIME OUT',dup:'ALREADY SCANNED',queued:'SAVED OFFLINE',err:'NOT RECORDED'};
  const ICON={in:'✓',out:'✓',dup:'•',queued:'↻',err:'✕'};
  // o: {kind, name, sub, time, note, id}
  function signal(o){
    if(!document.body.classList.contains('kiosk'))return;
    const kind=o.kind;lastId=o.id||null;
    const res=$('#kRes');res.className='k-res '+kind;
    $('#kKind').textContent=LABEL[kind]||'';
    $('#kName').textContent=o.name||'';
    $('#kSub').textContent=o.sub||'';
    $('#kTime').textContent=o.time||'';
    $('#kNote').textContent=o.note||'';
    const p=$('#kPhoto');p.classList.remove('on');p.removeAttribute('src');
    const person=kind==='in'||kind==='out'||kind==='dup';
    $('#kPW').style.display=person?'block':'none';$('#kNP').style.display=person?'flex':'none';
    if(person&&o.id){const c=cache.get(o.id);if(c){cache.delete(o.id);cache.set(o.id,c);showPhoto(c);}}
    hist.unshift({kind,name:kind==='err'?(o.note||'Not recorded'):o.name,time:o.time||'',id:o.id||null});
    if(hist.length>5)hist.pop();paintHist();
    const fl=$('#kFlash');fl.className='';fl.textContent=ICON[kind]||'';void fl.offsetWidth;fl.className=kind+' go';
    beep(kind);
    try{if(navigator.vibrate)navigator.vibrate(kind==='err'?[200,80,200]:60)}catch(e){}
    clearTimeout(resetT);resetT=setTimeout(idle,kind==='err'?5000:3500);
  }
  function showPhoto(url){
    const p=$('#kPhoto');p.onload=()=>{p.classList.add('on');$('#kNP').style.display='none';};p.src=url;
  }
  function paintHist(){
    const h=$('#kHist');if(!h)return;h.replaceChildren();
    hist.forEach((x,i)=>{
      const c=document.createElement('div');c.className='k-h '+x.kind+(i===0?' cur':'');
      const t=cache.get(x.id);
      if(t){const im=document.createElement('img');im.src=t;im.alt='';c.append(im);}
      else{const d=document.createElement('span');d.className='k-hdot';d.textContent=({in:'IN',out:'OUT',dup:'DUP',queued:'OFF',err:'✕'})[x.kind]||'';c.append(d);}
      const b=document.createElement('div');b.className='k-htxt';
      const n=document.createElement('b');n.textContent=x.name||'';
      const m=document.createElement('small');m.textContent=(({in:'IN',out:'OUT',dup:'Again',queued:'Offline',err:'Failed'})[x.kind]||'')+(x.time?' '+x.time.replace(/:\d\d (AM|PM)$/i,' $1'):'');
      b.append(n,m);c.append(b);h.append(c);
    });
  }
  function idle(){
    lastId=null;
    const res=$('#kRes');if(!res)return;res.className='k-res idle';
    $('#kKind').textContent='READY';$('#kName').textContent='Hold your ID QR to the camera';
    ['kSub','kTime','kNote'].forEach(i=>$('#'+i).textContent='');
    const p=$('#kPhoto');p.classList.remove('on');p.removeAttribute('src');
    $('#kPW').style.display='none';$('#kNP').style.display='none';
  }
  async function photo(url,id,own){
    if(!url||!id||!document.body.classList.contains('kiosk'))return;
    let copy=cache.get(id);
    if(!copy){
      try{const b=await (await fetch(url)).blob();copy=URL.createObjectURL(b);}catch(e){copy=null}
      if(own){try{URL.revokeObjectURL(url)}catch(e){}}
      if(!copy)return;
      cache.set(id,copy);
      while(cache.size>40){const k=cache.keys().next().value;try{URL.revokeObjectURL(cache.get(k))}catch(e){}cache.delete(k);}
    }else if(own){try{URL.revokeObjectURL(url)}catch(e){}}
    if(id===lastId)showPhoto(copy);
    paintHist();
  }
  const cachedPhoto=id=>cache.has(id);
  // d: {ready, demo, label, queued, offline}
  function tick(d){
    if(!built)return;
    const now=new Date();
    $('#kClock').textContent=now.toLocaleTimeString('en-PH',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit',second:'2-digit'});
    $('#kDate').textContent=now.toLocaleDateString('en-PH',{timeZone:'Asia/Manila',weekday:'long',month:'long',day:'numeric'})+' · PHT';
    const st=$('#kStation');st.className='k-chip '+(d.ready?(d.demo?'warn':'ok'):'');
    st.querySelector('em').textContent=d.demo?'Demo mode':d.ready?(d.label||'Station ready'):'Sign-in required';
    const nt=$('#kNet');
    nt.className='k-chip '+(d.offline?'warn':'ok');
    nt.querySelector('em').textContent=d.offline?'Offline'+(d.queued?' · '+d.queued+' saved':''):(d.queued?'Syncing '+d.queued:'Online');
    $('#kiosk').classList.toggle('locked',!d.ready);
  }
  async function wakeLock(){
    try{if('wakeLock' in navigator&&!wake){wake=await navigator.wakeLock.request('screen');wake.addEventListener('release',()=>{wake=null});}}catch(e){}
  }
  function firstGesture(){
    unlock();
    if(!fsTried&&!document.fullscreenElement&&document.documentElement.requestFullscreen){fsTried=true;document.documentElement.requestFullscreen().catch(()=>{});}
    wakeLock();
  }
  function enter(fromGesture){
    build();
    const panel=$('#cameraAttendancePanel');
    document.body.classList.add('kiosk');
    $('#kCam').prepend(panel);
    idle();
    window.dispatchEvent(new CustomEvent('kiosk:enter'));
    if(fromGesture)firstGesture();
    else document.addEventListener('pointerdown',firstGesture,{once:true});
    try{history.replaceState(null,'',location.pathname+'?kiosk=1')}catch(e){}
  }
  function exit(){
    if(!document.body.classList.contains('kiosk'))return;
    clearTimeout(resetT);
    const panel=$('#cameraAttendancePanel'),att=$('#cameraAttendancePanel')&&document.querySelector('#confirmation');
    document.body.classList.remove('kiosk');
    if(att)att.parentNode.insertBefore(panel,att);
    fsTried=false;
    if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    if(wake){wake.release().catch(()=>{});wake=null;}
    window.dispatchEvent(new CustomEvent('kiosk:exit'));
    try{history.replaceState(null,'',location.pathname)}catch(e){}
  }
  // USB/Bluetooth barcode scanners type the ID like a keyboard and press Enter
  let buf='',lastKey=0;
  document.addEventListener('keydown',e=>{
    if(!document.body.classList.contains('kiosk'))return;
    const now=Date.now();if(now-lastKey>300)buf='';lastKey=now;
    if(/^[0-9]$/.test(e.key))buf+=e.key;
    else if(e.key==='Enter'){if(/^[0-9]{7,12}$/.test(buf))window.dispatchEvent(new CustomEvent('kiosk:id',{detail:buf}));buf='';}
    else if(e.key==='Escape'){}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.body.classList.contains('kiosk'))wakeLock();});
  window.lscKiosk={enter,exit,signal,photo,cachedPhoto,tick,isOn:()=>document.body.classList.contains('kiosk')};
  document.addEventListener('DOMContentLoaded',()=>{
    const b=$('#kioskButton');if(b)b.addEventListener('click',()=>enter(true));
    if(new URLSearchParams(location.search).get('kiosk')==='1')enter(false);
  });
})();
