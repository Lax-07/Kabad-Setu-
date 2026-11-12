import {pipeline, env} from '/vendor/transformers.min.js';
env.allowRemoteModels=false;
env.allowLocalModels=true;
env.localModelPath='/models/';
env.backends.onnx.wasm.wasmPaths='/vendor/';
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.proxy=false;
let detector;
const candidates=[
 ['a laptop computer','Laptops',2],['a mobile phone','Mobile phones',0.18],['a desktop computer tower','Desktops',6],
 ['electrical wires and cables','Wires & cables',0.5],['a printed circuit board','Circuit boards',0.15],
 ['a computer monitor','Monitors',3],['a printer','Printers',5],['a computer keyboard','Accessories',0.5],
 ['a computer mouse','Accessories',0.1],['a power adapter or charger','Accessories',0.2],['a remote control','Accessories',0.1],
 ['a pile of paper','Paper',0.5],['a cardboard box','Cardboard',0.5],['a plastic bottle','Plastic',0.03],['a glass bottle','Glass',0.3],['a houseplant',null,0],['a table',null,0],['a decorative ornament',null,0],['a person',null,0],['an animal',null,0]
];
function overlap(a,b){const intersect=Math.max(0,Math.min(a.xmax,b.xmax)-Math.max(a.xmin,b.xmin))*Math.max(0,Math.min(a.ymax,b.ymax)-Math.max(a.ymin,b.ymin));const aa=Math.max(0,a.xmax-a.xmin)*Math.max(0,a.ymax-a.ymin),bb=Math.max(0,b.xmax-b.xmin)*Math.max(0,b.ymax-b.ymin);return {iou:intersect/(aa+bb-intersect||1),contained:intersect/(Math.min(aa,bb)||1)};}
self.onmessage=async({data})=>{
 try{
  if(!detector){
   detector=await pipeline('zero-shot-object-detection','Xenova/owlvit-base-patch32',{quantized:true,progress_callback:p=>{
    if(p.status==='progress'&&p.file?.endsWith('.onnx'))self.postMessage({type:'progress',id:data.id,progress:Math.round(p.progress)});
   }});
  }
  self.postMessage({type:'detecting',id:data.id});
  const detections=await detector(data.image,candidates.map(c=>c[0]),{threshold:0.2,topk:30});
  const selected=[];
  for(const detection of detections.sort((a,b)=>b.score-a.score)){
   if(!candidates.find(c=>c[0]===detection.label)?.[1])continue;
   if(!selected.some(other=>{const o=overlap(detection.box,other.box);return o.iou>0.45||o.contained>0.85;}))selected.push(detection);
  }
  const groups=new Map();
  for(const detection of selected){
   const [,type,referenceKg]=candidates.find(c=>c[0]===detection.label);
   const category=['Paper','Cardboard','Plastic','Glass'].includes(type)?type:'E-waste';
   const entry=groups.get(type)||{name:type,name_key:type,category,subcategory:category==='E-waste'?type:null,kg:0,score:0,count:0};
   entry.kg=Number((entry.kg+referenceKg).toFixed(2));entry.score=Math.max(entry.score,detection.score);entry.count++;groups.set(type,entry);
  }
  self.postMessage({type:'result',id:data.id,items:[...groups.values()],detections:selected});
 }catch(error){detector=null;self.postMessage({type:'error',id:data.id,message:'Local AI could not start. Try Chrome or Edge on a computer, or enter items manually.'});}
};
