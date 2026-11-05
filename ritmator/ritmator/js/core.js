/* Ritmator - core
   State, viewport, lighting, undo/redo, model loading, model placement (rotate/move/scale + FRONT arrow).
   Classic script (no modules): top-level names are shared by every file in js/. */
const $=id=>document.getElementById(id),T=THREE,D=Math.PI/180;
let scene,cam,ren,ctrl,tc,grid,root=null,helper=null,bones=[],bmap={},clips=[],cur=null,t=0,playing=false,H=1,armAng=0,last=0,speed=1,lastJoints=null,lastCx=0,rigging=false;
let hemi,key,fill,rim,lt,shadowPlane,bgCustom=null,viewC=new T.Vector3(0,.9,0),viewD=1.8;
let undoS=[],redoS=[],lastSnap={tag:'',time:0},poseClip=null;
const _q=new T.Quaternion(),_e=new T.Euler(),_v=new T.Vector3();
let wake=0,uiT=0;const poke=()=>{wake=performance.now()};
const say=s=>{$('st').textContent=s;poke()};
const stopPlay=()=>{playing=false;$('play').textContent='Play'};
const tick=()=>new Promise(r=>setTimeout(r,0));
const ARMS={T:0,A30:30,A45:45,A60:60,D:85};
const isRig=()=>!!root&&root.name==='RitmatorRig';

/* ---------- viewport ---------- */
function init(){
  const vp=$('vp');
  try{ren=new T.WebGLRenderer({antialias:true})}catch(e){say('WebGL is not available in this browser. Enable hardware acceleration or try Chrome/Edge/Firefox.');throw e}
  ren.setPixelRatio(Math.min(devicePixelRatio,1.5));ren.shadowMap.autoUpdate=false;ren.shadowMap.needsUpdate=true;vp.appendChild(ren.domElement);
  ren.outputEncoding=T.sRGBEncoding;ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFSoftShadowMap;
  scene=new T.Scene();cam=new T.PerspectiveCamera(45,1,.01,2000);cam.position.set(0,1.5,4);
  hemi=new T.HemisphereLight(0xffffff,0x555555,1);scene.add(hemi);
  key=new T.DirectionalLight(0xffffff,1.6);fill=new T.DirectionalLight(0xdde6ff,.6);rim=new T.DirectionalLight(0xffffff,1);
  lt=new T.Object3D();scene.add(lt);[key,fill,rim].forEach(l=>{l.target=lt;scene.add(l)});
  shadowPlane=new T.Mesh(new T.PlaneGeometry(1,1),new T.ShadowMaterial({opacity:.38}));shadowPlane.rotation.x=-Math.PI/2;shadowPlane.receiveShadow=true;scene.add(shadowPlane);
  ctrl=new T.OrbitControls(cam,ren.domElement);ctrl.enableDamping=true;
  tc=new T.TransformControls(cam,ren.domElement);tc.setSize(.8);
  tc.addEventListener('dragging-changed',e=>{ctrl.enabled=!e.value});
  tc.addEventListener('objectChange',onJointMove);
  scene.add(tc);
  clearBg();matchMedia('(prefers-color-scheme:dark)').addEventListener('change',clearBg);
  new ResizeObserver(()=>{const w=vp.clientWidth,h=vp.clientHeight;if(!w||!h)return;ren.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix();poke()}).observe(vp);
  const ray=new T.Raycaster(),ndc=new T.Vector2();
  ren.domElement.addEventListener('pointerdown',e=>{
    if(!mmode||tc.axis)return;
    const r=ren.domElement.getBoundingClientRect();
    ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);
    ray.setFromCamera(ndc,cam);
    const hit=ray.intersectObjects(Object.values(jm),false)[0];
    if(hit)selectJoint(hit.object.userData.jn);
  });
  frame();
  ren.setAnimationLoop(loop);
}
function clearBg(){ren.setClearColor(bgCustom||getComputedStyle(document.documentElement).getPropertyValue('--vp').trim()||'#dcdcd8')}
function frame(){
  if(grid){scene.remove(grid)}
  let c=new T.Vector3(0,.9,0),s=new T.Vector3(1,1.8,1),y=0;
  if(root){const b=new T.Box3().setFromObject(root);b.getSize(s);b.getCenter(c);y=b.min.y}
  const m=Math.max(s.x,s.y,s.z);
  grid=new T.GridHelper(m*3,20,0x888888,0x888888);grid.position.y=y;grid.material.opacity=.35;grid.material.transparent=true;scene.add(grid);
  const d=m*1.9;cam.position.set(c.x,c.y+s.y*.1,c.z+d);ctrl.target.copy(c);cam.near=d/200;cam.far=d*50;cam.updateProjectionMatrix();ctrl.update();
  viewC.copy(c);viewD=m;
  shadowPlane.scale.setScalar(m*6);shadowPlane.position.set(c.x,y+m*.0008,c.z);
  applyLight();
}
function setView(name){
  const c=viewC,d=viewD*1.9,v={front:[0,.1,1],side:[1,.1,0],back:[0,.1,-1],q:[.7,.25,.7]}[name];
  cam.position.set(c.x+v[0]*d,c.y+v[1]*d,c.z+v[2]*d);ctrl.target.copy(c);ctrl.update();
}
function loop(now){
  const dt=Math.min((now-last)/1000,.1);last=now;
  if(rigging)return; // give all CPU to the rig calculation
  if(playing&&cur){
    t+=dt*speed;if(t>=cur.dur){if($('loop').checked)t%=cur.dur;else{t=cur.dur;stopPlay()}}
    applyPose();if(now-uiT>100){uiT=now;syncTime();syncSliders()}
  }
  const moved=ctrl.update();
  if(playing||moved||ctrl.autoRotate||now-wake<1500)ren.render(scene,cam);
}
addEventListener('load',()=>['pointerdown','pointermove','wheel','keydown','input','change','click','touchstart'].forEach(ev=>addEventListener(ev,poke,{passive:true,capture:true})));

