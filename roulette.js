(function(root){
  'use strict';
  const red=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  const wheel=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
  const catalog=[];
  const add=(id,type,numbers,label,position)=>catalog.push({id,type,numbers,label,pays:36/numbers.length-1,position});
  const range=(from,to)=>Array.from({length:to-from+1},(_,i)=>from+i);
  for(let n=0;n<=36;n++)add('n'+n,'Straight',[n],String(n));
  for(let n=1;n<=36;n++){
    const col=Math.floor((n-1)/3),row=3-((n-1)%3)-1;
    if(n%3!==0)add('s'+n+'-'+(n+1),'Split',[n,n+1],n+' / '+(n+1),{x:col+.5,y:row});
    if(n<=33)add('s'+n+'-'+(n+3),'Split',[n,n+3],n+' / '+(n+3),{x:col+1,y:row+.5});
    if(n%3===1){add('t'+n,'Street',range(n,n+2),n+'–'+(n+2),{x:col+.5,y:3});if(n<=31)add('l'+n,'Six line',range(n,n+5),n+'–'+(n+5),{x:col+1,y:3});}
    if(n<=32&&n%3!==0)add('c'+n,'Corner',[n,n+1,n+3,n+4],[n,n+1,n+3,n+4].join(' / '),{x:col+1,y:row});
  }
  for(let n=1;n<=3;n++)add('s0-'+n,'Split',[0,n],'0 / '+n);
  add('trio1','Trio',[0,1,2],'0 / 1 / 2');add('trio2','Trio',[0,2,3],'0 / 2 / 3');add('first4','First four',[0,1,2,3],'0 / 1 / 2 / 3');
  for(let n=1;n<=3;n++){
    add('dozen'+n,'Dozen',range(n*12-11,n*12),(n===1?'1st':n===2?'2nd':'3rd')+' 12');
    add('column'+n,'Column',range(1,12).map(i=>(i-1)*3+n),'Column '+n);
  }
  add('low','Outside',range(1,18),'1–18');add('even','Outside',range(1,36).filter(n=>n%2===0),'Even');add('red','Outside',red,'Red');add('black','Outside',range(1,36).filter(n=>!red.includes(n)),'Black');add('odd','Outside',range(1,36).filter(n=>n%2),'Odd');add('high','Outside',range(19,36),'19–36');
  const byId=new Map(catalog.map(b=>[b.id,b]));
  function settle(bets,number){if(!Number.isInteger(number)||number<0||number>36)throw Error('Invalid wheel result');let stake=0,returned=0;const winners=[];for(const [id,amount] of Object.entries(bets)){const b=byId.get(id);if(!b||!Number.isSafeInteger(amount)||amount<=0)throw Error('Invalid bet');stake+=amount;if(b.numbers.includes(number)){returned+=amount*(b.pays+1);winners.push(id);}}return {stake,returned,net:returned-stake,winners};}
  function color(n){return n===0?'green':red.includes(n)?'red':'black';}
  function svgWheel(){const point=(a,r)=>[150+Math.sin(a*Math.PI/180)*r,150-Math.cos(a*Math.PI/180)*r];return `<svg class="wheel-rotor" viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="146" fill="#b99a5b"/>${wheel.map((n,i)=>{const a=point((i-.5)*360/37,140),b=point((i+.5)*360/37,140),t=point(i*360/37,121);return `<path d="M150 150 L${a.join(' ')} A140 140 0 0 1 ${b.join(' ')} Z" fill="${n===0?'#227b62':red.includes(n)?'#a9414f':'#152534'}" stroke="#d2b777" stroke-width=".6"/><text x="${t[0]}" y="${t[1]}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${i*360/37} ${t.join(' ')})" fill="#fff" font-size="10" font-family="system-ui">${n}</text>`;}).join('')}<circle cx="150" cy="150" r="85" fill="#12342f" stroke="#c9ae71" stroke-width="4"/><circle cx="150" cy="150" r="56" fill="#0c2428" stroke="#7c714f"/><path d="M110 150H190M150 110V190" stroke="#cdb47a" stroke-width="7" stroke-linecap="round"/><circle cx="150" cy="150" r="13" fill="#e5ce94"/></svg>`;}
  function create(element,hooks){
    let bets={},last={},undo=[],chip=10,spinning=false,rotation=0,result=null,history=[],type='Split';
    const fmt=n=>n.toLocaleString('en-US');
    const total=()=>Object.values(bets).reduce((a,b)=>a+b,0);
    const $=s=>element.querySelector(s);
    function place(id){if(spinning||hooks.busy()||!byId.has(id))return;if(total()+chip>hooks.balance()){hooks.status('Not enough available tokens for another chip.');return;}undo.push({...bets});bets[id]=(bets[id]||0)+chip;render();hooks.status('Placed '+chip+' on '+byId.get(id).label+'. Total bet: '+fmt(total())+' tokens.');}
    function button(id,text,extra=''){const b=byId.get(id),amount=bets[id]||0,won=result?.winners.includes(id);return `<button type="button" data-bet="${id}" class="bet-cell ${extra} ${won?'winning-bet':''}" aria-label="${b.type} ${b.label}, pays ${b.pays} to 1${amount?', '+amount+' tokens placed':''}" title="${b.type} ${b.label} · ${b.pays}:1" ${spinning?'disabled':''}>${text}${amount?`<span class="placed-chip">${fmt(amount)}</span>`:''}</button>`;}
    function render(){
      const previousScroll=$('.bet-scroll')?.scrollLeft||0,previousOpen=$('.precise-bet')?.open||false,previousSelection=$('#roulette-selection')?.value;
      const focused=element.ownerDocument?.activeElement;
      const focusKey=focused&&element.contains(focused)?['bet','chip','remove'].find(key=>focused.dataset[key]):null;
      const focusValue=focusKey?focused.dataset[focusKey]:null;
      element.className='roulette-game';
      element.innerHTML=`<div class="roulette-scene"><div class="wheel-area"><span class="table-eyebrow">EUROPEAN · SINGLE ZERO</span><div class="wheel-frame">${svgWheel()}<div class="ball-track" aria-hidden="true"><i></i></div><span class="wheel-pointer" aria-hidden="true">▼</span></div><div class="wheel-result ${result?color(result.number):''}" role="status">${spinning?'No more bets…':result?result.number+' · '+color(result.number).toUpperCase():'Place your chips'}</div><div class="spin-history" aria-label="Recent results">${history.map(n=>`<span class="${color(n)}">${n}</span>`).join('')}</div></div><div class="roulette-layout"><div class="chip-rack" role="group" aria-label="Choose chip value">${[1,5,10,25,100].map(n=>`<button type="button" class="casino-chip chip-${n}" data-chip="${n}" aria-label="${n} token chip" aria-pressed="${n===chip}" ${spinning?'disabled':''}>${n}</button>`).join('')}<span>Choose a chip.<br>Tap a number or betting area.</span></div><p class="table-help">Numbers: 35:1 · Lines: splits · Intersections: corners. On a phone, swipe the table or use “Choose a bet” below.</p><div class="bet-scroll" tabindex="0" aria-label="Roulette betting table, scroll horizontally"><div class="betting-layout"><div class="number-layout">${button('n0','0','zero-cell')}<div class="number-grid">${[3,2,1].map(row=>range(0,11).map(col=>{const n=col*3+row;return button('n'+n,n,color(n)+(result?.number===n?' landed-number':''));}).join('')).join('')}${catalog.filter(b=>b.position).map(b=>`<button type="button" class="bet-junction ${b.type==='Corner'?'corner-junction':''} ${bets[b.id]?'has-chip':''} ${result?.winners.includes(b.id)?'winning-bet':''}" data-bet="${b.id}" style="left:${b.position.x/12*100}%;top:${b.position.y/3*100}%" title="${b.type} ${b.label} · ${b.pays}:1" aria-label="${b.type} ${b.label}, pays ${b.pays} to 1${bets[b.id]?', '+bets[b.id]+' tokens placed':''}" ${spinning?'disabled':''}>${bets[b.id]?`<span class="placed-chip">${bets[b.id]}</span>`:'<span aria-hidden="true">+</span>'}</button>`).join('')}</div><div class="column-bets">${[3,2,1].map(n=>button('column'+n,'2:1')).join('')}</div></div><div class="dozen-bets">${[1,2,3].map(n=>button('dozen'+n,byId.get('dozen'+n).label+' <small>2:1</small>')).join('')}</div><div class="outside-bets">${['low','even','red','black','odd','high'].map(id=>button(id,byId.get(id).label,id==='red'||id==='black'?id:'')).join('')}</div></div></div><details class="precise-bet"><summary>Choose a bet · all numbers & combinations</summary><div><label>Bet type<select id="roulette-type">${[...new Set(catalog.map(b=>b.type))].map(t=>`<option ${t===type?'selected':''}>${t}</option>`).join('')}</select></label><label>Numbers / selection<select id="roulette-selection">${catalog.filter(b=>b.type===type).map(b=>`<option value="${b.id}">${b.label} (${b.pays}:1)</option>`).join('')}</select></label><button type="button" id="place-selected">Place ${chip}</button></div><p>Includes zero splits, both zero trios and first four (0 / 1 / 2 / 3).</p></details><div class="bet-summary"><span>ON THE TABLE <strong>${fmt(total())}</strong></span><span>AVAILABLE <strong>${fmt(hooks.balance()-(spinning?0:total()))}</strong></span><div><button type="button" id="undo-bet" ${!undo.length||spinning?'disabled':''}>Undo</button><button type="button" id="clear-bets" ${!total()||spinning?'disabled':''}>Clear</button><button type="button" id="repeat-bets" ${!Object.keys(last).length||spinning?'disabled':''}>Rebet</button></div></div><div class="bet-slip" aria-label="Your bets">${Object.entries(bets).map(([id,amount])=>`<button type="button" data-remove="${id}" ${spinning?'disabled':''}>${byId.get(id).type} ${byId.get(id).label} · ${amount} <span aria-hidden="true">×</span><span class="sr-only"> Remove bet</span></button>`).join('')||'<span>Place one or more chips to spin.</span>'}</div></div></div>`;
      $('.wheel-rotor').style.transform=`rotate(${rotation}deg)`;
      element.querySelectorAll('[data-bet]').forEach(b=>b.onclick=()=>place(b.dataset.bet));
      element.querySelectorAll('[data-chip]').forEach(b=>b.onclick=()=>{if(spinning)return;chip=Number(b.dataset.chip);render();});
      element.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{if(spinning)return;undo.push({...bets});delete bets[b.dataset.remove];render();});
      $('#roulette-type').onchange=e=>{type=e.target.value;$('#roulette-selection').innerHTML=catalog.filter(b=>b.type===type).map(b=>`<option value="${b.id}">${b.label} (${b.pays}:1)</option>`).join('');};
      $('#place-selected').onclick=()=>{const selected=$('#roulette-selection').value;place(selected);$('.precise-bet').open=true;$('#roulette-selection').value=selected;};
      $('#undo-bet').onclick=()=>{if(!spinning&&undo.length){bets=undo.pop();render();}};
      $('#clear-bets').onclick=()=>{if(!spinning){undo.push({...bets});bets={};render();}};
      $('#repeat-bets').onclick=()=>{if(spinning)return;const sum=Object.values(last).reduce((a,b)=>a+b,0);if(sum>hooks.balance()){hooks.status('Not enough tokens to repeat the last bets.');return;}undo.push({...bets});bets={...last};render();};
      $('.bet-scroll').scrollLeft=previousScroll;$('.precise-bet').open=previousOpen;
      if(previousSelection&&byId.get(previousSelection)?.type===type)$('#roulette-selection').value=previousSelection;
      if(focusKey)element.querySelector(`[data-${focusKey}="${focusValue}"]`)?.focus({preventScroll:true});
    }
    async function spin(){
      if(spinning||hooks.busy())return;const snapshot={...bets},stake=total();if(!stake){hooks.status('Choose a chip and place it on the table before spinning.');return;}
      if(stake>hooks.balance()){hooks.status('Your bets exceed the available balance. Clear or remove a bet.');return;}
      spinning=true;last=snapshot;hooks.start(stake);const number=hooks.random(37),outcome=settle(snapshot,number);result=null;render();hooks.status('No more bets. The wheel is spinning…');
      await hooks.wait(40);
      const angle=(360-wheel.indexOf(number)*360/37)%360;
      rotation=(Math.floor(rotation/360)+5)*360+angle;
      $('.wheel-rotor').classList.add('wheel-running');$('.ball-track').classList.add('ball-running');$('.wheel-rotor').style.transform=`rotate(${rotation}deg)`;
      await hooks.wait(4200);
      result={number,...outcome};history.unshift(number);history=history.slice(0,8);bets={};undo=[];spinning=false;
      hooks.finish(outcome.returned,`${number} ${color(number)}. ${outcome.winners.length?outcome.winners.length+' winning bet'+(outcome.winners.length===1?'':'s')+'.':'No winning bets.'}`);render();
    }
    render();return {spin,place,clear(){bets={};undo=[];result=null;render();},render,getBets:()=>({...bets})};
  }
  const api={catalog,byId,wheel,red,settle,color,create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Roulette=api;
})(globalThis);
