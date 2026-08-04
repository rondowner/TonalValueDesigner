const SHOW_QA_REFERENCE_SCALE=false; // Change to true to restore the ten-step QA strip.
document.documentElement.classList.toggle('embedded',window.self!==window.top||new URLSearchParams(location.search).has('embedded'));
document.documentElement.classList.toggle('show-qa-reference-scale',SHOW_QA_REFERENCE_SCALE);
const $=s=>document.querySelector(s);
const els={swatch:$('#swatch'),answers:$('#answers'),feedback:$('#feedback'),verdict:$('#verdict'),detail:$('#answerDetail'),marker:$('#valueMarker'),next:$('#nextButton'),peek:$('#peekButton'),scale:$('#scaleButton'),game:$('#game'),summary:$('#summary'),score:$('#roundScore'),message:$('#roundMessage'),breakdown:$('#roundBreakdown'),progress:$('#progressBar'),question:$('#questionNumber'),round:$('#roundNumber'),dialog:$('#historyDialog'),list:$('#historyList'),best:$('#bestScore'),headerBest:$('#headerBest')};
let history=JSON.parse(localStorage.getItem('valueEyeHistory')||'[]'), round=history.length+1, question=0, points=0, results=[], current, answered=false;

for(let n=1;n<=10;n++){const b=document.createElement('button');b.textContent=n;b.dataset.guess=n;b.addEventListener('click',()=>answer(n));els.answers.append(b)}

