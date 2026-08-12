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
  comparisonMode:$('#comparisonMode'),colorDifferenceMode:$('#colorDifferenceMode'),colorCorrectionMode:$('#colorCorrectionMode'),
  comparisonSettings:$('#comparisonSettings'),comparisonRange:$('#comparisonRange'),colorDifferenceNote:$('#colorDifferenceNote'),
  colorCorrectionNote:$('#colorCorrectionNote')
};
let history=JSON.parse(localStorage.getItem('valueEyeHistory')||'[]');
let mode='comparison',round=history.length+1,question=0,points=0,results=[],current,answered=false;

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
function makeLabColor(L,a,b){
  const candidate=labToRgb(L,a,b);if(!candidate.inGamut)return null;
  const measuredL=rgbToLab(candidate.rgb),measuredValue=1+9*measuredL/100;
  return {rgb:candidate.rgb,L:measuredL,value:Math.round(measuredValue*10)/10,color:cssRgb(candidate.rgb),peek:cssRgb(grayForL(measuredL)),a,b};
}
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
  els.answers.classList.toggle('color-answers',mode==='colorDifference'||mode==='colorCorrection');
  const choices=mode==='identification'
    ?Array.from({length:10},(_,i)=>({value:i+1,label:String(i+1)}))
    :mode==='comparison'
      ?[{value:'darker',label:'Second is darker'},{value:'same',label:'Same value'},{value:'lighter',label:'Second is lighter'}]
      :[{value:'redder',label:mode==='colorCorrection'?'Make redder':'Redder'},{value:'yellower',label:mode==='colorCorrection'?'Make yellower':'Yellower'},{value:'greener',label:mode==='colorCorrection'?'Make greener':'Greener'},{value:'bluer',label:mode==='colorCorrection'?'Make bluer':'Bluer'}];
  choices.forEach((choice,i)=>{
    const button=document.createElement('button');button.textContent=choice.label;button.dataset.guess=choice.value;
    if(mode==='identification'){const rgb=grayForL(valueToL(i+1));button.style.setProperty('--value-gray',cssRgb(rgb));button.style.setProperty('--value-ink',i<5?'#fff':'#111')}
    button.addEventListener('click',()=>answer(choice.value));els.answers.append(button);
  });
  els.answers.setAttribute('aria-label',mode==='identification'?'Choose a value from 1 to 10':mode==='comparison'?'Compare the second swatch with the first':mode==='colorDifference'?'Identify the color direction of the second swatch':'Correct the second swatch one color direction at a time');
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
    const relation=second.value===first.value?'same':second.value>first.value?'lighter':'darker';
    return {first,second,firstGroup,secondGroup,relation,difference:Math.round(Math.abs(second.value-first.value)*10)/10,maximum};
  }
  const first=makeColor(5);
  return {first,second:first,firstGroup:valueGroup(first.value),secondGroup:valueGroup(first.value),relation:'same',difference:0,maximum};
}
const COLOR_DIRECTIONS=[
  {relation:'redder',da:1,db:0},{relation:'yellower',da:0,db:1},
  {relation:'greener',da:-1,db:0},{relation:'bluer',da:0,db:-1}
];
function makeColorDifference(){
  for(let attempt=0;attempt<200;attempt++){
    const targetValue=randomTenth(2.5,8.5),L=valueToL(targetValue),h=Math.random()*Math.PI*2,chroma=10+Math.random()*18;
    const firstA=Math.cos(h)*chroma,firstB=Math.sin(h)*chroma;
    const direction=COLOR_DIRECTIONS[Math.floor(Math.random()*COLOR_DIRECTIONS.length)],amount=14+Math.random()*14;
    const first=makeLabColor(L,firstA,firstB),second=makeLabColor(L,firstA+direction.da*amount,firstB+direction.db*amount);
    if(!first||!second||Math.abs(second.value-first.value)>.1)continue;
    return {first,second,relation:direction.relation,amount:Math.round(amount),painterValue:Math.round(((first.value+second.value)/2)*10)/10};
  }
  const first=makeLabColor(valueToL(5),0,0),second=makeLabColor(valueToL(5),18,0);
  return {first,second,relation:'redder',amount:18,painterValue:5};
}
function correctionDirections(challenge){
  const needed=[];
  if(challenge.target.a-challenge.currentA>.01)needed.push('redder');
  if(challenge.target.a-challenge.currentA<-.01)needed.push('greener');
  if(challenge.target.b-challenge.currentB>.01)needed.push('yellower');
  if(challenge.target.b-challenge.currentB<-.01)needed.push('bluer');
  return needed;
}
function makeColorCorrection(){
  for(let attempt=0;attempt<300;attempt++){
    const L=valueToL(randomTenth(2.5,8.5)),h=Math.random()*Math.PI*2,chroma=8+Math.random()*16;
    const targetA=Math.cos(h)*chroma,targetB=Math.sin(h)*chroma;
    const offsetA=(Math.random()<.5?-1:1)*(12+Math.random()*14),offsetB=(Math.random()<.5?-1:1)*(12+Math.random()*14);
    const currentA=targetA+offsetA,currentB=targetB+offsetB;
    const target=makeLabColor(L,targetA,targetB),second=makeLabColor(L,currentA,currentB);
    const afterA=makeLabColor(L,targetA,currentB),afterB=makeLabColor(L,currentA,targetB);
    if(!target||!second||!afterA||!afterB)continue;
    if(Math.max(Math.abs(target.value-second.value),Math.abs(target.value-afterA.value),Math.abs(target.value-afterB.value))>.1)continue;
    return {L,target,second,currentA,currentB,corrections:0,earned:0,painterValue:Math.round(((target.value+second.value)/2)*10)/10};
  }
  const L=valueToL(5),target=makeLabColor(L,10,10),second=makeLabColor(L,-10,-10);
  return {L,target,second,currentA:-10,currentB:-10,corrections:0,earned:0,painterValue:5};
}
function correctionPrompt(){return current.corrections?'What does the second swatch still need?':'What should change first to make the second swatch match the first?'}
function resetChallengeUi(){
  answered=false;els.feedback.hidden=true;els.peek.hidden=false;els.answers.classList.remove('show-scale');
  els.peek.innerHTML=mode==='colorDifference'||mode==='colorCorrection'?'<span>◉</span> Hold to reveal direction':'<span>◉</span> Hold to peek';
  els.next.hidden=mode==='colorCorrection';
  [els.swatch,els.firstSwatch,els.secondSwatch].forEach(swatch=>swatch.classList.remove('grayscale'));
  [...els.answers.children].forEach(button=>{button.disabled=false;button.classList.remove('chosen')});
}
function newChallenge(){
  resetChallengeUi();
  if(mode==='identification'){
    const generated=makeColor(randomTenth());current=generated;els.swatch.style.backgroundColor=current.color;
  }else if(mode==='comparison'){
    current=makeComparison();els.firstSwatch.style.backgroundColor=current.first.color;els.secondSwatch.style.backgroundColor=current.second.color;
  }else if(mode==='colorDifference'){
    current=makeColorDifference();els.firstSwatch.style.backgroundColor=current.first.color;els.secondSwatch.style.backgroundColor=current.second.color;
  }else{
    current=makeColorCorrection();els.firstSwatch.style.backgroundColor=current.target.color;els.secondSwatch.style.backgroundColor=current.second.color;els.prompt.textContent=correctionPrompt();
  }
  els.question.textContent=question+1;els.progress.style.width=`${(question+1)*10}%`;
}
function accepted(v){const base=Math.min(10,Math.floor(v)),set=[base];if(v<10&&Math.round(v*10)%10===9)set.push(base+1);return set}
function answerColorCorrection(guess){
  const needed=correctionDirections(current),exact=needed.includes(guess);
  els.feedback.hidden=false;els.comparisonBar.hidden=true;els.next.hidden=true;
  [...els.answers.children].forEach(button=>button.classList.remove('chosen'));
  const chosenButton=[...els.answers.children].find(button=>button.dataset.guess===String(guess));if(chosenButton)chosenButton.classList.add('chosen');
  if(!exact){els.verdict.textContent='Try Again · +0';els.detail.textContent='That adjustment would move the second swatch away from the target in that color direction.';return}
  if(guess==='redder'||guess==='greener')current.currentA=current.target.a;else current.currentB=current.target.b;
  current.second=makeLabColor(current.L,current.currentA,current.currentB);current.corrections++;current.earned+=5;points+=5;
  els.secondSwatch.style.backgroundColor=current.second.color;
  const remaining=correctionDirections(current);
  if(remaining.length){els.verdict.textContent='Correct · +5';els.detail.textContent='That color component now matches. One correction remains.';els.prompt.textContent=correctionPrompt();return}
  answered=true;results.push(current.earned);[...els.answers.children].forEach(button=>button.disabled=true);
  els.verdict.textContent='Color matched · +5';els.detail.textContent=`The second swatch now matches the first at Painter’s Value ${current.painterValue.toFixed(1)}.`;
  els.prompt.textContent='The colors match.';els.next.hidden=false;els.next.textContent=question===9?'See round score':'Next challenge';
}
function answer(guess){
  if(answered)return;if(mode==='colorCorrection'){answerColorCorrection(guess);return}answered=true;
  let exact,close=false,earned;
  if(mode==='identification'){
    const numericGuess=Number(guess),good=accepted(current.value);exact=good.includes(numericGuess);close=!exact&&Math.min(...good.map(x=>Math.abs(x-numericGuess)))===1;earned=exact?10:close?5:0;
    els.detail.textContent=`You chose ${numericGuess} · Exact value ${current.value.toFixed(1)}`;els.marker.style.left=`${((current.value-1)/9)*100}%`;els.comparisonBar.hidden=false;
  }else if(mode==='comparison'){
    exact=guess===current.relation;close=!exact&&current.difference<=.4;earned=exact?10:close?5:0;
    const chosen=guess==='same'?'the same':guess;els.detail.textContent=`You chose ${chosen} · First ${current.first.value.toFixed(1)} (Group ${current.firstGroup}) · Second ${current.second.value.toFixed(1)} (Group ${current.secondGroup}) · Difference ${current.difference.toFixed(1)}`;els.comparisonBar.hidden=true;
  }else{
    exact=guess===current.relation;earned=exact?10:0;
    els.detail.textContent=`You chose ${guess} · The second swatch is ${current.relation} · Both are Painter’s Value ${current.painterValue.toFixed(1)}`;els.comparisonBar.hidden=true;
  }
  points+=earned;results.push(earned);[...els.answers.children].forEach(button=>button.disabled=true);
  const chosenButton=[...els.answers.children].find(button=>button.dataset.guess===String(guess));if(chosenButton)chosenButton.classList.add('chosen');
  els.verdict.textContent=exact?'Correct · +10':close?'Close · +5':'Try Again · +0';els.feedback.hidden=false;els.next.textContent=question===9?'See round score':'Next challenge';
}
function advance(){question++;if(question>=10)finish();else newChallenge()}
function finish(){
  history.push({round,date:new Date().toISOString(),score:points,mode});localStorage.setItem('valueEyeHistory',JSON.stringify(history));
  els.game.hidden=true;els.summary.hidden=false;els.score.textContent=`${points} / 100`;els.message.textContent=points>=90?'Exceptional value sense.':points>=70?'Your eye is getting sharp.':points>=50?'A solid study—keep training.':'Every round builds the eye.';
  els.breakdown.innerHTML=results.map(p=>`<i class="${p===10?'correct':p===5?'close':''}" title="${p} points"></i>`).join('');renderHistory();
}
function startRound(){round=history.length+1;question=0;points=0;results=[];els.round.textContent=round;els.summary.hidden=true;els.game.hidden=false;newChallenge()}
function setMode(nextMode){
  if(mode===nextMode)return;mode=nextMode;els.identificationMode.setAttribute('aria-pressed',String(mode==='identification'));els.comparisonMode.setAttribute('aria-pressed',String(mode==='comparison'));els.colorDifferenceMode.setAttribute('aria-pressed',String(mode==='colorDifference'));els.colorCorrectionMode.setAttribute('aria-pressed',String(mode==='colorCorrection'));
  els.comparisonSettings.hidden=mode!=='comparison';els.colorDifferenceNote.hidden=mode!=='colorDifference';els.colorCorrectionNote.hidden=mode!=='colorCorrection';els.swatch.hidden=mode!=='identification';els.comparisonSwatches.hidden=mode==='identification';els.scale.hidden=mode!=='identification';els.scaleHint.hidden=mode!=='identification';
  els.prompt.textContent=mode==='identification'?'What painter value is this?':mode==='comparison'?'Is the second swatch lighter, darker, or the same value?':mode==='colorDifference'?'Compared with the first swatch, which color direction has the second moved?':'What should change first to make the second swatch match the first?';buildAnswers();question=0;points=0;results=[];els.question.textContent='1';els.summary.hidden=true;els.game.hidden=false;newChallenge();
}
function peek(on){
  if(mode==='identification'){els.swatch.classList.toggle('grayscale',on);els.swatch.style.backgroundColor=on?current.peek:current.color}
  else if(mode==='comparison'){[['firstSwatch','first'],['secondSwatch','second']].forEach(([element,key])=>{els[element].classList.toggle('grayscale',on);els[element].style.backgroundColor=on?current[key].peek:current[key].color})}
  else if(mode==='colorDifference'&&!answered){els.prompt.textContent=on?`The second swatch is ${current.relation}.`:'Compared with the first swatch, which color direction has the second moved?'}
  else if(mode==='colorCorrection'&&!answered){const needed=correctionDirections(current);els.prompt.textContent=on?`It needs to be ${needed.join(' and ')}.`:correctionPrompt()}
}
function holdControl(button,toggle){
  ['pointerdown','keydown'].forEach(eventName=>button.addEventListener(eventName,event=>{if(eventName==='keydown'&&![' ','Enter'].includes(event.key))return;event.preventDefault();toggle(true)}));
  ['pointerup','pointercancel','pointerleave','keyup','blur'].forEach(eventName=>button.addEventListener(eventName,()=>toggle(false)));
}
function renderHistory(){
  const best=history.length?Math.max(...history.map(item=>item.score)):0;
  const modeName=item=>item.mode==='comparison'?'Value Comparison':item.mode==='colorDifference'?'Color Difference':item.mode==='colorCorrection'?'Correct the Color':'Value Identification';
  els.list.innerHTML=history.length?history.slice().reverse().map(item=>`<li>Round ${item.round} · ${modeName(item)} — <strong>${item.score}/100</strong></li>`).join(''):'<li>No completed rounds yet.</li>';
  els.best.textContent=best+'/100';els.headerBest.textContent=best;
}

els.identificationMode.addEventListener('click',()=>setMode('identification'));
els.comparisonMode.addEventListener('click',()=>setMode('comparison'));
els.colorDifferenceMode.addEventListener('click',()=>setMode('colorDifference'));
els.colorCorrectionMode.addEventListener('click',()=>setMode('colorCorrection'));
els.comparisonRange.addEventListener('change',()=>{if(mode==='comparison')newChallenge()});
els.next.addEventListener('click',advance);$('#newRoundButton').addEventListener('click',startRound);
$('#historyButton').addEventListener('click',()=>{renderHistory();els.dialog.showModal()});$('#closeHistory').addEventListener('click',()=>els.dialog.close());
$('#clearHistory').addEventListener('click',()=>{history=[];localStorage.removeItem('valueEyeHistory');round=1;els.round.textContent=round;renderHistory()});
holdControl(els.peek,peek);holdControl(els.scale,on=>els.answers.classList.toggle('show-scale',on));
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
els.round.textContent=round;initializeQaScale();buildAnswers();renderHistory();newChallenge();
