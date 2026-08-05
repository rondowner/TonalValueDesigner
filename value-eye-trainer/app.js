const SHOW_QA_REFERENCE_SCALE=false; // Change to true to restore the ten-step QA strip.
document.documentElement.classList.toggle('embedded',window.self!==window.top||new URLSearchParams(location.search).has('embedded'));
document.documentElement.classList.toggle('show-qa-reference-scale',SHOW_QA_REFERENCE_SCALE);

const $=selector=>document.querySelector(selector);
const els={
  swatch:$('#swatch'),firstSwatch:$('#firstSwatch'),secondSwatch:$('#secondSwatch'),comparisonSwatches:$('#comparisonSwatches'),
  answers:$('#answers'),feedback:$('#feedback'),verdict:$('#verdict'),detail:$('#answerDetail'),comparisonBar:$('.comparison'),marker:$('#valueMarker'),
  next:$('#nextButton'),peek:$('#peekButton'),scale:$('#scaleButton'),scaleHint:$('.scale-hint'),prompt:$('#prompt'),game:$('#game'),summary:$('#summary'),
  score:$('#roundScore'),message:$('#roundMessage'),breakdown:$('#roundBreakdown'),progress:$('#progressBar'),question:$('#questionNumber'),round:$('#roundNumber'),
  dialog:$('#historyDialog'),list:$('#historyList'),best:$('#bestScore'),headerBest:$('#headerBest'),identificationMode:$('#identificationMode'),
  comparisonMode:$('#comparisonMode'),comparisonSettings:$('#comparisonSettings'),comparisonRange:$('#comparisonRange')
};
let history=JSON.parse(localStorage.getItem('valueEyeHistory')||'[]');
let mode='identification',round=history.length+1,question=0,points=0,results=[],current,answered=false;

