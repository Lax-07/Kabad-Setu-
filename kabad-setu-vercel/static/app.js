'use strict';
const $ = (q, root = document) => root.querySelector(q);
const icons = {
 laptop:'<rect x="5" y="3" width="14" height="12" rx="1"/><path d="m5 15-3 5h20l-3-5M9 18h6"/>',
 phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4m-3 14h2"/>',
 chip:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/><path d="M9 9h6v6H9z"/>',
 cable:'<path d="M8 2v5m4-5v5M6 7h8v4a4 4 0 0 1-8 0ZM10 15v2a4 4 0 0 0 8 0v-4m-2-4h4v4h-4z"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 scan:'<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3M3 12h18"/><rect x="7" y="7" width="10" height="10" rx="2"/>',
 truck:'<path d="M3 5h11v12H3zM14 9h4l3 4v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
 pin:'<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 chart:'<path d="M4 3v18h17M8 15l4-5 4 2 5-7"/>',
 leaf:'<path d="M20 3s2 12-5 15C6 23 0 12 7 7c4-3 9-2 13-4Z M5 21 16 10"/>',
 building:'<path d="M4 21V7l8-4v18M12 9h8v12M2 21h20M7 8v2m0 3v2m0 3v2m9-7v2m0 3v2"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 camera:'<path d="M8 5 6 8H3v12h18V8h-3l-2-3Z"/><circle cx="12" cy="13" r="3"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
 voice:'<path d="M4 9v6m4-10v14m4-16v18m4-14v10m4-8v6"/>',
 volume:'<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18m0 4h-6v5h6M5 5V3h13v2"/>',
 recycle:'<path d="m8 6 4-4 5 8h-6m6 0 5 8H12l3-5m-3 5H2l5-9 2 5"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>',
 upload:'<path d="M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6"/>',
 box:'<path d="m12 3 9 5v10l-9 4-9-4V8Zm0 9 9-4M12 12 3 8m9 4v10M7 5l9 5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.recycle}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const money = value => new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',maximumFractionDigits:2}).format(value || 0);
