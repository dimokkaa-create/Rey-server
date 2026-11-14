const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const CHAT_ID = process.env.CHAT_ID || '';
const PANEL_PASS = '1234';

const links = new Map();
const uid = () => crypto.randomBytes(4).toString('hex');
const esc = s => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function notify(text) {
    if (!BOT_TOKEN || !CHAT_ID) return;
    const https = require('https');
    const data = JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' });
    const req = https.request(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    });
    req.write(data); req.end();
}

const server = http.createServer((req, res) => {
    const u = req.url.split('?')[0];

    if (u === '/api/login' && req.method === 'POST') {
        let b=''; req.on('data',c=>b+=c); req.on('end',()=>{
            let d={}; try{d=JSON.parse(b)}catch(e){}
            if(d.pass === PANEL_PASS) {
                res.writeHead(200, {'Set-Cookie':'rey_auth=ok; Path=/', 'Content-Type':'application/json'});
                res.end('{"ok":true}');
            } else { res.writeHead(401); res.end('{"ok":false}'); }
        }); return;
    }

    if (u.startsWith('/hit/') && req.method === 'POST') {
        let b=''; req.on('data',c=>b+=c); req.on('end',()=>{
            let d={}; try{d=JSON.parse(b)}catch(e){}
            const id = u.slice(5);
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            if(links.has(id)) links.get(id).hits.push({...d, ip, time: new Date().toLocaleString('ru-RU')});
            notify(`Визит!\nIP: ${ip}\nUA: ${d.ua||'?'}`);
            res.end('{"ok":true}');
        }); return;
    }

    if (!(req.headers.cookie || '').includes('rey_auth=ok') && !u.startsWith('/l/')) {
        if (u === '/login') { 
            res.writeHead(200, {'Content-Type':'text/html'}); 
            return res.end(`<body style="background:#0a0a0f;color:#fff;text-align:center;padding:50px;font-family:sans-serif"><h2>Вход</h2><input id="p" type="password" style="padding:10px"><button onclick="fetch('/api/login',{method:'POST',body:JSON.stringify({pass:document.getElementById('p').value})}).then(r=>{if(r.ok)location.href='/'})">Войти</button></body>`); 
        }
        res.writeHead(302, {'Location':'/login'}); return res.end();
    }

    if (u === '/' || u === '/panel') {
        res.writeHead(200, {'Content-Type':'text/html'});
        return res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rey</title>
        <style>body{background:#0a0a0f;color:#fff;font-family:sans-serif;padding:20px;max-width:600px;margin:auto}
        input{width:100%;padding:10px;margin:5px 0;background:#111;border:1px solid #333;color:#fff;box-sizing:border-box}
        button{padding:10px 20px;background:#7c5cff;color:#fff;border:none;border-radius:5px;margin-top:10px;width:100%}
        .card{background:#111;padding:15px;border-radius:10px;margin-bottom:15px}</style></head><body>
        <h2>Панель</h2>
        <div class="card">
            <input id="t" placeholder="Заголовок" value="Привет">
            <input id="b" placeholder="Кнопка" value="Открыть">
            <button onclick="create()">Создать ссылку</button>
        </div>
        <div id="list"></div>
        <script>
        async function create(){
            const t = document.getElementById('t').value;
            const b = document.getElementById('b').value;
            const r = await fetch('/api/links', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({title: t, btn: b})
            });
            if(r.ok) { location.reload(); } else { alert('Не вышло'); }
        }
        async function load(){
            const r = await fetch('/api/links');
            const links = await r.json();
            document.getElementById('list').innerHTML = links.map(l=>{
                const url = location.origin + '/l/' + l.id;
                return '<div class="card"><b>'+l.title+'</b><br><a href="'+url+'" style="color:#00d9a3" target="_blank">'+url+'</a><br><button onclick="navigator.clipboard.writeText(\''+url+'\')">Скопировать</button><div style="margin-top:10px;font-size:12px;color:#888">Визитов: '+l.hits.length+'</div></div>'
            }).join('');
        }
        load();
        </script></body></html>`);
    }

    if (u.startsWith('/l/')) {
        const id = u.slice(3);
        const link = links.get(id);
        if(!link){res.writeHead(404);return res.end('404')}
        res.writeHead(200, {'Content-Type':'text/html'});
        return res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(link.title)}</title>
        <style>body{background:#0a0a0f;color:#fff;text-align:center;padding:50px;font-family:sans-serif}button{padding:15px 30px;background:#7c5cff;color:#fff;border:none;border-radius:10px;margin-top:20px}</style></head><body>
        <h1>${esc(link.title)}</h1><p>Нажми кнопку ниже</p><button onclick="go()">${esc(link.btn)}</button>
        <script>function go(){const d={ua:navigator.userAgent,screen:screen.width+'x'+screen.height};fetch('/hit/${link.id}',{method:'POST',body:JSON.stringify(d)}).then(()=>document.body.innerHTML='<h1>Спасибо</h1>')}</script></body></html>`);
    }

    if (u === '/api/links' && req.method === 'POST') {
        let b=''; req.on('data',c=>b+=c); req.on('end',()=>{
            let d={}; try{d=JSON.parse(b)}catch(e){}
            const id = uid(); 
            links.set(id, {id, title: d.title || 'Ссылка', btn: d.btn || 'Открыть', hits: []});
            res.writeHead(200, {'Content-Type':'application/json'}); 
            res.end('{"ok":true}');
        }); return;
    }

    if (u === '/api/links' && req.method === 'GET') {
        res.writeHead(200, {'Content-Type':'application/json'});
        return res.end(JSON.stringify([...links.values()]));
    }

    res.writeHead(404); res.end('404');
});

server.listen(PORT, () => console.log('REY STARTED ON PORT ' + PORT));
