/* Ritmator - export
   GLB / code / player export.
   Classic script (no modules): top-level names are shared by every file in js/. */
/* ---------- export ---------- */
const LOADER='function loadRitmator(loader, onDone) {\n  const s = atob(RITMATOR_DATA), u = new Uint8Array(s.length);\n  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);\n  loader.parse(u.buffer, "", gltf => {\n    const mixer = new THREE.AnimationMixer(gltf.scene), actions = {};\n    gltf.animations.forEach(c => actions[c.name] = mixer.clipAction(c));\n    onDone({ scene: gltf.scene, mixer: mixer, actions: actions, clips: gltf.animations });\n  });\n}\n';
const b64=buf=>{let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)};
function buildGLB(){
  return new Promise((res,rej)=>{
    if(!root||!bones.length)return rej('Load and rig a model first');
    if(!clips.length)return rej('Add at least one clip first');
    const names=clips.map(c=>c.name.replace(/[^\w-]/g,'_')),anims=clips.map(toClip);
    // export in rest pose with clean userData, then restore
    const saved=bones.map(b=>[b.userData,b.quaternion.clone(),b.position.clone()]);
    bones.forEach((b,i)=>{b.quaternion.copy(b.userData.rest);b.position.copy(b.userData.rpos);b.userData={}});
    root.updateMatrixWorld(true);
    const restore=()=>{bones.forEach((b,i)=>{b.userData=saved[i][0];b.quaternion.copy(saved[i][1]);b.position.copy(saved[i][2])});root.updateMatrixWorld(true)};
    try{new T.GLTFExporter().parse(root,r=>{restore();res({buf:r,names})},e=>{restore();rej('Export failed')},{binary:true,animations:anims,onlyVisible:false})}
    catch(e){restore();rej('Export failed')}
  });
}
function code(b,names){
  return '// Ritmator export. Clips: '+names.join(', ')+'\nconst RITMATOR_DATA = "'+b+'";\n'+LOADER+
  '// Usage:\n// loadRitmator(new THREE.GLTFLoader(), r => { scene.add(r.scene); r.actions["'+names[0]+'"].play(); });\n// then call r.mixer.update(delta) each frame. Switch clips with r.actions[name].reset().play().\n';
}
function player(b,names){
  const js=code(b,names)+'const R=new THREE.WebGLRenderer({antialias:true});R.outputEncoding=THREE.sRGBEncoding;R.setSize(innerWidth,innerHeight);document.body.appendChild(R.domElement);\nconst S=new THREE.Scene(),C=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.01,1000);\nS.add(new THREE.HemisphereLight(0xffffff,0x444444,1.2));const L=new THREE.DirectionalLight(0xffffff,1.5);L.position.set(3,5,4);S.add(L);\nlet rig=null;const clock=new THREE.Clock();\nloadRitmator(new THREE.GLTFLoader(),r=>{rig=r;S.add(r.scene);const bb=new THREE.Box3().setFromObject(r.scene),sz=bb.getSize(new THREE.Vector3()),ct=bb.getCenter(new THREE.Vector3());C.position.set(ct.x,ct.y,ct.z+Math.max(sz.x,sz.y)*1.8);C.lookAt(ct);const n=Object.keys(r.actions);if(n.length)r.actions[n[0]].play();\naddEventListener("keydown",e=>{const k=n[+e.key-1];if(k){Object.values(r.actions).forEach(a=>a.stop());r.actions[k].reset().play()}})});\nR.setAnimationLoop(()=>{if(rig)rig.mixer.update(clock.getDelta());R.render(S,C)});\n';
  const esc=x=>x.replace(/<\/(script)/gi,'<\\/$1'),head='<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ritmator preview</title><style>html,body{margin:0;height:100%;background:#151515;overflow:hidden}<\/style><\/head><body>';
  if(window.__LIBS)return head+'<script>'+esc(window.__LIBS.three)+'<\/script><script>'+esc(window.__LIBS.loader)+'<\/script><script>'+esc(js)+'<\/script><\/body><\/html>';
  const boot='(function(){var B=["https://cdn.jsdelivr.net/npm/three@0.147.0/","https://unpkg.com/three@0.147.0/"],F=["build/three.min.js","examples/js/loaders/GLTFLoader.js"];function L(s){return new Promise(function(o,n){var e=document.createElement("script");e.src=s;e.onload=o;e.onerror=n;document.head.appendChild(e)})}(async function(){for(var i=0;i<B.length;i++){try{for(var j=0;j<F.length;j++)await L(B[i]+F[j]);break}catch(e){}}if(!window.THREE){document.body.textContent="Could not load Three.js (offline?)";return}(0,eval)(document.getElementById("ritmator-main").textContent)})()})();';
  return head+'<script id="ritmator-main" type="text/plain">'+esc(js)+'<\/script><script>'+boot+'<\/script><\/body><\/html>';
}
async function saveFile(name,text){
  try{const dl=window.claude&&await claude.use('downloads');if(dl){await dl.save({filename:name,data:text});return}}catch(e){if(e&&e.code==='declined')return}
  const a=document.createElement('a');const u=URL.createObjectURL(new Blob([text],{type:'text/plain'}));a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);
}
async function copyText(s){
  try{await navigator.clipboard.writeText(s);return true}catch(e){}
  const ta=document.createElement('textarea');ta.value=s;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}ta.remove();return ok;
}
/* The exported player embeds Three.js. In the single-file build it is already in memory; in the multi-file build we read it from lib/ (needs a local server) and otherwise fall back to the CDN. */
async function ensureLibs(){
  if(window.__LIBS)return;
  try{const [a,b]=await Promise.all([fetch('lib/three.min.js').then(r=>{if(!r.ok)throw 0;return r.text()}),fetch('lib/GLTFLoader.js').then(r=>{if(!r.ok)throw 0;return r.text()})]);window.__LIBS={three:a,loader:b}}catch(e){}
}
async function doExport(kind){
  try{
    if(kind==='html')await ensureLibs();
    say('Building export...');const was=wvOn;if(was)wvSet(false);let res;try{res=await buildGLB()}finally{if(was)wvSet(true)}const {buf,names}=res,b=b64(buf),kb=Math.round(b.length/1024);
    if(kind==='copy'){const ok=await copyText(code(b,names));say(ok?'Code copied ('+kb+' KB). Paste it into your game.':'Clipboard blocked. Use Code .txt instead.')}
    if(kind==='txt'){await saveFile('ritmator-model.txt',code(b,names));say('Code ready ('+kb+' KB)')}
    if(kind==='html'){await saveFile('ritmator-player.html',player(b,names));say('Player ready ('+kb+' KB)')}
  }catch(e){say(typeof e==='string'?e:'Export failed')}
}
$('copy').onclick=()=>doExport('copy');$('dlt').onclick=()=>doExport('txt');$('dlh').onclick=()=>doExport('html');

$('dlg').onclick=async()=>{try{say('Building .glb...');const was=wvOn;if(was)wvSet(false);let r;try{r=await buildGLB()}finally{if(was)wvSet(true)}const u=URL.createObjectURL(new Blob([r.buf],{type:'model/gltf-binary'})),a=document.createElement('a');a.href=u;a.download='ritmator-character.glb';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);say('Downloaded ritmator-character.glb ('+Math.round(r.buf.byteLength/1024)+' KB, '+r.names.length+' clips)')}catch(e){say(typeof e==='string'?e:'Export failed')}};