const state = {ewaste_rates:{},preferredSubcategory:'Laptops',recyclerFilter:'ewaste',user:null,recyclers:[],rates:{},ai_available:false,recycler_id:null,pickups:[],page:'home',hindi:I18N.language==='hi',analysisVersion:0,analysisBusy:false,analysisStatus:'',lot:null,image:null,items:[],regStep:0,gps:null,proofGps:null,proofImage:null,regVoice:false,otpPhone:null,otpVerification:null,otpDemoCode:null};
let pageVersion = 0;
let toastTimer;
async function api(path, body) {
 const response = await fetch(path, body === undefined ? {credentials:'same-origin'} : {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data = await response.json();
 if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
 return data;
}
function toast(text) { $('#toast').textContent=text; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),5000); }
function showOtp(code){const message=`Your website OTP is ${code}. It expires in 10 minutes.`;$('#otp-status').textContent=message;toast(message);}
function fillIcons(root=document) { root.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon)); }
function dateText(value) {return new Date(value.length===10 ? value+'T12:00:00' : value).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}
function dateInput(offset) {const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
const voiceSteps=['registration-name','registration-phone','registration-address'];
const welcome='welcome';
const guideAudio=$('#guide-audio');
const voiceLanguages={hi:'हिन्दी',mr:'मराठी',en:'English',kn:'ಕನ್ನಡ'};
let voiceLanguage='hi';try{const saved=localStorage.getItem('ks-voice-language');if(voiceLanguages[saved])voiceLanguage=saved;}catch{}
let voiceRequest=0;
let voiceMessage='Press Listen for voice guidance.';
let voicePlaying=false;
function updateVoiceUI(){
 document.querySelectorAll('[data-voice-status]').forEach(e=>e.textContent=voiceMessage);
 document.querySelectorAll('[data-action="voice-stop"]').forEach(e=>e.hidden=!voicePlaying);
 document.querySelectorAll('[data-action="read-step"], [data-action="voice-start"], [data-action="voice-sell"]').forEach(e=>e.setAttribute('aria-pressed',String(voicePlaying)));
}
function stopVoice(){
 voiceRequest++;guideAudio.pause();guideAudio.currentTime=0;voicePlaying=false;
 voiceMessage='Voice stopped. Press Listen to replay.';updateVoiceUI();
}
async function speak(key,quiet=false){
 const request=++voiceRequest;
 guideAudio.pause();
 guideAudio.src=`/audio/${voiceLanguage==='hi'?'':voiceLanguage+'-'}${key}.wav`;
 guideAudio.currentTime=0;guideAudio.muted=false;guideAudio.volume=1;
 voicePlaying=false;voiceMessage='Preparing voice guidance…';updateVoiceUI();
 try{
  // Invoke play directly from the click/submit handler, before any network await.
  await guideAudio.play();
  if(request!==voiceRequest)return;
  voicePlaying=true;voiceMessage='Voice guidance is playing.';updateVoiceUI();
 }catch(error){
  if(request!==voiceRequest||error.name==='AbortError')return;
  voicePlaying=false;
  voiceMessage=error.name==='NotAllowedError'?'Press Listen to start the voice guide.':'Audio could not load. Press Listen to try again.';
  updateVoiceUI();if(!quiet)toast(voiceMessage);
 }
}
guideAudio.addEventListener('ended',()=>{voicePlaying=false;voiceMessage='Press Listen to replay.';updateVoiceUI();});
function voiceControls(action='voice-start'){return `<div class="voice-actions"><label class="voice-language"><span>Voice language</span><select data-voice-language aria-label="Voice language" data-i18n-skip>${Object.entries(voiceLanguages).map(([code,label])=>`<option value="${code}" ${code===voiceLanguage?'selected':''}>${label}</option>`).join('')}</select></label><button class="button" data-action="${action}">${icon('volume')}Listen</button><button class="text-link" data-action="voice-stop" hidden>Stop</button></div>`;}
function itemRate(item){return item.category==='E-waste'?(state.ewaste_rates[item.subcategory||'Mixed e-waste']||0):state.rates[item.category];}
function ewasteTiles(){const labels={'Laptops':'लैपटॉप','Mobile phones':'मोबाइल','Desktops':'डेस्कटॉप','Wires & cables':'तार और केबल','Circuit boards':'सर्किट बोर्ड','Monitors':'मॉनिटर','Printers':'प्रिंटर','Accessories':'एक्सेसरीज़','Mixed e-waste':'मिला-जुला ई-कबाड़'};return `<div class="ewaste-grid">${Object.entries(state.ewaste_rates).map(([name,rate])=>`<button class="ewaste-tile" data-action="pick-ewaste" data-subcategory="${esc(name)}"><span class="step-icon">${icon(name==='Wires & cables'?'cable':name==='Circuit boards'?'chip':name==='Mobile phones'?'phone':'laptop')}</span><strong>${esc(name)}</strong><small>${labels[name]}</small><span class="ewaste-price">${money(rate)} <small>/ kg</small></span></button>`).join('')}</div>`;}
function modal(content) {$('#modal-content').innerHTML=`<div class="modal-inner"><button class="dialog-language" type="button" data-action="toggle-language" data-language-toggle data-i18n-skip>${I18N.language==='hi'?'English':'हिन्दी'}</button>${content}</div>`;if(!$('#modal').open) $('#modal').showModal();}
function modalHead(title,subtitle='',eyebrow='KABAD SETU') {return `<div class="modal-head"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div><button class="close-button" data-action="close-modal" aria-label="Close dialog">×</button></div>`;}
function closeModal() {$('#modal').close();state.regVoice=false;stopVoice();}
function heading(title,subtitle,action='') {return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;}
function recyclerCard(r) {return `<article class="recycler-card"><div class="recycler-title"><span class="recycler-logo">${r.initials}</span><div><h3>${esc(r.name)}</h3><small>${r.materials.split(',').includes('E-waste')?'E-waste specialist · Demo':'Demo recycler partner'}</small></div></div><div class="recycler-meta">${icon('pin')}${r.distance!=null?`${r.distance} km away · `:''}${esc(r.address.split(',')[0])}</div><div class="recycler-meta">${icon('clock')}${esc(r.operating_hours||'Timings not set')}</div><div class="tags">${r.materials.split(',').slice(0,3).map(m=>`<span class="tag">${m}</span>`).join('')}${r.materials.split(',').length>3?'<span class="tag">+ more</span>':''}</div><div class="card-bottom"><span>● Demo listing</span><button class="text-link" data-action="recycler-details" data-id="${r.id}">View details ↗</button></div></article>`;}
function home() {
 const done=state.pickups.filter(p=>p.status==='completed');const weight=done.reduce((sum,p)=>sum+p.items.reduce((s,i)=>s+i.kg,0),0);const total=done.reduce((s,p)=>s+p.total,0);const active=state.pickups.filter(p=>p.status==='scheduled').length;
 return `${heading(`A fresh start, ${state.user?esc(state.user.name.split(' ')[0]):'a greener tomorrow'}.`,'Good things happen when waste finds the right place.',`<button class="location-chip" data-action="location-info">${icon('pin')}${state.user?.lat!=null?'GPS location saved':'Set your location'}⌄</button>`)}
 <section class="hero"><div class="hero-copy"><div class="eyebrow">A SECOND LIFE FOR YOUR ELECTRONICS</div><h2>${'Old electronics.<br><em>New possibilities.</em>'}</h2><p>${'From laptops and phones to wires and circuit boards. Sort your e-waste, see its estimated value, and find a recycling partner.'}</p><div class="hero-actions"><button class="button" data-action="start-selling">${icon('camera')}${'Sell your e-waste'} ${icon('arrow')}</button><small>${icon('shield')}Simple. Transparent. Responsible.</small></div></div><img class="hero-art" src="/illustration.svg" alt="A collection of a laptop, phone, wires and circuit boards ready for recycling"></section>
 <section class="voice-card"><span class="voice-symbol">${icon('voice')}</span><div class="voice-copy"><strong>नमस्ते! मैं आपकी मदद के लिए यहाँ हूँ।</strong><span class="badge">Voice guidance</span><p data-voice-status role="status" aria-live="polite">${voiceMessage}</p></div>${voiceControls()}</section>
 <section class="stats" aria-label="Your activity"><article class="stat"><div class="stat-label">Waste collected</div>${icon('recycle')}<div class="stat-value">${weight.toLocaleString('en-IN')}<small>kg</small></div><div class="stat-sub">${done.length?'Estimated weight of completed lots':'Your first collection starts here'}</div></article><article class="stat"><div class="stat-label">Completed lot value</div>${icon('wallet')}<div class="stat-value">${money(total)}</div><div class="stat-sub">Estimated value · payment not tracked</div></article><article class="stat"><div class="stat-label">Upcoming pickups</div>${icon('truck')}<div class="stat-value">${String(active).padStart(2,'0')}<small>scheduled</small></div><div class="stat-sub">${active?'Your next step toward a cleaner city':'Ready when you are'}</div></article></section>
 <section class="ewaste-section"><div class="section-heading"><div><h2>What electronics are you recycling?</h2><p>Choose a type to start. Illustrative scrap rates, not resale prices.</p></div><a class="text-link" href="#rates">All rates ${icon('arrow')}</a></div>${ewasteTiles()}</section>
 <section><div class="section-heading"><div><h2>A little e-waste. A lot of possibility.</h2><p>Three simple steps to give your waste a second life.</p></div></div><div class="steps"><article class="step"><div class="step-top"><span class="step-icon">${icon('camera')}</span><span class="step-num">01</span></div><h3>Snap your collection</h3><p>Take a clear photo of your waste. A new beginning starts with a picture.</p></article><article class="step"><div class="step-top"><span class="step-icon">${icon('spark')}</span><span class="step-num">02</span></div><h3>Know its worth</h3><p>Review your materials and an estimated value, all in one simple breakdown.</p></article><article class="step"><div class="step-top"><span class="step-icon">${icon('truck')}</span><span class="step-num">03</span></div><h3>Book. Collect. Recycle.</h3><p>Choose a recycler and a convenient time. We’ll keep a record of the pickup.</p></article></div></section>
 <section><div class="section-heading"><div><h2>A better destination for your electronics.</h2><p>${state.user?.lat!=null?'Demo recyclers sorted by distance from your GPS location.':'Explore our sample recycler network in Delhi NCR.'}</p></div><a class="text-link" href="#recyclers">View all ${icon('arrow')}</a></div><div class="recycler-grid">${[...state.recyclers].sort((a,b)=>Number(b.materials.includes('E-waste'))-Number(a.materials.includes('E-waste'))).map(recyclerCard).join('')}</div></section>`;
}
function estimateTable() {return `<div class="table-wrap"><table class="estimate-table"><thead><tr><th>Item description</th><th>Category</th><th>E-waste type</th><th>Est. kg</th><th>Rate / kg</th><th>Value</th><th></th></tr></thead><tbody>${state.items.map((item,i)=>`<tr><td><input aria-label="Material ${i+1}" data-item="${i}" data-key="name" value="${esc(item.name_key?I18N.translate(item.name_key):item.name)}" ${item.name_key?`data-name-key="${esc(item.name_key)}"`:''} maxlength="80"></td><td><select aria-label="Category ${i+1}" data-item="${i}" data-key="category">${['E-waste',...Object.keys(state.rates).filter(c=>c!=='E-waste')].map(c=>`<option ${c===item.category?'selected':''}>${c}</option>`).join('')}</select></td><td>${item.category==='E-waste'?`<select aria-label="E-waste type ${i+1}" data-item="${i}" data-key="subcategory">${Object.keys(state.ewaste_rates).map(c=>`<option ${c===(item.subcategory||'Mixed e-waste')?'selected':''}>${esc(c)}</option>`).join('')}</select>`:'<span class="subtle">—</span>'}</td><td><input class="weight" type="number" min="0.01" max="10000" step="0.01" aria-label="Estimated kilograms ${i+1}" data-item="${i}" data-key="kg" value="${item.kg}"></td><td class="item-rate">${money(itemRate(item))}</td><td class="item-total">${money(item.kg*itemRate(item))}</td><td><button class="remove-item" data-action="remove-item" data-index="${i}" aria-label="Remove ${esc(item.name)}">×</button></td></tr>`).join('')}</tbody></table></div><button class="text-link" data-action="add-item">+ Add another item</button><div class="estimate-total" style="margin-top:17px"><span>Estimated lot value<small class="subtle" style="display:block;font-size:10px">Final price depends on weighing and recycler agreement.</small></span><strong id="estimate-total">${money(estimateTotal())}</strong></div>`;}
function estimateTotal(){return state.items.reduce((s,i)=>s+(Number(i.kg)||0)*itemRate(i),0);}
function sell() {
 if(!state.user)return `${heading('Your next collection starts here.','A few details, and you’re ready to give waste a new destination.')}<section class="panel empty-state">${icon('user')}<h2>Let’s get to know you.</h2><p>Create your collector profile with your name, verified phone number and address. Our multilingual voice guide can help along the way.</p><button class="button" data-action="register">Create collector profile ${icon('arrow')}</button></section>`;
 return `${heading('Give your electronics a second life.','Separate your laptops, wires, circuit boards and other electronics for a clearer estimate.','<button class="button secondary" data-action="edit-location">Edit pickup location</button>')}<section class="voice-card"><span class="voice-symbol">${icon('voice')}</span><div class="voice-copy"><strong>ई-कबाड़ बेचने में मदद चाहिए?</strong><p data-voice-status role="status" aria-live="polite">${voiceMessage}</p></div>${voiceControls('voice-sell')}</section><div class="sell-layout"><div><section class="panel"><div class="section-heading"><h2>1. Your electronics collection</h2><span class="badge">${state.ai_available?(state.ai_mode==='local'?'Local photo AI · No API key':'Photo AI connected'):'Manual estimate available'}</span></div><div class="upload-zone" id="upload-zone">${state.image?`<img class="photo-preview" src="${state.image}" alt="Your uploaded waste collection">`:icon('camera')}${!state.image?'<h3>Show us your old electronics.</h3><p>Drag a photo here, or choose how you’d like to add it.</p>':''}<div class="upload-actions"><button class="button" data-action="choose-photo">${icon('upload')}${state.image?'Change photo':'Upload a photo'}</button><button class="button secondary" data-action="take-photo">${icon('camera')}Take a photo</button></div><small>JPG, PNG or WebP · up to 6 MB · optimized before upload</small></div><input hidden type="file" id="lot-file" accept="image/jpeg,image/png,image/webp"><input hidden type="file" id="lot-camera" accept="image/*" capture="environment">${state.ai_mode==='local'?`<div class="notice">First analysis loads the local model and may take a minute. No API key needed.</div><div class="form-actions"><button class="button" data-action="analyze" ${!state.image||state.analysisBusy?'disabled':''}>${icon('spark')}Analyse my photo</button><button class="text-link" data-action="manual" ${state.analysisBusy?'disabled':''}>Enter materials manually</button></div>`:state.ai_available?`<label class="check-field" style="margin-top:17px"><input type="checkbox" id="ai-consent">I agree to send this waste photo to OpenAI for analysis. Keep personal documents out of the photo.</label><div class="form-actions"><button class="button" data-action="analyze" ${!state.image?'disabled':''}>${icon('spark')}Analyse my waste</button><button class="text-link" data-action="manual">Enter materials manually</button></div>`:`<div class="notice">Photo AI needs an API key. You can still upload a photo, enter materials and weights, and book a pickup.</div><button class="button" data-action="manual" ${!state.image?'disabled':''}>Enter e-waste details ${icon('arrow')}</button>`}<p id="analysis-status" role="status" class="subtle">${state.analysisStatus}</p>${state.analysisBusy?'<button class="text-link" data-action="cancel-analysis">Cancel analysis</button>':''}<div class="form-error" id="sell-error"></div></section>${state.items.length?`<section class="panel" id="estimate-panel"><div class="section-heading"><h2>2. A clearer picture of its worth</h2><span class="badge amber">${state.lot?.source==='local_ai'?'Local AI · review required':state.lot?.source==='ai'?'AI estimate · review required':'Manual estimate'}</span></div>${state.lot?.source==='local_ai'?'<div class="notice warning">AI suggests visible items only. Starting weights are reference assumptions per detected item, not measurements. Correct every category and weight before booking.</div>':''}<p class="subtle">Choose an e-waste type for each item. Each type has its own illustrative rate per kg.</p><div id="estimate-editor">${estimateTable()}</div><div class="form-error" id="estimate-error"></div><div class="form-actions"><span class="subtle">All values in Indian rupees</span><button class="button" data-action="save-estimate">Choose a recycler ${icon('arrow')}</button></div></section>`:''}</div><aside><section class="panel"><span class="step-icon">${icon('spark')}</span><h2 style="margin-top:18px">A better photo.<br>A better estimate.</h2><ul class="tip-list"><li>Spread your materials out so each type is visible.</li><li>Use natural light and avoid blurry photos.</li><li>Group laptops, cables and circuit boards separately.</li><li>Photograph whole devices as whole devices; don’t count their internal parts twice.</li><li>Enter measured weights if you know them.</li></ul><div class="notice">A photo cannot measure weight or reveal every hidden material. Always review the estimate.</div></section></aside></div>`;
}
function pickupCard(p,recycler=false) {return `<article class="pickup-card"><div class="pickup-head"><h3>Pickup KS-${String(p.id).padStart(4,'0')}</h3><span class="badge ${p.status==='scheduled'?'amber':''}">${p.status==='scheduled'?'● Scheduled':'✓ Completed'}</span></div><div class="pickup-details"><div><small>${recycler?'Collector':'Recycler'}</small><strong>${esc(recycler?p.collector_name:p.recycler_name)}</strong></div><div><small>Pickup date & time</small><strong>${dateText(p.pickup_date)} · ${esc(p.slot)}</strong></div><div><small>Estimated lot value</small><strong>${money(p.total)}</strong></div><div><small>Materials</small><strong>${esc(p.items.map(i=>`${i.category==='E-waste'?(i.subcategory||'Mixed e-waste'):i.category} (${i.kg} kg)`).join(', '))}</strong></div><div><small>Pickup address</small><strong>${esc(p.address)}</strong></div>${recycler?`<div><small>Collector phone</small><strong>${esc(p.phone)}</strong></div>`:''}</div><div class="pickup-actions"><span>${p.status==='completed'?'Photo and GPS receipt saved':'Saved · recycler notified in app'}</span><div><button class="text-link" data-action="view-lot" data-id="${p.lot_id}">View lot</button> ${p.status==='completed'?`<button class="button secondary" data-action="receipt" data-id="${p.id}">View receipt ${icon('arrow')}</button>`:recycler?`<button class="button" data-action="proof" data-id="${p.id}">${icon('camera')}Complete pickup</button>`:''}</div></div></article>`;}
function pickupsPage() {return `${heading('Your collections, all in one place.','Follow each lot from your doorstep to its next beginning.',`<a href="#sell" class="button">+ New collection</a>`)}${state.pickups.length?state.pickups.map(p=>pickupCard(p)).join(''):`<div class="panel empty-state">${icon('truck')}<h2>The road to a greener tomorrow starts here.</h2><p>You don’t have any pickups yet. Upload your first waste collection to get started.</p><a class="button" href="#sell">Sell your waste ${icon('arrow')}</a></div>`}`;}
function recyclersPage(){const partners=state.recyclerFilter==='ewaste'?state.recyclers.filter(r=>r.materials.split(',').includes('E-waste')):state.recyclers;return `${heading('The right partner for your e-waste.','Find a recycler accepting electronics before booking your collection.',state.user?'<button class="button secondary" data-action="edit-location">Edit pickup location</button>':'')}<div class="filter-tabs"><button class="${state.recyclerFilter==='ewaste'?'selected':''}" data-action="filter-recyclers" data-filter="ewaste">E-waste partners</button><button class="${state.recyclerFilter==='all'?'selected':''}" data-action="filter-recyclers" data-filter="all">All materials</button></div><div class="notice warning">These are fictional Delhi NCR demo listings, not verified authorised facilities. Add verified recycler records before using this service for real collections.</div>${state.user?.lat==null?'<div class="notice">Register and share GPS to sort recyclers by distance. You can continue registration with an address if GPS is unavailable.</div>':''}<div class="recycler-grid">${partners.map(recyclerCard).join('')}</div>`;}
function ratesPage(){return `${heading('Every electronic part has its own value.','Explore e-waste subcategories before you create your collection.')}<div class="notice warning">Illustrative scrap prices per kilogram, not live quotes or working-device resale values. Final prices depend on condition, material grade, weight and recycler agreement.</div><div class="section-heading"><h2>E-waste categories</h2><span class="badge">${Object.keys(state.ewaste_rates).length} types</span></div>${ewasteTiles()}<div class="section-heading" style="margin-top:28px"><h2>Other recyclable materials</h2></div><div class="rate-grid">${Object.entries(state.rates).filter(([c])=>c!=='E-waste').map(([c,r])=>`<article class="rate-card">${icon(c==='Paper'||c==='Cardboard'?'box':'recycle')}<h3>${c}</h3><strong>${money(r)}</strong> <small>/ kg</small></article>`).join('')}</div>`;}
function recyclerLogin(){return `${heading('A greener city takes a good team.','Sign in to manage assigned collections and record pickup proof.')}<section class="panel" style="max-width:540px"><h2>Recycler workspace</h2><p class="subtle">Local demo access for the sample recycler network.</p><form id="recycler-login"><div class="form-grid"><label class="field full"><span>Your organisation</span><select name="recycler_id">${state.recyclers.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></label><label class="field full"><span>Workspace password</span><input name="password" type="password" required autocomplete="current-password"><small>Local demo password: demo-recycler (unless changed by the administrator).</small></label></div><div class="form-error" id="login-error"></div><button class="button" type="submit">Open workspace ${icon('arrow')}</button></form></section>`;}
async function render() {
 const version=++pageVersion;state.page=location.hash.slice(1)||'home';
 if(!['home','sell','pickups','recyclers','rates','recycler'].includes(state.page))state.page='home';
 if(state.demo_role==='recycler')state.page='recycler';
 if(state.demo_role==='user'&&state.page==='recycler')state.page='home';
 roleNavigation();
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.dataset.page===state.page));
 if(['home','pickups'].includes(state.page)&&state.user){try{state.pickups=(await api('/api/pickups')).pickups;}catch(e){if(version===pageVersion)toast(e.message);}}
 if(version!==pageVersion)return;
 if(state.page==='recycler'){
  if(!state.recycler_id){$('#main').innerHTML=recyclerLogin();return;}
  $('#main').innerHTML='<div class="loading"><span class="spin"></span>Loading your workspace…</div>';
  try{const result=await api('/api/pickups?role=recycler');if(version!==pageVersion)return;state.recyclerPickups=result.pickups;
   const r=state.recyclers.find(r=>r.id===state.recycler_id);
   $('#main').innerHTML=`${heading(esc(r?.name||'Recycler workspace'),`${esc(r?.address||'')} · ${esc(r?.operating_hours||'Timings not set')}`,`<div class="upload-actions"><button class="button secondary" data-action="edit-recycler-profile">Edit recycler profile</button><button class="text-link" data-action="recycler-logout">Sign out</button></div>`)}<div class="tags">${r.materials.split(',').map(material=>`<span class="tag">${esc(material)}</span>`).join('')}</div><div class="notice">Demo workspace · notifications refresh every 15 seconds. Pickup evidence records browser-reported location and server receipt time; it does not verify payment or physical handover.</div><section class="notifications"><div class="section-heading"><h2>Collection notifications</h2><button class="text-link" data-action="refresh">Refresh ↻</button></div><div id="notification-list">${notificationHTML(result.notifications)}</div></section><div class="section-heading"><h2>Your assigned pickups</h2></div>${result.pickups.length?result.pickups.map(p=>pickupCard(p,true)).join(''):'<section class="panel empty-state">'+icon('truck')+'<h2>A clear road ahead.</h2><p>New bookings for this recycler will appear here.</p></section>'}`;
  }catch(e){$('#main').innerHTML=`<div class="panel"><p>${esc(e.message)}</p><button class="button" data-action="recycler-logout">Return to sign in</button></div>`;}
  return;
 }
 $('#main').innerHTML=({home,sell,pickups:pickupsPage,recyclers:recyclersPage,rates:ratesPage}[state.page])();updateVoiceUI();
 const drop=$('#upload-zone');if(drop){drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover');});drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragover');if(e.dataTransfer.files[0])loadLotPhoto(e.dataTransfer.files[0]);});}
 $('.notification-dot').hidden=!state.pickups.some(p=>p.status==='scheduled');
}
function rolePicker(){
 modal(`${modalHead('Choose your demo role.','Switch workspaces for your demonstration.')}<form id="role-form"><label class="field"><span>Demo role</span><select name="role"><option value="user">User</option><option value="admin">Admin</option><option value="recycler">Recycler</option></select></label><p class="subtle">Admin: full website. User: collector features only. Recycler: assigned pickups and proofs only.</p><label class="field" id="role-recycler" hidden><span>Recycler</span><select name="recycler_id">${state.recyclers.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></label><label class="field" id="role-password" hidden><span>Workspace password</span><input name="password" type="password" autocomplete="current-password"></label><p id="role-error" class="form-error"></p><button class="button" type="submit">Enter workspace</button></form>`);
}
function roleNavigation(){
 const role=state.demo_role||'user';document.body.dataset.demoRole=role;
 $('.workspace-label').textContent={admin:'ADMIN WORKSPACE',user:'USER WORKSPACE',recycler:'RECYCLER WORKSPACE'}[role];
 document.querySelectorAll('a[href="#recycler"]').forEach(e=>e.hidden=role!=='admin');
 document.querySelectorAll('nav a, .planet-note, #profile-button, #header-profile').forEach(e=>e.hidden=role==='recycler');
 $('#demo-role-button').textContent={admin:'Admin',user:'User',recycler:'Recycler'}[role]+' · Switch role';
}
function recyclerProfile(){
 const recycler=state.recyclers.find(item=>item.id===state.recycler_id);if(!recycler)return;
 const accepted=new Set(recycler.materials.split(','));
 modal(`${modalHead('Edit recycler profile.','Update what you collect, your location and operating timings.')}<form id="recycler-profile-form"><fieldset class="material-fieldset"><legend>Scrap categories accepted</legend><div class="check-grid">${Object.keys(state.rates).map(name=>`<label class="check-field"><input type="checkbox" name="materials" value="${esc(name)}" ${accepted.has(name)?'checked':''}><span>${esc(name)}</span></label>`).join('')}</div></fieldset><label class="field"><span>Recycler address</span><textarea name="address" required maxlength="400">${esc(recycler.address)}</textarea></label><div class="upload-actions"><button class="button secondary" type="button" data-action="recycler-profile-gps">${icon('pin')}Use current location</button><button class="text-link" type="button" data-action="recycler-profile-clear-gps">Use address only</button></div><p class="subtle" role="status" aria-live="polite" id="recycler-profile-gps-status">${recycler.lat==null?'No GPS location saved.':`Saved GPS: ${recycler.lat.toFixed(5)}, ${recycler.lng.toFixed(5)}`}</p><div class="form-grid"><label class="field"><span>Latitude</span><input type="number" name="lat" step="any" min="-90" max="90" value="${recycler.lat??''}"></label><label class="field"><span>Longitude</span><input type="number" name="lng" step="any" min="-180" max="180" value="${recycler.lng??''}"></label></div><label class="field"><span>Operating timings</span><input name="operating_hours" required maxlength="160" value="${esc(recycler.operating_hours||'09:00–18:00, Monday–Saturday')}" placeholder="e.g. 09:00–18:00, Monday–Saturday"></label><div class="form-error" id="recycler-profile-error"></div><div class="form-actions"><button type="button" class="text-link" data-action="close-modal">Cancel</button><button class="button" type="submit">Save recycler profile ${icon('check')}</button></div></form>`);
}
async function captureRecyclerGps(){
 const form=$('#recycler-profile-form');if(!form)return;const button=$('[data-action=recycler-profile-gps]',form),save=$('[type=submit]',form);button.disabled=true;save.disabled=true;$('#recycler-profile-gps-status').textContent='Capturing current location…';
 try{const gps=await getGps();if($('#recycler-profile-form')!==form)return;$('[name=lat]',form).value=gps.lat;$('[name=lng]',form).value=gps.lng;$('#recycler-profile-gps-status').textContent=`Saved GPS: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`;}catch(error){if($('#recycler-profile-form')===form)$('#recycler-profile-gps-status').textContent=error.message;}finally{if($('#recycler-profile-form')===form){button.disabled=false;save.disabled=false;}}
}
function notificationHTML(rows){return rows.length?rows.slice(0,5).map(n=>`<div class="notification-row">${icon('bell')}<span>${esc(n.message)}<small class="subtle" style="display:block;font-size:10px">${dateText(n.created_at)}</small></span></div>`).join(''):'<p class="subtle">No collection notifications yet.</p>';}
async function bootstrap(){const data=await api('/api/bootstrap');Object.assign(state,data);roleNavigation();$('#profile-name').toggleAttribute('data-i18n-skip',Boolean(state.user));$('#profile-name').textContent=state.user?.name||'Welcome, collector';$('#profile-status').textContent=state.user?'Collector · Phone verified':'Let’s get you started';const initials=state.user?state.user.name.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase():'KS';document.querySelectorAll('.avatar').forEach(el=>el.textContent=initials);}
function registration(voice=true){if(state.user){showProfile();return;}state.regStep=0;state.gps=null;state.regVoice=voice;state.otpPhone=null;state.otpVerification=null;state.otpDemoCode=null;
 modal(`${modalHead('A small step. A fresh start.','Let’s create your collector profile.','WELCOME TO THE COMMUNITY')}<div class="registration-steps"><span class="on"></span><span></span><span></span></div><div class="voice-card" style="padding:11px;margin-bottom:12px"><div class="voice-copy"><strong id="reg-hindi">अपना नाम और मोबाइल नंबर भरें।</strong><p data-voice-status role="status" aria-live="polite">${voiceMessage}</p></div>${voiceControls('read-step')}</div><form id="registration-form"><section class="reg-step" data-step="0"><div class="form-grid"><label class="field full"><span>Full name · पूरा नाम</span><input name="name" required maxlength="80" autocomplete="name" placeholder="e.g. Ramesh Kumar" data-prompt="कृपया अपना पूरा नाम भरें।"></label><label class="field full"><span>Mobile number · मोबाइल नंबर</span><input name="phone" required inputmode="numeric" pattern="[6-9][0-9]{9}" maxlength="10" autocomplete="tel-national" placeholder="10-digit mobile number" data-prompt="कृपया अपना दस अंकों का मोबाइल नंबर भरें।"><small>The website will generate a one-time demo password for this registration.</small></label></div></section><section class="reg-step" data-step="1" hidden><div class="form-grid"><label class="field full"><span>One-time password (OTP)</span><input name="otp" required maxlength="10" pattern="[0-9]{4,10}" inputmode="numeric" autocomplete="one-time-code" placeholder="Enter the OTP"></label></div><p class="subtle" id="otp-status" role="status" aria-live="polite">Enter the OTP shown in the website notification.</p><button class="text-link" type="button" data-action="resend-otp">Generate a new OTP</button></section><section class="reg-step" data-step="2" hidden><div class="form-grid"><label class="field full"><span>Pickup address · पूरा पता</span><textarea name="address" required maxlength="400" autocomplete="street-address" placeholder="House / street, landmark, area, city and PIN" data-prompt="कृपया अपना पूरा पता भरें।"></textarea></label></div><button type="button" class="button secondary" data-action="get-gps">${icon('pin')}Use my current location</button><p class="subtle" role="status" aria-live="polite" id="gps-status">GPS helps sort nearby demo recyclers. Your browser will ask for permission.</p><label class="check-field"><input type="checkbox" name="consent" required><span>I consent to storing my profile, verified phone number and location (if shared), and sharing pickup contact details with my chosen recycler.</span></label></section><div class="form-error" id="registration-error"></div><div class="form-actions"><button type="button" class="text-link" id="reg-back" data-action="reg-back" hidden>← Back</button><span class="subtle" id="step-label">Step 1 of 3</span><button type="submit" class="button" id="reg-next">Generate OTP ${icon('arrow')}</button></div></form>`);
 updateVoiceUI();captureRegistrationGps();
}
function updateRegStep(){document.querySelectorAll('.reg-step').forEach(e=>{e.hidden=Number(e.dataset.step)!==state.regStep;e.querySelectorAll('input,select,textarea').forEach(f=>f.disabled=e.hidden);});document.querySelectorAll('.registration-steps span').forEach((e,i)=>e.classList.toggle('on',i<=state.regStep));$('#reg-back').hidden=state.regStep===0;$('#step-label').textContent=`Step ${state.regStep+1} of 3`;$('#reg-next').innerHTML=state.regStep===0?`Generate OTP ${icon('arrow')}`:state.regStep===1?`Verify OTP ${icon('check')}`:`Create my profile ${icon('check')}`;$('#reg-hindi').textContent=['अपना नाम और मोबाइल नंबर भरें।','वेबसाइट की सूचना में दिखाया गया ओटीपी भरें।','अपना पता भरें और लोकेशन साझा करें।'][state.regStep];$('#registration-error').textContent='';if(state.regVoice)speak(voiceSteps[state.regStep]);}
function getGps(){
 return new Promise((resolve,reject)=>{
  if(!window.isSecureContext)return reject(new Error('Location requires HTTPS or localhost. Open this site using a secure address.'));
  if(!navigator.geolocation)return reject(new Error('GPS is unavailable in this browser.'));
  const attempt=highAccuracy=>navigator.geolocation.getCurrentPosition(
   p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),
   e=>{
    if(e.code!==1&&highAccuracy){attempt(false);return;}
    reject(new Error(e.code===1
     ?'Location access is blocked. Allow location for this site in browser settings and enable Location Services on your device, then try again.'
     :'Location could not be detected. Check your internet connection and device Location Services, then retry or enter your address and coordinates manually.'));
   },{enableHighAccuracy:highAccuracy,timeout:highAccuracy?8000:12000,maximumAge:0});
  attempt(true);
 });
}
async function captureRegistrationGps(){
 const form=$('#registration-form'),target=$('#gps-status');if(!form||!target||form.dataset.locating)return;
 form.dataset.locating='true';const button=$('[data-action=get-gps]',form);button.disabled=true;target.textContent='Locating you…';
 try{const gps=await getGps();if($('#registration-form')!==form||!$('#modal').open)return;state.gps=gps;target.textContent=`Location saved: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} (±${Math.round(gps.accuracy)} m)`;}
 catch(e){if($('#registration-form')===form)target.textContent=e.message;}
 finally{delete form.dataset.locating;button.disabled=false;}
}
function showProfile(){if(state.demo_role==='recycler')return;if(!state.user){registration();updateRegStep();return;}modal(`${modalHead('Your collector profile.')}<div class="receipt-grid"><div><small>Name</small>${esc(state.user.name)}</div><div><small>Verified phone</small>${esc(state.user.phone)}</div><div><small>Phone status</small><span class="badge">Verified by OTP</span></div><div style="grid-column:1/-1"><small>Pickup address</small>${esc(state.user.address)}</div></div><button class="button secondary" data-action="edit-location">${icon('pin')}Edit pickup location</button><div class="notice">Your profile is saved in this browser’s secure session for 7 days. Phone sign-in and account recovery are not yet configured.</div><p class="subtle">Signing out ends access to this collector account in this browser. Account recovery is not available yet.</p><button class="button secondary" data-action="collector-logout">Sign out of collector account</button>`);}
function editLocation(){
 if(!state.user)return;
 modal(`${modalHead('Edit your pickup location.','Update your address and location for your next collection.')}<form id="location-form"><div class="form-grid"><label class="field full"><span>Pickup address</span><textarea name="address" required maxlength="400" autocomplete="street-address">${esc(state.user.address)}</textarea></label></div><div class="upload-actions"><button class="button secondary" type="button" data-action="edit-location-gps">${icon('pin')}Use my current location</button><button class="text-link" type="button" data-action="clear-location-gps">Use address only</button></div><p class="subtle" role="status" aria-live="polite" id="location-gps-status">${state.user.lat==null?'No GPS location saved. You can use your address only.':`Saved GPS: ${state.user.lat.toFixed(5)}, ${state.user.lng.toFixed(5)}`}</p><details><summary class="subtle">Set coordinates manually</summary><div class="form-grid"><label class="field"><span>Latitude</span><input type="number" name="lat" step="any" min="-90" max="90" value="${state.user.lat??''}" inputmode="decimal"></label><label class="field"><span>Longitude</span><input type="number" name="lng" step="any" min="-180" max="180" value="${state.user.lng??''}" inputmode="decimal"></label></div></details><div class="notice">Updates nearby recyclers and future bookings. Existing pickups keep their booked address.</div><div class="form-error" id="location-error"></div><div class="form-actions"><button type="button" class="text-link" data-action="close-modal">Cancel</button><button type="submit" class="button">Save location ${icon('check')}</button></div></form>`);
 captureEditedGps(true);
}
function clearEditedGps(){const form=$('#location-form');if(!form)return;form.gpsRequest=null;$('[data-action=edit-location-gps]',form).disabled=false;$('[type=submit]',form).disabled=false;$('[name=lat]',form).value='';$('[name=lng]',form).value='';$('#location-gps-status').textContent='No GPS location saved. You can use your address only.';}
async function captureEditedGps(automatic=false){
 const form=$('#location-form');if(!form)return;
 const request={};form.gpsRequest=request;
 const button=$('[data-action=edit-location-gps]',form),save=$('[type=submit]',form);
 const current=()=>$('#location-form')===form&&$('#modal').open&&form.gpsRequest===request;
 button.disabled=true;save.disabled=true;$('#location-gps-status').textContent='Capturing current location…';
 try{const gps=await getGps();if(!current())return;$('[name=lat]',form).value=gps.lat;$('[name=lng]',form).value=gps.lng;if(!automatic)form.dataset.gpsEdited='true';$('#location-gps-status').textContent=`Saved GPS: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`;}
 catch(e){if(current())$('#location-gps-status').textContent=e.message;}
 finally{if(form.gpsRequest===request){button.disabled=false;save.disabled=false;form.gpsRequest=null;}}
}
async function readPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Please use a JPEG, PNG or WebP photo.');
 if(file.size>6*1024*1024)throw new Error('This photo is too large. Choose one under 6 MB.');
 const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read this photo.'));reader.readAsDataURL(file);});
 const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('This file is not a readable photo.'));image.src=url;});
 // Leave room for base64 encoding and JSON under Vercel's 4.5 MB request limit.
 if(file.size<=2.5*1024*1024)return url;
 const canvas=document.createElement('canvas'),scale=Math.min(1,1800/Math.max(img.width,img.height));
 canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
 const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);
 for(const quality of [0.88,0.75,0.6]){const compressed=canvas.toDataURL('image/jpeg',quality);if(compressed.length<3_500_000)return compressed;}
 throw new Error('The photo is too detailed to upload. Try a smaller photo.');
}
async function loadLotPhoto(file){try{const image=await readPhoto(file);state.analysisVersion++;if(state.analysisBusy){LocalAnalysis.cancel();state.analysisBusy=false;}state.analysisStatus='';state.image=image;state.lot=null;state.items=[];await render();toast('Photo added. Your collection is ready to review.');}catch(e){toast(e.message);}}
function validateItems(){if(!state.items.length)throw new Error('Add at least one material.');for(const i of state.items){if(!i.name.trim()||!Number.isFinite(Number(i.kg))||i.kg<=0||i.kg>10000)throw new Error('Add a material name and a weight between 0.01 and 10,000 kg for every row.');}}
function booking(){const compatible=state.recyclers.filter(r=>state.items.every(i=>r.materials.split(',').includes(i.category)));modal(`${modalHead('A good destination awaits.','Choose a recycler and a pickup time.','BOOK YOUR COLLECTION')}<form id="booking-form"><div class="form-grid"><label class="field full"><span>Recycler</span><select name="recycler_id" required>${compatible.map(r=>`<option value="${r.id}">${esc(r.name)}${r.distance!=null?` · ${r.distance} km`:''}</option>`).join('')}</select><small>Only partners accepting every material in your lot are shown.</small></label><label class="field"><span>Pickup date</span><input type="date" name="pickup_date" required min="${dateInput(1)}" max="${dateInput(30)}" value="${dateInput(1)}"></label><label class="field"><span>Time slot (India)</span><select name="slot"><option>09:00–12:00</option><option>12:00–15:00</option><option>15:00–18:00</option></select></label></div><div class="notice">Pickup from: ${esc(state.user.address)}</div><div class="estimate-total"><span>Estimated value</span><strong>${money(estimateTotal())}</strong></div><p class="subtle">Demo booking · your chosen recycler will receive an in-app notification. No SMS is sent. The final amount is agreed after weighing.</p>${!compatible.length?'<div class="form-error">No single demo recycler accepts this combination. Split your materials into separate lots.</div>':''}<div class="form-error" id="booking-error"></div><button class="button" type="submit" ${!compatible.length?'disabled':''} style="width:100%">Confirm pickup ${icon('truck')}</button></form>`);}
function proofDialog(id){state.proofGps=null;state.proofImage=null;state.proofCapturedAt=null;modal(`${modalHead('One last step. A clear record.','Take a collection photo and capture your current GPS location.','PICKUP PROOF')}<form id="proof-form" data-id="${id}"><div class="upload-zone"><img id="proof-preview" class="photo-preview" hidden alt="Pickup proof preview">${icon('camera')}<h3>Capture the handover</h3><button class="button secondary" type="button" data-action="take-proof">Take / upload pickup photo</button><input id="proof-file" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden><small>Use a fresh photo of the collected materials.</small></div><div class="form-actions"><button type="button" class="button secondary" data-action="proof-gps">${icon('pin')}Capture current GPS</button></div><p class="subtle" id="proof-gps-status">GPS is required to complete a pickup.</p><div class="notice">We save the photo, its image hash, current server date and time, and browser-reported GPS in a separate transaction database. This is collection evidence, not a payment receipt.</div><div class="form-error" id="proof-error"></div><button type="submit" class="button" style="width:100%">Save proof & complete pickup ${icon('check')}</button></form>`);}
function receipt(id){const p=(state.page==='recycler'?(state.recyclerPickups||[]):state.pickups).find(p=>p.id===id&&p.recorded_at);if(!p)return;modal(`${modalHead(`Collection receipt KS-${String(p.id).padStart(4,'0')}`,'Your collection has a traceable record.','PICKUP COMPLETED')}<img class="photo-preview" src="/api/photos/proof/${p.id}" alt="Recorded pickup evidence"><div class="receipt-grid"><div><small>Recycler</small>${esc(p.recycler_name)}</div><div><small>Collector</small>${esc(p.collector_name)}</div><div><small>Recorded at (server time)</small>${new Date(p.recorded_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</div><div><small>Estimated collection value</small>${money(p.total)}</div><div><small>Browser-reported GPS</small>${p.proof_lat.toFixed(5)}, ${p.proof_lng.toFixed(5)}</div><div><small>Reported GPS accuracy</small>±${Math.round(p.accuracy)} metres</div></div><p class="hash">Image SHA-256: ${esc(p.sha256)}</p><div class="notice">Pickup evidence saved in the transaction database. Photo time and GPS are device-reported; physical handover and payment are not independently verified.</div>`);}
async function action(name,el){
 switch(name){
 case 'toggle-language':toggleLanguage();break;
 case 'cancel-analysis':LocalAnalysis.cancel();break;
 case 'close-modal':closeModal();break;
 case 'start-selling':if(state.user)location.hash='sell';else{registration(true);updateRegStep();}break;
 case 'register':registration();updateRegStep();break;
 case 'voice-start':if(state.user)speak('sell');else{registration(true);updateRegStep();}break;
 case 'voice-stop':stopVoice();break;
 case 'voice-sell':speak('sell');break;
 case 'filter-recyclers':state.recyclerFilter=el.dataset.filter;await render();break;
 case 'pick-ewaste':state.preferredSubcategory=el.dataset.subcategory;location.hash='sell';if(state.page==='sell')await render();toast(`${state.preferredSubcategory} selected. Upload a photo to estimate your collection.`);break;
 case 'read-step':state.regVoice=true;speak(voiceSteps[state.regStep]);break;
 case 'reg-back':state.regStep--;updateRegStep();break;
 case 'resend-otp':{
  el.disabled=true;try{const result=await api('/api/otp/send',{phone:state.otpPhone});state.otpVerification=null;state.otpDemoCode=result.demo_code;showOtp(result.demo_code);}catch(error){$('#registration-error').textContent=error.message;}finally{el.disabled=false;}break;
 }
 case 'get-gps':await captureRegistrationGps();break;
 case 'location-info':if(!state.user){registration();updateRegStep();}else editLocation();break;
 case 'edit-location':editLocation();break;
 case 'edit-location-gps':await captureEditedGps();break;
 case 'clear-location-gps':clearEditedGps();break;
 case 'choose-photo':$('#lot-file').click();break;
 case 'take-photo':$('#lot-camera').click();break;
 case 'manual':if(!state.image){toast('Upload a photo first.');break;}state.items=[{name:state.preferredSubcategory,name_key:state.preferredSubcategory,category:'E-waste',subcategory:state.preferredSubcategory,kg:1}];state.lot=null;await render();$('#estimate-panel').scrollIntoView({behavior:'smooth',block:'start'});break;
 case 'add-item':if(state.items.length>=30){toast('You can add up to 30 materials.');break;}state.items.push({name:'',category:'E-waste',subcategory:state.preferredSubcategory,kg:1});$('#estimate-editor').innerHTML=estimateTable();break;
 case 'remove-item':state.items.splice(Number(el.dataset.index),1);$('#estimate-editor').innerHTML=estimateTable();break;
 case 'analyze':{
  if(!state.image||state.analysisBusy)break;
  const local=state.ai_mode==='local';
  if(!local&&!$('#ai-consent')?.checked){$('#sell-error').textContent='Please consent to sending this waste photo for analysis.';break;}
  state.analysisBusy=true;state.analysisStatus=local?'Loading local AI…':'Analysing your collection…';
  const originalImage=state.image,analysisVersion=++state.analysisVersion;
  let nextLot;
  await render();
  try{
   if(local){
    const items=await LocalAnalysis.analyze(originalImage,message=>{state.analysisStatus=message;if($('#analysis-status'))$('#analysis-status').textContent=message;});
    if(state.image!==originalImage)break;
    if(!items.length)throw new Error('No clear recyclable materials found. Try a clearer photo or enter materials manually.');
    nextLot=await api('/api/lots',{image:originalImage,items,source:'local_ai'});
   }else nextLot=await api('/api/lots',{image:originalImage,analyze:true});
   if(state.image!==originalImage)break;
   state.lot=nextLot;state.items=state.lot.items;state.analysisStatus=`Found ${state.items.length} item types. Review the estimate below.`;
  }catch(e){if(analysisVersion===state.analysisVersion)state.analysisStatus=e.message;}
  finally{if(analysisVersion===state.analysisVersion){state.analysisBusy=false;await render();if(state.items.length&&$('#estimate-panel'))$('#estimate-panel').scrollIntoView({behavior:'smooth'});}}
  break;
 }
 case 'save-estimate':el.disabled=true;try{validateItems();if(!state.lot)state.lot=await api('/api/lots',{image:state.image,items:state.items});booking();}catch(e){$('#estimate-error').textContent=e.message;}finally{el.disabled=false;}break;
 case 'recycler-details':{const r=state.recyclers.find(r=>r.id===Number(el.dataset.id));modal(`${modalHead(esc(r.name),esc(r.address),'DEMO RECYCLER PARTNER')}<p class="subtle">Operating timings: ${esc(r.operating_hours||'Timings not set')}</p><div class="tags">${r.materials.split(',').map(m=>`<span class="tag">${m}</span>`).join('')}</div><div class="notice warning">Fictional demonstration listing. Authorisation and operating licence have not been verified.</div><p class="subtle">${r.distance!=null?`${r.distance} km from your saved GPS location. Distances are straight-line estimates.`:'Share GPS during registration to see distance.'}</p><button class="button" data-action="sell-from-modal">Create a collection ${icon('arrow')}</button>`);break;}
 case 'sell-from-modal':closeModal();location.hash='sell';break;
 case 'collector-logout':
  await api('/api/logout',{role:'collector'});closeModal();LocalAnalysis.cancel();state.analysisVersion++;Object.assign(state,{user:null,pickups:[],gps:null,proofGps:null,proofGpsAt:null,proofImage:null,image:null,lot:null,items:[],analysisBusy:false,analysisStatus:''});await bootstrap();if(location.hash==='#home')await render();else location.hash='home';toast('You have signed out of your collector account.');break;
 case 'recycler-logout':await api('/api/logout',{role:'recycler'});state.recycler_id=null;await render();break;
 case 'edit-recycler-profile':recyclerProfile();break;
 case 'recycler-profile-gps':await captureRecyclerGps();break;
 case 'recycler-profile-clear-gps':{const form=$('#recycler-profile-form');$('[name=lat]',form).value='';$('[name=lng]',form).value='';$('#recycler-profile-gps-status').textContent='No GPS location saved. Address will still be shown.';break;}
 case 'refresh':await bootstrap();await render();break;
 case 'proof':proofDialog(Number(el.dataset.id));break;
 case 'take-proof':$('#proof-file').click();break;
 case 'proof-gps':el.disabled=true;$('#proof-gps-status').textContent='Capturing current location…';try{state.proofGps=await getGps();state.proofGpsAt=Date.now();$('#proof-gps-status').textContent=`${state.proofGps.lat.toFixed(5)}, ${state.proofGps.lng.toFixed(5)} · ±${Math.round(state.proofGps.accuracy)} m`;}catch(e){if($('#proof-gps-status'))$('#proof-gps-status').textContent=e.message;}finally{el.disabled=false;}break;
 case 'receipt':receipt(Number(el.dataset.id));break;
 case 'view-lot':modal(`${modalHead('The collection photo.')}<img class="photo-preview" style="max-height:65vh" src="/api/photos/lot/${Number(el.dataset.id)}" alt="Waste collection photo">`);break;
 }
}
document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(el)action(el.dataset.action,el).catch(e=>toast(e.message));});

