(() => {
  const hero = document.querySelector('.hero-panel');
  hero.className='hero-panel leaderboard-panel';
  hero.setAttribute('aria-label','All-time minigames leaderboard');
  hero.innerHTML=`<div class="arcade-top"><div><span class="arcade-kicker">THE SIDE QUEST</span><h2>Minigames leaderboard</h2></div><span class="arcade-chip" aria-hidden="true">♠</span></div><div class="leaderboard-columns"><span>PLAYER</span><span>BEST SCORE</span></div><div id="global-scores" aria-live="polite"><div class="leaderboard-empty"><p>Loading high scores…</p></div></div><button class="leaderboard-refresh" id="refresh-scores" type="button">Refresh scores</button><a class="button primary explore-games" href="#minigames">Explore Minigames <span aria-hidden="true">↓</span></a><p class="leaderboard-note">Three games · 1,000 starting tokens · Just for fun</p>`;
  const section=document.createElement('section');section.id='minigames';section.className='minigames-section container';section.setAttribute('aria-labelledby','minigames-title');
  section.innerHTML='<div class="section-label"><span>05 / THE SIDE QUEST</span><h2 id="minigames-title">A little friendly competition.</h2></div><p class="minigames-intro">Pick a table. Play a few hands. See how far 1,000 tokens take you.</p><div class="minigames-layout"><aside class="minigames-info"><h3>One wallet.<br>Three ways to play.</h3><p>Blackjack, baccarat and roulette share the same token balance. Your progress stays in this browser.</p><p>Beat your starting balance and aim for the all-time top ten. Submit a nickname to claim your place.</p><p class="preview-note">Free play only. No purchases, cash prizes or real money. Scores are community-submitted.</p><form id="score-form" hidden><h4>A place on the board.</h4><p id="qualifying-score"></p><label for="nickname">Your nickname</label><input id="nickname" name="nickname" minlength="2" maxlength="20" autocomplete="off" required placeholder="2–20 characters"><small>Your nickname and best score will be public.</small><button class="button primary" type="submit">Submit high score</button></form><p id="submission-status" role="status"></p><a href="#hero-title">Back to leaderboard ↑</a></aside><div id="arcade-host"></div></div>';
  document.querySelector('#contact').before(section);
  document.querySelector('#contact .eyebrow').textContent='06 / SAY HELLO';
  const host = document.querySelector('#arcade-host');
  const key = 'mh-arcade-v1';
  const fresh = () => ({balance:1000, peak:1000, rounds:0, wins:0, records:[], pending:null});
  let state = fresh(), persistent = true;
  try { const s=JSON.parse(localStorage.getItem(key)); if(s && Number.isFinite(s.balance) && s.balance>=0 && s.balance<=1e8 && Number.isFinite(s.peak) && s.peak>=1000 && s.peak<=1e8 && Number.isInteger(s.rounds) && s.rounds>=0 && Number.isInteger(s.wins) && s.wins>=0 && Array.isArray(s.records)) state={...fresh(),...s}; } catch { persistent=false; }
  let game='blackjack', active=null, busy=false;
  const fmt = n => Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
  function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{persistent=false;}}
  // Stakes are deducted before a round, so reloading cannot refund a losing hand.
  if(state.pending){state.pending=null;save();}
  host.className='arcade';
  host.setAttribute('aria-label','Mini casino with free play tokens');
  host.innerHTML=`<div class="arcade-top"><div><span class="arcade-kicker">THE SIDE QUEST</span><h2>Take a little break.</h2></div><span class="arcade-chip" aria-hidden="true">♠</span></div>
    <div class="arcade-wallet"><div><small>YOUR TOKENS</small><strong id="tokens"></strong></div><div><small>RUN BEST</small><strong id="peak"></strong></div></div>
    <details class="arcade-board"><summary>Past runs <span>This browser</span></summary><p>Best completed runs on this browser. Finish a run to record its highest balance.</p><ol id="scores"></ol></details>
    <div class="arcade-tabs" role="group" aria-label="Choose a game"><button data-game="blackjack" aria-pressed="true">♠ Blackjack</button><button data-game="baccarat" aria-pressed="false">♦ Baccarat</button><button data-game="roulette" aria-pressed="false">◉ Roulette</button></div>
    <div id="game-table" class="game-table"></div>
    <div class="arcade-controls"><label>Stake <select id="stake"><option>10</option><option selected>20</option><option>50</option><option>100</option></select></label><label id="pick-label">Bet on <select id="pick"></select></label><button id="deal" class="arcade-primary">Deal cards</button><button id="hit" hidden>Hit</button><button id="stand" hidden>Stand</button></div>
    <p id="game-status" role="status" aria-live="polite">Three games. Your move.</p><details class="arcade-rules"><summary>How to play</summary><p id="rules"></p></details>
    <div class="arcade-footer"><span id="storage-note">Free play · No cash value</span><button id="reset">Finish run & reset</button></div><noscript>Enable JavaScript to play.</noscript>`;
  const $ = id=>host.querySelector('#'+id);
  function wallet(){ $('tokens').textContent=fmt(state.balance);$('peak').textContent=fmt(state.peak);$('scores').replaceChildren();state.records.slice(0,5).forEach((r,i)=>{const li=document.createElement('li');li.textContent=`${i+1}. ${fmt(r.peak)} tokens · ${r.rounds} rounds`; $('scores').append(li);});if(!state.records.length){const li=document.createElement('li');li.textContent='Your first run starts here.';$('scores').append(li);}if(!persistent)$('storage-note').textContent='Session only · Storage unavailable';}
  const rules={blackjack:'Get closer to 21 than the dealer without going over. Aces count as 1 or 11. Dealer stands on all 17s. Natural blackjack pays 3:2; other wins 1:1; ties return the stake. Hit or stand only; no splits, doubles or insurance. Fresh shuffled deck each round.',baccarat:'Bet on Player, Banker or Tie. Closest to 9 wins; tens and faces count as 0, aces as 1. Standard automatic third-card draws. Player pays 1:1, Banker 0.95:1, Tie 8:1. On a tie, Player/Banker stakes are returned. Fresh eight-deck shoe each round.',roulette:'Single-zero wheel: 0–36. Choose red, black, odd or even; wins pay 1:1. Zero loses all four bets. Every number has an equal chance. Payouts are profit in addition to your returned stake.'};
  function choose(){ $('rules').textContent=rules[game]+' Leaving or reloading during a round forfeits its stake.';$('pick-label').hidden=game==='blackjack';$('pick').innerHTML=(game==='baccarat'?['Player','Banker','Tie']:['Red','Black','Odd','Even']).map(x=>`<option value="${x.toLowerCase()}">${x}</option>`).join('');$('deal').textContent=game==='roulette'?'Spin wheel':'Deal cards';$('game-table').innerHTML=game==='roulette'?'<div class="roulette-wheel"><span>◉</span></div><small>EUROPEAN · SINGLE ZERO</small>':'<div class="table-intro"><span>♠ <b>♥</b> ♣ <b>♦</b></span><small>'+ (game==='blackjack'?'CHASE 21':'CLOSEST TO NINE')+'</small></div>';host.querySelectorAll('[data-game]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.game===game)));}
  function lock(on){busy=on;host.querySelectorAll('[data-game],#stake,#pick,#reset,#deal').forEach(b=>b.disabled=on);$('deal').hidden=on&&game==='blackjack';$('hit').hidden=$('stand').hidden=!(on&&game==='blackjack');}
  function random(n){const a=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
  function deck(copies=1){const d=[];for(let c=0;c<copies;c++)for(const suit of ['♠','♥','♣','♦'])for(let r=1;r<=13;r++)d.push({r,suit});for(let i=d.length-1;i>0;i--){const j=random(i+1);[d[i],d[j]]=[d[j],d[i]];}return d;}
  function total(hand){let n=0,a=0;hand.forEach(c=>{n+=c.r===1?11:Math.min(c.r,10);if(c.r===1)a++;});while(n>21&&a-->0)n-=10;return n;}
  const bac=h=>h.reduce((n,c)=>n+(c.r>=10?0:c.r),0)%10;
  function cards(h){return h.map(c=>`<span class="playing-card ${'♥♦'.includes(c.suit)?'red-card':''}">${['','A','2','3','4','5','6','7','8','9','10','J','Q','K'][c.r]}<small>${c.suit}</small></span>`).join('');}
  function showHands(reveal=true){const {p,d}=active,score=game==='baccarat'?bac:total;$('game-table').innerHTML=`<div class="hand"><small>${game==='baccarat'?'BANKER':'DEALER'} · ${reveal?score(d):'?'}</small><div>${cards(reveal?d:[d[0]])}${reveal?'':'<span class="playing-card card-back">✦</span>'}</div></div><div class="hand"><small>${game==='baccarat'?'PLAYER':'YOU'} · ${score(p)}</small><div>${cards(p)}</div></div>`;}
  function finish(returned,message){const net=Math.round((returned-active.stake)*100)/100;state.balance=Math.round((state.balance+returned)*100)/100;state.peak=Math.max(state.peak,state.balance);state.rounds++;if(net>0)state.wins++;state.pending=null;save();wallet();$('game-status').textContent=`${message} ${net>0?'+':''}${fmt(net)} tokens.${state.balance<10?' Finish this run to get 1,000 fresh tokens.':''}`;active=null;lock(false);recordBest();}
  function stand(){if(!active||!busy)return;while(total(active.d)<17)active.d.push(active.deck.pop());showHands();const p=total(active.p),d=total(active.d);finish(d>21||p>d?active.stake*2:p===d?active.stake:0,d>21?'Dealer busts.':p>d?'You win.':p===d?'Push.':'Dealer wins.');}
  $('hit').onclick=()=>{if(!active||!busy)return;active.p.push(active.deck.pop());showHands(false);if(total(active.p)>21){showHands();finish(0,'You bust.');}else if(total(active.p)===21)stand();};$('stand').onclick=stand;
  $('deal').onclick=()=>{if(busy)return;const stake=Number($('stake').value);if(state.balance<stake){$('game-status').textContent='Not enough tokens. Choose a smaller stake or finish this run.';return;}state.balance-=stake;state.pending={stake,game};save();wallet();lock(true);active={stake};
    if(game==='roulette'){const n=random(37),red=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n),pick=$('pick').value;const win=n!==0&&(pick==='red'?red:pick==='black'?!red:pick==='odd'?n%2===1:n%2===0);$('game-table').innerHTML='<div class="roulette-wheel spinning"><span>◉</span></div><small>SPINNING…</small>';$('game-status').textContent='The wheel is spinning…';setTimeout(()=>{$('game-table').innerHTML=`<div class="roulette-wheel ${n===0?'zero':red?'red-wheel':'black-wheel'}"><span>${n}</span></div><small>${n===0?'ZERO':red?'RED':'BLACK'}</small>`;finish(win?stake*2:0,`${n} ${n===0?'green':red?'red':'black'}. ${win?'You win.':'No win this spin.'}`);},650);return;}
    active.deck=deck(game==='baccarat'?8:1);active.p=[active.deck.pop(),active.deck.pop()];active.d=[active.deck.pop(),active.deck.pop()];
    if(game==='blackjack'){showHands(false);const p=total(active.p),d=total(active.d);if(p===21||d===21){showHands();finish(p===d?stake:p===21?stake*2.5:0,p===d?'Both blackjack. Push.':p===21?'Blackjack!':'Dealer blackjack.');}else $('game-status').textContent='Your turn: hit for another card or stand.';return;}
    let p=bac(active.p),b=bac(active.d);if(p<8&&b<8){let third=null;if(p<=5){const c=active.deck.pop();active.p.push(c);third=c.r>=10?0:c.r;}const draw=third===null?b<=5:b<=2||(b===3&&third!==8)||(b===4&&third>=2&&third<=7)||(b===5&&third>=4&&third<=7)||(b===6&&third>=6&&third<=7);if(draw)active.d.push(active.deck.pop());}p=bac(active.p);b=bac(active.d);const winner=p===b?'tie':p>b?'player':'banker',pick=$('pick').value;showHands();finish(winner===pick?stake*(winner==='tie'?9:winner==='banker'?1.95:2):winner==='tie'?stake:0,`${winner==='tie'?'Tie':winner==='player'?'Player wins':'Banker wins'} (${p}–${b}).`);
  };
  host.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>{if(busy)return;game=b.dataset.game;choose();$('game-status').textContent='Choose a stake and play a round.';});
  $('reset').onclick=()=>{if(busy)return;const records=state.records;if(state.rounds)records.push({peak:state.peak,rounds:state.rounds});records.sort((a,b)=>b.peak-a.peak);state={...fresh(),records:records.slice(0,5)};save();wallet();choose();$('game-status').textContent='New run. Your 1,000 tokens are ready.';};

  const API='https://menghong-minigames-leaderboard.menghong20.chatgpt.site/api/leaderboard';
  const profileKey='mh-arcade-profile-v1';
  let profile={token:Array.from(crypto.getRandomValues(new Uint8Array(32)), x=>x.toString(16).padStart(2,'0')).join(''),nickname:'',submitted:1000,best:1000,rounds:0};
  try { const p=JSON.parse(localStorage.getItem(profileKey));if(p && /^[a-f0-9]{64}$/.test(p.token) && Number.isFinite(p.best) && p.best>=1000 && p.best<=1e8 && Number.isInteger(p.rounds) && p.rounds>=0 && Number.isFinite(p.submitted))profile={...profile,...p}; }catch{}
  function saveProfile(){try{localStorage.setItem(profileKey,JSON.stringify(profile));}catch{persistent=false;}}
  saveProfile();
  let board=null,loading=false,sending=false;
  const scoreForm=document.getElementById('score-form'),nickname=document.getElementById('nickname'),submission=document.getElementById('submission-status'),boardHost=document.getElementById('global-scores');
  nickname.value=typeof profile.nickname==='string'?profile.nickname:'';
  async function request(options){const r=await fetch(API,{...options,signal:AbortSignal.timeout(12000)});const data=await r.json();if(!r.ok)throw new Error(data.error||'The leaderboard is unavailable. Please try again.');return data;}
  function qualify(){
    const eligible=board!==null && profile.rounds>0 && profile.best>Math.max(1000,profile.submitted) && (board.length<10 || profile.best>board[9].score);
    scoreForm.hidden=!eligible;
    document.getElementById('qualifying-score').textContent=fmt(profile.best)+' tokens — your best balance so far.';
  }
  function renderBoard(){
    boardHost.replaceChildren();
    if(!board.length){const box=document.createElement('div');box.className='leaderboard-empty';const title=document.createElement('h3');title.textContent='The first seat is yours.';const p=document.createElement('p');p.textContent='Beat 1,000 tokens and claim the first high score.';box.append(title,p);boardHost.append(box);return;}
    const list=document.createElement('ol');list.className='global-score-list';
    board.forEach((row,i)=>{const li=document.createElement('li'),rank=document.createElement('span'),name=document.createElement('span'),score=document.createElement('strong');rank.className='score-rank';rank.textContent=String(i+1).padStart(2,'0');name.textContent=row.nickname;score.textContent=fmt(row.score);li.append(rank,name,score);list.append(li);});boardHost.append(list);
  }
  async function refresh(){
    if(loading)return;loading=true;document.getElementById('refresh-scores').disabled=true;
    try{const data=await request();if(!Array.isArray(data.scores))throw new Error('Invalid leaderboard');board=data.scores.slice(0,10);renderBoard();qualify();}
    catch{if(!board){boardHost.replaceChildren();const p=document.createElement('p');p.className='leaderboard-empty';p.textContent='Scores are temporarily unavailable. You can still play — your best score stays in this browser.';boardHost.append(p);}else document.getElementById('refresh-scores').textContent='Couldn’t refresh — retry';}
    finally{loading=false;document.getElementById('refresh-scores').disabled=false;}
  }
  function recordBest(){if(state.rounds>0 && state.peak>profile.best){profile.best=state.peak;profile.rounds=state.rounds;saveProfile();}qualify();}
  scoreForm.addEventListener('submit',async e=>{
    e.preventDefault();if(sending)return;
    const name=nickname.value.trim();if(!/^[\p{L}\p{N}][\p{L}\p{N} _.-]{1,19}$/u.test(name)){submission.textContent='Use 2–20 letters, numbers, spaces, underscores, dots or hyphens.';return;}
    sending=true;const button=scoreForm.querySelector('button');button.disabled=true;submission.textContent='Saving your high score…';
    const score=profile.best,rounds=profile.rounds;
    try{const result=await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:name,score,rounds,token:profile.token})});profile.submitted=Math.max(profile.submitted,score);profile.nickname=name;saveProfile();submission.textContent=result.rank<=10?'You’re on the board! Current rank: #'+result.rank+'.':'Best score saved. The top ten moved ahead — keep playing!';await refresh();qualify();}
    catch(error){submission.textContent=error.name==='TimeoutError'?'The request timed out. Your score is saved here; please try submitting again.':error.message;}
    finally{sending=false;button.disabled=false;}
  });
  document.getElementById('refresh-scores').onclick=()=>{document.getElementById('refresh-scores').textContent='Refresh scores';refresh();};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  wallet();choose();recordBest();refresh();
})();
