/* Ritmator - rig
   Joint estimation, voxel skinning, auto rig, mesh-only re-fit, skin tools, manual rig.
   Classic script (no modules): top-level names are shared by every file in js/. */
/* ---------- joints (shared by auto and manual rig) ---------- */
const CEN=['pelvis','spine','chest','neck','head','headTop'],SID=['sh','el','wr','hand','hip','knee','ankle','toe'];
const JL=[...CEN,...SID.map(n=>n+'_L'),...SID.map(n=>n+'_R')];
const JLAB={pelvis:'Pelvis (hips)',spine:'Spine',chest:'Chest',neck:'Neck base',head:'Head base',headTop:'Head top',sh:'Shoulder',el:'Elbow',wr:'Wrist',hand:'Hand tip',hip:'Hip joint',knee:'Knee',ankle:'Ankle',toe:'Toe'};
const jlabel=n=>{const p=n.split('_');return (JLAB[p[0]]||n)+(p[1]?(p[1]==='L'?' (left, +X)':' (right, -X)'):'')};
const LINKS=[['pelvis','spine'],['spine','chest'],['chest','neck'],['neck','head'],['head','headTop']];
['L','R'].forEach(n=>LINKS.push(['chest','sh_'+n],['sh_'+n,'el_'+n],['el_'+n,'wr_'+n],['wr_'+n,'hand_'+n],['pelvis','hip_'+n],['hip_'+n,'knee_'+n],['knee_'+n,'ankle_'+n],['ankle_'+n,'toe_'+n]));
const cloneJ=J=>{const o={};for(const k in J)o[k]=J[k].clone();return o};
const getMeshes=()=>{const m=[];if(root)root.traverse(o=>{if(o.isMesh)m.push(o)});return m};
function resetRest(){bones.forEach(b=>{b.quaternion.copy(b.userData.rest);b.position.copy(b.userData.rpos)});if(root)root.updateMatrixWorld(true)}
function setArmSel(a){let best='T',bd=1e9;for(const k in ARMS){const d=Math.abs(ARMS[k]-a);if(d<bd){bd=d;best=k}}$('arms').value=best}
function detectArm(J){const v=J.el_L.clone().sub(J.sh_L);return Math.max(0,Math.min(90,Math.atan2(-v.y,Math.abs(v.x))/D))}

/* crotch / neck heights as fractions of total height: c = crotch, n = neck (chin level) */
const PROPS={adult:{c:.47,n:.865},teen:{c:.46,n:.85},child:{c:.455,n:.83},chibi:{c:.38,n:.67},hero:{c:.5,n:.875}};

