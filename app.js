(function(){
const $=s=>document.querySelector(s);
/* tabs */
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#tabs button').forEach(x=>x.setAttribute('aria-selected',x===b));
  document.querySelectorAll('main section').forEach(s=>s.classList.toggle('on',s.id===b.dataset.t));
  window.scrollTo({top:0});
});
/* alias */
const A1=['Brave','Quiet','Gentle','Bright','Strong','Kind','Rising','Calm','Fearless','Warm'],A2=['Lotus','Sparrow','Jasmine','River','Moon','Tigress','Marigold','Star','Lioness','Dawn'];
let alias='';
function newAlias(){alias=A1[Math.random()*10|0]+' '+A2[Math.random()*10|0]+' '+(10+Math.random()*90|0);$('#myAlias').textContent=alias}
newAlias();$('#newAlias').onclick=newAlias;
/* stories */
let stories=[],replies=[],comms=[],cur='',db=null,local=true;
const rep=new Set();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ago=t=>{const m=(Date.now()-t)/6e4;return m<1?'just now':m<60?(m|0)+' min ago':m<1440?(m/60|0)+' h ago':(m/1440|0)+' d ago'};
function render(){
  const f=$('#feed');
  const list=stories.filter(s=>(s.cid||'')===cur&&(s.reports||0)<3);renderBar();
  if(!list.length){f.innerHTML='<div class="card meta">No stories here yet. Be the first to speak up. Your words can help another woman feel less alone. 💜</div>';return}
  f.innerHTML=list.map(s=>{
    const rs=replies.filter(r=>r.sid===s.id).sort((a,b)=>a.t-b.t);
    return '<div class="card story"><span class="tag">'+esc(s.cat)+'</span><span class="alias">'+esc(s.alias)+'</span> <span class="meta">· '+ago(s.t)+'</span><p>'+esc(s.text)+'</p>'+
    rs.map(r=>'<div class="reply"><span class="alias">'+esc(r.alias)+'</span> <span class="meta">'+ago(r.t)+'</span><br>'+esc(r.text)+'</div>').join('')+
    '<div class="row"><input data-r="'+s.id+'" maxlength="500" placeholder="Write a supportive reply…"><button class="btn alt" data-s="'+s.id+'">Reply</button><button class="btn alt sm" data-x="'+s.id+'"'+(rep.has(s.id)?' disabled>Reported':'>Report')+'</button></div></div>'}).join('');
  f.querySelectorAll('button[data-x]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.x;rep.add(id);b.disabled=true;b.textContent='Reported';
    if(db&&id[0]!=='l'){try{await db.collection('stories').doc(id).update({reports:firebase.firestore.FieldValue.increment(1)})}catch(e){console.error(e)}}
    else{const s=stories.find(x=>x.id===id);if(s)s.reports=(s.reports||0)+1}
  });
  f.querySelectorAll('button[data-s]').forEach(b=>b.onclick=()=>{
    const i=f.querySelector('input[data-r="'+b.dataset.s+'"]'),v=i.value.trim();if(!v)return;
    addReply({sid:b.dataset.s,text:v,alias,t:Date.now()});i.value=''});
}
async function addReply(r){
  if(db){try{await db.collection('replies').add(r);return}catch(e){}}
  r.id='l'+Math.random();replies.push(r);render();
}
$('#post').onclick=async()=>{
  const v=$('#txt').value.trim();if(v.length<5){$('#status').textContent='Please write a little more.';return}
  const s={text:v,cat:$('#cat').value,alias,cid:cur,t:Date.now(),reports:0};
  $('#status').textContent='';
  if(db){try{await db.collection('stories').add(s);$('#txt').value='';$('#status').textContent='Shared. Thank you for being brave 💜';return}catch(e){}}
  s.id='l'+Math.random();stories.unshift(s);$('#txt').value='';render();
  $('#status').textContent='Shared (visible only on this device right now).';
};
render();
(function(){
  try{
    if(typeof firebase==='undefined'||!window.firebaseConfig||String(firebaseConfig.apiKey).startsWith('PASTE'))return; /* no backend configured: stay in local mode */
    firebase.initializeApp(firebaseConfig);
    const c=firebase.firestore();db=c;local=false;
    const err=e=>console.error('Firestore:',e);
    c.collection('stories').orderBy('t','desc').limit(100).onSnapshot(q=>{stories=q.docs.map(d=>({id:d.id,...d.data()}));render()},err);
    c.collection('replies').orderBy('t','asc').limit(500).onSnapshot(q=>{replies=q.docs.map(d=>({id:d.id,...d.data()}));render()},err);
    c.collection('communities').orderBy('t','desc').limit(100).onSnapshot(q=>{comms=q.docs.map(d=>({id:d.id,...d.data()}));renderComms();render()},err);
  }catch(e){console.error(e)}
})();
/* communities */
const cName=id=>{const c=comms.find(x=>x.id===id);return c?c.name:'General'};
function joined(){try{return JSON.parse(localStorage.getItem('shree_joined')||'[]')}catch(e){return[]}}
function setJoined(a){try{localStorage.setItem('shree_joined',JSON.stringify(a))}catch(e){}}
function renderBar(){
  const b=$('#cbar');
  if(!cur){b.innerHTML='<div class="cbar"><span><b>General</b> · open to everyone</span><button class="btn alt sm" id="goComm">Browse communities</button></div>';$('#goComm').onclick=()=>document.querySelector('#tabs button[data-t="comm"]').click();return}
  const c=comms.find(x=>x.id===cur)||{name:'Community',desc:''};
  b.innerHTML='<div class="cbar"><span><b>👭 '+esc(c.name)+'</b><br><span class="meta">'+esc(c.desc||'')+'</span></span><button class="btn alt sm" id="goAll">← General</button></div>';
  $('#goAll').onclick=()=>{cur='';render()};
}
function renderComms(){
  const j=joined(),all=[{id:'',name:'General',desc:'The open space for every story and every woman.'}].concat(comms);
  $('#cList').innerHTML=all.map(c=>{
    const on=c.id&&j.includes(c.id);
    return '<div class="card help"><div><b>'+esc(c.name)+'</b><div class="meta">'+esc(c.desc||'')+'</div>'+(c.alias?'<div class="meta">Started by '+esc(c.alias)+'</div>':'')+'</div><div class="row" style="margin:0">'+(c.id?'<button class="btn alt sm" data-j="'+c.id+'">'+(on?'Joined ✓':'Join')+'</button>':'')+'<button class="btn sm" data-o="'+c.id+'">Open</button></div></div>'}).join('');
  $('#cList').querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{cur=b.dataset.o;render();document.querySelector('#tabs button[data-t="stories"]').click()});
  $('#cList').querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>{let a=joined();const id=b.dataset.j;a=a.includes(id)?a.filter(x=>x!==id):a.concat(id);setJoined(a);renderComms()});
}
$('#cMake').onclick=async()=>{
  const n=$('#cName').value.trim(),d=$('#cDesc').value.trim();
  if(n.length<3){$('#cStatus').textContent='Please add a name.';return}
  const c={name:n,desc:d,alias,t:Date.now()};
  if(db){try{const r=await db.collection('communities').add(c);setJoined(joined().concat(r.id))}catch(e){c.id='l'+Math.random();comms.unshift(c)}}
  else{c.id='l'+Math.random();comms.unshift(c);setJoined(joined().concat(c.id))}
  $('#cName').value='';$('#cDesc').value='';$('#cStatus').textContent='Community created 🎉';renderComms();
};
renderComms();
/* SOS */
const dlg=$('#sosDlg');let msg='';
try{$('#contact').value=localStorage.getItem('saheli_contact')||''}catch(e){}
function links(){
  const n=($('#contact').value||'').replace(/[^\d+]/g,'');
  try{localStorage.setItem('saheli_contact',$('#contact').value)}catch(e){}
  const e=encodeURIComponent(msg);
  $('#wa').href='https://wa.me/'+(n.replace('+','')||'')+'?text='+e;
  $('#sms').href='sms:'+n+'?body='+e;
}
$('#contact').oninput=links;
$('#sosBtn').onclick=()=>{
  dlg.showModal();$('#locState').style.display='block';$('#locState').textContent='Getting your location…';$('#locBox').style.display='none';
  if(!navigator.geolocation){$('#locState').innerHTML='<span class="warn">Location isn’t supported on this device. Call 112 now.</span>';return}
  navigator.geolocation.getCurrentPosition(p=>{
    const la=p.coords.latitude.toFixed(6),lo=p.coords.longitude.toFixed(6);
    msg='🚨 I need help. My live location: https://maps.google.com/?q='+la+','+lo+' (accuracy ~'+Math.round(p.coords.accuracy)+' m). Sent '+new Date().toLocaleTimeString()+'.';
    $('#locMsg').textContent=msg;$('#locState').style.display='none';$('#locBox').style.display='block';links();
  },err=>{$('#locState').innerHTML='<span class="warn">Couldn’t get location ('+esc(err.message)+'). Please allow location access, or call 112 now.</span>'},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
};
$('#share').onclick=()=>{if(navigator.share)navigator.share({text:msg}).catch(()=>{});else $('#copy').click()};
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(msg);$('#copy').textContent='Copied ✓'}catch(e){$('#copy').textContent='Select text above'}};
$('#closeDlg').onclick=()=>dlg.close();
})();
