const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../arcade.js','utf8');
function setup(){
 const nodes=new Map();
 function node(id){if(nodes.has(id))return nodes.get(id);const n={value:id==='#stake'?'20':id==='#pairs-stake'||id==='#three-stake'?'0':'player',textContent:'',innerHTML:'',hidden:false,disabled:false,dataset:{},style:{},classList:{add(){},remove(){}},closest(){return node('stake-label')},children:[],className:'',setAttribute(){},append(...x){this.children.push(...x)},replaceChildren(){this.children=[]},before(){},showModal(){this.open=true},close(){this.open=false},focus(){this.focused=true},addEventListener(type,fn){this[type]=fn},querySelector(selector){return node(selector)},querySelectorAll(selector){return selector==='[data-game]'?['blackjack','baccarat','roulette'].map(g=>{const b=node(g);b.dataset.game=g;return b;}):[]}};nodes.set(id,n);return n;}
 const storage=new Map();const ctx={Roulette:require('../roulette.js'),document:{querySelector:node,createElement:()=>node('new'+Math.random()),getElementById:id=>node('#'+id),addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},crypto:require('node:crypto').webcrypto,AbortSignal,fetch:async()=>({ok:true,json:async()=>({scores:[]})}),setTimeout:fn=>fn(),console};
 vm.createContext(ctx);vm.runInContext(source.replace('  wallet();choose();recordBest();refresh();',`globalThis.gameTest={get state(){return state;},get active(){return active;},setDeck(cards){deck=()=>cards.slice().reverse();},setRandom(n){random=()=>n;},choose(g){game=g;choose();},deal(){ return $('deal').onclick(); },bet(id){roulette.place(id)},getBets(){return roulette.getBets()},sideBets,double(){return $('double').onclick();},stand,hit(){ return $('hit').onclick(); },reset(){ $('reset').onclick(); },total};wallet();choose();recordBest();refresh();`),ctx);
 return {api:ctx.gameTest,nodes,node,ctx};
}
const hand=(...r)=>r.map(r=>({r,suit:'♠'}));
test('double down adds one main stake, draws once, auto-stands and rejects duplicate clicks',async()=>{
 const {api,node}=setup();api.setDeck(hand(5,6,10,7,10));await api.deal();const doubling=api.double();assert.equal(api.state.balance,960);assert.equal(api.state.pending.stake,40);await api.double();await api.hit();await doubling;assert.equal(api.state.balance,1040);assert.equal(api.state.rounds,1);
 const loss=setup();loss.api.setDeck(hand(10,6,10,7,10));await loss.api.deal();await loss.api.double();assert.equal(loss.api.state.balance,960);
 const push=setup();push.api.setDeck(hand(5,6,10,10,9));await push.api.deal();await push.api.double();assert.equal(push.api.state.balance,1000);
});
test('double down is blocked after a hit, during dealing and when balance cannot cover it',async()=>{
 const {api}=setup();api.setDeck(hand(2,3,10,7,2));const dealing=api.deal();await api.double();assert.equal(api.state.balance,980);await dealing;await api.hit();await api.double();assert.equal(api.state.balance,980);assert.equal(api.active.p.length,3);
 const poor=setup();poor.api.state.balance=30;poor.api.setDeck(hand(5,6,10,7));await poor.api.deal();await poor.api.double();assert.equal(poor.api.state.balance,10);assert.equal(poor.node('#double').disabled,true);
});
test('side bets classify every payout, ace-high/low straights and non-straight wraparounds',()=>{
 const {api}=setup(),c=(r,suit)=>({r,suit});
 for(const [p,up,expected] of [
 [[c(7,'♠'),c(7,'♠')],c(7,'♠'),127],
 [[c(7,'♠'),c(7,'♣')],c(7,'♥'),44],
 [[c(7,'♠'),c(7,'♥')],c(2,'♣'),7],
 [[c(1,'♠'),c(2,'♠')],c(3,'♠'),41],
 [[c(1,'♠'),c(12,'♥')],c(13,'♣'),11],
 [[c(1,'♠'),c(2,'♥')],c(3,'♣'),11],
 [[c(2,'♠'),c(7,'♠')],c(11,'♠'),6],
 [[c(13,'♠'),c(1,'♥')],c(2,'♣'),0]
 ])assert.equal(api.sideBets(p,up,1,1).returned,expected);
});
test('side bets debit together, pay independently on bust and do not double with the main bet',async()=>{
 const {api,node}=setup();node('#pairs-stake').value='5';node('#three-stake').value='10';api.setDeck(hand(8,8,10,7,10));await api.deal();assert.equal(api.state.balance,965);assert.equal(api.state.pending.stake,35);assert.match(node('#side-result').textContent,/Perfect pair/);await api.double();assert.equal(api.state.balance,1135);assert.equal(api.state.rounds,1);
 const poor=setup();poor.api.state.balance=25;poor.node('#pairs-stake').value='10';await poor.api.deal();assert.equal(poor.api.state.balance,25);assert.equal(poor.api.state.rounds,0);
 const natural=setup();natural.node('#three-stake').value='5';natural.api.setDeck(hand(1,13,12,9));await natural.api.deal();assert.equal(natural.api.state.balance,1230);
});
test('roulette undo, clear and rebet preserve exact chip amounts without charging the wallet',async()=>{
 const {api,node}=setup();api.choose('roulette');api.bet('n0');api.bet('first4');api.bet('first4');
 node('#undo-bet').onclick();assert.equal(api.getBets().first4,10);assert.equal(api.state.balance,1000);
 node('#clear-bets').onclick();assert.equal(Object.keys(api.getBets()).length,0);node('#undo-bet').onclick();assert.equal(api.getBets().n0,10);
 api.setRandom(0);await api.deal();assert.equal(api.state.balance,1430);assert.equal(Object.keys(api.getBets()).length,0);
 node('#repeat-bets').onclick();assert.equal(api.getBets().n0,10);assert.equal(api.getBets().first4,10);assert.equal(api.state.balance,1430);
});
test('roulette locks chips, reset and repeat spin during animation, then settles multiple bets once',async()=>{
 const {api}=setup();api.choose('roulette');api.bet('n17');api.bet('black');api.setRandom(17);
 const spinning=api.deal();assert.equal(api.state.balance,980);api.bet('red');api.reset();await api.deal();assert.equal(api.state.balance,980);
 await spinning;assert.equal(api.state.balance,1360);assert.equal(api.state.rounds,1);assert.equal(api.state.pending,null);
});
test('roulette rejects empty spins and chips exceeding the wallet',async()=>{
 const {api,node}=setup();api.choose('roulette');await api.deal();assert.equal(api.state.rounds,0);assert.match(node('#game-status').textContent,/place it on the table/);
 for(let i=0;i<101;i++)api.bet('n0');assert.match(node('#game-status').textContent,/Not enough/);api.setRandom(1);await api.deal();assert.equal(api.state.balance,0);assert.equal(api.state.rounds,1);
});
test('blackjack natural pays 3:2 and simultaneous naturals push',async()=>{
 let {api}=setup();api.setDeck(hand(1,10,10,9));await api.deal();assert.equal(api.state.balance,1030);assert.equal(api.state.peak,1030);assert.equal(api.state.rounds,1);
 ({api}=setup());api.setDeck(hand(1,10,1,13));await api.deal();assert.equal(api.state.balance,1000);
});
test('blackjack aces, bust, dealer drawing, and duplicate clicks preserve the wallet',async()=>{
 let {api}=setup();assert.equal(api.total(hand(1,1,9)),21);assert.equal(api.total(hand(1,1,13,9)),21);
 api.setDeck(hand(10,6,10,7,10));await api.deal();assert.equal(api.state.balance,980);await api.deal();assert.equal(api.state.balance,980);await api.hit();assert.equal(api.state.balance,980);await api.stand();assert.equal(api.state.balance,980);
 const winning=setup();api=winning.api;api.setDeck(hand(10,8,10,6,10));await api.deal();await api.stand();assert.equal(api.state.balance,1020);api.reset();assert.equal(api.state.balance,1020);winning.node("#skip-score").onclick();assert.equal(api.state.balance,1000);assert.equal(api.state.records[0].peak,1020);
});
test('baccarat natural banker win pays commission and ties return player stakes',async()=>{
 let {api,node}=setup();api.choose('baccarat');node('#pick').value='banker';api.setDeck(hand(4,4,4,5));await api.deal();assert.equal(api.state.balance,1019);
 ({api,node}=setup());api.choose('baccarat');node('#pick').value='player';api.setDeck(hand(4,4,4,4));await api.deal();assert.equal(api.state.balance,1000);
 ({api,node}=setup());api.choose('baccarat');node('#pick').value='tie';api.setDeck(hand(4,4,4,4));await api.deal();assert.equal(api.state.balance,1160);
});
test('baccarat third-card exception: banker 3 stands against player third-card 8',async()=>{
 const {api,node}=setup();api.choose('baccarat');node('#pick').value='banker';api.setDeck(hand(2,2,1,2,8,6));await api.deal();assert.equal(api.state.balance,1019);
});
test('roulette zero loses even-money bets; red wins and wrong colour loses',async()=>{
 for(const [number,pick,balance] of [[0,'even',980],[16,'red',1020],[16,'black',980],[35,'odd',1020]]){const {api,node}=setup();api.choose('roulette');api.bet(pick);api.bet(pick);api.setRandom(number);await api.deal();assert.equal(api.state.balance,balance);assert.equal(api.state.rounds,1);}
});
test('nickname qualification, failed submission retry and submitted record survive a run reset',async()=>{
 const {api,node,ctx}=setup();await new Promise(setImmediate);
 api.setDeck(hand(1,10,10,9));await api.deal();assert.equal(node('#score-form').hidden,false);
 node('#nickname').value='Test Player';let body;
 ctx.fetch=async (url,options)=>{if(options?.method==='POST'){body=JSON.parse(options.body);return {ok:false,json:async()=>({error:'Temporary failure'})};}return {ok:true,json:async()=>({scores:[]})};};
 await node('#score-form').submit({preventDefault(){}});assert.match(node('#submission-status').textContent,/Not saved online.*Temporary failure/);assert.equal(node('#score-form').hidden,false);assert.equal(node('#nickname').value,'Test Player');
 ctx.fetch=async (url,options)=>({ok:true,json:async()=>options?.method==='POST'?{saved:true,rank:1}:{scores:[{nickname:'Test Player',score:1030}]}});
 await node('#score-form').submit({preventDefault(){}});assert.equal(body.score,1030);assert.equal(body.token.length,64);assert.equal(node('#score-form').hidden,true);assert.match(node('#submission-status').textContent,/#1/);api.reset();assert.equal(node('#score-form').hidden,true);
});
test('reset prompts before clearing tokens, retains the run after failed save, then resets after confirmed save',async()=>{
 const {api,node,ctx}=setup();await new Promise(setImmediate);
 api.setDeck(hand(1,10,10,9));await api.deal();api.reset();
 assert.equal(api.state.balance,1030);assert.equal(node('#nickname').focused,true);assert.equal(node('#score-form').hidden,false);
 node('#nickname').value='Reset Player';let submitted;
 ctx.fetch=async()=>{throw Error('Offline');};
 await node('#score-form').submit({preventDefault(){}});assert.equal(api.state.balance,1030);assert.match(node('#submission-status').textContent,/Not saved online/);
 ctx.fetch=async(url,options)=>{if(options?.method==='POST'){submitted=JSON.parse(options.body);return {ok:true,json:async()=>({saved:true,rank:1})};}return {ok:true,json:async()=>({scores:[]})};};
 await node('#score-form').submit({preventDefault(){}});assert.equal(submitted.score,1030);assert.equal(api.state.balance,1000);assert.equal(api.state.records[0].peak,1030);assert.match(node('#game-status').textContent,/Saved online!.*New run/);
});
test('reset still prompts when leaderboard loading fails; a baseline-only run explains why it is not submitted',async()=>{
 const {api,node,ctx}=setup();api.setDeck(hand(1,10,10,9));await api.deal();api.reset();assert.equal(node('#nickname').focused,true);assert.equal(api.state.balance,1030);
 node('#skip-score').onclick();assert.equal(api.state.balance,1000);assert.equal(node('#claim-score').hidden,false);assert.match(node('#game-status').textContent,/browser only/);
 const baseline=setup();baseline.api.reset();assert.match(baseline.node('#game-status').textContent,/beat 1,000 tokens/);
});