/* Measures the real mesh (width profile, leg gap, arm reach, feet) to place joints. */
function estimateJoints(meshes){
  root.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(root),s=box.getSize(new T.Vector3()),bc=box.getCenter(new T.Vector3());
  const h=s.y,y0=box.min.y;
  let tot=0;meshes.forEach(m=>tot+=m.geometry.attributes.position.count);
  const step=Math.max(1,Math.floor(tot/80000)),vs=[],v=new T.Vector3();
  meshes.forEach(m=>{const p=m.geometry.attributes.position;for(let i=0;i<p.count;i+=step){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);vs.push(v.x,v.y,v.z)}});
  let mx=0,mz=0,cn=0;
  for(let i=0;i<vs.length;i+=3){const f=(vs[i+1]-y0)/h;if(f>.55&&f<.7){mx+=vs[i];mz+=vs[i+2];cn++}}
  const cx=cn>20?mx/cn:bc.x,cz=cn>20?mz/cn:bc.z;
  for(let i=0;i<vs.length;i+=3){vs[i]-=cx;vs[i+2]-=cz}
  const P=(x,f,z=0)=>new T.Vector3(cx+x,y0+f*h,cz+z);
  const sel=(f0,f1,fn)=>{for(let i=0;i<vs.length;i+=3){const f=(vs[i+1]-y0)/h;if(f>=f0&&f<=f1)fn(vs[i],vs[i+1],vs[i+2])}};
  const pct=(a,p)=>{if(!a.length)return 0;a.sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(a.length*p))]};
  // ---- proportions
  const pr=$('prop').value;let nf=PROPS.adult.n,cf=PROPS.adult.c,src='adult';
  if(pr!=='auto'){nf=PROPS[pr].n;cf=PROPS[pr].c;src=pr}
  else{
    const NS=100,buck=Array.from({length:NS},()=>[]),cc=new Float32Array(NS),tt=new Float32Array(NS);
    for(let i=0;i<vs.length;i+=3){const f=(vs[i+1]-y0)/h;if(f<0||f>=1)continue;const k=Math.floor(f*NS);buck[k].push(Math.abs(vs[i]));tt[k]++;if(Math.abs(vs[i])<.03*h)cc[k]++}
    const W=buck.map(b=>b.length>6?pct(b,.9):null);
    const sm=k=>{let a=0,n=0;for(let j=k-1;j<=k+1;j++)if(W[j]!=null){a+=W[j];n++}return n?a/n:null};
    let bk=-1,bw=1e9;
    for(let k=Math.floor(.55*NS);k<=Math.floor(.93*NS);k++){const w=sm(k);if(w!=null&&w<bw){bw=w;bk=k}}
    let nOK=false;
    if(bk>0){const nfm=(bk+.5)/NS;if(nfm>.55&&nfm<.93&&1-nfm>.07){nf=nfm;nOK=true;src='measured'}}
    let cOK=false;
    for(let k=Math.floor(.15*NS);k<=Math.floor(.6*NS);k++){
      if(tt[k]>6&&tt[k+1]>6&&cc[k]/tt[k]>.12&&cc[k+1]/tt[k+1]>.12){const cm=k/NS;if(cm>.28&&cm<.56){cf=cm;cOK=true}break}
    }
    if(!cOK)cf=nf*.543;
    if(!nOK&&!cOK)src='adult (could not measure)';else if(!cOK)src='measured neck, estimated legs';
  }
  const tl=nf-cf,pelvisF=cf+.13*tl,spineF=cf+.33*tl,chestF=cf+.58*tl,hipF=cf+.06*tl;
  const neckF=nf-Math.min(.045,.3*(1-nf)),shF=neckF-.1*tl,ankF=.11*cf,toeF=.045*cf;
  // ---- arms
  const ax=[];sel(.6,.66,x=>ax.push(Math.abs(x)));const thw=pct(ax,.9)||.12*h;
  const ex={'1':0,'-1':0};sel(Math.max(shF-.06,.5),shF+.06,x=>{const k=x>=0?1:-1;if(Math.abs(x)>ex[k])ex[k]=Math.abs(x)});
  const wide=Math.min(ex['1'],ex['-1'])>thw*1.7;
  if(wide&&armAng>12){armAng=0;$('arms').value='T'}
  let ay=null;
  if(wide){let sy=0,c2=0;sel(.5,.97,(x,y)=>{if(Math.abs(x)>thw*1.3){sy+=y;c2++}});if(c2>30)ay=sy/c2}
  const al=armAng*D,dir=[Math.cos(al),-Math.sin(al)];
  const span=1.15*(neckF-pelvisF)*h,hl=.2*tl*h;
  // ---- feet / facing
  let front=0,back=0;sel(0,.07,(x,y,z)=>{if(z>front)front=z;if(-z>back)back=-z});
  const J={pelvis:P(0,pelvisF),spine:P(0,spineF),chest:P(0,chestF),neck:P(0,neckF),head:P(0,nf),headTop:P(0,1)};
  for(const [sd,n] of [[1,'L'],[-1,'R']]){
    let lx=sd*Math.max(.04*h,.15*tl*h);
    const xs=[];sel(cf*.45,cf*.85,x=>{if(x*sd>0)xs.push(Math.abs(x))});
    if(xs.length>30){const m=xs.reduce((a,b)=>a+b,0)/xs.length;if(m>.02*h&&m<.25*h)lx=sd*m}
    let sh,el,wr,hd;
    if(armAng<=12&&wide&&ay!==null){
      const e=ex[String(sd)],shx=Math.min(thw*.8,e*.5),wx=shx+(e-shx)*.85;
      sh=new T.Vector3(cx+sd*shx,ay,cz);wr=new T.Vector3(cx+sd*wx,ay,cz);el=sh.clone().lerp(wr,.5);hd=new T.Vector3(cx+sd*e,ay,cz);
    }else{
      const dv=new T.Vector3(sd*dir[0],dir[1],0).normalize();
      sh=P(sd*.22*tl*h,shF);
      el=sh.clone().addScaledVector(dv,span*.5);wr=sh.clone().addScaledVector(dv,span);hd=wr.clone().addScaledVector(dv,hl);
    }
    const tz=front>.05*h?Math.max(front-.015*h,.05*h):.1*h;
    J['sh_'+n]=sh;J['el_'+n]=el;J['wr_'+n]=wr;J['hand_'+n]=hd;
    J['hip_'+n]=P(lx*.9,hipF);J['knee_'+n]=P(lx,(hipF+ankF)/2);J['ankle_'+n]=P(lx,ankF);J['toe_'+n]=P(lx,toeF,tz);
  }
  const flip=back>front*1.25&&back>.05*h;
  return {J,cx,h,flip,info:'Proportions: '+src+' (crotch '+Math.round(cf*100)+'%, neck '+Math.round(nf*100)+'% of height)'};
}
/* estimate, turning the model around first if it faces -Z */
function estimateAuto(meshes){
  let r=estimateJoints(meshes);
  if(r.flip&&$('autoface').checked){turnModel(true);r=estimateJoints(meshes);r.info+='. Model faced -Z, so it was turned 180 degrees (turn off Auto-detect facing to keep your own rotation).'}
  return r;
}