document.addEventListener('input',e=>{if(e.target.dataset.item!=null){const i=Number(e.target.dataset.item),key=e.target.dataset.key;state.items[i][key]=key==='kg'?Number(e.target.value):e.target.value;if(key==='name'){state.items[i].name_key=null;e.target.removeAttribute('data-name-key');}if(key==='category'){state.items[i].subcategory=state.items[i].category==='E-waste'?state.preferredSubcategory:null;}if(key==='category'||key==='subcategory'){if(state.items[i].name_key){state.items[i].name_key=state.items[i].category==='E-waste'?state.items[i].subcategory:state.items[i].category;state.items[i].name=state.items[i].name_key;}$('#estimate-editor').innerHTML=estimateTable();return;}const row=e.target.closest('tr');$('.item-rate',row).textContent=money(itemRate(state.items[i]));$('.item-total',row).textContent=money(state.items[i].kg*itemRate(state.items[i]));$('#estimate-total').textContent=money(estimateTotal());}});
document.addEventListener('input',e=>{
 if(e.target.matches('#registration-form [name=phone]')&&e.target.value!==state.otpPhone){state.otpPhone=null;state.otpVerification=null;state.otpDemoCode=null;}
 const form=e.target.closest('#location-form');if(!form)return;
 if(e.target.name==='lat'||e.target.name==='lng'){form.dataset.gpsEdited='true';form.gpsRequest=null;$('[data-action=edit-location-gps]',form).disabled=false;$('[type=submit]',form).disabled=false;$('#location-gps-status').textContent='Manual coordinates entered. Save to update your location.';}
 if(e.target.name==='address'&&e.target.value!==state.user.address&&!form.dataset.gpsEdited){clearEditedGps();$('#location-gps-status').textContent='Address changed. Capture GPS again or save using your address only.';}
});
document.addEventListener('change',async e=>{
 if(e.target.matches('#role-form [name=role]')){$('#role-password').hidden=e.target.value==='user';$('#role-recycler').hidden=e.target.value!=='recycler';$('#role-form [name=password]').required=e.target.value!=='user';return;}
 if(e.target.matches('[data-voice-language]')){voiceLanguage=e.target.value;try{localStorage.setItem('ks-voice-language',voiceLanguage);}catch{}document.querySelectorAll('[data-voice-language]').forEach(select=>select.value=voiceLanguage);stopVoice();if($('#registration-form')&&$('#modal').open){state.regVoice=true;speak(voiceSteps[state.regStep]);}else speak(state.user?'sell':'welcome');return;}
 if(['lot-file','lot-camera'].includes(e.target.id)&&e.target.files[0])await loadLotPhoto(e.target.files[0]);
 if(e.target.id==='proof-file'&&e.target.files[0]){try{state.proofImage=await readPhoto(e.target.files[0]);state.proofCapturedAt=new Date().toISOString();$('#proof-preview').src=state.proofImage;$('#proof-preview').hidden=false;}catch(err){toast(err.message);}}
});
document.addEventListener('invalid',e=>{if(I18N.language==='hi'&&e.target.setCustomValidity)e.target.setCustomValidity('कृपया इस फ़ील्ड में सही जानकारी भरें।');},true);
document.addEventListener('input',e=>{if(e.target.setCustomValidity)e.target.setCustomValidity('');});
document.addEventListener('submit',async e=>{
 e.preventDefault();const form=e.target;
 if(form.id==='location-form'){
  const button=$('[type=submit]',form);button.disabled=true;
  try{const data=Object.fromEntries(new FormData(form));if(Boolean(data.lat.trim())!==Boolean(data.lng.trim()))throw new Error('Provide both coordinates, or clear both to use your address only.');data.lat=data.lat.trim()===''?null:Number(data.lat);data.lng=data.lng.trim()===''?null:Number(data.lng);await api('/api/profile/location',data);await bootstrap();closeModal();await render();toast('Your pickup location is updated.');}
  catch(err){if($('#location-form')===form){$('#location-error').textContent=err.message;button.disabled=false;}}
 }
 if(form.id==='registration-form'){
  if(state.regStep===0){const button=$('#reg-next'),phone=$('[name=phone]',form).value;if(state.otpPhone===phone){state.regStep=1;updateRegStep();showOtp(state.otpDemoCode);return;}button.disabled=true;try{const result=await api('/api/otp/send',{phone});state.otpPhone=phone;state.otpVerification=null;state.otpDemoCode=result.demo_code;state.regStep=1;updateRegStep();showOtp(result.demo_code);}catch(error){$('#registration-error').textContent=error.message;}finally{button.disabled=false;}return;}
  if(state.regStep===1){if(state.otpVerification){state.regStep=2;updateRegStep();return;}const button=$('#reg-next');button.disabled=true;try{const result=await api('/api/otp/check',{phone:state.otpPhone,code:$('[name=otp]',form).value});state.otpVerification=result.verification_token;state.regStep=2;updateRegStep();}catch(error){$('#registration-error').textContent=error.message;}finally{button.disabled=false;}return;}
  const button=$('#reg-next');button.disabled=true;
  try{form.querySelectorAll('input,select,textarea').forEach(f=>f.disabled=false);const data=Object.fromEntries(new FormData(form));data.phone=state.otpPhone;data.verification_token=state.otpVerification;data.consent=$('[name="consent"]',form).checked;Object.assign(data,state.gps||{});await api('/api/register',data);await bootstrap();closeModal();state.regVoice=false;location.hash='sell';await render();toast('Welcome to Kabad Setu. Your phone is verified and your profile is saved.');speak('registration-complete');}catch(err){$('#registration-error').textContent=err.message;form.querySelectorAll('.reg-step').forEach(s=>s.querySelectorAll('input,select,textarea').forEach(f=>f.disabled=s.hidden));button.disabled=false;}
 }
 if(form.id==='booking-form'){
  const button=$('button[type="submit"]',form);button.disabled=true;
  try{const data=Object.fromEntries(new FormData(form));data.recycler_id=Number(data.recycler_id);data.lot_id=state.lot.id;data.items=state.items;const booking=await api('/api/pickups',data);state.lot=null;state.items=[];state.image=null;closeModal();location.hash='pickups';await render();toast(`Pickup KS-${String(booking.id).padStart(4,'0')} booked. Recycler notified in app.`);}catch(err){$('#booking-error').textContent=err.message;button.disabled=false;}
 }
 if(form.id==='role-form'){
  const button=$('[type=submit]',form);button.disabled=true;
  try{const data=Object.fromEntries(new FormData(form));data.recycler_id=Number(data.recycler_id);await api('/api/demo/role',data);closeModal();LocalAnalysis.cancel();state.analysisVersion++;Object.assign(state,{pickups:[],recyclerPickups:[],image:null,items:[],lot:null,proofImage:null,proofGps:null,gps:null,analysisBusy:false,analysisStatus:''});await bootstrap();location.hash=state.demo_role==='recycler'?'recycler':'home';await render();}
  catch(error){$('#role-error').textContent=error.message;button.disabled=false;}
 }
 if(form.id==='recycler-profile-form'){
  const button=$('[type=submit]',form);button.disabled=true;
  try{const values=new FormData(form),data={address:values.get('address'),operating_hours:values.get('operating_hours'),materials:values.getAll('materials'),lat:values.get('lat')===''?null:Number(values.get('lat')),lng:values.get('lng')===''?null:Number(values.get('lng'))};if((data.lat===null)!==(data.lng===null))throw new Error('Provide both coordinates, or clear both to use your address only.');await api('/api/recycler/profile',data);await bootstrap();closeModal();await render();toast('Recycler profile updated.');}catch(error){$('#recycler-profile-error').textContent=error.message;button.disabled=false;}
 }
 if(form.id==='recycler-login'){
  const button=$('button[type="submit"]',form);button.disabled=true;try{const data=Object.fromEntries(new FormData(form));data.recycler_id=Number(data.recycler_id);await api('/api/recycler/login',data);await bootstrap();await render();}catch(err){$('#login-error').textContent=err.message;button.disabled=false;}
 }
 if(form.id==='proof-form'){
  const button=$('button[type="submit"]',form);button.disabled=true;
  try{if(!state.proofImage)throw new Error('Take or upload a pickup photo first.');if(!state.proofGps)throw new Error('Capture your current GPS location first.');if(Date.now()-state.proofGpsAt>600000)throw new Error('Your GPS reading has expired. Capture it again.');await api('/api/proofs',{pickup_id:Number(form.dataset.id),image:state.proofImage,captured_at:state.proofCapturedAt,...state.proofGps});closeModal();await render();toast('Pickup completed. Photo, time and GPS evidence saved.');}catch(err){$('#proof-error').textContent=err.message;button.disabled=false;}
 }
});
$('#demo-role-button').addEventListener('click',rolePicker);
$('#profile-button').addEventListener('click',showProfile);$('#header-profile').addEventListener('click',showProfile);$('#notification-button').addEventListener('click',()=>{location.hash=state.demo_role==='recycler'?'recycler':'pickups';});
function toggleLanguage(){document.querySelectorAll('input,select,textarea').forEach(e=>e.setCustomValidity(''));state.hindi=!state.hindi;I18N.setLanguage(state.hindi?'hi':'en');}
$('#language-toggle').addEventListener('click',toggleLanguage);
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
$('#modal').addEventListener('cancel',()=>{state.regVoice=false;stopVoice();});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});
setInterval(async()=>{if(state.page==='recycler'&&state.recycler_id&&!document.hidden){try{const result=await api('/api/pickups?role=recycler');if($('#notification-list'))$('#notification-list').innerHTML=notificationHTML(result.notifications);const old=JSON.stringify((state.recyclerPickups||[]).map(p=>[p.id,p.status]));const next=JSON.stringify(result.pickups.map(p=>[p.id,p.status]));if(old!==next&&!$('#modal').open)await render();}catch{ /* The next foreground refresh reports an expired session. */ }}},15000);
I18N.start();fillIcons();$('#main').innerHTML='<div class="loading"><span class="spin"></span>Making room for a greener tomorrow…</div>';
bootstrap().then(render).then(()=>{if(!state.role_selected)rolePicker();else if(!state.user&&state.demo_role!=='recycler')speak(welcome,true);}).catch(e=>{$('#main').innerHTML=`<section class="panel empty-state"><h2>We couldn’t connect.</h2><p>${esc(e.message)}</p><button class="button" data-action="refresh">Try again</button></section>`;});
