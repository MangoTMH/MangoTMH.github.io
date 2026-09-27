const {test}=require('node:test');
const assert=require('node:assert/strict');
const {catalog,byId,wheel,red,settle}=require('../roulette.js');
test('complete single-zero catalog has legal, unique bets and a 37-pocket wheel',()=>{
 assert.equal(catalog.length,157);assert.equal(byId.size,157);assert.deepEqual([...wheel].sort((a,b)=>a-b),Array.from({length:37},(_,i)=>i));assert.equal(red.length,18);
 const counts={Straight:37,Split:60,Street:12,Corner:22,'Six line':11,Trio:2,'First four':1,Dozen:3,Column:3,Outside:6};
 for(const [type,count] of Object.entries(counts))assert.equal(catalog.filter(b=>b.type===type).length,count,type);
 for(const b of catalog){assert.equal(new Set(b.numbers).size,b.numbers.length);assert.ok(b.numbers.every(n=>Number.isInteger(n)&&n>=0&&n<=36));}
});
test('every bet settles correctly for all 37 outcomes, with returned stake included exactly once',()=>{
 const payouts={Straight:35,Split:17,Street:11,Corner:8,'Six line':5,Trio:11,'First four':8,Dozen:2,Column:2,Outside:1};
 for(const b of catalog){let sum=0;for(let n=0;n<=36;n++){const actual=settle({[b.id]:10},n);const returned=b.numbers.includes(n)?10*(payouts[b.type]+1):0;assert.equal(actual.returned,returned,b.id+' on '+n);assert.equal(actual.net,returned-10);sum+=actual.returned;}assert.equal(sum,360,b.id);}
});
test('overlapping winning bets and losing bets combine without dropping or double-counting chips',()=>{
 assert.deepEqual(settle({n17:10,black:25,'s17-20':5,red:10},17),{stake:50,returned:500,net:450,winners:['n17','black','s17-20']});
 assert.equal(settle({first4:10,trio1:5,'s0-3':10,n0:1,red:10},0).returned,366);
 assert.throws(()=>settle({madeUp:10},1));assert.throws(()=>settle({red:-10},1));assert.throws(()=>settle({red:10},37));
});