/* ---------- volume skinning (voxel + geodesic distance, no leaking between legs/arms) ---------- */
const worldGeom=m=>{const g=m.geometry.clone();g.applyMatrix4(m.matrixWorld);return g};
function voxelize(geoms,maxDim){
  const box=new T.Box3();geoms.forEach(g=>{g.computeBoundingBox();box.union(g.boundingBox)});
  const size=box.getSize(new T.Vector3()),cell=Math.max(size.x,size.y,size.z,1e-6)/maxDim,pad=3;
  const nx=Math.ceil(size.x/cell)+2*pad+1,ny=Math.ceil(size.y/cell)+2*pad+1,nz=Math.ceil(size.z/cell)+2*pad+1;
  const ox=box.min.x-pad*cell,oy=box.min.y-pad*cell,oz=box.min.z-pad*cell,N=nx*ny*nz,surf=new Uint8Array(N),sz=nx*ny;
  const mark=(x,y,z)=>{const i=Math.floor((x-ox)/cell),j=Math.floor((y-oy)/cell),k=Math.floor((z-oz)/cell);surf[i+nx*j+sz*k]=1};
  geoms.forEach(g=>{
    const p=g.attributes.position,ix=g.index,nT=Math.floor((ix?ix.count:p.count)/3);
    for(let t=0;t<nT;t++){
      const i0=ix?ix.getX(t*3):t*3,i1=ix?ix.getX(t*3+1):t*3+1,i2=ix?ix.getX(t*3+2):t*3+2;
      const ax=p.getX(i0),ay=p.getY(i0),az=p.getZ(i0),bx=p.getX(i1),by=p.getY(i1),bz=p.getZ(i1),cx=p.getX(i2),cy=p.getY(i2),cz=p.getZ(i2);
      const e=Math.sqrt(Math.max((ax-bx)**2+(ay-by)**2+(az-bz)**2,(bx-cx)**2+(by-cy)**2+(bz-cz)**2,(cx-ax)**2+(cy-ay)**2+(cz-az)**2));
      const n=Math.min(40,Math.max(1,Math.ceil(e/(cell*.5))));
      for(let a=0;a<=n;a++)for(let b=0;b<=n-a;b++){const u=a/n,v=b/n,w=1-u-v;mark(ax*w+bx*u+cx*v,ay*w+by*u+cy*v,az*w+bz*u+cz*v)}
    }
  });
  const ext=new Uint8Array(N),st=new Int32Array(N);let sp=0;st[sp++]=0;ext[0]=1;
  while(sp){
    const c=st[--sp],x=c%nx,y=((c/nx)|0)%ny,z=(c/sz)|0;
    if(x>0&&!ext[c-1]&&!surf[c-1]){ext[c-1]=1;st[sp++]=c-1}
    if(x<nx-1&&!ext[c+1]&&!surf[c+1]){ext[c+1]=1;st[sp++]=c+1}
    if(y>0&&!ext[c-nx]&&!surf[c-nx]){ext[c-nx]=1;st[sp++]=c-nx}
    if(y<ny-1&&!ext[c+nx]&&!surf[c+nx]){ext[c+nx]=1;st[sp++]=c+nx}
    if(z>0&&!ext[c-sz]&&!surf[c-sz]){ext[c-sz]=1;st[sp++]=c-sz}
    if(z<nz-1&&!ext[c+sz]&&!surf[c+sz]){ext[c+sz]=1;st[sp++]=c+sz}
  }
  const occ=new Uint8Array(N);for(let i=0;i<N;i++)occ[i]=ext[i]?0:1;
  const nbo=[],nbc=[];for(let dz=-1;dz<=1;dz++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const m=Math.abs(dx)+Math.abs(dy)+Math.abs(dz);if(m===0||m===3)continue;nbo.push(dx+nx*dy+sz*dz);nbc.push(cell*Math.sqrt(m))}
  return {nx,ny,nz,ox,oy,oz,cell,occ,N,sz,NBo:Int32Array.from(nbo),NBc:Float32Array.from(nbc),stamp:null,sc:0};
}
function voxIndex(V,x,y,z){const i=Math.floor((x-V.ox)/V.cell),j=Math.floor((y-V.oy)/V.cell),k=Math.floor((z-V.oz)/V.cell);if(i<0||j<0||k<0||i>=V.nx||j>=V.ny||k>=V.nz)return -1;return i+V.nx*j+V.sz*k}
function voxNear(V,x,y,z){ // nearest occupied voxel within 2 cells, or -1
  const i=Math.floor((x-V.ox)/V.cell),j=Math.floor((y-V.oy)/V.cell),k=Math.floor((z-V.oz)/V.cell);
  let best=-1,bd=1e30;
  for(let r=0;r<=2&&best<0;r++)for(let dz=-r;dz<=r;dz++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    const a=i+dx,b=j+dy,c=k+dz;if(a<0||b<0||c<0||a>=V.nx||b>=V.ny||c>=V.nz)continue;
    const id=a+V.nx*b+V.sz*c;if(!V.occ[id])continue;
    const d=(V.ox+(a+.5)*V.cell-x)**2+(V.oy+(b+.5)*V.cell-y)**2+(V.oz+(c+.5)*V.cell-z)**2;if(d<bd){bd=d;best=id}
  }
  return best;
}
function boneSeeds(V,a,b){
  const {nx,ny,nz,ox,oy,oz,cell,occ,sz}=V,abx=b.x-a.x,aby=b.y-a.y,abz=b.z-a.z,l2=abx*abx+aby*aby+abz*abz;
  for(const R of [1.75,3,5,8]){
    const rr=R*cell,out=[];
    const i0=Math.max(0,Math.floor((Math.min(a.x,b.x)-rr-ox)/cell)),i1=Math.min(nx-1,Math.floor((Math.max(a.x,b.x)+rr-ox)/cell));
    const j0=Math.max(0,Math.floor((Math.min(a.y,b.y)-rr-oy)/cell)),j1=Math.min(ny-1,Math.floor((Math.max(a.y,b.y)+rr-oy)/cell));
    const k0=Math.max(0,Math.floor((Math.min(a.z,b.z)-rr-oz)/cell)),k1=Math.min(nz-1,Math.floor((Math.max(a.z,b.z)+rr-oz)/cell));
    for(let k=k0;k<=k1;k++)for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
      const id=i+nx*j+sz*k;if(!occ[id])continue;
      const px=ox+(i+.5)*cell-a.x,py=oy+(j+.5)*cell-a.y,pz=oz+(k+.5)*cell-a.z;
      let s=l2?(px*abx+py*aby+pz*abz)/l2:0;s=s<0?0:s>1?1:s;
      const d=Math.sqrt((px-abx*s)**2+(py-aby*s)**2+(pz-abz*s)**2);if(d<=rr)out.push([id,d]);
    }
    if(out.length>=3)return out;
  }
  const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,mz=(a.z+b.z)/2;let best=-1,bd=1e30;
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const id=i+nx*j+sz*k;if(!occ[id])continue;const d=(ox+(i+.5)*cell-mx)**2+(oy+(j+.5)*cell-my)**2+(oz+(k+.5)*cell-mz)**2;if(d<bd){bd=d;best=id}}
  return best<0?[]:[[best,Math.sqrt(bd)]];
}
function dijkstra(V,seeds,maxD){
  const {N,occ,NBo,NBc}=V,dist=new Float32Array(N).fill(Infinity),nn=NBo.length;
  let cap=1<<15,hd=new Float32Array(cap),hi=new Int32Array(cap),n=0,popD=0;
  const push=(d,i)=>{if(n===cap){cap*=2;let a=new Float32Array(cap);a.set(hd);hd=a;let b=new Int32Array(cap);b.set(hi);hi=b}
    let k=n++;while(k>0){const p=(k-1)>>1;if(hd[p]<=d)break;hd[k]=hd[p];hi[k]=hi[p];k=p}hd[k]=d;hi[k]=i};
  const pop=()=>{const d0=hd[0],i0=hi[0];n--;if(n>0){const d=hd[n],i=hi[n];let k=0;for(;;){let c=2*k+1;if(c>=n)break;if(c+1<n&&hd[c+1]<hd[c])c++;if(hd[c]>=d)break;hd[k]=hd[c];hi[k]=hi[c];k=c}hd[k]=d;hi[k]=i}popD=d0;return i0};
  seeds.forEach(([i,d])=>{if(d<dist[i]){dist[i]=d;push(d,i)}});
  while(n){const i=pop();if(popD>dist[i])continue;if(popD>maxD)break;for(let q=0;q<nn;q++){const j=i+NBo[q];if(occ[j]===0)continue;const nd=popD+NBc[q];if(nd<dist[j]){dist[j]=nd;push(nd,j)}}}
  return dist;
}
/* Moves limb joints (elbow, wrist, knee) to the centre of the limb's cross-section. */
const REFINE=['el_L','el_R','wr_L','wr_R','knee_L','knee_R'];
function refineJoints(J,V,iters){
  const nbr={};LINKS.forEach(([p,q])=>{(nbr[p]=nbr[p]||[]).push(q);(nbr[q]=nbr[q]||[]).push(p)});
  const {nx,ny,ox,oy,oz,cell,occ,sz,N}=V;if(!V.stamp)V.stamp=new Uint32Array(N);
  for(let it=0;it<(iters||3);it++)for(const n of REFINE){
    const j=J[n],nb=nbr[n];if(!nb||nb.length!==2)continue;
    const axis=J[nb[1]].clone().sub(J[nb[0]]).normalize(),minL=Math.min(J[nb[0]].distanceTo(j),J[nb[1]].distanceTo(j)),rmax=Math.max(.28*minL,3*cell);
    let si=-1,sd=1e30;
    const ci=Math.floor((j.x-ox)/cell),cj=Math.floor((j.y-oy)/cell),ck=Math.floor((j.z-oz)/cell);
    for(let dz=-3;dz<=3;dz++)for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
      const a=ci+dx,b=cj+dy,c=ck+dz;if(a<0||b<0||c<0||a>=nx||b>=ny||c>=V.nz)continue;const id=a+nx*b+sz*c;if(!occ[id])continue;
      const px=ox+(a+.5)*cell-j.x,py=oy+(b+.5)*cell-j.y,pz=oz+(c+.5)*cell-j.z,al=px*axis.x+py*axis.y+pz*axis.z;
      if(Math.abs(al)>1.5*cell)continue;const d=px*px+py*py+pz*pz;if(d<sd){sd=d;si=id}
    }
    if(si<0)continue;
    const sc=++V.sc,q=[si];V.stamp[si]=sc;let sx=0,sy=0,sz2=0,cnt=0;
    while(q.length){
      const id=q.pop(),x=id%nx,y=((id/nx)|0)%ny,z=(id/sz)|0;
      const wx=ox+(x+.5)*cell,wy=oy+(y+.5)*cell,wz=oz+(z+.5)*cell,dx=wx-j.x,dy=wy-j.y,dz=wz-j.z;
      if(Math.abs(dx*axis.x+dy*axis.y+dz*axis.z)>1.5*cell||dx*dx+dy*dy+dz*dz>rmax*rmax)continue;
      sx+=wx;sy+=wy;sz2+=wz;cnt++;
      for(const o of [-1,1,-nx,nx,-sz,sz]){const k=id+o;if(k>=0&&k<N&&occ[k]&&V.stamp[k]!==sc){V.stamp[k]=sc;q.push(k)}}
    }
    if(cnt<4)continue;
    const d=new T.Vector3(sx/cnt-j.x,sy/cnt-j.y,sz2/cnt-j.z);d.addScaledVector(axis,-d.dot(axis));
    const cap=.08*minL;if(d.length()>cap)d.setLength(cap);j.add(d);
  }
}
const buildVox=(meshes)=>{const gs=meshes.map(worldGeom),V=voxelize(gs,+$('wres').value||72);gs.forEach(g=>g.dispose());return V};