// CIELAB (D65) is the single source of truth for color, Peek, and value scales.
const clamp=x=>Math.max(0,Math.min(1,x));
const encode=x=>x<=.0031308?12.92*x:1.055*Math.pow(x,1/2.4)-.055;
const decode=x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);
function labToRgb(L,a=0,b=0){
  const fy=(L+16)/116,fx=fy+a/500,fz=fy-b/200,d=6/29;
  const inv=t=>t>d?t*t*t:3*d*d*(t-4/29);
  const X=.95047*inv(fx),Y=inv(fy),Z=1.08883*inv(fz);
  const linear=[3.2404542*X-1.5371385*Y-.4985314*Z,-.969266*X+1.8760108*Y+.041556*Z,.0556434*X-.2040259*Y+1.0572252*Z];
  return {rgb:linear.map(x=>Math.round(255*encode(clamp(x)))),inGamut:linear.every(x=>x>=0&&x<=1)};
}
function rgbToLab([r,g,b]){
  [r,g,b]=[r,g,b].map(x=>decode(x/255));
  const X=(.4124564*r+.3575761*g+.1804375*b)/.95047,Y=.2126729*r+.7151522*g+.072175*b,Z=(.0193339*r+.119192*g+.9503041*b)/1.08883;
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
  return {rgb:candidate.rgb,L:measuredL,value:Math.round(measuredValue*10)/10,color:cssRgb(candidate.rgb),peek:cssRgb(grayForL(measuredL))};
}
function initializeQaScale(){
  document.querySelectorAll('.qa-scale span').forEach((step,i)=>{const rgb=grayForL(valueToL(i+1));step.style.backgroundColor=cssRgb(rgb);step.style.color=i<5?'#fff':'#111'});
}
function buildAnswers(){
  els.answers.innerHTML='';
  els.answers.classList.toggle('comparison-answers',mode==='comparison');
  const choices=mode==='identification'?Array.from({length:10},(_,i)=>({value:i+1,label:String(i+1)})):[
    {value:'darker',label:'Second is darker'},{value:'same',label:'Same value'},{value:'lighter',label:'Second is lighter'}
  ];
  choices.forEach((choice,i)=>{
    const button=document.createElement('button');button.textContent=choice.label;button.dataset.guess=choice.value;
    if(mode==='identification'){const rgb=grayForL(valueToL(i+1));button.style.setProperty('--value-gray',cssRgb(rgb));button.style.setProperty('--value-ink',i<5?'#fff':'#111')}
    button.addEventListener('click',()=>answer(choice.value));els.answers.append(button);
  });
  els.answers.setAttribute('aria-label',mode==='identification'?'Choose a value from 1 to 10':'Compare the second swatch with the first');
}
function randomTenth(min=1,max=10){return Math.round((min+Math.random()*(max-min))*10)/10}
function valueGroup(value){return Math.min(10,Math.floor(value))}
function makeComparison(){
  const maximum=Number(els.comparisonRange.value);
  for(let attempt=0;attempt<120;attempt++){
    const same=Math.random()<.2;
    const first=makeColor(randomTenth());
    let second;
    if(same){
      for(let retry=0;retry<30;retry++){second=makeColor(first.value);if(second.value===first.value)break}
      if(!second||second.value!==first.value)continue;
    }else{
      const delta=(Math.floor(Math.random()*(maximum*10))+1)/10;
      const possible=[];if(first.value+delta<=10)possible.push(first.value+delta);if(first.value-delta>=1)possible.push(first.value-delta);
      if(!possible.length)continue;
      second=makeColor(possible[Math.floor(Math.random()*possible.length)]);
      const measuredDifference=Math.abs(second.value-first.value);
      if(measuredDifference<.1||measuredDifference>maximum)continue;
    }
    const firstGroup=valueGroup(first.value),secondGroup=valueGroup(second.value);
    const relation=secondGroup===firstGroup?'same':secondGroup>firstGroup?'lighter':'darker';
    return {first,second,firstGroup,secondGroup,relation,difference:Math.round(Math.abs(second.value-first.value)*10)/10,maximum};
  }
  const first=makeColor(5);
  return {first,second:first,firstGroup:valueGroup(first.value),secondGroup:valueGroup(first.value),relation:'same',difference:0,maximum};
}
function resetChallengeUi(){
  answered=false;els.feedback.hidden=true;els.peek.hidden=false;els.answers.classList.remove('show-scale');
  [els.swatch,els.firstSwatch,els.secondSwatch].forEach(swatch=>swatch.classList.remove('grayscale'));
  [...els.answers.children].forEach(button=>{button.disabled=false;button.classList.remove('chosen')});
}
function newChallenge(){
  resetChallengeUi();
  if(mode==='identification'){
    const generated=makeColor(randomTenth());current=generated;els.swatch.style.backgroundColor=current.color;
  }else{
    current=makeComparison();els.firstSwatch.style.backgroundColor=current.first.color;els.secondSwatch.style.backgroundColor=current.second.color;
  }
  els.question.textContent=question+1;els.progress.style.width=`${(question+1)*10}%`;
}
function accepted(v){const base=Math.min(10,Math.floor(v)),set=[base];if(v<10&&Math.round(v*10)%10===9)set.push(base+1);return set}
function answer(guess){
  if(answered)return;answered=true;
  let exact,close=false,earned;
  if(mode==='identification'){
    const numericGuess=Number(guess),good=accepted(current.value);exact=good.includes(numericGuess);close=!exact&&Math.min(...good.map(x=>Math.abs(x-numericGuess)))===1;earned=exact?10:close?5:0;
    els.detail.textContent=`You chose ${numericGuess} · Exact value ${current.value.toFixed(1)}`;els.marker.style.left=`${((current.value-1)/9)*100}%`;els.comparisonBar.hidden=false;
  }else{
    exact=guess===current.relation;close=!exact&&current.difference<=.4;earned=exact?10:close?5:0;
    const chosen=guess==='same'?'the same':guess;els.detail.textContent=`You chose ${chosen} · First ${current.first.value.toFixed(1)} (Group ${current.firstGroup}) · Second ${current.second.value.toFixed(1)} (Group ${current.secondGroup}) · Difference ${current.difference.toFixed(1)}`;els.comparisonBar.hidden=true;
  }
  points+=earned;results.push(earned);[...els.answers.children].forEach(button=>button.disabled=true);
  const chosenButton=[...els.answers.children].find(button=>button.dataset.guess===String(guess));if(chosenButton)chosenButton.classList.add('chosen');
  els.verdict.textContent=exact?'Correct · +10':close?'Close · +5':'Keep looking · +0';els.feedback.hidden=false;els.next.textContent=question===9?'See round score':'Next challenge';
}
function advance(){question++;if(question>=10)finish();else newChallenge()}
function finish(){
  history.push({round,date:new Date().toISOString(),score:points,mode});localStorage.setItem('valueEyeHistory',JSON.stringify(history));
  els.game.hidden=true;els.summary.hidden=false;els.score.textContent=`${points} / 100`;els.message.textContent=points>=90?'Exceptional value sense.':points>=70?'Your eye is getting sharp.':points>=50?'A solid study—keep training.':'Every round builds the eye.';
  els.breakdown.innerHTML=results.map(p=>`<i class="${p===10?'correct':p===5?'close':''}" title="${p} points"></i>`).join('');renderHistory();
}
function startRound(){round=history.length+1;question=0;points=0;results=[];els.round.textContent=round;els.summary.hidden=true;els.game.hidden=false;newChallenge()}
function setMode(nextMode){
  if(mode===nextMode)return;mode=nextMode;els.identificationMode.setAttribute('aria-pressed',String(mode==='identification'));els.comparisonMode.setAttribute('aria-pressed',String(mode==='comparison'));
  els.comparisonSettings.hidden=mode!=='comparison';els.swatch.hidden=mode!=='identification';els.comparisonSwatches.hidden=mode!=='comparison';els.scale.hidden=mode!=='identification';els.scaleHint.hidden=mode!=='identification';
  els.prompt.textContent=mode==='identification'?'What painter value is this?':'Is the second swatch lighter, darker, or the same value?';buildAnswers();question=0;points=0;results=[];els.question.textContent='1';els.summary.hidden=true;els.game.hidden=false;newChallenge();
}
function peek(on){
  if(mode==='identification'){els.swatch.classList.toggle('grayscale',on);els.swatch.style.backgroundColor=on?current.peek:current.color}
  else {[['firstSwatch','first'],['secondSwatch','second']].forEach(([element,key])=>{els[element].classList.toggle('grayscale',on);els[element].style.backgroundColor=on?current[key].peek:current[key].color})}
}
function holdControl(button,toggle){
  ['pointerdown','keydown'].forEach(eventName=>button.addEventListener(eventName,event=>{if(eventName==='keydown'&&![' ','Enter'].includes(event.key))return;event.preventDefault();toggle(true)}));
  ['pointerup','pointercancel','pointerleave','keyup','blur'].forEach(eventName=>button.addEventListener(eventName,()=>toggle(false)));
}
function renderHistory(){
  const best=history.length?Math.max(...history.map(item=>item.score)):0;
  els.list.innerHTML=history.length?history.slice().reverse().map(item=>`<li>Round ${item.round} · ${item.mode==='comparison'?'Comparison':'Identification'} — <strong>${item.score}/100</strong></li>`).join(''):'<li>No completed rounds yet.</li>';
  els.best.textContent=best+'/100';els.headerBest.textContent=best;
}

els.identificationMode.addEventListener('click',()=>setMode('identification'));
els.comparisonMode.addEventListener('click',()=>setMode('comparison'));
els.comparisonRange.addEventListener('change',()=>{if(mode==='comparison')newChallenge()});
els.next.addEventListener('click',advance);$('#newRoundButton').addEventListener('click',startRound);
$('#historyButton').addEventListener('click',()=>{renderHistory();els.dialog.showModal()});$('#closeHistory').addEventListener('click',()=>els.dialog.close());
$('#clearHistory').addEventListener('click',()=>{history=[];localStorage.removeItem('valueEyeHistory');round=1;els.round.textContent=round;renderHistory()});
holdControl(els.peek,peek);holdControl(els.scale,on=>els.answers.classList.toggle('show-scale',on));
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
els.round.textContent=round;initializeQaScale();buildAnswers();renderHistory();newChallenge();
