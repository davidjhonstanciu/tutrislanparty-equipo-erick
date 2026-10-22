
const COLS=10,ROWS=20,C=30,GOAL=1000000;
const LINE_PTS=[0,1000,3000,5000,8000];
const cl=(n,m)=>({n,m});
const PIECES=[
 cl('I',[[1,1,1,1]]),cl('O',[[1,1],[1,1]]),cl('T',[[0,1,0],[1,1,1]]),
 cl('S',[[0,1,1],[1,1,0]]),cl('Z',[[1,1,0],[0,1,1]]),cl('J',[[1,0,0],[1,1,1]]),cl('L',[[0,0,1],[1,1,1]]),
 cl('Cruz',[[0,1,0],[1,1,1],[0,1,0]]),cl('V',[[1,0,0],[1,0,0],[1,1,1]]),cl('Esquina',[[1,0],[1,1]])
];
const CLASSIC=7;
const NORMAL=['#8ec5f0','#f7e07a','#c9a6e8','#8fd49b','#f49a96','#6f8fdc','#f7b267','#e86f8f','#7fd4cf','#b5c96b','#3a3a3a'];
let CBPAL=['#E69F00','#56B4E9','#009E73','#F0E442','#0072B2','#D55E00','#CC79A7','#999999','#FFFFFF','#44AA99','#222222'];
const SYM=['●','▲','■','◆','★','✚','✖','♥','≡','◐','💣'];
const cv=document.getElementById('board'),ctx=cv.getContext('2d');
const nx=document.getElementById('next').getContext('2d');
const $=id=>document.getElementById(id);
$('goal').textContent=GOAL.toLocaleString('es-ES');
let cb=false,grid,cur,nextP,score,lines,level,over,paused,won,acc,last,bag=[],best=0,started=false,flash=[],flashT=0,shake=0,streak=0,bombNext=false,skin=0,diff=1,spd=1,mode=0,playT=0,timeLeft=120000,tu=false;
try{best=+localStorage.getItem('tutris-best')||0}catch(e){}