/* Computes skin weights (4 influences per vertex) for world-space geometries against the bone segments. */
async function computeSkin(gs,heads,tails,h,V0,label){
  const nb=heads.length,pw=+$('wpow').value||4;
  const A=new Float32Array(nb*3),AB=new Float32Array(nb*3),L2=new Float32Array(nb);
  for(let j=0;j<nb;j++){const a=heads[j],b=tails[j];A.set([a.x,a.y,a.z],j*3);AB.set([b.x-a.x,b.y-a.y,b.z-a.z],j*3);L2[j]=AB[j*3]**2+AB[j*3+1]**2+AB[j*3+2]**2}
  say((label||'Rigging')+': building volume...');await tick();
  const V=V0||voxelize(gs,+$('wres').value||72),cell=V.cell,D=[];
  for(let j=0;j<nb;j++){
    D.push(dijkstra(V,boneSeeds(V,heads[j],tails[j]),.35*h));
    say((label||'Rigging')+': computing skin weights... '+Math.round((j+1)/nb*50)+'%');await tick();
  }
  let total=0,done=0;gs.forEach(g=>total+=g.attributes.position.count);
  const eps=.3*cell,bi=[0,0,0,0],bd=[0,0,0,0];
  const ins=(d,j)=>{let k=3;if(d>=bd[3])return;while(k>0&&d<bd[k-1]){bd[k]=bd[k-1];bi[k]=bi[k-1];k--}bd[k]=d;bi[k]=j};
  for(let mi=0;mi<gs.length;mi++){
    const g=gs[mi],pos=g.attributes.position,n=pos.count,si=new Uint16Array(n*4),sw=new Float32Array(n*4);
    for(let i=0;i<n;i++){
      const px=pos.getX(i),py=pos.getY(i),pz=pos.getZ(i),vi=voxNear(V,px,py,pz);
      bd[0]=bd[1]=bd[2]=bd[3]=Infinity;bi[0]=bi[1]=bi[2]=bi[3]=0;
      if(vi>=0)for(let j=0;j<nb;j++){const d=D[j][vi];if(d<bd[3])ins(d,j)}
      if(!isFinite(bd[0])){ // separate piece (eyes, hair...): nearest bone by straight distance
        for(let j=0;j<nb;j++){const j3=j*3,ax=px-A[j3],ay=py-A[j3+1],az=pz-A[j3+2];let k=L2[j]?(ax*AB[j3]+ay*AB[j3+1]+az*AB[j3+2])/L2[j]:0;k=k<0?0:k>1?1:k;
          const d=Math.sqrt((ax-AB[j3]*k)**2+(ay-AB[j3+1]*k)**2+(az-AB[j3+2]*k)**2);if(d<bd[3])ins(d,j)}
      }
      const lim=bd[0]*3+2*cell;let sum=0;const w=[0,0,0,0];
      for(let k=0;k<4;k++){if(isFinite(bd[k])&&(k===0||bd[k]<=lim)){w[k]=1/Math.pow(bd[k]+eps,pw);sum+=w[k]}}
      for(let k=0;k<4;k++){si[i*4+k]=bi[k];sw[i*4+k]=w[k]/sum}
      if((++done&16383)===0){say((label||'Rigging')+': computing skin weights... '+(50+Math.round(done/total*50))+'%');await tick()}
    }
    g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));
  }
}
/* Builds the humanoid skeleton from joint positions and skins every mesh to it. */
let rigInfo=null; // {J,heads,tails,h,src:[{geo,sm}]} - lets the MESH be moved/rotated later while the rig stays put
async function rigFromJoints(J,cx,info,V0){
  const meshes=getMeshes();if(!meshes.length)return say('No meshes found');
  root.updateMatrixWorld(true);
  const bb=new T.Box3().setFromObject(root),h=Math.max(bb.getSize(new T.Vector3()).y,1e-3);
  H=h;armAng=detectArm(J);setArmSel(armAng);
  const defs=[['hips',null,'pelvis','spine'],['spine','hips','spine','chest'],['chest','spine','chest','neck'],['neck','chest','neck','head'],['head','neck','head','headTop']];
  ['L','R'].forEach(n=>defs.push(['upperArm_'+n,'chest','sh_'+n,'el_'+n],['lowerArm_'+n,'upperArm_'+n,'el_'+n,'wr_'+n],['hand_'+n,'lowerArm_'+n,'wr_'+n,'hand_'+n],['upperLeg_'+n,'hips','hip_'+n,'knee_'+n],['lowerLeg_'+n,'upperLeg_'+n,'knee_'+n,'ankle_'+n],['foot_'+n,'lowerLeg_'+n,'ankle_'+n,'toe_'+n]));
  const rig=new T.Group();rig.name='RitmatorRig';const mk={},hd={},bl=[],heads=[],tails=[];
  defs.forEach(([n,p,a,b])=>{const bone=new T.Bone();bone.name=n;hd[n]=J[a];bone.position.copy(J[a]).sub(p?hd[p]:new T.Vector3());(p?mk[p]:rig).add(bone);mk[n]=bone;bl.push(bone);heads.push(J[a].clone());tails.push(J[b].clone())});
  rig.updateMatrixWorld(true);
  const skel=new T.Skeleton(bl);
  const gs=meshes.map(worldGeom);
  const src=gs.map(g=>{const c=g.clone();c.deleteAttribute('skinIndex');c.deleteAttribute('skinWeight');return c});
  await computeSkin(gs,heads,tails,h,V0,'Rigging');
  const sms=[];
  for(let mi=0;mi<meshes.length;mi++){
    const m=meshes[mi],sm=new T.SkinnedMesh(gs[mi],m.material);sm.name=m.name||('mesh'+mi);sm.frustumCulled=false;rig.add(sm);
    sm.bind(skel,new T.Matrix4());sms.push(sm);
  }
  if(wvOn){$('wview').checked=false;wvSet(false)}
  scene.remove(root);if(helper)scene.remove(helper);
  root=rig;scene.add(root);root.updateMatrixWorld(true);xfCapture();placeArrow();
  rigInfo={J:cloneJ(J),heads,tails,h,src:src.map((g,i)=>({geo:g,sm:sms[i]}))};
  lastJoints=cloneJ(J);lastCx=cx;undoS=[];redoS=[];
  collect();clips=[];addPreset('idle');addPreset('walk');cur=clips[0];t=0;stopPlay();makeHelper();refresh();applyLight();
  say('Rigged: '+bones.length+' bones. '+(info||'')+' Placement now moves only the MESH (the rig stays). Joint wrong? Manual rig -> fix -> Apply rig.');
}
/* After rigging: move/rotate/scale only the mesh, then re-fit the skin to the fixed rig. */
let reskinTimer=0,reskinPending=false;
function meshMatrix(){
  const pv=rigInfo.J.pelvis,R=new T.Matrix4().makeRotationFromEuler(new T.Euler(xf.rx*D,xf.ry*D,xf.rz*D,'YXZ'));
  return new T.Matrix4().makeTranslation(xf.px,xf.py,xf.pz).multiply(new T.Matrix4().makeTranslation(pv.x,pv.y,pv.z)).multiply(R)
    .multiply(new T.Matrix4().makeScale(xf.s,xf.s,xf.s)).multiply(new T.Matrix4().makeTranslation(-pv.x,-pv.y,-pv.z));
}
function scheduleReskin(){clearTimeout(reskinTimer);say('Mesh moved - re-fitting skin to the rig...');reskinTimer=setTimeout(reskin,160)}
async function reskin(){
  if(!rigInfo||!isRig())return;
  if(rigging){reskinPending=true;return}
  rigging=true;
  try{
    stopPlay();resetRest();
    if(wvOn){$('wview').checked=false;wvSet(false)}
    const M=meshMatrix(),gs=rigInfo.src.map(s=>{const g=s.geo.clone();g.applyMatrix4(M);return g});
    await computeSkin(gs,rigInfo.heads,rigInfo.tails,rigInfo.h,null,'Re-fitting skin');
    rigInfo.src.forEach((s,i)=>{const old=s.sm.geometry;s.sm.geometry=gs[i];old.dispose()});
    applyPose();ren.shadowMap.needsUpdate=true;
    say('Mesh placed. The rig did not move. Rotate / move until the mesh sits on the rig and faces the FRONT arrow.');
  }catch(e){console.error(e);say('Re-fit failed: '+(e&&e.message||e))}
  finally{rigging=false;if(reskinPending){reskinPending=false;scheduleReskin()}}
}
const confirmReplace=()=>!(bones.length&&root&&!isRig())||confirm('This model already has a skeleton. Rigging will replace it with a new humanoid rig. Continue?');
async function autoRig(){
  if(!root)return say('Load a model first');
  if(rigging)return;rigging=true;
  try{
    if(mmode)exitManual();
    stopPlay();armAng=ARMS[$('arms').value];resetRest();
    const meshes=getMeshes();if(!meshes.length)return say('No meshes found');
    say('Measuring the model...');await tick();
    const r=estimateAuto(meshes);
    let V=null;
    if($('refine').checked){say('Building volume...');await tick();V=buildVox(meshes);refineJoints(r.J,V,3);r.info+='; limb joints centred in the mesh'}
    await rigFromJoints(r.J,r.cx,r.info+'.',V);
  }catch(e){console.error(e);say('Auto rig failed: '+(e&&e.message||e))}
  finally{rigging=false}
}

