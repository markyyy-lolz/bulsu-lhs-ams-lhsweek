// Gate kiosk mode for the attendance terminal (student.html). student.js calls window.lscKiosk.*
(function(){
  const $=s=>document.querySelector(s);
  const SOUND_KEY='lsc_kiosk_sound';
  let ac=null,soundOn=true,resetT=null,lastId=null,fsTried=false,wake=null,built=false;
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
       '<div class="k-res idle" id="kRes"><div class="k-kind" id="kKind">READY</div><img class="k-photo" id="kPhoto" alt=""><div class="k-name" id="kName">Hold your ID QR to the camera</div><div class="k-sub" id="kSub"></div><div class="k-time" id="kTime"></div><div class="k-note" id="kNote"></div></div>'+
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
    const fl=$('#kFlash');fl.className='';fl.textContent=ICON[kind]||'';void fl.offsetWidth;fl.className=kind+' go';
    beep(kind);
    try{if(navigator.vibrate)navigator.vibrate(kind==='err'?[200,80,200]:60)}catch(e){}
    clearTimeout(resetT);resetT=setTimeout(idle,kind==='err'?5000:3500);
  }
  function idle(){
    lastId=null;
    const res=$('#kRes');if(!res)return;res.className='k-res idle';
    $('#kKind').textContent='READY';$('#kName').textContent='Hold your ID QR to the camera';
    ['kSub','kTime','kNote'].forEach(i=>$('#'+i).textContent='');
    const p=$('#kPhoto');p.classList.remove('on');p.removeAttribute('src');
  }
  function photo(url,id){
    if(!url||!document.body.classList.contains('kiosk')||id!==lastId)return;
    const p=$('#kPhoto');p.onload=()=>p.classList.add('on');p.src=url;
  }
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
  window.lscKiosk={enter,exit,signal,photo,tick,isOn:()=>document.body.classList.contains('kiosk')};
  document.addEventListener('DOMContentLoaded',()=>{
    const b=$('#kioskButton');if(b)b.addEventListener('click',()=>enter(true));
    if(new URLSearchParams(location.search).get('kiosk')==='1')enter(false);
  });
})();