function rnd(){
  if(!bag.length){bag=PIECES.map((_,k)=>k);for(let k=bag.length-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[bag[k],bag[j]]=[bag[j],bag[k]]}}
  const i=bag.pop();
  return {id:i,m:PIECES[i].m.map(r=>r.slice())};
}
function rot(m){return m[0].map((_,i)=>m.map(r=>r[i]).reverse())}
function hit(p,x,y){
  for(let r=0;r<p.m.length;r++)for(let c=0;c<p.m[r].length;c++){
    if(!p.m[r][c])continue;
    const gx=x+c,gy=y+r;
    if(gx<0||gx>=COLS||gy>=ROWS)return true;
    if(gy>=0&&grid[gy][gx]!==null)return true;
  }
  return false;
}
function spawn(){
  cur=nextP||rnd();nextP=bombNext?(bombNext=false,{id:10,m:[[1]],bomb:true}):rnd();
  cur.x=Math.floor((COLS-cur.m[0].length)/2);cur.y=0;
  if(hit(cur,cur.x,cur.y))end(false);
}
function reset(){
  grid=Array.from({length:ROWS},()=>Array(COLS).fill(null));
  score=0;lines=0;level=1;streak=0;bombNext=false;playT=0;timeLeft=120000;tu=false;over=false;paused=false;won=false;acc=0;last=performance.now();nextP=null;
  $('ov').style.display='none';spawn();ui();
}
function ui(){
  if(score>best){best=score;try{localStorage.setItem('tutris-best',best)}catch(e){}}
  $('score').textContent=score.toLocaleString('es-ES');$('lines').textContent=lines;$('level').textContent=level;
  $('best').textContent=best.toLocaleString('es-ES');$('mul').textContent='x'+(mult()*DIFF[diff].m*SPD[spd].m).toFixed(1);$('bar').style.width=Math.min(100,score/GOAL*100)+'%';
}
function lock(){beep(180,.08,'square',.04);
  if(cur.bomb){explode();return}
  {const perfect=cur.m[0].every((_,c)=>{let lo=-1;cur.m.forEach((row,r)=>{if(row[c])lo=r});if(lo<0)return true;const y=cur.y+lo+1;return y>=ROWS||grid[y][cur.x+c]!==null});if(perfect){streak++;if(streak>=2)popup('ENCAJE x'+mult().toFixed(1),120)}else streak=0;ui()}
  cur.m.forEach((row,r)=>row.forEach((v,c)=>{if(v&&cur.y+r>=0)grid[cur.y+r][cur.x+c]=cur.id}));
  let n=0;flash=[];
  for(let r=ROWS-1;r>=0;r--){
    if(grid[r].every(v=>v!==null)){flash.push(r);burst(r);if(maxRun(grid[r])>=BOMB_RUN)bombNext=true;grid.splice(r,1);grid.unshift(Array(COLS).fill(null));n++;r++}
  }
  if(n){
    flashT=performance.now();const gain=Math.round(LINE_PTS[Math.min(n,4)]*level*mult()*DIFF[diff].m*SPD[spd].m);if(bombNext)popup('¡BOMBA!',260);score+=gain;popup('+'+gain.toLocaleString('es-ES'),220);beep(n>=4?880:660,.25,'triangle',.08);if(n>=4)shake=14;lines+=n;const lv=level;level=1+Math.floor(lines/10);if(level>lv)popup('NIVEL '+level,300);ui();
    if(!won&&mode===0&&score>=GOAL){won=true;end(true);return}
  }
  spawn();
}
function end(win){
  over=true;beep(win?900:110,.6,win?'triangle':'sawtooth',.08);submitScore();
  $('ovt').textContent=win?'¡OBJETIVO CONSEGUIDO!':(tu?'TIEMPO AGOTADO':'FIN DE PARTIDA');
  $('ovs').textContent='Puntuación: '+score.toLocaleString('es-ES')+(win?'':' · ¡Buen intento!');
  $('ovb').textContent=win?'Seguir jugando':'Volver a jugar';
  $('ov').style.display='flex';
  $('ovb').onclick=()=>{if(win){over=false;$('ov').style.display='none';last=performance.now();spawn()}else reset()};
}
function move(dx){if(!hit(cur,cur.x+dx,cur.y))cur.x+=dx}
function drop(){if(!hit(cur,cur.x,cur.y+1))cur.y++;else lock()}
function softDrop(){if(!hit(cur,cur.x,cur.y+1)){cur.y++;score+=1;ui()}else lock()}
function rotate(){
  const m=rot(cur.m);
  for(const k of [0,-1,1,-2,2]){if(!hit({m},cur.x+k,cur.y)){cur.m=m;cur.x+=k;beep(520,.05,'square',.03);return}}
}
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  // Accesos rápidos: espacio inicia/reinicia desde la pantalla de bienvenida;
  // Enter alterna pausa/reanudación durante la partida.
  if(e.code==='Space' && (!started || $('ov').style.display!=='none')){
    e.preventDefault();
    $('ovb').click();
    return;
  }
  if(e.key==='Enter' && started && !over){
    e.preventDefault();
    paused=!paused;
    last=performance.now();
    return;
  }
  if(e.key==='Escape'&&!over&&started){paused=!paused;last=performance.now();return}
  if(e.code==='Space'||e.key.startsWith('Arrow'))e.preventDefault();
  if(over||paused)return;
  if(e.key==='ArrowLeft')move(-1);
  else if(e.key==='ArrowRight')move(1);
  else if(e.key==='ArrowDown')softDrop();
  else if(e.key===' '||e.key==='ArrowUp'||e.key==='x'||e.key==='X')rotate();
  else return;
  e.preventDefault();
});
$('cbm').onchange=()=>{const k=+$('cbm').value;cb=k>0;if(k>0)CBPAL=CBS[k-1];$('cbm').blur()};
document.addEventListener('keyup',e=>{if(e.key===' ')e.preventDefault()});

