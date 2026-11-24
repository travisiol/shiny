// Shiny : le vrai tirage côté page `[F-115]`
// Wallet (Phantom, Solflare, Backpack… via le standard « Wallet Standard », sans bibliothèque),
// choix de la boule, paiement signé par le joueur, puis la machine s'ouvre sur le vrai résultat.

const BALLS = [
  { k: 'MINI', price: '0.1 SOL', big: '1 in 50', col: '#FFFFFF' },
  { k: 'MEGA', price: '0.5 SOL', big: '1 in 29', col: '#FFA4B2' },
  { k: 'GOLD', price: '1 SOL', big: '1 in 20', col: '#FFC233' },
];
const CHAIN = 'solana:mainnet';

// ---------- wallets (Wallet Standard)
const wallets = [];
const reg = { register: (...ws) => { ws.forEach((w) => { if (!wallets.includes(w)) wallets.push(w); }); render(); return () => {}; } };
window.addEventListener('wallet-standard:register-wallet', (e) => { try { e.detail(reg); } catch {} });
window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: reg }));
const usable = () => wallets.filter((w) => w.features && w.features['standard:connect'] && w.features['solana:signAndSendTransaction'] && (w.chains || []).some((c) => c.startsWith('solana:')));

let wallet = null, account = null, ball = 'MINI', busy = false, msg = '';

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
  if (pendingRetry) { const p = pendingRetry; pendingRetry = null; window.__machine.play(deliver(p.id, p.signature)); return; }
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
    round = await api('/api/round', { ball, player: account.address });
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
  // le paiement est parti : l'adresse garde le numéro du tirage (recharger la page reprend ce tirage) `[F-122]`
  const u = new URL(location.href); u.searchParams.set('r', round.id); history.replaceState(null, '', u);
  // la manivelle tourne tout de suite, la boule s'ouvre quand le serveur a fait le tirage et livré les tokens
  window.__machine.play(deliver(round.id, signature));
}

