// Shiny : le vrai tirage côté page `[F-115]`
// Wallet (Phantom, Solflare, Backpack… via le standard « Wallet Standard », sans bibliothèque),
// choix de la boule, paiement signé par le joueur, puis la machine s'ouvre sur le vrai résultat.

const BALLS = [
  { k: 'MINI', price: '0.1 SOL', big: '1 in 50', col: '#FFFFFF' },
  { k: 'MEGA', price: '0.5 SOL', big: '1 in 29', col: '#FFA4B2' },
  { k: 'GOLD', price: '1 SOL', big: '1 in 20', col: '#FFC233' },
];
const CHAIN = 'solana:mainnet';
// boule d'essai privée : seulement avec le lien ?test=<clé> (le serveur vérifie la clé)
const TEST_KEY = new URLSearchParams(location.search).get('test');
if (TEST_KEY) BALLS.unshift({ k: 'TEST', price: '0.01 SOL', big: '1 in 50', col: '#4FB3FF' });

// ---------- wallets (Wallet Standard)
const wallets = [];
const reg = { register: (...ws) => { ws.forEach((w) => { if (!wallets.includes(w)) wallets.push(w); }); render(); return () => {}; } };
window.addEventListener('wallet-standard:register-wallet', (e) => { try { e.detail(reg); } catch {} });
window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: reg }));
const usable = () => wallets.filter((w) => w.features && w.features['standard:connect'] && w.features['solana:signAndSendTransaction'] && (w.chains || []).some((c) => c.startsWith('solana:')));

let wallet = null, account = null, ball = TEST_KEY ? 'TEST' : 'MINI', busy = false, msg = '';

// ---------- base58 (signature de la transaction → texte)
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(bytes) {
  let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b);
  let out = ''; while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n; }
  for (const b of bytes) { if (b === 0) out = '1' + out; else break; }
  return out;
}
const short = (a) => a.slice(0, 4) + '…' + a.slice(-4);
// ce que les wallets fournissent (nom, icône) est échappé avant d'aller dans la page
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- la fenêtre d'achat
const css = `
.sh-back{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:18px;background:rgba(11,42,60,.45);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .2s}
.sh-back.on{opacity:1;pointer-events:auto}
.sh{position:relative;width:min(460px,100%);max-height:calc(100vh - 36px);overflow:auto;padding:26px 24px 22px;border:3.5px solid var(--ink);border-radius:26px;background:var(--cream);box-shadow:7px 8px 0 var(--ink);transform:translateY(20px) scale(.96);transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
.sh-back.on .sh{transform:none}
.sh h3{margin:0 0 4px;font:400 34px/1 'Luckiest Guy';color:#fff;-webkit-text-stroke:5px var(--ink);paint-order:stroke fill;text-shadow:0 4px 0 var(--ink)}
.sh .lead2{margin:0 0 16px;font:600 14px/1.4 Poppins}
.sh-x{position:absolute;top:12px;right:12px;width:38px;height:38px;border:3px solid var(--ink);border-radius:50%;background:#fff;font:700 18px/1 Poppins;cursor:pointer;box-shadow:2px 3px 0 var(--ink)}
.sh-balls{display:grid;grid-template-columns:repeat(var(--n,3),1fr);gap:10px;margin-bottom:16px}
.sh-ball{padding:12px 6px 10px;border:3px solid var(--ink);border-radius:18px;background:#fff;cursor:pointer;text-align:center;box-shadow:3px 4px 0 var(--ink);transition:transform .15s}
.sh-ball:hover{transform:translateY(-2px)}
.sh-ball[aria-pressed=true]{background:var(--sun);transform:translateY(-3px) rotate(-2deg)}
.sh-ball i{display:block;width:34px;height:34px;margin:0 auto 6px;border:3px solid var(--ink);border-radius:50%;background:linear-gradient(var(--c) 50%,#fff 50%)}
.sh-ball b{display:block;font:400 18px/1 'Luckiest Guy'}
.sh-ball span{display:block;margin-top:3px;font:700 13px Poppins}
.sh-ball small{display:block;margin-top:4px;font:600 11px Poppins;opacity:.75}
.sh-w{display:grid;gap:8px;margin-bottom:14px}
.sh-wbtn{display:flex;align-items:center;gap:10px;padding:10px 14px;border:3px solid var(--ink);border-radius:16px;background:#fff;font:700 15px Poppins;cursor:pointer;box-shadow:2px 3px 0 var(--ink)}
.sh-wbtn img{width:26px;height:26px;border-radius:7px}
.sh-acct{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;margin-bottom:14px;border:3px dashed var(--ink);border-radius:16px;font:600 14px Poppins}
.sh-acct button{border:0;background:none;font:700 13px Poppins;text-decoration:underline;cursor:pointer}
.sh-go{width:100%;justify-content:center}
.sh-go[disabled]{opacity:.6;cursor:wait}
.sh-msg{min-height:18px;margin:10px 0 0;font:600 13px/1.4 Poppins;color:#B4235A}
.sh-fine{margin:12px 0 0;font:500 11.5px/1.5 Poppins;opacity:.75}
.sh-none{padding:12px 14px;margin-bottom:14px;border:3px solid var(--ink);border-radius:16px;background:#fff;font:600 14px/1.5 Poppins}
.sh-none a{color:var(--ink)}
`;
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));
const back = Object.assign(document.createElement('div'), { className: 'sh-back' });
back.innerHTML = '<div class="sh" role="dialog" aria-modal="true" aria-labelledby="shT"></div>';
document.body.appendChild(back);
const sheet = back.firstChild;