/* ---------- lighting ---------- */
const LP={
  studio:{lkey:1.3,lfill:.35,lrim:.6,lamb:.55,lexp:1,laz:35,lel:40},
  flat:{lkey:.5,lfill:.2,lrim:0,lamb:1.3,lexp:1,laz:20,lel:30},
  drama:{lkey:2.2,lfill:.05,lrim:1.5,lamb:.2,lexp:1,laz:300,lel:25},
  sun:{lkey:2,lfill:.25,lrim:.35,lamb:.7,lexp:1,laz:60,lel:60}
};
function applyLight(){
  if(!key)return;
  const g=id=>+$(id).value;
  ['lkey','lfill','lrim','lamb','lexp','laz','lel'].forEach(id=>{$(id+'v').textContent=$(id).value});
  hemi.intensity=g('lamb');key.intensity=g('lkey');fill.intensity=g('lfill');rim.intensity=g('lrim');
  ren.toneMappingExposure=g('lexp');ren.toneMapping=$('ltone').checked?T.ACESFilmicToneMapping:T.NoToneMapping;
  const az=g('laz')*D,el=g('lel')*D,d=viewD*1.6,c=viewC;
  lt.position.copy(c);
  key.position.set(c.x+Math.sin(az)*Math.cos(el)*d,c.y+Math.sin(el)*d,c.z+Math.cos(az)*Math.cos(el)*d);
  fill.position.set(c.x-Math.sin(az)*d*.8,c.y+d*.2,c.z+Math.cos(az)*d*.5);
  rim.position.set(c.x-Math.sin(az)*d*.3,c.y+d*.5,c.z-d);
  const sh=$('lshadow').checked;
  key.castShadow=sh;shadowPlane.visible=sh;
  const sz=viewD*.9,sc=key.shadow.camera;sc.left=-sz;sc.right=sz;sc.top=sz;sc.bottom=-sz;sc.near=.01;sc.far=d*4;sc.updateProjectionMatrix();
  if(key.shadow.mapSize.x!==1024){key.shadow.mapSize.set(1024,1024);if(key.shadow.map){key.shadow.map.dispose();key.shadow.map=null}}
  key.shadow.bias=-.0004;
  if(root)root.traverse(o=>{if(o.isMesh)o.castShadow=sh});
  if(grid)grid.visible=$('lgrid').checked;
  ren.shadowMap.needsUpdate=true;poke();
  ctrl.autoRotate=$('lspin').checked;
}