function cell(g,x,y,id,s){cell0(g,x,y,id,s);if(id===10){g.font=(s*.7)+'px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText('💣',x+s/2,y+s/2+1)}}
function cell0(g,x,y,id,s){if(skin>0){cellSkin(g,x,y,id,s);return}
  g.fillStyle=(cb?CBPAL:NORMAL)[id];g.fillRect(x+1,y+1,s-2,s-2);
  const gr=g.createLinearGradient(x,y,x+s,y+s);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(.5,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(0,0,0,.28)');
  g.fillStyle=gr;g.fillRect(x+1,y+1,s-2,s-2);
  g.fillStyle='rgba(255,255,255,.5)';g.fillRect(x+1,y+1,s-2,3);g.fillRect(x+1,y+1,3,s-2);
  g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x+1,y+s-4,s-2,3);g.fillRect(x+s-4,y+1,3,s-2);
  g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=1;g.strokeRect(x+.5,y+.5,s-1,s-1);
  if(cb){g.fillStyle=id===8||id===3?'#000':'#111';g.font=(s*.6)+'px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(SYM[id],x+s/2,y+s/2+1)}
}
let fx=[],mute=false,AC=null;
function burst(r){grid[r].forEach((v,c)=>{if(v===null)return;for(let k=0;k<3;k++)fx.push({x:c*C+C/2,y:r*C+C/2,vx:(Math.random()-.5)*7,vy:-Math.random()*6-1,l:1,id:v})})}
function popup(t,y){fx.push({t,x:150,y,vx:0,vy:-.6,l:1.6})}
function beep(f,d,type,v){
  if(mute)return;
  try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    if(AC.state==='suspended')AC.resume();
    const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;
    o.type=type||'square';o.frequency.value=f;
    g.gain.setValueAtTime((v||.05)*3,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d);
  }catch(e){}
}
$('mu').onclick=()=>{mute=!mute;$('mu').textContent=mute?'Sonido: no':'Sonido: sí';$('mu').blur()};
const BOMB_RUN=3;
const SPD=[{f:1.5,m:.8},{f:1,m:1},{f:.7,m:1.3},{f:.3,m:1.6},{f:1,m:.8,fixed:true},{f:.15,m:2.2},{f:.08,m:3}];
const DIFF=[{base:900,m:1},{base:800,m:1.5},{base:600,m:2}];
function mult(){return 1+Math.min(streak,10)*.2}
function maxRun(row){let b=0,k=0;for(let i=0;i<row.length;i++){k=(i&&row[i]===row[i-1])?k+1:1;if(row[i]!==null&&k>b)b=k}return b}
function burstCell(r,c){const v=grid[r][c];for(let k=0;k<4;k++)fx.push({x:c*C+C/2,y:r*C+C/2,vx:(Math.random()-.5)*8,vy:-Math.random()*6-1,l:1,id:v})}
function explode(){
  let n=0;
  for(let r=cur.y-1;r<=cur.y+1;r++)for(let c=cur.x-1;c<=cur.x+1;c++){if(r>=0&&r<ROWS&&c>=0&&c<COLS&&grid[r][c]!==null){burstCell(r,c);grid[r][c]=null;n++}}
  const gain=Math.round(n*100*level*mult()*DIFF[diff].m*SPD[spd].m);score+=gain;popup('+'+gain.toLocaleString('es-ES'),200);beep(120,.4,'sawtooth',.1);shake=14;ui();
  if(!won&&mode===0&&score>=GOAL){won=true;end(true);return}
  spawn();
}
function cellSkin(g,x,y,id,s){
  g.fillStyle=(cb?CBPAL:NORMAL)[id];g.fillRect(x+1,y+1,s-2,s-2);
  g.strokeStyle='rgba(0,0,0,.35)';g.fillStyle='rgba(0,0,0,.25)';g.lineWidth=1.5;
  if(skin===2){g.beginPath();g.moveTo(x+1,y+s/2);g.lineTo(x+s-1,y+s/2);g.moveTo(x+s/2,y+1);g.lineTo(x+s/2,y+s/2);g.moveTo(x+s/4,y+s/2);g.lineTo(x+s/4,y+s-1);g.moveTo(x+3*s/4,y+s/2);g.lineTo(x+3*s/4,y+s-1);g.stroke()}
  else if(skin===3){for(let i=0;i<3;i++)for(let j=0;j<3;j++){g.beginPath();g.arc(x+s*(i+.5)/3,y+s*(j+.5)/3,1.6,0,6.3);g.fill()}}
  else if(skin===4){for(let k=6;k<s;k+=7){g.beginPath();g.moveTo(x+2,y+k);g.lineTo(x+s-2,y+k);g.stroke()}}
  g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=1;g.strokeRect(x+.5,y+.5,s-1,s-1);
  if(cb){g.fillStyle=id===8||id===3?'#000':'#111';g.font=(s*.6)+'px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(SYM[id],x+s/2,y+s/2+1)}
}
const CBS=[
  ['#E69F00','#56B4E9','#009E73','#F0E442','#0072B2','#D55E00','#CC79A7','#999999','#FFFFFF','#44AA99','#222222'],
  ['#0072B2','#F0E442','#FFFFFF','#56B4E9','#E69F00','#B79A2F','#C8D3EA','#7BA7D6','#FFF0A8','#A0A0A0','#222222'],
  ['#0072B2','#F0E442','#FFFFFF','#56B4E9','#E69F00','#C2A53A','#D3DCF0','#6FA0D8','#FFE98A','#9A9A9A','#222222'],
  ['#D55E00','#FFFFFF','#E0719A','#BBBBBB','#F4A582','#C75B7A','#E8E8E8','#C98E5A','#00A6A6','#FFB3C7','#222222']
];
function restart(){reset();paused=true;started=false;showStart()}
$('mode').onchange=()=>{mode=+$('mode').value;$('modeStatus').textContent=mode===0?'MODO CLÁSICO':'MODO CONTRARRELOJ';$('mode').blur();restart()};
$('diff').onchange=()=>{diff=+$('diff').value;$('diff').blur();restart()};
$('spd').onchange=()=>{spd=+$('spd').value;$('spd').blur();restart()};
$('skin').onchange=()=>{skin=+$('skin').value;$('skin').blur()};

const fullscreenBtn=$('fullscreenBtn');
function updateFullscreenUI(){
  const active=!!document.fullscreenElement;
  document.body.classList.toggle('fullscreen-active',active);
  fullscreenBtn.innerHTML=active?'<span class="fullscreen-icon" aria-hidden="true">⛶</span><span class="fullscreen-label">Salir de pantalla completa</span>':'<span class="fullscreen-icon" aria-hidden="true">⛶</span><span class="fullscreen-label">Pantalla completa</span>';
  fullscreenBtn.setAttribute('aria-label',active?'Salir de pantalla completa':'Activar pantalla completa');
  fullscreenBtn.title=active?'Salir de pantalla completa':'Activar pantalla completa';
}
fullscreenBtn.addEventListener('click',async()=>{
  try{
    if(!document.fullscreenElement){await document.documentElement.requestFullscreen();}
    else{await document.exitFullscreen();}
  }catch(err){
    fullscreenBtn.title='La pantalla completa no está disponible en este navegador';
    fullscreenBtn.setAttribute('aria-label','La pantalla completa no está disponible');
  }
});
document.addEventListener('fullscreenchange',updateFullscreenUI);

let DB=null,UID=null,nick='';
try{nick=localStorage.getItem('tutris-nick')||''}catch(e){}
$('nick').value=nick;$('nick').oninput=()=>{nick=$('nick').value;try{localStorage.setItem('tutris-nick',nick)}catch(e){}};
async function initDb(){
  try{
    if(typeof claude==='undefined')throw 0;
    DB=await claude.use('db');const u=await claude.use('user');UID=u?await u.id():null;
    if(!DB)throw 0;
    DB.collection('scores').orderBy('score','desc').limit(10).onSnapshot(s=>{
      const ol=$('lb');ol.textContent='';
      s.docs.forEach(d=>{const v=d.data()||{};const li=document.createElement('li');li.textContent=(v.name||'Jugador')+' · '+Number(v.score||0).toLocaleString('es-ES');if(d.id===UID)li.style.fontWeight='700';ol.appendChild(li)});
      $('lbm').textContent='Solo puntúa el modo Clásico.';
    },()=>{$('lbm').textContent='Clasificación no disponible.'});
  }catch(e){DB=null;$('lbm').textContent='Clasificación no disponible aquí.'}
}
async function submitScore(){
  if(!DB||!UID||mode!==0||score<=0)return;
  try{
    const ref=DB.collection('scores').doc(UID),old=await ref.get();
    if(!old.exists||Number(old.data().score)<score)await ref.set({name:(nick||'Jugador').slice(0,12),score,level,diff:diff,t:Date.now()});
  }catch(e){$('lbm').textContent='No se pudo guardar tu puntuación (¿tienes permiso de escritura?).'}
}
const bgm=$('bgm');let musicOn=true;bgm.volume=.4;
function playBgm(){if(musicOn)bgm.play().catch(()=>{})}
bgm.onerror=()=>{$('bm').textContent='Música: no disponible'};
$('vol').oninput=()=>{bgm.volume=$('vol').value/100};
$('bm').onclick=()=>{musicOn=!musicOn;$('bm').textContent='Música: '+(musicOn?'sí':'no');if(musicOn&&started)playBgm();else bgm.pause();$('bm').blur()};
initDb();
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume()}catch(e){}}));
function draw(){
  ctx.clearRect(0,0,300,600);
  ctx.save();if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.85;if(shake<.5)shake=0}
  ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=1;
  for(let i=1;i<COLS;i++){ctx.beginPath();ctx.moveTo(i*C+.5,0);ctx.lineTo(i*C+.5,600);ctx.stroke()}
  for(let i=1;i<ROWS;i++){ctx.beginPath();ctx.moveTo(0,i*C+.5);ctx.lineTo(300,i*C+.5);ctx.stroke()}
  grid.forEach((row,r)=>row.forEach((v,c)=>{if(v!==null)cell(ctx,c*C,r*C,v,C)}));
  if(cur&&!over){let gy=cur.y;while(!hit(cur,cur.x,gy+1))gy++;ctx.globalAlpha=.3;cur.m.forEach((row,r)=>row.forEach((v,c)=>{if(v)cell(ctx,(cur.x+c)*C,(gy+r)*C,cur.id,C)}));ctx.globalAlpha=1}
  if(cur&&!over)cur.m.forEach((row,r)=>row.forEach((v,c)=>{if(v)cell(ctx,(cur.x+c)*C,(cur.y+r)*C,cur.id,C)}));
  fx=fx.filter(p=>p.l>0);
  fx.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy;
    ctx.globalAlpha=Math.max(0,Math.min(1,p.l));
    if(p.t!==undefined){p.l-=.012;ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=6;ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.t,p.x,p.y);ctx.shadowBlur=0}
    else{p.vy+=.35;p.l-=.025;ctx.fillStyle=(cb?CBPAL:NORMAL)[p.id];ctx.fillRect(p.x-3,p.y-3,6,6)}
  });
  ctx.globalAlpha=1;
  const fa=1-(performance.now()-flashT)/350;
  if(fa>0)flash.forEach(r=>{ctx.fillStyle='rgba(255,255,255,'+(fa*.8)+')';ctx.fillRect(0,r*C,300,C)});
  if(paused&&started){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,300,600);ctx.fillStyle='#fff';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('PAUSA',150,300)}
  ctx.restore();
  nx.clearRect(0,0,120,120);
  if(nextP){const s=22,w=nextP.m[0].length*s,h=nextP.m.length*s;
    nextP.m.forEach((row,r)=>row.forEach((v,c)=>{if(v)cell(nx,(120-w)/2+c*s,(120-h)/2+r*s,nextP.id,s)}))}
}
function loop(t){
  if(!over&&!paused){
    acc+=t-last;playT+=t-last;
    if(mode===1){timeLeft-=t-last;if(timeLeft<=0){timeLeft=0;tu=true;end(false)}}
    $('clock').textContent=mode===1?Math.ceil(timeLeft/1000)+'s':'';
    const S=SPD[spd];const iv=Math.max(35,Math.round(Math.max(70,DIFF[diff].base-(S.fixed?0:(level-1)*70+Math.floor(playT/20000)*10))*S.f));
    while(acc>=iv&&!over){acc-=iv;drop()}
  }
  last=t;draw();requestAnimationFrame(loop);
}
function showStart(){
  $('modeStatus').textContent=mode===0?'MODO CLÁSICO':'MODO CONTRARRELOJ';
  $('ovt').textContent=mode===0?'Modo clásico':'Contrarreloj';
  $('ovs').textContent=mode===0?'Llega a 1.000.000 de puntos. Completa filas, encadena combos y evita que las piezas lleguen arriba.':'Tienes 2 minutos para conseguir la mayor puntuación posible. Cada fila cuenta: mantén el ritmo y aprovecha los combos.';
  $('ovhint').textContent='← → mover · ↓ bajar · Espacio / ↑ girar · Esc pausar';
  $('ovb').innerHTML='Empezar partida <span aria-hidden="true">→</span>';$('ov').style.display='flex';
  $('ovb').onclick=()=>{$('ov').style.display='none';started=true;paused=false;last=performance.now();window.focus();beep(660,.1,'triangle',.06);playBgm()};
}
const act={l:()=>move(-1),r:()=>move(1),d:()=>softDrop(),o:()=>rotate(),p:()=>{if(!over&&started){paused=!paused;last=performance.now()}}};
document.querySelectorAll('.touch button').forEach(b=>b.addEventListener('pointerdown',e=>{
  e.preventDefault();const k=b.dataset.k;
  if(k==='p'||(started&&!over&&!paused))act[k]();
}));
cv.addEventListener('pointerdown',()=>{if(started&&!over&&!paused)rotate()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){bgm.pause();if(started&&!over)paused=true}else if(started&&musicOn)playBgm()});
reset();paused=true;showStart();requestAnimationFrame(loop);
