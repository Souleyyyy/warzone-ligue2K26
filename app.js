// ── WARZONE LEAGUE 2025 — APP ────────────────────────────────────────────────
const App = (() => {
  const PASS = 'warzone2025';
  let adminOk  = sessionStorage.getItem('wz_ok') === '1';
  let curPage  = 'home';
  let activeTab = 'import';

  // ── ROUTING ────────────────────────────────────────────────────────────────
  function go(page, e) {
    if (e) e.preventDefault();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('[data-page]').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    const el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');
    curPage = page;
    window.scrollTo(0,0);
    closeMobileMenu();
    render(page);
  }

  // ── TOAST ──────────────────────────────────────────────────────────────────
  function toast(msg, type='ok') {
    const c = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3600);
  }

  // ── MOBILE MENU ────────────────────────────────────────────────────────────
  function toggleMobileMenu() {
    document.querySelector('.nav-mobile')?.classList.toggle('open');
  }
  function closeMobileMenu() {
    document.querySelector('.nav-mobile')?.classList.remove('open');
  }

  // ── AVATAR HTML ────────────────────────────────────────────────────────────
  function avatar(name, cls='', size=38) {
    const photo = WZ.getPhoto(name);
    const init  = name.charAt(0).toUpperCase();
    const img   = photo ? `<img src="${photo}" alt="${name}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:50%">` : init;
    return `<div class="${cls}" style="width:${size}px;height:${size}px">${img}</div>`;
  }

  // ── RENDER HOME ────────────────────────────────────────────────────────────
  function renderHome() {
    const stats = WZ.getStats();
    const top3  = stats.slice(0,3);
    const next  = WZ.getNextJournee();
    const total = WZ.getTotalPartiesJouees();
    const logo  = WZ.getLogo();

    // Logo / tag
    const logoEl = document.getElementById('hero-logo-container');
    if (logoEl) {
      logoEl.innerHTML = logo
        ? `<img src="${logo}" alt="Warzone League" style="max-height:100px;max-width:280px;object-fit:contain">`
        : `<div class="hero-tag"><div class="hero-tag-pulse"></div>WARZONE LEAGUE 2025</div>`;
    }

    // Hero BG
    const heroBg = document.getElementById('hero-bg');
    if (heroBg) {
      if (logo) { heroBg.className = 'hero-bg-media'; heroBg.style.backgroundImage = `url(${logo})`; }
      else { heroBg.className = ''; heroBg.style.backgroundImage = ''; }
    }

    // Stats
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set('hs-parties', total);
    set('hs-joueurs', WZ.NAMES.length);
    set('hs-leader',  stats[0]?.name.toUpperCase() || '—');
    set('hs-pts',     stats[0]?.total || '0');

    // Podium
    const podEl = document.getElementById('podium-list');
    if (podEl) {
      const medals = ['🥇','🥈','🥉'];
      const cls    = ['r1','r2','r3'];
      podEl.innerHTML = top3.length
        ? top3.map((p,i) => `
            <div class="podium-row ${cls[i]}">
              <div class="pod-medal">${medals[i]}</div>
              ${avatar(p.name, `pod-avatar${i===0?' r1':i===1?' r2':' r3'}`, 38)}
              <div>
                <div class="pod-name">${p.name}</div>
                <div class="pod-info">${p.kills} kills · ${p.partiesJouees} parties</div>
              </div>
              <div class="pod-pts">${p.total}</div>
            </div>`).join('')
        : `<div style="color:var(--text2);font-size:14px;padding:12px 0">Aucune partie jouée pour le moment</div>`;
    }

    // Next game
    const ngEl = document.getElementById('next-content');
    if (ngEl) {
      if (next) {
        const partieHTML = (lbl, grp) => {
          const names = grp.map(n => WZ.TOP3.has(n) ? `<span class="top3-name">${n}</span>` : n).join(' · ');
          return `<div class="npart"><div class="npart-lbl">${lbl}</div><div class="npart-names">${names}</div></div>`;
        };
        ngEl.innerHTML = `
          <div class="next-num">JOURNÉE ${next.j}</div>
          <div class="next-exempt">Exempté : <span>${next.exempt}</span></div>
          <div class="next-parties">
            ${partieHTML('A', next.g1)}
            ${partieHTML('B', next.g2)}
            ${partieHTML('C', next.g3)}
          </div>`;
      } else {
        ngEl.innerHTML = `<div style="color:var(--text2);font-size:14px;padding:14px 0">🏆 Toutes les journées sont terminées !</div>`;
      }
    }
  }

  // ── RENDER CLASSEMENT ──────────────────────────────────────────────────────
  function renderClassement() {
    const stats  = WZ.getStats();
    const maxPts = Math.max(1, stats[0]?.total || 1);
    const rows   = document.getElementById('rank-rows');
    if (!rows) return;

    const total = WZ.getTotalPartiesJouees();
    const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    set('cl-parties', total); set('cl-leader', stats[0]?.name||'—');
    set('cl-kills', stats[0]?.kills||0); set('cl-pts', stats[0]?.total||0);

    const cls  = (i) => i===0?'g1':i===1?'g2':i===2?'g3':'';
    const meds = ['🥇','🥈','🥉'];
    const badg = (i) => i<6?'<span class="badge badge-q">Qualifié</span>':i<8?'<span class="badge badge-p">Play-In</span>':'<span class="badge badge-m">Master PI</span>';

    rows.innerHTML = stats.map((p,i) => {
      const pct  = Math.round(p.total / maxPts * 100);
      const sanc = p.sanction !== 0 ? `<span style="font-family:var(--font-mono);font-size:11px;color:var(--red);margin-left:5px">(${p.sanction>0?'+':''}${p.sanction})</span>` : '';
      const photo = WZ.getPhoto(p.name);
      const avInner = photo ? `<img src="${photo}" alt="${p.name}">` : p.name.charAt(0);
      return `
        <div class="rank-row ${cls(i)} fu" style="animation-delay:${i*.035}s">
          <div class="rc rc-rank">${i<3?meds[i]:i+1}</div>
          <div class="rc">
            <div class="rc-player">
              <div class="rc-avatar">${avInner}</div>
              <div><div class="rc-name">${p.name}${sanc}</div></div>
            </div>
          </div>
          <div class="rc rc-num">${p.partiesJouees}</div>
          <div class="rc rc-num">${p.kills}</div>
          <div class="rc rc-pts">${p.total}</div>
          <div class="rc"><div class="rc-bar-wrap"><div class="rc-bar" style="width:${pct}%"></div></div></div>
          <div class="rc rc-num">${p.partiesJouees>0?(p.kills/p.partiesJouees).toFixed(1):'—'}</div>
          <div class="rc">${badg(i)}</div>
        </div>`;
    }).join('');
  }

  // ── RENDER CALENDRIER ──────────────────────────────────────────────────────
  function renderCalendrier() {
    const grid = document.getElementById('cal-grid');
    if (!grid) return;
    grid.innerHTML = WZ.SCHEDULE.map(day => {
      const st  = WZ.getJourneeStatus(day.j);
      const res = WZ.getState().results[day.j];
      const stTxt = {done:'Terminée', partial:'En cours', pending:'À jouer'}[st];
      const parties = [['A',day.g1],['B',day.g2],['C',day.g3]];
      return `
        <div class="jour-card ${st} fu">
          <div class="jour-head">
            <div class="jour-num">Journée ${day.j}</div>
            <div class="jour-st ${st}">${stTxt}</div>
          </div>
          <div class="jour-exempt"><span class="el">Exempté</span><span class="ev">${day.exempt}</span></div>
          ${parties.map(([lbl,grp]) => {
            const validated = res?.[lbl]?.validated;
            const ranked    = validated ? WZ.rankPartie(res[lbl].players) : null;
            const namesHTML = ranked
              ? ranked.map(pl => {
                  const col = pl.rank===1?'var(--gold)':pl.rank===2?'#c0c0cd':pl.rank===3?'#cd7f32':'var(--text2)';
                  const t3  = WZ.TOP3.has(pl.name) ? ' class="top3"' : '';
                  return `<span${t3} style="color:${col}">${pl.name}(${pl.total})</span>`;
                }).join(' <span style="color:var(--text3)">·</span> ')
              : grp.map(n => WZ.TOP3.has(n) ? `<span class="top3">${n}</span>` : n).join(' · ');
            return `
              <div class="jour-partie">
                <div class="jp-lbl">${lbl}</div>
                <div class="jp-players">${namesHTML}</div>
                <div class="jp-check ${validated?'ok':'no'}">${validated?'✓':'○'}</div>
              </div>`;
          }).join('')}
        </div>`;
    }).join('');
  }

  // ── RENDER JOUEURS ─────────────────────────────────────────────────────────
  function renderJoueurs() {
    const grid = document.getElementById('players-grid');
    if (!grid) return;
    const stats = WZ.getStats();
    const meds  = {1:'🥇',2:'🥈',3:'🥉'};
    const bds   = {1:'var(--gold)',2:'#c0c0cd',3:'#cd7f32'};
    grid.innerHTML = stats.map((p,i) => {
      const photo = WZ.getPhoto(p.name);
      const rank  = i+1;
      const isT3  = WZ.TOP3.has(p.name);
      const avInner = photo
        ? `<img src="${photo}" alt="${p.name}" style="width:68px;height:68px;object-fit:cover;border-radius:50%">`
        : p.name.charAt(0);
      const bd = bds[rank] || (isT3 ? 'rgba(232,184,75,0.35)' : 'var(--border2)');
      return `
        <div class="player-card ${isT3?'top3-card':''} fu" style="animation-delay:${i*.04}s">
          <div class="pc-avatar" style="border-color:${bd}">
            ${avInner}
            ${meds[rank] ? `<div class="pc-rank-badge">${meds[rank]}</div>` : ''}
          </div>
          <div class="pc-name">${p.name}</div>
          <div class="pc-pts">${p.total} pts</div>
          <div class="pc-stats">#${rank} · ${p.kills} kills · ${p.partiesJouees} parties</div>
          ${isT3 ? '<div class="pc-top3-badge">★ TOP 3</div>' : ''}
        </div>`;
    }).join('');
  }

  // ── RENDER ADMIN ───────────────────────────────────────────────────────────
  function renderAdmin() {
    const lock  = document.getElementById('admin-lock');
    const panel = document.getElementById('admin-panel');
    if (adminOk) {
      lock.style.display  = 'none';
      panel.classList.add('open');
      renderTab(activeTab);
    } else {
      lock.style.display  = 'flex';
      panel.classList.remove('open');
    }
  }

  function renderTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab===tab));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.dataset.tab===tab));
    if (tab==='saisie')    buildKillsForm();
    if (tab==='sanctions') buildSancForm();
    if (tab==='photos')    buildPhotosForm();
  }

  // KILLS FORM
  function buildKillsForm() {
    const wrap = document.getElementById('kills-form');
    if (!wrap) return;
    wrap.innerHTML = WZ.SCHEDULE.map(day => {
      const res = WZ.getState().results[day.j];
      return `
        <div class="kills-day">
          <div class="kills-day-head">
            Journée ${day.j}
            <span style="font-size:14px;color:var(--text2);font-weight:400">Exempté : ${day.exempt}</span>
          </div>
          ${[['A',day.g1],['B',day.g2],['C',day.g3]].map(([p,grp]) => {
            const validated = res?.[p]?.validated||false;
            const pdata = res?.[p]?.players || grp.map(n => ({name:n, kills:[0,0,0,0,0]}));
            return `
              <div class="kills-partie ${validated?'validated':''}" id="kpart-${day.j}-${p}">
                <div class="kills-partie-head">
                  <div class="kp-label">Partie ${p}</div>
                  <label class="kp-toggle" style="color:${validated?'var(--green)':'var(--text2)'}">
                    <input type="checkbox" ${validated?'checked':''} style="accent-color:var(--green)"
                      onchange="App.toggleVal(${day.j},'${p}',this.checked)">
                    ${validated?'✓ Jouée':'Marquer Jouée'}
                  </label>
                </div>
                ${pdata.map((pl,pi) => {
                  const kills = pl.kills||[0,0,0,0,0];
                  const total = kills.reduce((s,k)=>s+(parseInt(k)||0),0);
                  const isT3  = WZ.TOP3.has(pl.name);
                  return `
                    <div class="kp-row">
                      <div class="kp-name ${isT3?'is-top3':''}">${isT3?'★ ':''}${pl.name}</div>
                      <div class="kp-inputs">
                        ${kills.map((k,ki) => `<input class="kp-input" type="number" min="0" max="99" value="${k}"
                          onchange="App.setKills(${day.j},'${p}',${pi},${ki},this.value)">`).join('')}
                      </div>
                      <div class="kp-total" id="kt-${day.j}-${p}-${pi}">${total}K</div>
                    </div>`;
                }).join('')}
              </div>`;
          }).join('')}
        </div>`;
    }).join('');
  }

  // SANCTIONS FORM
  function buildSancForm() {
    const grid = document.getElementById('sanc-grid');
    if (!grid) return;
    const sancs = WZ.getSanctions();
    grid.innerHTML = WZ.NAMES.map(n => {
      const cur = sancs[n]||0;
      return `
        <div class="sanc-card">
          <div class="sanc-name">${WZ.TOP3.has(n)?'★ ':''}${n}${cur!==0?`<span class="sanc-cur">${cur>0?'+':''}${cur}pts</span>`:''}</div>
          <div class="sanc-row">
            <input type="number" class="sanc-input" placeholder="-20" id="sp-${n}">
            <input type="text" class="sanc-note" placeholder="Motif...">
            <button class="btn-ghost" style="padding:6px 12px;font-size:11px" onclick="App.addSanc('${n}')">OK</button>
            <button class="btn-ghost" style="padding:6px 10px;font-size:11px" onclick="App.clearSanc('${n}')" title="Réinitialiser">✕</button>
          </div>
        </div>`;
    }).join('');
  }

  // PHOTOS FORM
  function buildPhotosForm() {
    const wrap = document.getElementById('photos-form');
    if (!wrap) return;
    const logo = WZ.getLogo();
    wrap.innerHTML = `
      <div style="margin-bottom:28px">
        <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:2px;color:var(--text3);text-transform:uppercase;margin-bottom:12px">// Logo ou bannière de la ligue</div>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          ${logo ? `<img src="${logo}" style="height:56px;object-fit:contain;border-radius:8px;border:1px solid var(--border)">` : ''}
          <label class="btn-ghost" style="cursor:pointer;font-size:13px">
            ${logo?'↺ Changer':'+ Importer le logo / bannière'}
            <input type="file" accept="image/*" style="display:none" onchange="App.uploadLogo(this)">
          </label>
        </div>
      </div>
      <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:2px;color:var(--text3);text-transform:uppercase;margin-bottom:14px">// Photos des joueurs</div>
      <div class="photos-grid">
        ${WZ.NAMES.map(name => {
          const photo = WZ.getPhoto(name);
          const isT3  = WZ.TOP3.has(name);
          return `
            <div class="photo-card">
              <div class="photo-preview">${photo?`<img src="${photo}" alt="${name}">`:name.charAt(0)}</div>
              <div class="photo-name">${isT3?'★ ':''}${name}</div>
              <label class="btn-ghost" style="cursor:pointer;font-size:11px;padding:6px 12px">
                ${photo?'↺ Changer':'+ Photo'}
                <input type="file" accept="image/*" style="display:none" onchange="App.uploadPhoto('${name}',this)">
              </label>
            </div>`;
        }).join('')}
      </div>`;
  }

  // ── ACTIONS ────────────────────────────────────────────────────────────────
  function tryLogin() {
    const pw = document.getElementById('admin-pw');
    if (!pw) return;
    if (pw.value === PASS) {
      adminOk = true;
      sessionStorage.setItem('wz_ok','1');
      renderAdmin(); toast('Accès accordé ✓','ok');
    } else {
      const err = document.getElementById('login-err');
      if (err) err.style.display = 'block';
      pw.value = '';
    }
  }

  function logout() {
    adminOk = false; sessionStorage.removeItem('wz_ok');
    renderAdmin(); toast('Déconnecté','ok');
  }

  function toggleVal(j, p, checked) {
    WZ.setValidation(j, p, checked);
    const kpart = document.getElementById(`kpart-${j}-${p}`);
    if (kpart) { kpart.classList.toggle('validated', checked); const lbl = kpart.querySelector('.kp-toggle'); if(lbl){lbl.style.color=checked?'var(--green)':'var(--text2)'; lbl.innerHTML=`<input type="checkbox" ${checked?'checked':''} style="accent-color:var(--green)" onchange="App.toggleVal(${j},'${p}',this.checked)">${checked?'✓ Jouée':'Marquer Jouée'}`;} }
    ['home','classement','calendrier'].forEach(pg => { if(curPage===pg) render(pg); });
    toast(`J${j} · Partie ${p} : ${checked?'Validée ✓':'Annulée'}`, checked?'ok':'err');
  }

  function setKills(j, p, pi, ki, val) {
    const r = WZ.getState().results[j]?.[p];
    if (!r) return;
    const kills = [...(r.players[pi]?.kills||[0,0,0,0,0])];
    kills[ki] = parseInt(val)||0;
    WZ.setKills(j, p, pi, kills);
    const el = document.getElementById(`kt-${j}-${p}-${pi}`);
    if (el) el.textContent = kills.reduce((s,k)=>s+(parseInt(k)||0),0)+'K';
  }

  function addSanc(name) {
    const pts = parseInt(document.getElementById(`sp-${name}`)?.value);
    if (isNaN(pts)) { toast('Points invalides','err'); return; }
    WZ.addSanction(name, pts);
    buildSancForm();
    if (curPage==='classement') renderClassement();
    toast(`${name} : ${pts>0?'+':''}${pts} pts`, pts<0?'err':'ok');
    const el = document.getElementById(`sp-${name}`);
    if (el) el.value='';
  }

  function clearSanc(name) {
    WZ.clearSanction(name); buildSancForm();
    if (curPage==='classement') renderClassement();
    toast(`Sanctions de ${name} réinitialisées`,'ok');
  }

  function uploadPhoto(name, input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { WZ.savePhoto(name, e.target.result); buildPhotosForm(); toast(`Photo de ${name} ✓`,'ok'); };
    reader.readAsDataURL(file);
  }

  function uploadLogo(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { WZ.saveLogo(e.target.result); buildPhotosForm(); if(curPage==='home') renderHome(); toast('Logo mis à jour ✓','ok'); };
    reader.readAsDataURL(file);
  }

  function handleExcel(file) {
    if (!file) return;
    const stEl = document.getElementById('drop-status');
    if (stEl) { stEl.style.display='block'; stEl.textContent='⏳ Lecture du fichier...'; stEl.style.color='var(--text2)'; }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
        WZ.importExcel(wb);
        if (stEl) { stEl.textContent='✓ Import réussi — ' + file.name; stEl.style.color='var(--green)'; }
        toast('Excel importé avec succès !','ok');
        buildKillsForm();
        ['home','classement','calendrier'].forEach(pg => { if(curPage===pg) render(pg); });
      } catch(err) {
        if (stEl) { stEl.textContent='✗ Erreur : ' + err.message; stEl.style.color='var(--red)'; }
        toast('Erreur import','err'); console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ── DISPATCH ───────────────────────────────────────────────────────────────
  function render(page) {
    ({home:renderHome, classement:renderClassement, calendrier:renderCalendrier,
      joueurs:renderJoueurs, admin:renderAdmin})[page]?.();
  }

  // ── INIT ───────────────────────────────────────────────────────────────────
  function init() {
    // Nav links
    document.querySelectorAll('[data-page]').forEach(a =>
      a.addEventListener('click', e => { e.preventDefault(); go(a.dataset.page); })
    );
    // Scroll nav
    window.addEventListener('scroll', () =>
      document.getElementById('nav')?.classList.toggle('scrolled', window.scrollY>20)
    );
    // Admin login
    document.getElementById('admin-pw')?.addEventListener('keydown', e => { if(e.key==='Enter') tryLogin(); });
    // Admin tabs
    document.querySelectorAll('.admin-tab').forEach(t => t.addEventListener('click', () => renderTab(t.dataset.tab)));
    // Drop zone
    const dz = document.getElementById('drop-zone');
    if (dz) {
      dz.addEventListener('click', () => document.getElementById('xl-file')?.click());
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
      dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag'); handleExcel(e.dataTransfer.files[0]); });
      document.getElementById('xl-file')?.addEventListener('change', e => handleExcel(e.target.files[0]));
    }
    go('home');
  }

  return { init, go, tryLogin, logout, toggleVal, setKills, addSanc, clearSanc, uploadPhoto, uploadLogo, renderTab };
})();

document.addEventListener('DOMContentLoaded', App.init);