// ---------- livraison d'un tirage payé (premier envoi, reprise, ou nouvel essai après une panne)
// La boule s'ouvre dès que le tirage est fait ; une carte « Delivering your tokens » suit la livraison en direct `[F-123]`
const GET = async (url) => { const r = await fetch(url, { cache: 'no-store' }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Server error'); return j; };
const sol = (x) => (Math.round(x * 10000) / 10000).toString();
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
let pendingRetry = null;

function toResult(r) {
  const got = (r.buys || []).filter((b) => b.tx).length;
  let sub;
  if (r.simulated) sub = `Test mode: ${sol(r.value)} SOL of tokens, not bought for real.`;
  else if (r.status !== 'done') sub = `${sol(r.value)} SOL of tokens on the way to your wallet.`;
  else if (got) sub = `${sol(r.value)} SOL in ${got} tokens sent to your wallet${r.refunded ? ` (+${sol(r.refunded)} SOL back)` : ''}.`;
  else sub = `${sol(r.refunded || r.value)} SOL sent back to your wallet.`;
  return { n: r.rarity, m: r.mult, sub, link: r.simulated ? `/api/round/${r.id}` : `https://solscan.io/account/${r.player}#portfolio` };
}

// ----- la carte de livraison
const dlCss = `
.dl{position:fixed;left:50%;bottom:20px;z-index:70;width:min(460px,calc(100% - 24px));padding:16px 18px 14px;border:3.5px solid var(--ink);border-radius:24px;background:var(--cream);box-shadow:6px 7px 0 var(--ink);transform:translate(-50%,150%);transition:transform .45s cubic-bezier(.3,1.5,.5,1)}
.dl.on{transform:translate(-50%,0)}
@media (min-width:900px){.dl{left:24px;bottom:24px;transform:translateX(-130%)}.dl.on{transform:none}}
.dl-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.dl-top b{font:400 21px/1 'Luckiest Guy';letter-spacing:.01em}
.dl-pct{font:800 15px Poppins}
.dl-x{width:30px;height:30px;border:2.5px solid var(--ink);border-radius:50%;background:#fff;font:700 13px/1 Poppins;cursor:pointer;margin-left:6px}
.dl-bar{height:18px;margin:12px 0 14px;border:3px solid var(--ink);border-radius:99px;background:#fff;overflow:hidden}
.dl-bar i{display:block;height:100%;width:0;border-right:3px solid var(--ink);background:repeating-linear-gradient(-45deg,#FFD23F 0 10px,#FFC233 10px 20px);background-size:28px 28px;animation:dlStripes .8s linear infinite;transition:width .5s ease-out}
.dl.done .dl-bar i{background:#7CD992;animation:none;border-right:0}
@keyframes dlStripes{to{background-position:28px 0}}
.dl-toks{display:flex;justify-content:space-around;gap:6px}
.dl-t{position:relative;flex:0 0 auto;width:54px;height:54px;border:3px solid var(--ink);border-radius:50%;background:#fff;opacity:.4;filter:grayscale(1);transition:opacity .3s,filter .3s,transform .3s}
.dl-t img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
.dl-t.busy{opacity:.75;animation:dlBob 1s ease-in-out infinite}
.dl-t.busy:nth-child(2){animation-delay:-.2s}.dl-t.busy:nth-child(3){animation-delay:-.4s}.dl-t.busy:nth-child(4){animation-delay:-.6s}.dl-t.busy:nth-child(5){animation-delay:-.8s}
@keyframes dlBob{50%{transform:translateY(-5px)}}
.dl-t.ok{opacity:1;filter:none;animation:dlPop .5s cubic-bezier(.3,1.8,.5,1)}
@keyframes dlPop{0%{transform:scale(.6)}100%{transform:scale(1)}}
.dl-t em{position:absolute;right:-6px;bottom:-5px;display:none;width:24px;height:24px;border:3px solid var(--ink);border-radius:50%;font:800 12px/18px Poppins;font-style:normal;text-align:center;color:#fff}
.dl-t.ok em{display:block;background:#2BB673}
.dl-t.err{opacity:.6;filter:grayscale(1)}.dl-t.err em{display:block;background:#E5484D}
.dl-t small{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:3px;font:700 10px Poppins;white-space:nowrap}
.dl-msg{margin:24px 0 0;font:600 14px/1.4 Poppins;text-align:center}
.dl-act{display:flex;justify-content:center;gap:10px;margin-top:10px}
.dl-act[hidden]{display:none}
.dl-act a{font:700 14px Poppins;color:var(--ink)}
`;
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: dlCss }));
const dl = Object.assign(document.createElement('div'), { className: 'dl', role: 'status' });
dl.setAttribute('aria-live', 'polite');
document.body.appendChild(dl);
const TOK_IMG = Object.fromEntries((window.__TOKENS || []).map((t) => [t.sym, t.img]));
let dlShown = 0, dlTarget = 0, dlCap = 0, dlTimer = 0;
// le centre de chaque logo, en % de la barre : un logo passe au vert quand la barre l'atteint `[F-124]`
function dlCenters() {
  const bar = dl.querySelector('.dl-bar').getBoundingClientRect();
  return [...dl.querySelectorAll('.dl-t')].map((el) => { const r = el.getBoundingClientRect(); return ((r.left + r.width / 2 - bar.left) / bar.width) * 100; });
}
function dlPaint() {
  dlShown += Math.max(0, Math.min(dlCap, Math.max(dlTarget, dlShown + (dlCap - dlShown) * 0.03)) - dlShown);
  dl.querySelector('.dl-bar i').style.width = dlShown.toFixed(1) + '%';
  dl.querySelector('.dl-pct').textContent = Math.round(dlShown) + '%';
  const c = dlCenters();
  dl.querySelectorAll('.dl-t').forEach((el, i) => {
    if (!el.dataset.got || el.classList.contains('ok') || el.classList.contains('err') || dlShown < c[i] - 0.5) return;
    el.classList.remove('busy');
    if (el.dataset.got === 'err') { el.classList.add('err'); el.querySelector('em').textContent = '!'; }
    else { el.classList.add('ok'); window.SFX && SFX.play('clink'); }
  });
}
function dlSet(target, cap) { dlTarget = Math.max(dlTarget, target); dlCap = Math.max(dlTarget, cap); if (!dlTimer) dlTimer = setInterval(dlPaint, 120); dlPaint(); }
function dlOpen(syms) {
  dl.className = 'dl';
  dl.innerHTML = `<div class="dl-top"><b>Delivering your tokens</b><span><span class="dl-pct">0%</span><button class="dl-x" type="button" aria-label="Hide">✕</button></span></div>
    <div class="dl-bar"><i></i></div>
    <div class="dl-toks">${syms.map((s) => `<span class="dl-t" data-s="${s}">${TOK_IMG[s] ? `<img alt="" src="${TOK_IMG[s]}">` : ''}<em>✓</em><small>${s}</small></span>`).join('')}</div>
    <p class="dl-msg">Finding your payment on Solana…</p>
    <div class="dl-act" hidden></div>`;
  dl.querySelector('.dl-x').onclick = () => dl.classList.remove('on');
  dlShown = 0; dlTarget = 0; dlCap = 0; clearInterval(dlTimer); dlTimer = 0; resolved = [];
  requestAnimationFrame(() => dl.classList.add('on'));
  dlSet(1, 4);
}
const dlMsg = (t) => { dl.querySelector('.dl-msg').textContent = t; };
let resolved = []; // tokens arrivés (ou en échec), dans l'ordre d'arrivée
function dlUpdate(r) {
  const buys = r.buys || [];
  buys.forEach((b) => { if ((b.tx || b.error) && !resolved.includes(b.sym)) resolved.push(b.sym); });
  // les tokens arrivés glissent à gauche, dans l'ordre d'arrivée : la barre les atteint l'un après l'autre
  const box = dl.querySelector('.dl-toks');
  const els = [...box.querySelectorAll('.dl-t')];
  [...resolved, ...els.map((e) => e.dataset.s).filter((s) => !resolved.includes(s))].forEach((sym) => { const el = els.find((e) => e.dataset.s === sym); if (el) box.appendChild(el); });
  els.forEach((el) => {
    const b = buys.find((x) => x.sym === el.dataset.s);
    if (b && (b.tx || b.error)) el.dataset.got = b.tx ? 'ok' : 'err';
    el.classList.toggle('busy', r.stage === 'buying' && !!b && !b.tx && !b.error);
  });
  const c = dlCenters(), n = resolved.length, first = c[0] - 4;
  if (r.status === 'open') { dlMsg('Finding your payment on Solana…'); dlSet(1, 4); return; }
  if (r.status === 'paid') {
    if (r.stage === 'buying') { dlMsg(`Buying your tokens… ${buys.filter((b) => b.tx).length}/${buys.length || 5} in your wallet`); dlSet(n ? c[n - 1] : first, n < c.length ? c[n] - 3 : c[c.length - 1]); }
    else if (r.stage === 'refunding') { dlMsg('Sending the rest back to you in SOL…'); dlSet(n ? c[n - 1] : first, 97); }
    else { dlMsg('Payment confirmed. Opening your token accounts…'); dlSet(4, first); }
  }
}
function dlDone(r) {
  dlUpdate(r);
  const ok = (r.buys || []).filter((b) => b.tx).length;
  dlSet(100, 100); dl.classList.add('done');
  dl.querySelector('.dl-top b').textContent = r.simulated ? 'Test mode' : 'Delivered!';
  dlMsg(r.simulated ? 'Test mode: nothing was bought for real.'
    : ok === 5 ? 'All 5 tokens are in your wallet!'
    : ok ? `${ok} tokens are in your wallet, plus ${sol(r.refunded || 0)} SOL back.`
    : `${sol(r.refunded || r.value)} SOL sent back to your wallet.`);
  const act = dl.querySelector('.dl-act');
  act.innerHTML = r.simulated ? '' : `<a href="https://solscan.io/account/${r.player}#portfolio" target="_blank" rel="noopener">See them on Solscan ↗</a>`;
  act.hidden = r.simulated;
  const ps = document.getElementById('pullSub'); // l'étiquette de la machine passe aussi au résultat final
  if (ps && !ps.hidden) ps.textContent = toResult(r).sub;
}
function dlFail(msg, canRetry) {
  dl.querySelector('.dl-top b').textContent = 'Almost there';
  dlMsg(msg);
  const act = dl.querySelector('.dl-act');
  act.innerHTML = canRetry ? '<button class="btn btn-main sm" type="button">Try again</button>' : '';
  act.hidden = !canRetry;
  const b = act.querySelector('button');
  if (b) b.onclick = () => { const p = pendingRetry; pendingRetry = null; if (p) deliver(p.id, p.signature, true); };
}