/* ---------- undo / redo ---------- */
function snap(tag){
  const now=performance.now();
  if(tag&&tag===lastSnap.tag&&now-lastSnap.time<700){lastSnap.time=now;return}
  lastSnap={tag,time:now};
  undoS.push(JSON.stringify({clips,cur:clips.indexOf(cur)}));if(undoS.length>60)undoS.shift();redoS=[];
}
function restoreSnap(s){const o=JSON.parse(s);clips=o.clips;cur=clips[o.cur]||clips[0]||null;t=Math.min(t,cur?cur.dur:0);lastSnap={tag:'',time:0};refresh()}
function undo(){if(!undoS.length)return say('Nothing to undo');redoS.push(JSON.stringify({clips,cur:clips.indexOf(cur)}));restoreSnap(undoS.pop())}
function redo(){if(!redoS.length)return say('Nothing to redo');undoS.push(JSON.stringify({clips,cur:clips.indexOf(cur)}));restoreSnap(redoS.pop())}

/* ---------- loading ---------- */
function loadBuf(buf){
  say('Reading model...');
  try{new T.GLTFLoader().parse(buf,'',g=>setModel(g.scene),e=>say('Could not read this file. Use a self-contained .glb'))}
  catch(e){say('Could not read this file. Use a self-contained .glb')}
}
function setModel(obj){
  if(mmode)exitManual();
  if(wvOn){$('wview').checked=false;wvSet(false)}
  if(root)scene.remove(root);if(helper){scene.remove(helper);helper=null}
  root=obj;scene.add(root);root.updateMatrixWorld(true);xfCapture();
  root.traverse(o=>{if(o.isSkinnedMesh)o.frustumCulled=false});
  const b=new T.Box3().setFromObject(root);H=Math.max(b.getSize(new T.Vector3()).y,1e-3);
  lastJoints=null;rigInfo=null;stopPlay();undoS=[];redoS=[];
  collect();clips=[];cur=null;frame();placeArrow();
  if(bones.length){addPreset('idle');addPreset('walk');cur=clips[0];say('Existing skeleton found: '+bones.length+' bones. Presets are tuned for the Ritmator auto rig.')}
  else say('Model loaded without a skeleton. Press Auto rig (or Manual rig to place the joints yourself).');
  makeHelper();refresh();
}
function collect(){
  bones=[];bmap={};root.traverse(o=>{if(o.isBone)bones.push(o)});
  bones.forEach(b=>{b.userData.rest=b.quaternion.clone();b.userData.rpos=b.position.clone();bmap[b.name]=b});
}
function makeHelper(){
  if(helper){scene.remove(helper);helper=null}
  if(!bones.length)return;
  helper=new T.SkeletonHelper(root);helper.material.depthTest=false;helper.renderOrder=10;helper.visible=$('skel').checked&&!mmode;scene.add(helper);
}

