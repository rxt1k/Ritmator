/* Ritmator - demo
   Built-in test mannequin.
   Classic script (no modules): top-level names are shared by every file in js/. */
/* ---------- built-in test mannequin ---------- */
function makeMannequin(kind){
  const S={
    adult:{hipY:.9,kneeY:.49,ankY:.09,hipX:.09,pelY:.97,chestY:1.3,shY:1.42,shX:.2,neck0:1.46,neck1:1.6,headY:1.69,headR:.105,up:.3,fo:.27,hand:.09,arm:0,k:1},
    a45:{hipY:.9,kneeY:.49,ankY:.09,hipX:.09,pelY:.97,chestY:1.3,shY:1.42,shX:.2,neck0:1.46,neck1:1.6,headY:1.69,headR:.105,up:.3,fo:.27,hand:.09,arm:45,k:1},
    child:{hipY:.62,kneeY:.34,ankY:.07,hipX:.07,pelY:.68,chestY:.93,shY:1.02,shX:.15,neck0:1.05,neck1:1.14,headY:1.23,headR:.115,up:.22,fo:.19,hand:.07,arm:0,k:.8},
    chibi:{hipY:.45,kneeY:.26,ankY:.06,hipX:.08,pelY:.52,chestY:.72,shY:.8,shX:.17,neck0:.82,neck1:.9,headY:1.08,headR:.26,up:.17,fo:.15,hand:.07,arm:0,k:.9}
  }[kind]||{};
  const s=S,parts=[],V=(x,y,z)=>new T.Vector3(x,y,z),Y=V(0,1,0);
  const SK=0xe0b090,SH=0x3a6ea5,PA=0x3a3f4d,SO=0xa83a3a;
  const cap=(a,b,r,col)=>{const d=b.clone().sub(a),len=d.length(),g=new T.CapsuleGeometry(r,Math.max(len,1e-4),6,18);
    g.applyMatrix4(new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(Y,d.clone().normalize()),V(1,1,1)));parts.push({g,col})};
  const ell=(c,rx,ry,rz,col)=>{const g=new T.SphereGeometry(1,28,18);g.applyMatrix4(new T.Matrix4().makeScale(rx,ry,rz).premultiply(new T.Matrix4().makeTranslation(c.x,c.y,c.z)));parts.push({g,col})};
  const k=s.k;
  ell(V(0,s.pelY,0),.16*k,.11*k,.1*k,PA);
  ell(V(0,(s.chestY+s.pelY)/2,0),.14*k,.15*k,.09*k,SH);
  ell(V(0,s.chestY,0),.17*k,.2*k,.1*k,SH);
  cap(V(0,s.neck0,0),V(0,s.neck1,0),.05*k,SK);
  ell(V(0,s.headY,0),s.headR,s.headR*1.12,s.headR,SK);
  ell(V(0,s.headY-.01,s.headR),.02,.025,.03,SK);
  ell(V(0,s.headY+s.headR*.35,-s.headR*.2),s.headR*1.04,s.headR*.85,s.headR*1.04,0x3b2a20);
  const al=s.arm*D;
  for(const sd of [1,-1]){
    const sh=V(sd*s.shX,s.shY,0),dir=V(sd*Math.cos(al),-Math.sin(al),0),el=sh.clone().addScaledVector(dir,s.up),wr=el.clone().addScaledVector(dir,s.fo),he=wr.clone().addScaledVector(dir,s.hand);
    ell(sh,.06*k,.06*k,.06*k,SH);cap(sh,el,.045*k,SH);ell(el,.043*k,.043*k,.043*k,SH);cap(el,wr,.037*k,SK);cap(wr,he,.03*k,SK);
    const hp=V(sd*s.hipX,s.hipY,0),kn=V(sd*s.hipX,s.kneeY,0),an=V(sd*s.hipX,s.ankY,0);
    cap(hp,kn,.075*k,PA);ell(kn,.062*k,.062*k,.062*k,PA);cap(kn,an,.055*k,PA);
    cap(V(sd*s.hipX,.045,-.03),V(sd*s.hipX,.045,.15*k+.03),.045*k,SO);
  }
  let n=0;parts.forEach(p=>{p.g=p.g.index?p.g.toNonIndexed():p.g;n+=p.g.attributes.position.count});
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);let o=0;
  parts.forEach(p=>{const c=new T.Color(p.col),cnt=p.g.attributes.position.count;pos.set(p.g.attributes.position.array,o*3);nor.set(p.g.attributes.normal.array,o*3);for(let i=0;i<cnt;i++){col[(o+i)*3]=c.r;col[(o+i)*3+1]=c.g;col[(o+i)*3+2]=c.b}o+=cnt;p.g.dispose()});
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(nor,3));g.setAttribute('color',new T.BufferAttribute(col,3));
  const mesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.65,metalness:0}));mesh.name='Mannequin';
  const grp=new T.Group();grp.name='MannequinModel';grp.add(mesh);return grp;
}
async function loadDemo(kind,auto){
  if(rigging)return;
  setModel(makeMannequin(kind));
  $('arms').value=kind==='a45'?'A45':'T';armAng=ARMS[$('arms').value];
  say('Demo mannequin loaded (unrigged). Press Auto rig.');
  if(auto){await tick();await autoRig()}
}

