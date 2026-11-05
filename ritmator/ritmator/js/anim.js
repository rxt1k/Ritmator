/* Ritmator - animation
   Presets, keyframe sampling, pose application, GLB clip building.
   Classic script (no modules): top-level names are shared by every file in js/. */
/* ---------- animation data ---------- */
function findBone(k){
  if(bmap[k])return k;
  const PR={hips:/hip|pelvis/,spine:/spine$|spine0?1$/,chest:/chest|spine0?2$/,neck:/neck/,head:/head/,upperArm:/upper_?arm|(^|[^a-z])arm/,lowerArm:/fore_?arm|lower_?arm/,hand:/hand/,upperLeg:/up_?leg|upper_?leg|thigh/,lowerLeg:/lo(w|wer)_?leg|calf|shin/,foot:/foot/};
  const [p,sd]=k.split('_'),re=PR[p];if(!re)return null;
  const m=bones.filter(b=>{const n=b.name.toLowerCase();
    if(!re.test(n))return false;
    if(p==='head'&&/end|top/.test(n))return false;
    if(p==='upperArm'&&/fore|lower/.test(n))return false;
    if(!sd)return true;
    return sd==='L'?/left|[._:]l($|[._])|l$/.test(n):/right|[._:]r($|[._])|r$/.test(n)});
  return m.length?m[0].name:null;
}
function addPreset(kind){
  const k=parseFloat($('int').value)||1;
  const dur={idle:3,walk:1,run:.7,wave:2,jump:1.2,punch:.9,kick:1.1,dance:2,sit:3,crouch:2,hit:.7,fall:1.8,empty:2}[kind];
  const N={punch:24,kick:24,hit:24,fall:24,jump:24,dance:24}[kind]||12,tr={};
  const baseZ=sd=>-sd*Math.max(0,70-armAng),lift=armAng+68;
  const add=(key,fn)=>{const nm=findBone(key);if(!nm)return;tr[nm]=[];for(let i=0;i<=N;i++){const u=i/N,r=fn(u*Math.PI*2,u),o={t:+(dur*u).toFixed(4),e:r.e.map((x,j)=>x*k+(r.b?r.b[j]:0))};if(r.p)o.p=r.p.map(x=>x*k);tr[nm].push(o)}};
  const E=(x=0,y=0,z=0,p)=>({e:[x,y,z],p}),S=Math.sin,C=Math.cos;
  const ss=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)};
  // elbow bend about the axis perpendicular to the resting arm direction, so it works for any arm angle
  const elbow=(sd,a)=>{const al=armAng*D,u=new T.Vector3(-Math.sin(al),-sd*Math.cos(al),0).normalize(),q=new T.Quaternion().setFromAxisAngle(u,a*D),e=new T.Euler().setFromQuaternion(q,'XYZ');return[e.x/D,e.y/D,e.z/D]};
  const AR=(sd,x,y=0,z=0)=>({e:[x,y,z],b:[0,0,baseZ(sd)]});
  const sides=[[1,'L'],[-1,'R']];
  const squat=deg=>{const th=deg*D;return[0,-.22*H*(1-C(th)),-.22*H*S(th)]};
  if(kind==='idle'){
    add('hips',p=>E(0,S(p)*1.2,0,[0,H*.004*S(p*2),0]));add('spine',p=>E(S(p)*1.2));add('chest',p=>E(S(p)*2));add('head',p=>E(S(p+1)*2,S(p)*3));
    for(const [sd,n] of sides)add('upperArm_'+n,p=>AR(sd,S(p+sd)*2));
  }
  if(kind==='walk'||kind==='run'){
    const run=kind==='run',la=run?55:30,kn=run?85:45,as=run?45:25;
    add('hips',p=>E(0,S(p)*(run?6:4),0,[0,H*(run?.035:.018)*C(p*2),0]));add('spine',p=>E(run?10:3,-S(p)*(run?6:4)));add('chest',p=>E(0,S(p)*(run?5:3)));add('head',p=>E(-(run?8:0),-S(p)*3));
    for(const [sd,n] of sides){const ph=p=>p+(n==='R'?Math.PI:0);
      add('upperLeg_'+n,p=>E(-la*S(ph(p))));add('lowerLeg_'+n,p=>E(kn*Math.max(0,C(ph(p)))));add('foot_'+n,p=>E(-12*Math.max(0,C(ph(p)))));
      add('upperArm_'+n,p=>AR(sd,as*S(ph(p))));add('lowerArm_'+n,()=>({e:elbow(sd,run?80:15)}));}
  }
  if(kind==='wave'){
    add('chest',p=>E(0,0,-S(p)*2));add('head',p=>E(0,S(p)*5));
    add('upperArm_R',()=>({e:[0,0,0],b:[0,0,-lift]}));add('lowerArm_R',p=>E(0,0,S(p*2)*30));
    add('upperArm_L',()=>AR(1,0));
  }
  if(kind==='jump'){
    const f=u=>u<.3?u/.3:u<.5?1-(u-.3)/.2:0,air=u=>u>=.3&&u<=.85?S((u-.3)/.55*Math.PI):0;
    add('hips',(p,u)=>E(0,0,0,[0,H*(.35*air(u)-.09*f(u)),0]));add('spine',(p,u)=>E(25*f(u)));
    for(const [sd,n] of sides){add('upperLeg_'+n,(p,u)=>E(-(50*f(u)+30*air(u))));add('lowerLeg_'+n,(p,u)=>E(75*f(u)+45*air(u)));
      add('upperArm_'+n,(p,u)=>AR(sd,f(u)*40-air(u)*110))}
  }
  if(kind==='punch'){
    const wind=u=>ss(0,.18,u)*(1-ss(.18,.3,u)),st=u=>ss(.18,.32,u)*(1-ss(.5,.85,u));
    add('hips',(p,u)=>E(0,-22*st(u)+8*wind(u)));add('spine',(p,u)=>E(8,-12*st(u)+6*wind(u)));add('chest',(p,u)=>E(0,-14*st(u)+8*wind(u)));add('head',(p,u)=>E(-6,4*st(u)));
    add('upperArm_R',(p,u)=>AR(-1,-55-45*st(u)+25*wind(u)));add('lowerArm_R',(p,u)=>({e:elbow(-1,100*(1-st(u))+10*st(u))}));
    add('upperArm_L',()=>AR(1,-60));add('lowerArm_L',()=>({e:elbow(1,110)}));
    add('upperLeg_L',()=>E(-12));add('lowerLeg_L',()=>E(18));add('upperLeg_R',()=>E(12));add('lowerLeg_R',()=>E(16));
  }
  if(kind==='kick'){
    const kick=u=>ss(.15,.4,u)*(1-ss(.55,.85,u));
    add('upperLeg_R',(p,u)=>E(-95*kick(u)));
    add('lowerLeg_R',(p,u)=>E(100*ss(.05,.28,u)*(1-ss(.3,.42,u))+40*ss(.42,.55,u)*(1-ss(.6,.85,u))));
    add('foot_R',(p,u)=>E(20*kick(u)));
    add('upperLeg_L',(p,u)=>E(5*kick(u)));add('lowerLeg_L',(p,u)=>E(10*kick(u)));
    add('spine',(p,u)=>E(-18*kick(u)));add('chest',(p,u)=>E(-8*kick(u)));add('head',(p,u)=>E(8*kick(u)));
    add('hips',(p,u)=>E(0,0,0,[0,0,-.03*H*kick(u)]));
    add('upperArm_L',(p,u)=>AR(1,25*kick(u)));add('upperArm_R',(p,u)=>AR(-1,-35*kick(u)));
  }
  if(kind==='dance'){
    const bob=p=>(1-C(p*4))/2;
    add('hips',p=>E(0,14*S(p),5*S(p),[H*.02*S(p),-H*.012*bob(p),0]));
    add('spine',p=>E(3,-8*S(p),-3*S(p)));add('chest',p=>E(0,10*S(p+1),5*S(p)));add('head',p=>E(0,-10*S(p),4*S(p)));
    for(const [sd,n] of sides){
      const ph=p=>p+(sd>0?0:Math.PI);
      add('upperArm_'+n,p=>({e:[0,0,0],b:[0,0,baseZ(sd)+sd*(60+60*S(ph(p)))]}));
      add('lowerArm_'+n,p=>({e:elbow(sd,40+30*S(ph(p)+1))}));
      add('upperLeg_'+n,p=>E(-12*bob(p)-8*Math.max(0,S(ph(p)))));add('lowerLeg_'+n,p=>E(24*bob(p)+10*Math.max(0,S(ph(p)))));
    }
  }
  if(kind==='sit'){
    const sq=squat(88);
    add('hips',p=>E(0,0,0,[sq[0],sq[1]+H*.002*S(p),sq[2]]));add('spine',p=>E(4+S(p)));add('chest',p=>E(S(p)*1.5));add('head',p=>E(-4,S(p+1)*2));
    for(const [sd,n] of sides){add('upperLeg_'+n,()=>E(-88));add('lowerLeg_'+n,()=>E(88));add('upperArm_'+n,()=>AR(sd,-35));add('lowerArm_'+n,()=>({e:elbow(sd,70)}))}
  }
  if(kind==='crouch'){
    const sq=squat(62);
    add('hips',p=>E(0,0,0,[sq[0],sq[1]+H*.003*S(p),sq[2]]));add('spine',p=>E(22+S(p)*2));add('chest',p=>E(8));add('head',p=>E(-22+S(p)*2));
    for(const [sd,n] of sides){add('upperLeg_'+n,()=>E(-62));add('lowerLeg_'+n,()=>E(62));add('upperArm_'+n,()=>AR(sd,-30));add('lowerArm_'+n,()=>({e:elbow(sd,60)}))}
  }
  if(kind==='hit'){
    const h=u=>ss(0,.15,u)*(1-ss(.2,.7,u));
    add('hips',(p,u)=>E(0,0,0,[0,0,-.04*H*h(u)]));add('spine',(p,u)=>E(-22*h(u)));add('chest',(p,u)=>E(-12*h(u)));add('head',(p,u)=>E(-28*h(u),12*h(u)));
    for(const [sd,n] of sides){add('upperArm_'+n,(p,u)=>AR(sd,35*h(u)));add('lowerLeg_'+n,(p,u)=>E(15*h(u)))}
  }
  if(kind==='fall'){
    const f=u=>ss(.1,.75,u);
    add('hips',(p,u)=>E(-88*f(u),0,0,[0,-.44*H*f(u),0]));
    add('head',(p,u)=>E(10*f(u)));add('spine',(p,u)=>E(-8*ss(0,.2,u)*(1-f(u))));
    for(const [sd,n] of sides){add('upperArm_'+n,(p,u)=>({e:[0,0,0],b:[0,0,baseZ(sd)+sd*30*f(u)]}));add('lowerLeg_'+n,(p,u)=>E(15*f(u)))}
  }
  let nm=kind,i=1;while(clips.some(c=>c.name===nm))nm=kind+(++i);
  const c={name:nm,dur,tr};clips.push(c);cur=c;t=0;return c;
}
let smoothOn=true;
const cr=(p0,p1,p2,p3,f)=>.5*((2*p1)+(-p0+p2)*f+(2*p0-5*p1+4*p2-p3)*f*f+(-p0+3*p1-3*p2+p3)*f*f*f);
function interp(a,b,p0,p3,f,k){
  const A=a[k],B=b[k];if(!A||!B)return A||B;
  if(!$('smooth').checked)return A.map((x,j)=>x+(B[j]-x)*f);
  const P0=(p0&&p0[k])||A,P3=(p3&&p3[k])||B;
  return A.map((x,j)=>cr(P0[j],x,B[j],P3[j],f));
}
function sample(tk,tm){
  if(!tk||!tk.length)return null;if(tm<=tk[0].t)return tk[0];const L=tk[tk.length-1];if(tm>=L.t)return L;
  let i=0;while(tk[i+1].t<tm)i++;
  const a=tk[i],b=tk[i+1],f=(tm-a.t)/(b.t-a.t),p0=tk[i-1],p3=tk[i+2];
  return{e:interp(a,b,p0,p3,f,'e'),p:interp(a,b,p0,p3,f,'p')};
}
const _o={e:[0,0,0],p:[0,0,0],hp:false};
function sampleInto(tk,tm,o){
  const n=tk.length;if(!n)return false;
  let a,b,f=0,p0=null,p3=null;
  if(n===1||tm<=tk[0].t)a=b=tk[0];else if(tm>=tk[n-1].t)a=b=tk[n-1];
  else{let i=0;while(tk[i+1].t<tm)i++;a=tk[i];b=tk[i+1];f=(tm-a.t)/(b.t-a.t);p0=tk[i-1]||null;p3=tk[i+2]||null}
  const sm=smoothOn&&a!==b;
  for(let j=0;j<3;j++){const x=a.e[j];o.e[j]=a===b?x:sm?cr((p0||a).e[j],x,b.e[j],(p3||b).e[j],f):x+(b.e[j]-x)*f}
  let pa=a.p,pb=b.p;o.hp=!!(pa||pb);
  if(o.hp){if(!pa)pa=pb;if(!pb)pb=pa;
    const q0=(p0&&p0.p)||pa,q3=(p3&&p3.p)||pb;
    for(let j=0;j<3;j++){const x=pa[j];o.p[j]=a===b?x:sm?cr(q0[j],x,pb[j],q3[j],f):x+(pb[j]-x)*f}}
  return true;
}
function applyPose(){
  if(!root)return;
  for(let i=0;i<bones.length;i++){const b=bones[i];b.quaternion.copy(b.userData.rest);b.position.copy(b.userData.rpos)}
  if(cur)for(const n in cur.tr){
    const b=bmap[n];if(!b||!sampleInto(cur.tr[n],t,_o))continue;
    _e.set(_o.e[0]*D,_o.e[1]*D,_o.e[2]*D,'XYZ');b.quaternion.copy(b.userData.rest).multiply(_q.setFromEuler(_e));
    if(_o.hp)b.position.copy(b.userData.rpos).add(_v.set(_o.p[0],_o.p[1],_o.p[2]));
  }
  root.updateMatrixWorld(true);
  if(ren)ren.shadowMap.needsUpdate=true;
  poke();
}
function toClip(c){
  const fps=30,n=Math.max(1,Math.round(c.dur*fps)),tracks=[];
  for(const nm in c.tr){
    const b=bmap[nm];if(!b||!c.tr[nm].length)continue;const ts=[],qs=[],ps=[];let hp=false;
    for(let i=0;i<=n;i++){
      const tt=i*c.dur/n,s=sample(c.tr[nm],tt);ts.push(tt);
      _e.set(s.e[0]*D,s.e[1]*D,s.e[2]*D,'XYZ');const q=b.userData.rest.clone().multiply(new T.Quaternion().setFromEuler(_e));qs.push(q.x,q.y,q.z,q.w);
      const r=b.userData.rpos,p=s.p||[0,0,0];if(s.p)hp=true;ps.push(r.x+p[0],r.y+p[1],r.z+p[2]);
    }
    tracks.push(new T.QuaternionKeyframeTrack(nm+'.quaternion',ts,qs));if(hp)tracks.push(new T.VectorKeyframeTrack(nm+'.position',ts,ps));
  }
  return new T.AnimationClip(c.name.replace(/[^\w-]/g,'_'),c.dur,tracks);
}