/* ---------- model placement (rotate / move / scale), also drives the FRONT arrow ---------- */
let xf={rx:0,ry:0,rz:0,px:0,py:0,pz:0,s:1},xbase=null,xpiv=new T.Vector3(),fwd=null;
const wrap180=a=>{a=((a+180)%360+360)%360-180;return a};
function xfCapture(){
  root.updateMatrix();xbase=root.matrix.clone();
  root.updateMatrixWorld(true);new T.Box3().setFromObject(root).getCenter(xpiv);
  xf={rx:0,ry:0,rz:0,px:0,py:0,pz:0,s:1};xfUI();
}
function xfUI(){
  ['x','y','z'].forEach(a=>{$('xr'+a).value=xf['r'+a];$('xr'+a+'v').textContent=Math.round(xf['r'+a]);$('xp'+a).value=xf['p'+a];$('xp'+a+'v').textContent=xf['p'+a].toFixed(2)});
  $('xs').value=+xf.s.toFixed(4);
}
function applyXf(){
  if(!root||!xbase)return;
  if(isRig()&&rigInfo){scheduleReskin();return}
  const R=new T.Matrix4().makeRotationFromEuler(new T.Euler(xf.rx*D,xf.ry*D,xf.rz*D,'YXZ'));
  const M=new T.Matrix4().makeTranslation(xf.px,xf.py,xf.pz)
    .multiply(new T.Matrix4().makeTranslation(xpiv.x,xpiv.y,xpiv.z)).multiply(R)
    .multiply(new T.Matrix4().makeScale(xf.s,xf.s,xf.s)).multiply(new T.Matrix4().makeTranslation(-xpiv.x,-xpiv.y,-xpiv.z)).multiply(xbase);
  M.decompose(root.position,root.quaternion,root.scale);
  root.updateMatrixWorld(true);lastJoints=null;placeArrow();
  if(ren)ren.shadowMap.needsUpdate=true;poke();
}
function xfGuard(){if(mmode){xfUI();say('Finish the manual rig first (Apply rig or Cancel), then move the model.');return false}if(!root){say('Load a model first');return false}return true}
function xfSet(k,v){if(!xfGuard())return;xf[k]=v;applyXf();xfUI()}
function groundIt(){
  if(isRig()){say('Ground and Fit only work before rigging (they would pull the mesh off the bones). Use the Move sliders to line the mesh up with the rig.');return}
  root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(root),c=b.getCenter(new T.Vector3());
  xf.px-=c.x;xf.pz-=c.z;xf.py-=b.min.y;applyXf();xfUI();
}
function fitModel(){
  if(!xfGuard())return;
  if(isRig()){say('Fit only works before rigging. After rigging use Scale to resize the mesh on the rig.');return}
  root.updateMatrixWorld(true);const h=new T.Box3().setFromObject(root).getSize(new T.Vector3()).y;if(h<1e-6)return;
  xf.s*=1.8/h;applyXf();groundIt();H=1.8;frame();say('Model scaled to 1.8 m tall, centred, feet on the ground.');
}
function turnModel(quiet){
  if(!root)return say('Load a model first');
  if(mmode)return xfGuard();
  xf.ry=wrap180(xf.ry+180);applyXf();xfUI();
  if(!quiet)say(isRig()?'Mesh turned 180 degrees. The rig stayed in place.':'Turned 180 degrees. The model should now face +Z, the way the green FRONT arrow points.');
}
function placeArrow(){
  if(!fwd){
    fwd=new T.Group();const c=document.createElement('canvas');c.width=256;c.height=64;const g=c.getContext('2d');
    g.fillStyle='#1fa35a';g.font='bold 34px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('FRONT +Z',128,32);
    const sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false,transparent:true}));sp.scale.set(4,1,1);sp.position.set(0,.15,1.25);sp.renderOrder=40;
    const ar=new T.ArrowHelper(new T.Vector3(0,0,1),new T.Vector3(0,0,0),1,0x1fa35a,.28,.18);ar.line.material.depthTest=false;ar.cone.material.depthTest=false;ar.renderOrder=40;
    fwd.add(ar,sp);scene.add(fwd);
  }
  fwd.visible=$('xarrow').checked&&!!root;if(!root)return;
  const b=new T.Box3().setFromObject(root),m=Math.max(b.getSize(new T.Vector3()).y,.1),c=b.getCenter(new T.Vector3());
  fwd.scale.setScalar(m*.35);fwd.position.set(c.x,b.min.y+m*.003,b.max.z+m*.12);
  poke();
}