/**
 * Lance (ou reprend) la livraison et la suit. Renvoie la promesse du résultat pour la machine :
 * elle se résout dès que le tirage est fait (la boule s'ouvre), la carte continue jusqu'à la fin.
 */
function deliver(id, signature, alreadyPopped = false) {
  dlOpen(['BONK', 'WIF', 'PENGU', 'POPCAT', 'FARTCOIN']);
  let popped = alreadyPopped, finished = false, popOk, popNo;
  const pop = new Promise((a, b) => { popOk = a; popNo = b; });
  const onRound = (r) => {
    if (finished || !r || !r.status) return;
    if (r.buys && r.buys.length) {
      const order = r.buys.map((b) => b.sym);
      const box = dl.querySelector('.dl-toks'); // même ordre que les achats du serveur
      order.forEach((sym) => { const el = box.querySelector(`[data-s="${sym}"]`); if (el) box.appendChild(el); });
    }
    dlUpdate(r);
    if (!popped && r.rarity && r.status !== 'open' && r.status !== 'failed') { popped = true; popOk(toResult(r)); }
    if (r.status === 'done') { finished = true; dlDone(r); pendingRetry = null; }
    if (r.status === 'failed') {
      finished = true; pendingRetry = { id, signature };
      dlFail('Delivery hit a snag. Your payment is safe: tap Try again to finish it.', true);
      if (!popped) { popped = true; popNo(new Error('Delivery hit a snag. Your payment is safe: tap Try again to finish it.')); }
    }
  };
  api(`/api/round/${id}/paid`, { signature }).then(onRound).catch((e) => {
    // refus net avant le tirage (paiement introuvable, déjà utilisé…) : on s'arrête là
    if (!popped && !/Server error/.test(e.message)) { finished = true; dlFail(e.message, false); popped = true; popNo(e); }
  });
  (async () => {
    const t0 = Date.now();
    while (!finished && Date.now() - t0 < 150000) {
      await wait(1500);
      try { onRound(await GET(`/api/round/${id}`)); } catch {}
    }
    if (!finished) {
      finished = true; pendingRetry = { id, signature };
      dlFail('Still working on it. Your payment is safe: tap Try again in a minute.', true);
      if (!popped) { popped = true; popNo(new Error('Still working on it. Your payment is safe: tap Try again in a minute.')); }
    }
  })();
  return pop;
}

