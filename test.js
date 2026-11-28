import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const URL_='https://rfxzbuocxersgbshczbj.supabase.co',KEY='sb_publishable_CR-CJKna_rcjQi7gg1CZGQ__DnXI6Lb';
const client=createClient(URL_,KEY);
const $=id=>document.getElementById(id);
const st={seen:new Set(),ok:0,bad:0,probs:[],busy:false,reader:null,photoUrl:null,mode:'public',recent:[]};
const idInput=$('studentID'),btn=$('recordButton'),conf=$('confirmation');
function idFromScan(raw){const v=String(raw||'').trim();if(/^[0-9]{7,12}$/.test(v))return v;const m=v.match(/^(?:STUDENT[_ -]?ID|ID)[:= ]\s*([0-9]{7,12})$/i);return m?m[1]:null;}
// clock
function tick(){const d=new Date();$('clockTime').textContent=d.toLocaleTimeString('en-PH',{timeZone:'Asia/Manila',hour12:true});$('clockDate').textContent=d.toLocaleDateString('en-PH',{timeZone:'Asia/Manila',weekday:'long',month:'long',day:'numeric',year:'numeric'});}
tick();setInterval(tick,1000);
// keypad
function sync(){btn.disabled=!/^[0-9]{7,12}$/.test(idInput.value.trim());}
document.getElementById('keypad').addEventListener('click',e=>{const k=e.target.closest('.key')?.dataset.key;if(!k)return;if(k==='Clear')idInput.value='';else if(k==='Back')idInput.value=idInput.value.slice(0,-1);else if(idInput.value.length<12)idInput.value+=k;sync();});
idInput.addEventListener('input',()=>{idInput.value=idInput.value.replace(/\D/g,'').slice(0,12);sync();});
// mode
(async()=>{try{const {data:{user}}=await client.auth.getUser();if(user){const {data,error}=await client.rpc('lsc_attendance_access');if(!error&&data?.authorized){st.mode='operator';$('modeNote').textContent='Signed in: you see full details for your class. Nothing is recorded.';}}}catch{}})();
const REASONS={OFF:'The ID check is not open right now. Ask your class mayor or the LSC.',RATE_LIMITED:'Too many tries. Please wait 10 minutes.',NOT_FOUND:'ID not found. Check the number or tell the LSC.',ERROR:'Something went wrong. Try again.',NOT_ACTIVE:'ID found but not activated yet (waiting for school verification).',NOT_AVAILABLE:'Not available: the ID is wrong or not in your class. Tell the LSC.',INVALID_FORMAT:'Not a valid Student ID (7–12 digits).',INACTIVE:'ID found but not activated yet (waiting for school verification).',NO_CLASS:'No class assigned yet.'};
async function publicCheck(id){const r=await fetch(URL_+'/functions/v1/lsc-id-check',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify({student_id:id}),cache:'no-store'});return await r.json().catch(()=>({status:'ERROR'}));}
async function operatorPhoto(id){try{const {data:{session}}=await client.auth.getSession();if(!session?.access_token)return null;const r=await fetch(URL_+'/functions/v1/lsc-student-photo',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({student_id:id}),cache:'no-store'});if(!r.ok)return null;const b=await r.blob();if(!/^image\/(jpeg|png|webp)$/.test(b.type)||!b.size||b.size>5*1024*1024)return null;return URL.createObjectURL(b);}catch{return null}}
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;};
function showOk(d,id){
  conf.replaceChildren();
  const card=el('div','result arrival-result');
  card.append(el('div','eyebrow arrival-eyebrow','ID WORKS — TEST ONLY'));
  const layout=el('div','arrival-layout'),frame=el('div','arrival-photo'),ph=el('div','arrival-photo-placeholder');
  ph.append(el('span','arrival-placeholder-icon','👤'),el('span','',d.photo_enabled===false?'Photo off':'No photo'));frame.append(ph);
  const det=el('div','arrival-details');
  det.append(el('h3','arrival-name',st.mode==='public'?d.masked_name:d.full_name),el('p','arrival-section',[d.grade_level,d.section].filter(Boolean).join(' · ')));
  det.append(el('div','arrival-time-label',st.mode==='public'?'STATUS':'NEXT REAL SCAN'),el('strong','arrival-time',st.mode==='public'?'ID is working ✓':'Time '+d.next_event));
  if(st.mode!=='public')det.append(el('div','arrival-student-id','ID '+d.student_id));
  det.append(el('div','arrival-operator','Nothing was recorded.'));
  layout.append(frame,det);card.append(layout);conf.append(card);
  const setImg=u=>{const im=el('img','arrival-photo-image');im.alt='Student photo';im.onload=()=>ph.remove();im.onerror=()=>im.remove();im.src=u;frame.append(im);};
  if(st.mode==='public'){if(d.photo)setImg(d.photo);}
  else operatorPhoto(id).then(u=>{if(u){st.photoUrl=u;setImg(u);}});
}
function showBad(status,d){
  conf.replaceChildren();
  const soft=['INACTIVE','NOT_ACTIVE','OFF','RATE_LIMITED','ERROR'].includes(status);
  const card=el('div','result '+(soft?'warn':'err'));
  card.append(el('div','eyebrow',['OFF','RATE_LIMITED','ERROR'].includes(status)?'CANNOT CHECK RIGHT NOW':soft?'NOT WORKING YET':'ID DOES NOT WORK'));
  card.append(el('div','result-title',['OFF','RATE_LIMITED','ERROR'].includes(status)?'Try again later':soft?'Not activated yet':'ID not working'));
  card.append(el('div','result-meta',(d?.full_name?d.full_name+'\n':'')+(REASONS[status]||status)+'\nTell your class mayor or the LSC so it can be fixed.'));
  card.querySelector('.result-meta').style.whiteSpace='pre-line';conf.append(card);
}
function recent(kind,name,sub,id){
  st.recent.unshift({kind,name,sub,t:new Date().toLocaleTimeString('en-PH',{timeZone:'Asia/Manila',hour:'numeric',minute:'2-digit'})});st.recent=st.recent.slice(0,5);
  const box=$('recentScans');box.replaceChildren();if(!st.recent.length)return;
  box.append(el('div','recent-title','LAST 5 CHECKS'));
  st.recent.forEach(r=>{const row=el('div','recent-row '+(r.kind==='ok'?'in':r.kind==='warn'?'queued':'err'));row.append(el('span','recent-tag',r.kind==='ok'?'ID WORKS':r.kind==='warn'?'NOT YET':'NOT WORKING'));const w=el('div','recent-who');w.append(el('b','',r.name),el('small','',r.sub));row.append(w,el('time','',r.t));box.append(row);});
}
async function check(id){
  if(st.busy)return;st.busy=true;btn.disabled=true;
  if(st.photoUrl){URL.revokeObjectURL(st.photoUrl);st.photoUrl=null;}
  conf.replaceChildren();conf.append(el('p','scanner-status','Checking…'));
  try{
    let d;
    if(st.mode==='operator'){const r=await client.rpc('lsc_check_student_id',{p_student_id:id});if(r.error)throw r.error;d=r.data;}
    else d=await publicCheck(id);
    const first=!st.seen.has(id);st.seen.add(id);
    const nm=st.mode==='public'?d.masked_name:d.full_name;
    if(d.status==='VALID'){if(first)st.ok++;showOk(d,id);recent('ok',nm,[d.grade_level,d.section].filter(Boolean).join(' · '));}
    else{
      if(first){st.bad++;st.probs.push(id+': '+(REASONS[d.status]||d.status));}
      showBad(d.status,d);recent(['INACTIVE','NOT_ACTIVE'].includes(d.status)?'warn':'err',id,REASONS[d.status]||d.status);
    }
  }catch(e){showBad('ERROR');}
  st.busy=false;sync();
}
$('studentForm').addEventListener('submit',e=>{e.preventDefault();const id=idFromScan(idInput.value);if(id)check(id);});
// camera
async function stopCam(){try{if(st.reader){await st.reader.stop();st.reader.clear();}}catch{}st.reader=null;$('scannerPlaceholder').hidden=false;$('cameraStatus').textContent='Camera is not active.';}
async function startCam(){
  try{
    if(!window.Html5Qrcode)await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s);});
    st.reader=new window.Html5Qrcode('attendanceReader',{verbose:false});let last='',lt=0;
    await st.reader.start({facingMode:'environment'},{fps:10,qrbox:{width:210,height:180}},raw=>{const id=idFromScan(raw);const now=Date.now();if(!id||(id===last&&now-lt<4000))return;last=id;lt=now;idInput.value=id;sync();check(id);},()=>{});
    $('scannerPlaceholder').hidden=true;$('cameraStatus').textContent='Camera ready. Show the ID QR code.';
  }catch{await stopCam();$('cameraStatus').textContent='Camera could not start. Allow camera access or type the ID.';$('cameraStatus').classList.add('failed');$('restartCameraButton').hidden=false;}
}
function method(m){
  const cam=m==='camera';
  $('manualMethodButton').classList.toggle('selected',!cam);$('cameraMethodButton').classList.toggle('selected',cam);
  $('manualMethodButton').setAttribute('aria-selected',String(!cam));$('cameraMethodButton').setAttribute('aria-selected',String(cam));
  $('manualAttendancePanel').hidden=cam;$('cameraAttendancePanel').hidden=!cam;
  if(cam)startCam();else stopCam();
}
$('manualMethodButton').onclick=()=>method('manual');$('cameraMethodButton').onclick=()=>method('camera');
$('restartCameraButton').onclick=()=>{$('restartCameraButton').hidden=true;$('cameraStatus').classList.remove('failed');startCam();};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&st.reader){stopCam();}});