// CIELAB (D65) is the single source of truth for color, Peek, and value scales.
const clamp=x=>Math.max(0,Math.min(1,x));
const encode=x=>x<=.0031308?12.92*x:1.055*Math.pow(x,1/2.4)-.055;
const decode=x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);
function labToRgb(L,a=0,b=0){
  const fy=(L+16)/116,fx=fy+a/500,fz=fy-b/200,d=6/29;
  const inv=t=>t>d?t*t*t:3*d*d*(t-4/29);
  const X=.95047*inv(fx),Y=inv(fy),Z=1.08883*inv(fz);
  const linear=[3.2404542*X-1.5371385*Y-.4985314*Z,-.969266*X+1.8760108*Y+.041556*Z,.0556434*X-.2040259*Y+1.0572252*Z];
  const inGamut=linear.every(x=>x>=0&&x<=1);
  return {rgb:linear.map(x=>Math.round(255*encode(clamp(x)))),inGamut};
}
function rgbToLab([r,g,b]){
  [r,g,b]=[r,g,b].map(x=>decode(x/255));
  const X=(.4124564*r+.3575761*g+.1804375*b)/.95047;
  const Y=.2126729*r+.7151522*g+.072175*b;
  const Z=(.0193339*r+.119192*g+.9503041*b)/1.08883;
  const e=216/24389,k=24389/27,f=t=>t>e?Math.cbrt(t):(k*t+16)/116;
  return 116*f(Y)-16;
}
const cssRgb=rgb=>`rgb(${rgb.join(' ')})`;
const valueToL=value=>(value-1)*100/9;
function grayForL(L){return labToRgb(L).rgb}
function makeColor(targetValue){
  const targetL=valueToL(targetValue),h=Math.random()*Math.PI*2;
  let chroma=18+Math.random()*60,candidate;
  for(let i=0;i<24;i++){candidate=labToRgb(targetL,Math.cos(h)*chroma,Math.sin(h)*chroma);if(candidate.inGamut)break;chroma*=.82}
  const measuredL=rgbToLab(candidate.rgb),measuredValue=1+9*measuredL/100;
  return {rgb:candidate.rgb,L:measuredL,value:Math.round(measuredValue*10)/10};
}
function initializeScales(){
  [...els.answers.children].forEach((button,i)=>{const rgb=grayForL(valueToL(i+1));button.style.setProperty('--value-gray',cssRgb(rgb));button.style.setProperty('--value-ink',i<5?'#fff':'#111')});
  document.querySelectorAll('.qa-scale span').forEach((step,i)=>{const rgb=grayForL(valueToL(i+1));step.style.backgroundColor=cssRgb(rgb);step.style.color=i<5?'#fff':'#111'});
}
function newSwatch(){
  answered=false;els.feedback.hidden=true;els.peek.hidden=false;els.swatch.classList.remove('grayscale');
  [...els.answers.children].forEach(b=>{b.disabled=false;b.classList.remove('chosen')});
  const targetValue=(Math.floor(Math.random()*91)+10)/10; // 1.0–10.0 inclusive
  const generated=makeColor(targetValue),peekRgb=grayForL(generated.L);
  const peekDelta=Math.abs(rgbToLab(peekRgb)-generated.L);
  if(peekDelta>.35){newSwatch();return} // defensive QA guard against quantization drift
  current={value:generated.value,L:generated.L,color:cssRgb(generated.rgb),peek:cssRgb(peekRgb)};
  els.swatch.style.backgroundColor=current.color;
  els.question.textContent=question+1;els.progress.style.width=`${(question+1)*10}%`;
}
function accepted(v){const base=Math.min(10,Math.floor(v));const set=[base];if(v<10&&Math.round(v*10)%10===9)set.push(base+1);return set}
function answer(guess){
  if(answered)return;answered=true;const good=accepted(current.value);const exact=good.includes(guess);const close=!exact&&Math.min(...good.map(x=>Math.abs(x-guess)))===1;const earned=exact?10:close?5:0;
  points+=earned;results.push(earned);[...els.answers.children].forEach(b=>b.disabled=true);els.answers.children[guess-1].classList.add('chosen');
  els.verdict.textContent=exact?'Correct · +10':close?'Close · +5':'Keep looking · +0';
  els.detail.textContent=`You chose ${guess} · Exact value ${current.value.toFixed(1)}`;
  els.marker.style.left=`${((current.value-1)/9)*100}%`;els.feedback.hidden=false;els.peek.hidden=false;
  els.next.textContent=question===9?'See round score':'Next swatch';
}
function advance(){question++;if(question>=10)finish();else newSwatch()}
function finish(){
  history.push({round,date:new Date().toISOString(),score:points});localStorage.setItem('valueEyeHistory',JSON.stringify(history));
  els.game.hidden=true;els.summary.hidden=false;els.score.textContent=`${points} / 100`;els.message.textContent=points>=90?'Exceptional value sense.':points>=70?'Your eye is getting sharp.':points>=50?'A solid study—keep training.':'Every round builds the eye.';
  els.breakdown.innerHTML=results.map(p=>`<i class="${p===10?'correct':p===5?'close':''}" title="${p} points"></i>`).join('');renderHistory();
}
function startRound(){round=history.length+1;question=0;points=0;results=[];els.round.textContent=round;els.summary.hidden=true;els.game.hidden=false;newSwatch()}
function peek(on){els.swatch.classList.toggle('grayscale',on);els.swatch.style.backgroundColor=on?current.peek:current.color}
function holdControl(button,toggle){
  ['pointerdown','keydown'].forEach(e=>button.addEventListener(e,x=>{if(e==='keydown'&&![' ','Enter'].includes(x.key))return;x.preventDefault();toggle(true)}));
  ['pointerup','pointercancel','pointerleave','keyup','blur'].forEach(e=>button.addEventListener(e,()=>toggle(false)));
}
holdControl(els.peek,peek);
holdControl(els.scale,on=>els.answers.classList.toggle('show-scale',on));
function renderHistory(){const best=history.length?Math.max(...history.map(h=>h.score)):0;els.list.innerHTML=history.length?history.slice().reverse().map(h=>`<li>Round ${h.round} — <strong>${h.score}/100</strong></li>`).join(''):'<li>No completed rounds yet.</li>';els.best.textContent=best+'/100';els.headerBest.textContent=best}
els.next.addEventListener('click',advance);$('#newRoundButton').addEventListener('click',startRound);$('#historyButton').addEventListener('click',()=>{renderHistory();els.dialog.showModal()});$('#closeHistory').addEventListener('click',()=>els.dialog.close());$('#clearHistory').addEventListener('click',()=>{history=[];localStorage.removeItem('valueEyeHistory');round=1;els.round.textContent=round;renderHistory()});
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
els.round.textContent=round;initializeScales();renderHistory();newSwatch();
