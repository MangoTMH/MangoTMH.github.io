const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../arcade.js','utf8');
function setup(){
 const nodes=new Map();
 function node(id){if(nodes.has(id))return nodes.get(id);const n={value:id==='#stake'?'20':'player',textContent:'',innerHTML:'',hidden:false,disabled:false,dataset:{},children:[],className:'',setAttribute(){},append(...x){this.children.push(...x)},replaceChildren(){this.children=[]},before(){},showModal(){this.open=true},close(){this.open=false},focus(){this.focused=true},addEventListener(type,fn){this[type]=fn},querySelector(selector){return node(selector)},querySelectorAll(selector){return selector==='[data-game]'?['blackjack','baccarat','roulette'].map(g=>{const b=node(g);b.dataset.game=g;return b;}):[]}};nodes.set(id,n);return n;}
 const storage=new Map();const ctx={document:{querySelector:node,createElement:()=>node('new'+Math.random()),getElementById:id=>node('#'+id),addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},crypto:require('node:crypto').webcrypto,AbortSignal,fetch:async()=>({ok:true,json:async()=>({scores:[]})}),setTimeout:fn=>fn(),console};
 vm.createContext(ctx);vm.runInContext(source.replace('  wallet();choose();recordBest();refresh();',`globalThis.gameTest={get state(){return state;},get active(){return active;},setDeck(cards){deck=()=>cards.slice().reverse();},setRandom(n){random=()=>n;},choose(g){game=g;choose();},deal(){ $('deal').onclick(); },stand,hit(){ $('hit').onclick(); },reset(){ $('reset').onclick(); },total};wallet();choose();recordBest();refresh();`),ctx);
 return {api:ctx.gameTest,nodes,node,ctx};
}
const hand=(...r)=>r.map(r=>({r,suit:'♠'}));
test('blackjack natural pays 3:2 and simultaneous naturals push',()=>{
 let {api}=setup();api.setDeck(hand(1,10,10,9));api.deal();assert.equal(api.state.balance,1030);assert.equal(api.state.peak,1030);assert.equal(api.state.rounds,1);
 ({api}=setup());api.setDeck(hand(1,10,1,13));api.deal();assert.equal(api.state.balance,1000);
});
test('blackjack aces, bust, dealer drawing, and duplicate clicks preserve the wallet',()=>{
 let {api}=setup();assert.equal(api.total(hand(1,1,9)),21);assert.equal(api.total(hand(1,1,13,9)),21);
 api.setDeck(hand(10,6,10,7,10));api.deal();assert.equal(api.state.balance,980);api.deal();assert.equal(api.state.balance,980);api.hit();assert.equal(api.state.balance,980);api.stand();assert.equal(api.state.balance,980);
 const winning=setup();api=winning.api;api.setDeck(hand(10,8,10,6,10));api.deal();api.stand();assert.equal(api.state.balance,1020);api.reset();assert.equal(api.state.balance,1020);winning.node("#skip-score").onclick();assert.equal(api.state.balance,1000);assert.equal(api.state.records[0].peak,1020);
});
test('baccarat natural banker win pays commission and ties return player stakes',()=>{
 let {api,node}=setup();api.choose('baccarat');node('#pick').value='banker';api.setDeck(hand(4,4,4,5));api.deal();assert.equal(api.state.balance,1019);
 ({api,node}=setup());api.choose('baccarat');node('#pick').value='player';api.setDeck(hand(4,4,4,4));api.deal();assert.equal(api.state.balance,1000);
 ({api,node}=setup());api.choose('baccarat');node('#pick').value='tie';api.setDeck(hand(4,4,4,4));api.deal();assert.equal(api.state.balance,1160);
});
test('baccarat third-card exception: banker 3 stands against player third-card 8',()=>{
 const {api,node}=setup();api.choose('baccarat');node('#pick').value='banker';api.setDeck(hand(2,2,1,2,8,6));api.deal();assert.equal(api.state.balance,1019);
});
test('roulette zero loses even-money bets; red wins and wrong colour loses',()=>{
 for(const [number,pick,balance] of [[0,'even',980],[16,'red',1020],[16,'black',980],[35,'odd',1020]]){const {api,node}=setup();api.choose('roulette');node('#pick').value=pick;api.setRandom(number);api.deal();assert.equal(api.state.balance,balance);assert.equal(api.state.rounds,1);}
});
test('nickname qualification, failed submission retry and submitted record survive a run reset',async()=>{
 const {api,node,ctx}=setup();await new Promise(setImmediate);
 api.setDeck(hand(1,10,10,9));api.deal();assert.equal(node('#score-form').hidden,false);
 node('#nickname').value='Test Player';let body;
 ctx.fetch=async (url,options)=>{if(options?.method==='POST'){body=JSON.parse(options.body);return {ok:false,json:async()=>({error:'Temporary failure'})};}return {ok:true,json:async()=>({scores:[]})};};
 await node('#score-form').submit({preventDefault(){}});assert.match(node('#submission-status').textContent,/Not saved online.*Temporary failure/);assert.equal(node('#score-form').hidden,false);assert.equal(node('#nickname').value,'Test Player');
 ctx.fetch=async (url,options)=>({ok:true,json:async()=>options?.method==='POST'?{saved:true,rank:1}:{scores:[{nickname:'Test Player',score:1030}]}});
 await node('#score-form').submit({preventDefault(){}});assert.equal(body.score,1030);assert.equal(body.token.length,64);assert.equal(node('#score-form').hidden,true);assert.match(node('#submission-status').textContent,/#1/);api.reset();assert.equal(node('#score-form').hidden,true);
});
test('reset prompts before clearing tokens, retains the run after failed save, then resets after confirmed save',async()=>{
 const {api,node,ctx}=setup();await new Promise(setImmediate);
 api.setDeck(hand(1,10,10,9));api.deal();api.reset();
 assert.equal(api.state.balance,1030);assert.equal(node('#nickname').focused,true);assert.equal(node('#score-form').hidden,false);
 node('#nickname').value='Reset Player';let submitted;
 ctx.fetch=async()=>{throw Error('Offline');};
 await node('#score-form').submit({preventDefault(){}});assert.equal(api.state.balance,1030);assert.match(node('#submission-status').textContent,/Not saved online/);
 ctx.fetch=async(url,options)=>{if(options?.method==='POST'){submitted=JSON.parse(options.body);return {ok:true,json:async()=>({saved:true,rank:1})};}return {ok:true,json:async()=>({scores:[]})};};
 await node('#score-form').submit({preventDefault(){}});assert.equal(submitted.score,1030);assert.equal(api.state.balance,1000);assert.equal(api.state.records[0].peak,1030);assert.match(node('#game-status').textContent,/Saved online!.*New run/);
});
test('reset still prompts when leaderboard loading fails; a baseline-only run explains why it is not submitted',async()=>{
 const {api,node,ctx}=setup();api.setDeck(hand(1,10,10,9));api.deal();api.reset();assert.equal(node('#nickname').focused,true);assert.equal(api.state.balance,1030);
 node('#skip-score').onclick();assert.equal(api.state.balance,1000);assert.equal(node('#claim-score').hidden,false);assert.match(node('#game-status').textContent,/browser only/);
 const baseline=setup();baseline.api.reset();assert.match(baseline.node('#game-status').textContent,/beat 1,000 tokens/);
});