/* ---------- skin tools ---------- */
let wvOn=false;const wvMat=new Map();
function wvSet(on){
  wvOn=on;
  const sms=[];if(root)root.traverse(o=>{if(o.isSkinnedMesh)sms.push(o)});
  sms.forEach(sm=>{
    const g=sm.geometry;
    if(!on){
      if(wvMat.has(sm)){sm.material.dispose();sm.material=wvMat.get(sm);wvMat.delete(sm)}
      if('oc' in g.userData){if(g.userData.oc)g.setAttribute('color',g.userData.oc);else g.deleteAttribute('color');delete g.userData.oc}
      return;
    }
    if(!wvMat.has(sm)){wvMat.set(sm,sm.material);sm.material=new T.MeshBasicMaterial({vertexColors:true})}
  });
  if(on)wvPaint();
}
function wvPaint(){
  if(!wvOn||!root)return;
  const b=bmap[$('bone').value];
  root.traverse(sm=>{
    if(!sm.isSkinnedMesh)return;
    const g=sm.geometry,n=g.attributes.position.count,bi=sm.skeleton.bones.indexOf(b),si=g.attributes.skinIndex.array,sw=g.attributes.skinWeight.array;
    if(!('oc' in g.userData))g.userData.oc=g.attributes.color||null;
    let col=g.attributes.color;if(!col||col===g.userData.oc||col.count!==n){col=new T.BufferAttribute(new Float32Array(n*3),3);g.setAttribute('color',col)}
    const ca=col.array;
    for(let i=0;i<n;i++){
      let w=0;for(let k=0;k<4;k++)if(si[i*4+k]===bi)w+=sw[i*4+k];
      w=Math.min(1,w);
      ca[i*3]=Math.min(1,Math.max(0,2*w-1));ca[i*3+1]=1-Math.abs(2*w-1);ca[i*3+2]=Math.min(1,Math.max(0,1-2*w));
    }
    col.needsUpdate=true;
  });
}
async function smoothWeights(passes){
  const sms=[];if(root)root.traverse(o=>{if(o.isSkinnedMesh)sms.push(o)});
  if(!sms.length)return say('Rig the model first');
  if(rigging)return;rigging=true;
  try{
    for(let mi=0;mi<sms.length;mi++){
      const sm=sms[mi],g=sm.geometry,pos=g.attributes.position,n=pos.count,nb=sm.skeleton.bones.length,sia=g.attributes.skinIndex.array,swa=g.attributes.skinWeight.array;
      const keyMap=new Map(),canon=new Int32Array(n);
      for(let i=0;i<n;i++){const k=Math.round(pos.getX(i)*1e4)+','+Math.round(pos.getY(i)*1e4)+','+Math.round(pos.getZ(i)*1e4);let c=keyMap.get(k);if(c===undefined){c=i;keyMap.set(k,i)}canon[i]=c}
      const adj=new Map(),A=(a,b)=>{if(a===b)return;let s=adj.get(a);if(!s){s=new Set();adj.set(a,s)}s.add(b)};
      const idx=g.index?g.index.array:null,tri=Math.floor((idx?idx.length:n)/3);
      for(let f=0;f<tri;f++){const a=canon[idx?idx[f*3]:f*3],b=canon[idx?idx[f*3+1]:f*3+1],c=canon[idx?idx[f*3+2]:f*3+2];A(a,b);A(b,a);A(b,c);A(c,b);A(a,c);A(c,a)}
      let W=new Float32Array(n*nb);
      for(let i=0;i<n;i++)for(let k=0;k<4;k++)W[i*nb+sia[i*4+k]]+=swa[i*4+k];
      for(let p=0;p<passes;p++){
        const W2=W.slice();let cnt=0;
        for(const [c,set] of adj){
          const deg=set.size;
          for(let b=0;b<nb;b++){let a=0;for(const q of set)a+=W[q*nb+b];W2[c*nb+b]=.5*W[c*nb+b]+.5*a/deg}
          if((++cnt&4095)===0){say('Smoothing weights... mesh '+(mi+1)+'/'+sms.length+', pass '+(p+1)+'/'+passes);await tick()}
        }
        for(let i=0;i<n;i++)if(canon[i]!==i)for(let b=0;b<nb;b++)W2[i*nb+b]=W2[canon[i]*nb+b];
        W=W2;
      }
      for(let i=0;i<n;i++){
        let a0=-1,a1=-1,a2=-1,a3=-1;const o=i*nb;
        for(let b=0;b<nb;b++){const w=W[o+b];
          if(a0<0||w>W[o+a0]){a3=a2;a2=a1;a1=a0;a0=b}else if(a1<0||w>W[o+a1]){a3=a2;a2=a1;a1=b}else if(a2<0||w>W[o+a2]){a3=a2;a2=b}else if(a3<0||w>W[o+a3]){a3=b}}
        const ids=[a0,a1,a2,a3],ws=ids.map(b=>b<0?0:W[o+b]),sum=ws[0]+ws[1]+ws[2]+ws[3]||1;
        for(let k=0;k<4;k++){sia[i*4+k]=ids[k]<0?0:ids[k];swa[i*4+k]=ws[k]/sum}
      }
      g.attributes.skinIndex.needsUpdate=true;g.attributes.skinWeight.needsUpdate=true;
    }
    wvPaint();say('Weights smoothed ('+passes+' passes). Press again for softer joints.');
  }catch(e){console.error(e);say('Smoothing failed: '+(e&&e.message||e))}
  finally{rigging=false}
}

