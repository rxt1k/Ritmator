/* Ritmator - main
   Startup.
   Classic script (no modules): top-level names are shared by every file in js/. */
init();refresh();
window.__rt={get root(){return root},get bones(){return bones},get clips(){return clips},get cur(){return cur},loadDemo,autoRig,addPreset,refresh,setT:x=>{t=x;applyPose();syncTime()},setClip:i=>{cur=clips[i];t=0;refresh()},frame,setView,render:()=>ren.render(scene,cam),applyLight,J:()=>lastJoints};
loadDemo('adult',true).catch(e=>console.error(e));