function render() {
  if (!sheet) return;
  const ws = usable();
  const balls = BALLS.map((b) => `<button class="sh-ball" type="button" data-b="${b.k}" aria-pressed="${b.k === ball}" style="--c:${b.col}"><i></i><b>${b.k}</b><span>${b.price}</span><small>x5+ ${b.big}</small></button>`).join('');
  let walletPart;
  if (account) walletPart = `<div class="sh-acct"><span>${wallet.icon ? `<img alt="" src="${esc(wallet.icon)}" style="width:20px;height:20px;border-radius:5px;vertical-align:-4px;margin-right:6px">` : ''}${short(account.address)}</span><button type="button" data-a="switch">Switch</button></div>`;
  else if (ws.length) walletPart = `<div class="sh-w">${ws.map((w, i) => `<button class="sh-wbtn" type="button" data-w="${i}">${w.icon ? `<img alt="" src="${esc(w.icon)}">` : ''}Connect ${esc(w.name)}</button>`).join('')}</div>`;
  else walletPart = `<div class="sh-none">No Solana wallet found in this browser. Install <a href="https://phantom.com" target="_blank" rel="noopener">Phantom</a>, <a href="https://solflare.com" target="_blank" rel="noopener">Solflare</a> or <a href="https://backpack.app" target="_blank" rel="noopener">Backpack</a>, then reload.</div>`;
  const price = BALLS.find((b) => b.k === ball).price;
  sheet.innerHTML = `<button class="sh-x" type="button" data-a="close" aria-label="Close">✕</button>
    <h3 id="shT">Pick your ball</h3><p class="lead2">Five real memecoins inside, bought the second it pops.</p>
    <div class="sh-balls" style="--n:${BALLS.length}">${balls}</div>${walletPart}
    <button class="btn btn-main sh-go" type="button" data-a="pay" ${!account || busy ? 'disabled' : ''}>${busy ? 'Check your wallet…' : `Pop it! · ${price}`}</button>
    <p class="sh-msg" aria-live="polite">${msg}</p>
    <p class="sh-fine">18+ only. Memecoins are volatile: your tokens can be worth less than you paid. Odds and every draw are public. Not financial advice.</p>`;
}

function open() {
  if (window.__machine && window.__machine.busy()) return;
  msg = ''; render(); back.classList.add('on');
  setTimeout(() => sheet.querySelector('.sh-ball[aria-pressed=true]')?.focus(), 50);
}
const close = () => { if (!busy) back.classList.remove('on'); };
back.addEventListener('click', (e) => { if (e.target === back) close(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

sheet.addEventListener('click', async (e) => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.b) { ball = t.dataset.b; render(); return; }
  if (t.dataset.a === 'close') return close();
  if (t.dataset.a === 'switch') { account = null; wallet = null; render(); return; }
  if (t.dataset.w) return connect(usable()[Number(t.dataset.w)]);
  if (t.dataset.a === 'pay') return pay();
});

async function connect(w) {
  msg = '';
  try {
    const { accounts } = await w.features['standard:connect'].connect();
    const acc = (accounts || w.accounts || []).find((a) => (a.chains || []).some((c) => c.startsWith('solana:'))) || (accounts || [])[0];
    if (!acc) throw new Error('No account');
    wallet = w; account = acc;
  } catch (err) { msg = 'Wallet connection was cancelled.'; }
  render();
}

const api = async (url, body) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Server error');
  return j;
};

async function pay() {
  if (busy || !account) return;
  busy = true; msg = ''; render();
  let round, signature;
  try {
    round = await api('/api/round', { ball, player: account.address, testKey: TEST_KEY || undefined });
    const bytes = Uint8Array.from(atob(round.transaction), (c) => c.charCodeAt(0));
    const [out] = await wallet.features['solana:signAndSendTransaction'].signAndSendTransaction({ account, chain: CHAIN, transaction: bytes });
    signature = b58(out.signature);
  } catch (err) {
    busy = false;
    msg = /reject|denied|cancel/i.test(String(err && err.message)) ? 'You cancelled the payment. Nothing was sent.' : (err && err.message) || 'Something went wrong. Nothing was sent.';
    render();
    return;
  }
  busy = false; back.classList.remove('on');
  // le paiement est parti : la manivelle tourne tout de suite, la boule s'ouvre quand le serveur a fait le tirage
  const result = api(`/api/round/${round.id}/paid`, { signature }).then((r) => {
    if (r.status === 'failed') throw new Error(r.error || 'Something went wrong on our side.');
    const sol = (x) => (Math.round(x * 1000) / 1000).toString();
    return {
      n: r.rarity, m: r.mult,
      sub: r.simulated ? `Test mode: ${sol(r.value)} SOL of tokens, not bought for real.` : `${sol(r.value)} SOL in ${r.buys.filter((b) => b.tx).length} tokens sent to your wallet${r.refunded ? ` (+${sol(r.refunded)} SOL back)` : ''}.`,
      link: r.simulated ? `/api/round/${r.id}` : `https://solscan.io/account/${account.address}#portfolio`,
    };
  });
  window.__machine.play(result);
}

// ---------- les boutons d'achat de la page ouvrent la fenêtre
window.__onTurn = open;
document.querySelectorAll('a[href="#capsules"].btn-dark, .final .btn, .tier .btn').forEach((el) => {
  el.addEventListener('click', (e) => { e.preventDefault(); const k = el.closest('.tier')?.querySelector('h3')?.textContent.trim().toUpperCase(); if (k && BALLS.some((b) => b.k === k)) ball = k; open(); });
});
document.querySelectorAll('.tier .btn').forEach((el) => { el.textContent = 'Pop one'; });
render();