/* ---------- manual rig ---------- */
let mmode=false,mj=null,jm={},jgrp=null,jlines=null,jsel=null,gh=[];
function ghost(on){
  if(on){const seen=new Set();getMeshes().forEach(m=>{(Array.isArray(m.material)?m.material:[m.material]).forEach(mt=>{if(seen.has(mt))return;seen.add(mt);gh.push([mt,mt.transparent,mt.opacity,mt.depthWrite]);mt.transparent=true;mt.opacity=.45;mt.depthWrite=false;mt.needsUpdate=true})})}
  else{gh.forEach(([mt,a,b,c])=>{mt.transparent=a;mt.opacity=b;mt.depthWrite=c;mt.needsUpdate=true});gh=[]}
}
function updateLines(){
  const a=jlines.geometry.attributes.position.array;
  LINKS.forEach(([p,q],i)=>{a.set([mj[p].x,mj[p].y,mj[p].z,mj[q].x,mj[q].y,mj[q].z],i*6)});
  jlines.geometry.attributes.position.needsUpdate=true;
}
function selectJoint(n){
  jsel=n;tc.attach(jm[n]);$('jsel').value=n;
  Object.values(jm).forEach(m=>m.scale.setScalar(m.userData.jn===n?1.8:1));
}
function onJointMove(){
  if(!mmode||!jsel)return;
  const o=jm[jsel],mir=$('jmir').checked,sided=/_[LR]$/.test(jsel);
  if(mir&&!sided)o.position.x=lastCx;
  mj[jsel].copy(o.position);
  if(mir&&sided){const k=jsel.replace(/_([LR])$/,(m,a)=>a==='L'?'_R':'_L');mj[k].set(2*lastCx-o.position.x,o.position.y,o.position.z);jm[k].position.copy(mj[k])}
  updateLines();
}
function enterManual(){
  if(!root)return say('Load a model first');
  if(rigging||mmode)return;
  if(!confirmReplace())return;
  stopPlay();armAng=ARMS[$('arms').value];resetRest();
  if(wvOn){$('wview').checked=false;wvSet(false)}
  const meshes=getMeshes();if(!meshes.length)return say('No meshes found');
  const r=lastJoints?{J:cloneJ(lastJoints),cx:lastCx,info:'Showing your previous joints.'}:estimateAuto(meshes);
  if(!lastJoints&&$('refine').checked){try{refineJoints(r.J,buildVox(meshes),3)}catch(e){console.warn(e)}}
  mj=r.J;lastCx=r.cx;mmode=true;
  if(helper)helper.visible=false;
  ghost(true);
  jgrp=new T.Group();scene.add(jgrp);
  const bb=new T.Box3().setFromObject(root),rad=Math.max(bb.getSize(new T.Vector3()).y*.012,1e-3);
  jm={};
  JL.forEach(n=>{
    const col=n.endsWith('_L')?0x3b9cff:n.endsWith('_R')?0xff5a5a:0xe07a38;
    const m=new T.Mesh(new T.SphereGeometry(rad,16,12),new T.MeshBasicMaterial({color:col,depthTest:false,transparent:true}));
    m.renderOrder=30;m.position.copy(mj[n]);m.userData.jn=n;jm[n]=m;jgrp.add(m);
  });
  const lg=new T.BufferGeometry();lg.setAttribute('position',new T.BufferAttribute(new Float32Array(LINKS.length*6),3));
  jlines=new T.LineSegments(lg,new T.LineBasicMaterial({color:0xffffff,depthTest:false,transparent:true,opacity:.8}));
  jlines.renderOrder=29;jlines.frustumCulled=false;jgrp.add(jlines);
  updateLines();
  $('jsel').innerHTML=JL.map(n=>'<option value="'+n+'">'+jlabel(n)+'</option>').join('');
  $('mpanel').classList.remove('hid');
  selectJoint('pelvis');
  say('Manual rig: drag the gizmo to move the selected joint, click a dot to pick another. '+(r.info||'')+' Press Apply rig when done.');
}
function centerJoints(){
  if(!mmode)return;
  refineJoints(mj,buildVox(getMeshes()),3);
  JL.forEach(n=>jm[n].position.copy(mj[n]));updateLines();say('Elbows, wrists and knees centred in the limbs.');
}
function exitManual(){
  if(!mmode)return;
  tc.detach();scene.remove(jgrp);
  jgrp.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose()});
  jgrp=null;jlines=null;jm={};jsel=null;mmode=false;
  ghost(false);if(helper)helper.visible=$('skel').checked;
  $('mpanel').classList.add('hid');
}
async function applyManual(){
  if(!mmode||rigging)return;
  const J=cloneJ(mj),cx=lastCx;
  exitManual();rigging=true;
  try{await rigFromJoints(J,cx,'')}catch(e){console.error(e);say('Rig failed: '+(e&&e.message||e))}
  finally{rigging=false}
}