// reprise : page ouverte avec ?r=<tirage> (après un rechargement, ou depuis un lien)
async function resume(id) {
  let r;
  try { r = await GET(`/api/round/${id}`); } catch { return; }
  if (r.status === 'open') return; // jamais payé : rien à reprendre
  for (let i = 0; !window.__machine && i < 50; i++) await wait(200);
  if (!window.__machine) return;
  if (r.status === 'done') { window.__machine.play(Promise.resolve(toResult(r))); dlOpen((r.buys || []).map((b) => b.sym)); dlDone(r); return; }
  window.__machine.play(deliver(id, r.signature));
}
const RID = new URLSearchParams(location.search).get('r');
if (RID) setTimeout(() => resume(RID), 1200);

// ---------- les boutons d'achat de la page ouvrent la fenêtre
window.__onTurn = open;
document.querySelectorAll('a[href="#capsules"].btn-dark, .final .btn, .tier .btn').forEach((el) => {
  el.addEventListener('click', (e) => { e.preventDefault(); const k = el.closest('.tier')?.querySelector('h3')?.textContent.trim().toUpperCase(); if (k && BALLS.some((b) => b.k === k)) ball = k; open(); });
});
document.querySelectorAll('.tier .btn').forEach((el) => { el.textContent = 'Pop one'; });
render();
