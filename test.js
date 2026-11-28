import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const URL_='https://rfxzbuocxersgbshczbj.supabase.co',KEY='sb_publishable_CR-CJKna_rcjQi7gg1CZGQ__DnXI6Lb';
const client=createClient(URL_,KEY);
const $=id=>document.getElementById(id);
const esc=v=>String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DRILL=5;
const st={seen:new Set(),ok:0,bad:0,probs:[],busy:false,reader:null,photoUrl:null};
function idFromScan(raw){const v=String(raw||'').trim();if(/^[0-9]{7,12}$/.test(v))return v;const m=v.match(/^(?:STUDENT[_ -]?ID|ID)[:= ]\s*([0-9]{7,12})$/i);return m?m[1]:null;}
let MODE='public';
async function auth(){
  $('authCard').hidden=true;$('app').hidden=false;
  try{
    const {data:{user}}=await client.auth.getUser();
    if(user){const {data,error}=await client.rpc('lsc_attendance_access');if(!error&&data?.authorized){MODE='operator';$('modeNote').textContent='Signed in: you see full details for your class.';return;}}
  }catch{}
  $('modeNote').textContent='No sign-in needed. Name is partly hidden for privacy.';
}
async function publicCheck(id){
  const r=await fetch(URL_+'/functions/v1/lsc-id-check',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify({student_id:id}),cache:'no-store'});
  return await r.json().catch(()=>({status:'ERROR'}));
}
async function photo(id){
  try{
    const {data:{session}}=await client.auth.getSession();if(!session?.access_token)return null;
    const r=await fetch(URL_+'/functions/v1/lsc-student-photo',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({student_id:id}),cache:'no-store'});
    if(!r.ok)return null;const b=await r.blob();
    if(!/^image\/(jpeg|png|webp)$/.test(b.type)||!b.size||b.size>5*1024*1024)return null;
    return URL.createObjectURL(b);
  }catch{return null}
}
function tally(){
  $('tN').textContent=st.seen.size;$('tOk').textContent=st.ok;$('tBad').textContent=st.bad;
  const n=Math.min(st.seen.size,DRILL);$('bar').style.width=(n/DRILL*100)+'%';
  $('drill').textContent=n>=DRILL?'🎉 Drill complete! You know how to check IDs.':n+' / '+DRILL+' checked';
  $('probs').innerHTML=st.probs.map(p=>'<li class="bad-li">'+esc(p)+'</li>').join('');
  $('copy').hidden=!st.probs.length;
}
const REASONS={OFF:'The ID check is not open right now. Ask your class mayor or the LSC.',RATE_LIMITED:'Too many tries. Please wait 10 minutes.',NOT_FOUND:'ID not found — check the number or tell the LSC',ERROR:'Something went wrong. Try again.',NOT_ACTIVE:'ID found but not activated yet (waiting for school verification)',NOT_AVAILABLE:'Not available — ID is wrong or not in your class',INVALID_FORMAT:'Not a valid Student ID',INACTIVE:'Not activated yet (waiting for school verification)',NO_CLASS:'No class assigned'};
async function check(id){
  if(st.busy)return;st.busy=true;
  const card=$('resCard'),res=$('res');card.hidden=false;res.innerHTML='<p class="muted">Checking…</p>';
  if(st.photoUrl){URL.revokeObjectURL(st.photoUrl);st.photoUrl=null;}
  try{
    let data;
    if(MODE==='operator'){const r=await client.rpc('lsc_check_student_id',{p_student_id:id});if(r.error)throw r.error;data=r.data;}
    else data=await publicCheck(id);
    const first=!st.seen.has(id);st.seen.add(id);
    if(data.status==='VALID'){
      if(first)st.ok++;
      const pub=MODE==='public';
      res.innerHTML='<div class="res ok"><div class="big" style="color:var(--green)">✅ ID works</div><div id="phw">'+(pub?(data.photo?'<img class="ph" alt="Student photo" src="'+esc(data.photo)+'">':(data.photo_enabled?'<div class="ph empty">No photo on file</div>':'')):'<div class="ph empty">Loading photo…</div>')+'</div><div class="nm">'+esc(pub?data.masked_name:data.full_name)+'</div><div>'+esc(data.grade_level)+' · '+esc(data.section)+'</div>'+(pub?'':'<div class="muted">'+esc(data.student_id)+'</div><p class="muted" style="margin-top:8px">A real scan now would record <b>Time '+esc(data.next_event)+'</b>. (Nothing was recorded.)</p>')+(pub?'<p class="muted" style="margin-top:8px">Your ID is working. (Nothing was recorded.)</p>':'')+'</div>';
      if(!pub)photo(id).then(u=>{const w=$('phw');if(!w)return;if(u){st.photoUrl=u;w.innerHTML='<img class="ph" alt="Student photo" src="'+u+'">';}else w.innerHTML='<div class="ph empty">No photo on file</div>';});
    }else{
      if(first){st.bad++;st.probs.push(id+' — '+(REASONS[data.status]||data.status)+(data.full_name?' ('+data.full_name+')':''));}
      const warn=data.status==='INACTIVE'||data.status==='NOT_ACTIVE'||data.status==='OFF'||data.status==='RATE_LIMITED'||data.status==='ERROR';
      res.innerHTML='<div class="res '+(warn?'warn':'bad')+'"><div class="big" style="color:'+(warn?'var(--orange)':'var(--red)')+'">'+(data.status==='OFF'||data.status==='RATE_LIMITED'||data.status==='ERROR'?'⚠️ Cannot check right now':warn?'⚠️ Not working yet':'❌ ID does not work')+'</div>'+(data.full_name?'<div class="nm">'+esc(data.full_name)+'</div><div>'+esc(data.grade_level||'')+' · '+esc(data.section||'')+'</div>':'')+'<p style="margin-top:8px">'+esc(REASONS[data.status]||data.status)+'</p><p class="muted">Tell your class mayor or the LSC so it can be fixed.</p></div>';
    }
    tally();
  }catch(e){res.innerHTML='<div class="res bad"><div class="big">Could not check</div><p class="muted">'+esc(e.message||'Network error')+'</p></div>';}
  st.busy=false;
}
$('f').addEventListener('submit',e=>{e.preventDefault();const id=idFromScan($('sid').value);if(!id){$('resCard').hidden=false;$('res').innerHTML='<div class="res bad"><div class="big">Enter 7–12 digits</div></div>';return;}check(id);$('sid').select();});
async function stopCam(){try{if(st.reader){await st.reader.stop();st.reader.clear();}}catch{}st.reader=null;$('reader').hidden=true;$('camBtn').textContent='📷 Scan with camera';}
$('camBtn').addEventListener('click',async()=>{
  if(st.reader)return stopCam();
  try{
    if(!window.Html5Qrcode)await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s);});
    $('reader').hidden=false;$('camBtn').textContent='⏹ Stop camera';
    st.reader=new window.Html5Qrcode('reader',{verbose:false});let last='',lt=0;
    await st.reader.start({facingMode:'environment'},{fps:10,qrbox:{width:220,height:220}},raw=>{
      const id=idFromScan(raw);const now=Date.now();if(!id||(id===last&&now-lt<4000))return;last=id;lt=now;$('sid').value=id;check(id);
    },()=>{});
  }catch{await stopCam();alert('Camera could not start. Allow camera access or type the ID.');}
});
$('copy').addEventListener('click',()=>{navigator.clipboard?.writeText(st.probs.join('\n')).then(()=>{$('copy').textContent='Copied ✓';setTimeout(()=>$('copy').textContent='Copy problem list',1500);});});
$('reset').addEventListener('click',()=>{st.seen.clear();st.ok=0;st.bad=0;st.probs=[];$('resCard').hidden=true;tally();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCam();});
auth();tally();
