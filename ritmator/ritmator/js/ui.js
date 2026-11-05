/* Ritmator - ui
   Panels, buttons, sliders, keyboard shortcuts (wiring only; loaded last).
   Classic script (no modules): top-level names are shared by every file in js/. */
/* ---------- UI ---------- */
const selBone=()=>$('bone').value;
function refresh(){
  const sb=$('bone').value;
  $('bone').innerHTML=bones.map(b=>'<option>'+b.name+'</option>').join('');
  if(bones.some(b=>b.name===sb))$('bone').value=sb;
  $('clips').innerHTML=clips.map((c,i)=>'<option value="'+i+'">'+c.name+'</option>').join('');
  if(cur)$('clips').value=clips.indexOf(cur);
  $('info').textContent=root?(bones.length+' bones, '+clips.length+' clips'):'No model loaded';
  syncClip();syncTime();applyPose();syncSliders();ticks();
}
function syncClip(){$('cname').value=cur?cur.name:'';$('cdur').value=cur?cur.dur:'';$('tt').max=cur?cur.dur:1}
function syncTime(){$('tt').value=t;$('tlab').textContent=t.toFixed(2)+' / '+(cur?cur.dur:0).toFixed(2)}
function syncSliders(){
  const s=cur&&sample(cur.tr[selBone()],t),e=s?s.e:[0,0,0];
  ['x','y','z'].forEach((a,i)=>{$('r'+a).value=e[i];$('v'+a).textContent=Math.round(e[i])});
}
function ticks(){
  const el=$('ticks');el.innerHTML='';if(!cur)return;
  (cur.tr[selBone()]||[]).forEach(k=>{const i=document.createElement('i');i.style.left=(k.t/cur.dur*100)+'%';i.title=k.t.toFixed(2)+'s';i.onclick=()=>{t=k.t;stopPlay();syncTime();applyPose();syncSliders()};el.appendChild(i)});
}
function ensureClip(){if(!cur){addPreset('empty');refresh()}return cur}
function putKey(nm,e,p){
  const c=ensureClip();if(!nm)return;
  const tk=c.tr[nm]||(c.tr[nm]=[]),k=tk.find(x=>Math.abs(x.t-t)<.002);
  if(k){k.e=e;if(p)k.p=p}else{const o={t:+t.toFixed(3),e};if(p)o.p=p;tk.push(o);tk.sort((a,b)=>a.t-b.t)}
}
function setKey(e){snap('key');putKey(selBone(),e);applyPose();ticks()}
const curEuler=()=>['x','y','z'].map(a=>+$('r'+a).value);
['x','y','z'].forEach(a=>$('r'+a).addEventListener('input',()=>{
  $('v'+a).textContent=$('r'+a).value;stopPlay();
  if($('auto').checked)setKey(curEuler());
  else{const b=bmap[selBone()];if(b){const e=curEuler();_e.set(e[0]*D,e[1]*D,e[2]*D,'XYZ');b.quaternion.copy(b.userData.rest).multiply(_q.setFromEuler(_e));root.updateMatrixWorld(true)}}
}));
$('setk').onclick=()=>setKey(curEuler());
$('delk').onclick=()=>{if(!cur)return;const tk=cur.tr[selBone()];if(!tk)return;const i=tk.findIndex(x=>Math.abs(x.t-t)<.002);if(i>=0){snap('');tk.splice(i,1)}applyPose();syncSliders();ticks()};
$('clrb').onclick=()=>{if(cur){snap('');delete cur.tr[selBone()];applyPose();syncSliders();ticks()}};
$('zerob').onclick=()=>{if(!cur)return;snap('');putKey(selBone(),[0,0,0]);applyPose();syncSliders();ticks()};
$('bone').onchange=()=>{syncSliders();ticks();wvPaint()};
$('tt').oninput=e=>{t=+e.target.value;stopPlay();syncTime();applyPose();syncSliders()};
$('play').onclick=()=>{if(!cur)return;playing=!playing;if(playing&&t>=cur.dur)t=0;$('play').textContent=playing?'Pause':'Play'};
$('spd').onchange=e=>{speed=+e.target.value};
$('smooth').onchange=()=>{smoothOn=$('smooth').checked;applyPose();syncSliders()};
$('clips').onchange=e=>{cur=clips[+e.target.value];t=0;stopPlay();syncClip();syncTime();applyPose();syncSliders();ticks()};
$('cname').onchange=e=>{if(cur){snap('');cur.name=e.target.value.trim()||cur.name;refresh()}};
$('cdur').onchange=e=>{if(!cur)return;snap('');const d=Math.max(.1,+e.target.value||cur.dur),f=d/cur.dur;for(const n in cur.tr)cur.tr[n].forEach(k=>k.t*=f);cur.dur=d;t=Math.min(t*f,d);refresh()};
$('cdel').onclick=()=>{if(!cur)return;snap('');clips.splice(clips.indexOf(cur),1);cur=clips[0]||null;t=0;refresh()};
$('cdup').onclick=()=>{if(!cur)return;snap('');const c=JSON.parse(JSON.stringify(cur));let nm=cur.name+'_copy',i=1;while(clips.some(x=>x.name===nm))nm=cur.name+'_copy'+(++i);c.name=nm;clips.push(c);cur=c;t=0;refresh()};
document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{if(!root)return say('Load a model first');if(!bones.length)return say('Auto rig the model first');if(mmode)return say('Finish the manual rig first (Apply rig or Cancel)');snap('');addPreset(b.dataset.p);refresh()});
$('skel').onchange=e=>{if(helper)helper.visible=e.target.checked&&!mmode};
$('load').onclick=()=>$('file').click();
$('file').onchange=e=>{const f=e.target.files[0];if(f)f.arrayBuffer().then(loadBuf);e.target.value=''};
$('arms').onchange=()=>{armAng=ARMS[$('arms').value];lastJoints=null};
$('prop').onchange=()=>{lastJoints=null};
$('rig').onclick=()=>{if(!confirmReplace())return;say('Rigging...');setTimeout(autoRig,30)};
$('mrig').onclick=enterManual;
$('demob').onclick=()=>loadDemo($('demo').value,true);
$('fit').onclick=fitModel;
['x','y','z'].forEach(a=>{$('xr'+a).oninput=e=>xfSet('r'+a,+e.target.value);$('xp'+a).oninput=e=>xfSet('p'+a,+e.target.value)});
$('xs').onchange=e=>xfSet('s',Math.max(.001,+e.target.value||1));
document.querySelectorAll('[data-xr]').forEach(b=>b.onclick=()=>{if(!xfGuard())return;const k='r'+b.dataset.xr[0],d=+b.dataset.xr.slice(1);xf[k]=wrap180(xf[k]+d);applyXf();xfUI();});
$('xground').onclick=()=>{if(xfGuard())groundIt()};
$('xreset').onclick=()=>{if(!xfGuard())return;xf={rx:0,ry:0,rz:0,px:0,py:0,pz:0,s:1};applyXf();xfUI()};
$('xarrow').onchange=placeArrow;
$('turn').onclick=()=>turnModel(false);
$('jsel').onchange=e=>{if(mmode)selectJoint(e.target.value)};
$('jreset').onclick=()=>{if(!mmode)return;exitManual();lastJoints=null;enterManual()};
$('japply').onclick=applyManual;
$('jcenter').onclick=centerJoints;
$('jcancel').onclick=()=>{exitManual();say(bones.length?'Manual rig cancelled.':'Manual rig cancelled. Model has no skeleton yet.')};
$('wpow').oninput=()=>{$('wpv').textContent=$('wpow').value};
$('wsmooth').onclick=()=>smoothWeights(2);
$('wview').onchange=e=>{if(!isRig()&&!bones.length){e.target.checked=false;return say('Rig the model first')}wvSet(e.target.checked)};
/* pose tools */
$('undo').onclick=undo;$('redo').onclick=redo;
$('keyall').onclick=()=>{if(!bones.length)return;snap('');ensureClip();bones.forEach(b=>{const s=cur.tr[b.name]&&sample(cur.tr[b.name],t);putKey(b.name,s?s.e.slice():[0,0,0],s&&s.p?s.p.slice():null)});applyPose();ticks();say('Keyed all bones at '+t.toFixed(2)+'s')};
$('pcopy').onclick=()=>{if(!cur)return say('No clip selected');poseClip={};bones.forEach(b=>{const s=cur.tr[b.name]&&sample(cur.tr[b.name],t);poseClip[b.name]={e:s?s.e.slice():[0,0,0],p:s&&s.p?s.p.slice():null}});say('Pose copied from '+t.toFixed(2)+'s')};
$('ppaste').onclick=()=>{if(!poseClip)return say('Copy a pose first');snap('');ensureClip();for(const n in poseClip)if(bmap[n])putKey(n,poseClip[n].e.slice(),poseClip[n].p?poseClip[n].p.slice():null);applyPose();syncSliders();ticks();say('Pose pasted at '+t.toFixed(2)+'s')};
$('cmir').onclick=()=>{
  if(!cur)return;snap('');const out={};
  for(const nm in cur.tr){
    let tn=nm.replace(/_L$/,'_#').replace(/_R$/,'_L').replace(/_#$/,'_R');if(!bmap[tn])tn=nm;
    out[tn]=cur.tr[nm].map(k=>{const o={t:k.t,e:[k.e[0],-k.e[1],-k.e[2]]};if(k.p)o.p=[-k.p[0],k.p[1],k.p[2]];return o});
  }
  cur.tr=out;applyPose();syncSliders();ticks();say('Clip mirrored left <-> right');
};
$('crev').onclick=()=>{if(!cur)return;snap('');for(const n in cur.tr){cur.tr[n]=cur.tr[n].map(k=>Object.assign({},k,{t:+(cur.dur-k.t).toFixed(4)})).sort((a,b)=>a.t-b.t)}applyPose();syncSliders();ticks();say('Clip reversed')};
$('cloop').onclick=()=>{if(!cur)return;snap('');for(const n in cur.tr){const tk=cur.tr[n];if(!tk.length)continue;const f=tk[0],l=tk[tk.length-1],c={t:cur.dur,e:f.e.slice()};if(f.p)c.p=f.p.slice();if(Math.abs(l.t-cur.dur)<.002){l.e=c.e;if(c.p)l.p=c.p}else tk.push(c)}applyPose();ticks();say('Last key now matches the first key, so the clip loops cleanly')};
/* light + view */
['lkey','lfill','lrim','lamb','lexp','laz','lel'].forEach(id=>$(id).addEventListener('input',applyLight));
['lshadow','lgrid','lspin','ltone'].forEach(id=>$(id).addEventListener('change',applyLight));
document.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{const p=LP[b.dataset.l];for(const id in p)$(id).value=p[id];applyLight()});
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>setView(b.dataset.v));
$('bgc').oninput=e=>{bgCustom=e.target.value;clearBg()};
$('bgr').onclick=()=>{bgCustom=null;clearBg()};
const vpEl=$('vp');
['dragover','drop'].forEach(ev=>window.addEventListener(ev,e=>e.preventDefault()));
vpEl.ondrop=e=>{const f=e.dataTransfer.files[0];if(f)f.arrayBuffer().then(loadBuf)};
addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){
    if(e.key==='z'||e.key==='Z'){e.preventDefault();e.shiftKey?redo():undo();return}
    if(e.key==='y'||e.key==='Y'){e.preventDefault();redo();return}
  }
  if(e.target!==document.body&&e.target!==ren.domElement)return;
  if(e.code==='Space'){e.preventDefault();$('play').click()}
  else if(e.key==='k'||e.key==='K')$('setk').click();
  else if(e.key==='Delete')$('delk').click();
});

