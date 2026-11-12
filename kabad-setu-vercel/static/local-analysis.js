'use strict';
window.LocalAnalysis=(()=>{
 let worker,active,sequence=0;
 function cancel(){if(active){clearTimeout(active.timer);active.reject(new Error('Analysis cancelled. Your photo is still available.'));active=null;}if(worker){worker.terminate();worker=null;}}
 function analyze(image,progress){
  if(active)cancel();const id=++sequence;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{if(active){active.reject(new Error('Analysis took too long. Try a smaller, clearer photo or enter items manually.'));active=null;}if(worker){worker.terminate();worker=null;}},180000);
   active={id,resolve,reject,timer};
   try{if(!worker)worker=new Worker('/analysis-worker.js',{type:'module'});}catch(e){clearTimeout(timer);active=null;reject(new Error('Local AI could not start. Try Chrome or Edge on a computer, or enter items manually.'));return;}
   worker.onmessage=({data})=>{if(!active||data.id!==active.id)return;if(data.type==='progress'){progress(`Loading local AI: ${data.progress}%`);return;}if(data.type==='detecting'){progress('Detecting electronics…');return;}clearTimeout(timer);active=null;if(data.type==='error')reject(new Error(data.message));else resolve(data.items);};
   worker.onerror=()=>{if(!active)return;clearTimeout(timer);active=null;reject(new Error('Local AI could not start. Try Chrome or Edge on a computer, or enter items manually.'));};
   worker.postMessage({id,image});
  });
 }
 return {analyze,cancel};
})();
