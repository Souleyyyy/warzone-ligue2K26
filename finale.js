// ── WARZONE LEAGUE 2026 — PHASE FINALE ──────────────────────────────────────
//
// Structure CORRIGÉE :
// - Master Play-In : 9e,10e,11e,12e jouent ENSEMBLE (4 joueurs, 5 manches)
//                   → 1er et 2e qualifiés pour le Play-In Final
// - Play-In Final  : 7e, 8e + 2 gagnants MPI jouent ENSEMBLE (4 joueurs, 5 manches)
//                   → 1er et 2e qualifiés pour le Final 8
// - Final 8 G1 : 1er ligue + 2e Play-In + 4e ligue + 5e ligue
// - Final 8 G2 : 2e ligue + 1er Play-In + 3e ligue + 6e ligue
// - Grande Finale  : 2 qualifiés G1 vs 2 qualifiés G2 — Best of 5 MK

const Finale = (() => {
  const K  = 'wz_finale_v2';
  const ls = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
  const ss = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  function emptyMatch4(names) {
    return {
      validated: false,
      players: (names || [null,null,null,null]).map(n => ({ name: n, kills: [0,0,0,0,0] }))
    };
  }

  function initFinaleState() {
    return {
      masterPlayIn: emptyMatch4(),
      playIn:       emptyMatch4(),
      groupes: {
        // G1 et G2 = même format match4 que MPI/PI : 4 joueurs, 5 manches, kills only
        g1: emptyMatch4(),
        g2: emptyMatch4(),
      },
      grandeFinale: {
        // 4 joueurs individuels, best-of-5 MK, 1 seul champion
        masterKills: [],
        mkWins:    {},     // { name: nb victoires MK }
        champion:  null,
        g1q1:null,g1q2:null,g2q1:null,g2q2:null
      }
    };
  }

  let finaleState = ls(K, null) || initFinaleState();
  // Migration depuis ancienne version (match1/match2 → players[])
  if (finaleState.masterPlayIn && !Array.isArray(finaleState.masterPlayIn.players)) {
    finaleState = initFinaleState();
  }

  function save()       { ss(K, finaleState); }
  function getState()   { return finaleState; }
  function reset()      { finaleState = initFinaleState(); save(); }

  function getQualifies() {
    const cl = WZ.getStats();
    return { directs:cl.slice(0,6), playIn78:cl.slice(6,8), masterPI:cl.slice(8,12) };
  }

  function rankMatch(match) {
    if (!match?.validated) return [];
    const ranked = match.players.filter(p=>p.name).map(p=>({
      name: p.name,
      total: WZ.sumKills(p.kills),
      best:  Math.max(...(p.kills||[0]).map(k=>parseInt(k)||0))
    }));
    ranked.sort((a,b)=>b.total!==a.total?b.total-a.total:b.best-a.best);
    ranked.forEach((p,i)=>p.rank=i+1);
    return ranked;
  }

  function autoFill() {
    const q = getQualifies();
    const f = finaleState;

    // Noms MPI
    if (q.masterPI.length>=4) {
      [0,1,2,3].forEach(i=>{
        if (!f.masterPlayIn.players[i].name)
          f.masterPlayIn.players[i].name = q.masterPI[i].name;
      });
    }

    // Gagnants MPI
    const mpiR  = rankMatch(f.masterPlayIn);
    const mpi1  = mpiR.find(p=>p.rank===1)?.name||null;
    const mpi2  = mpiR.find(p=>p.rank===2)?.name||null;

    // Noms Play-In : 7e, 8e, puis gagnants MPI (toujours mis à jour)
    if (q.playIn78.length>=2) {
      if (!f.playIn.players[0].name) f.playIn.players[0].name = q.playIn78[0].name;
      if (!f.playIn.players[1].name) f.playIn.players[1].name = q.playIn78[1].name;
      if (mpi1) f.playIn.players[2].name = mpi1;
      if (mpi2) f.playIn.players[3].name = mpi2;
    }

    // Gagnants Play-In
    const piR  = rankMatch(f.playIn);
    const pi1  = piR.find(p=>p.rank===1)?.name||null; // → G2
    const pi2  = piR.find(p=>p.rank===2)?.name||null; // → G1

    // Groupes — G1 et G2 = même format match4 que MPI/PI
    if (q.directs.length>=6) {
      // G1 : 1er + 2e PI + 4e + 5e
      const g1n=[q.directs[0].name, pi2||null, q.directs[3].name, q.directs[4].name];
      g1n.forEach((n,i)=>{ if(n) f.groupes.g1.players[i].name=n; });
      // G2 : 2e + 1er PI + 3e + 6e
      const g2n=[q.directs[1].name, pi1||null, q.directs[2].name, q.directs[5].name];
      g2n.forEach((n,i)=>{ if(n) f.groupes.g2.players[i].name=n; });
    }

    // Qualifiés groupes → Grande Finale (4 finalistes individuels)
    const g1R=rankMatch(f.groupes.g1);
    const g2R=rankMatch(f.groupes.g2);
    f.grandeFinale.g1q1=g1R.find(p=>p.rank===1)?.name||null;
    f.grandeFinale.g1q2=g1R.find(p=>p.rank===2)?.name||null;
    f.grandeFinale.g2q1=g2R.find(p=>p.rank===1)?.name||null;
    f.grandeFinale.g2q2=g2R.find(p=>p.rank===2)?.name||null;

    save();
  }

  function setMatch4Kills(phase, playerIdx, kills) {
    const m = finaleState[phase];
    if (!m?.players?.[playerIdx]) return;
    m.players[playerIdx].kills = kills;
    save();
  }

  function setMatch4Validated(phase, validated) {
    finaleState[phase].validated = validated;
    autoFill();
  }

  function setGroupeMatch(gKey, matchKey, k0, k1) {
    const g = finaleState.groupes[gKey];
    const m = g.matchs[matchKey]; if(!m) return;
    const parts = matchKey.replace('m','').split('v');
    const i0=parseInt(parts[0]), i1=parseInt(parts[1]);
    m['k'+i0]=k0; m['k'+i1]=k1;
    m.winner = k0>k1 ? g.players[i0] : g.players[i1];
    calcGroupeClassement(gKey);
  }

  function calcGroupeClassement(gKey) {
    const g  = finaleState.groupes[gKey];
    const pts = {};
    g.players.forEach(p=>{ if(p&&p!=='?') pts[p]={wins:0,kills:0}; });
    const pairs=[['m0v1',0,1],['m0v2',0,2],['m0v3',0,3],['m1v2',1,2],['m1v3',1,3],['m2v3',2,3]];
    pairs.forEach(([key,i0,i1])=>{
      const m=g.matchs[key]; if(!m?.winner) return;
      const p0=g.players[i0],p1=g.players[i1];
      if(!p0||!p1||p0==='?'||p1==='?') return;
      if(!pts[p0]) pts[p0]={wins:0,kills:0};
      if(!pts[p1]) pts[p1]={wins:0,kills:0};
      pts[p0].kills+=m['k'+i0]||0; pts[p1].kills+=m['k'+i1]||0;
      if(m.winner===p0) pts[p0].wins++; else pts[p1].wins++;
    });
    g.pts=pts;
    const ranked = g.players.filter(p=>p&&p!=='?')
      .sort((a,b)=>{
        if(!pts[a]) return 1; if(!pts[b]) return -1;
        return pts[b].wins!==pts[a].wins ? pts[b].wins-pts[a].wins : pts[b].kills-pts[a].kills;
      });
    g.qualifies=[ranked[0]||null,ranked[1]||null];
    const gf=finaleState.grandeFinale;
    if(gKey==='g1'){gf.g1q1=g.qualifies[0];gf.g1q2=g.qualifies[1];}
    if(gKey==='g2'){gf.g2q1=g.qualifies[0];gf.g2q2=g.qualifies[1];}
    save();
  }

  function setGrandeFinaleResult(mkIndex, scores) {
    const gf=finaleState.grandeFinale;
    if(!gf.masterKills) gf.masterKills=[];
    // Gagnant = joueur avec le plus de kills
    let winner=null, maxK=0;
    Object.entries(scores).forEach(([name,k])=>{ if(k>maxK){maxK=k;winner=name;} });
    gf.masterKills[mkIndex]={scores,winner};
    // Compter victoires MK par joueur
    gf.mkWins={};
    gf.masterKills.filter(m=>m?.winner).forEach(m=>{
      gf.mkWins[m.winner]=(gf.mkWins[m.winner]||0)+1;
    });
    // Champion = premier à 2 victoires
    gf.champion=Object.entries(gf.mkWins).find(([n,w])=>w>=2)?.[0]||null;
    save();
  }

  return { getState,getQualifies,autoFill,save,reset,
           setMatch4Kills,setMatch4Validated,
           setGrandeFinaleResult,rankMatch };
})();


// ════════════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════════════
function buildFinalePage() {
  const wrap = document.getElementById('finale-content');
  if (!wrap) return;

  Finale.autoFill();
  const f       = Finale.getState();
  const isAdmin = sessionStorage.getItem('wz_ok')==='1';
  const stats   = WZ.getStats();
  const getRank = n => { const i=stats.findIndex(p=>p.name===n); return i>=0?i+1:null; };

  // ── playerPill ───────────────────────────────────────────────────────
  const playerPill = (name, extra='') => {
    if (!name||name==='?')
      return `<div class="fl-player fl-tbd"><span class="fl-tbd-icon">?</span><span class="fl-tbd-txt">À déterminer</span></div>`;
    const photo=WZ.getPhoto(name);
    const isT3=WZ.TOP3.has(name);
    const avIn=photo?`<img src="${photo}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`${name[0]}`;
    const r=getRank(name);
    return `<div class="fl-player ${extra}">
      <div class="fl-av">${avIn}</div>
      <span class="fl-name ${isT3?'is-top3':''}">${isT3?'★ ':''}${name}</span>
      ${r?`<span class="fl-rank">#${r}</span>`:''}
    </div>`;
  };

  // ── Render match 4 joueurs ───────────────────────────────────────────
  const render4Match = (matchData, phase, title, sublabel) => {
    const m      = matchData;
    const ranked = Finale.rankMatch(m);
    const done   = m.validated;
    const medals = ['🥇','🥈','🥉','4e'];
    const rankColors = ['var(--gold)','#c0c0cd','#cd7f32','var(--text2)'];

    const rows = m.players.map((pl,pi)=>{
      const r     = ranked.find(x=>x.name===pl.name);
      const total = WZ.sumKills(pl.kills||[0,0,0,0,0]);
      const rn    = r?.rank;
      const rc    = rankColors[(rn||4)-1];

      const cells = (pl.kills||[0,0,0,0,0]).map((k,ki)=>
        isAdmin && !done
          ? `<input class="fl-kinput sm" type="number" min="0" value="${k||0}"
              onchange="FinaleApp.setKills('${phase}',${pi},${ki},this.value)">`
          : `<span class="fl-manche-val">${k||0}</span>`
      ).join('');

      return `<div class="fl-4p-row ${done&&rn<=2?'fl-top2':''}">
        <div class="fl-4p-rank" style="color:${rc}">${done&&rn?medals[rn-1]:'—'}</div>
        ${playerPill(pl.name,'fl-4p-player')}
        <div class="fl-4p-manches">${cells}</div>
        <div class="fl-4p-total" style="color:${done?rc:'var(--text3)'}">${done?total+'K':'—'}</div>
      </div>`;
    }).join('');

    const validBtn = isAdmin ? `<div class="fl-4p-validate">
      ${!done
        ? `<button class="fl-btn-ok" onclick="FinaleApp.validateMatch('${phase}',true)">✓ Valider le match</button>`
        : `<button class="fl-btn-cancel" onclick="FinaleApp.validateMatch('${phase}',false)">↺ Annuler</button>`
      }</div>` : '';

    const result = done && ranked.length>=2
      ? `<div class="fl-4p-result">
          <span class="fl-qual-badge gold">🏆 1er qualifié → ${ranked[0].name} (${ranked[0].total}K)</span>
          <span class="fl-qual-badge silver">✅ 2e qualifié → ${ranked[1].name} (${ranked[1].total}K)</span>
        </div>` : '';

    return `<div class="fl-4match ${done?'fl-done':''}">
      <div class="fl-4match-head">
        <div class="fl-4match-label">${title}</div>
        ${done?'<span class="fl-done-badge">✓ Validé</span>':'<span class="fl-pending-badge">⏳ À jouer</span>'}
      </div>
      <div class="fl-4match-sub">${sublabel}</div>
      <div class="fl-4match-header-row">
        <div style="flex:0 0 30px"></div>
        <div style="flex:1;font-family:var(--font-mono);font-size:8px;color:var(--text3)">JOUEUR</div>
        <div class="fl-4p-manches-head">G.1 &nbsp; G.2 &nbsp; G.3 &nbsp; G.4 &nbsp; G.5</div>
        <div style="width:52px;text-align:right;font-family:var(--font-mono);font-size:8px;color:var(--text3)">TOTAL</div>
      </div>
      ${rows}
      ${validBtn}
      ${result}
    </div>`;
  };

  // ── Render groupe (même format que MPI/PI — 4 joueurs ensemble) ──────
  const renderGroupe = (gKey, label, color) => {
    const lbls = gKey==='g1'
      ? ['1er Ligue','2e Play-In','4e Ligue','5e Ligue']
      : ['2e Ligue','1er Play-In','3e Ligue','6e Ligue'];
    const g = f.groupes[gKey];
    return `<div class="fl-groupe-wrap">
      <div class="fl-groupe-header" style="color:${color}">${label}</div>
      <div class="fl-groupe-labels">
        ${g.players.map((p,i)=>`<div class="fl-gp-tag"><span class="fl-gp-lbl">${lbls[i]}</span></div>`).join('')}
      </div>
      ${render4Match(g, `groupes.${gKey}`, label, '4 joueurs · 5 manches · Kills only · Les 2 premiers qualifiés pour la Grande Finale')}
    </div>`;
  };

  // ── Grande Finale — 4 joueurs individuels ────────────────────────────
  const gf = f.grandeFinale;
  const finalistes = [gf.g1q1, gf.g1q2, gf.g2q1, gf.g2q2].filter(p=>p&&p!=='?');
  const mkWins = gf.mkWins || {};
  const maxWins = Math.max(0, ...Object.values(mkWins));
  const canPlay = finalistes.length===4;

  const mkHtml = (gf.masterKills||[]).map((mk,i)=>{
    if(!mk) return '';
    const s=mk.scores||{};
    const rows = finalistes.map(p=>{
      const isWinner = mk.winner===p;
      return `<div class="fl-mk-row ${isWinner?'fl-win':''}">
        ${playerPill(p,'fl-mk-player')}
        <span class="fl-mk-kills">${s[p]||0}K</span>
        ${isWinner?`<span class="fl-mk-crown">👑 +1</span>`:''}
      </div>`;
    }).join('');
    return `<div class="fl-mk fl-done">
      <div class="fl-mk-label">Master Kill ${i+1} — Gagné par ${mk.winner||'?'}</div>
      <div class="fl-mk-rows">${rows}</div>
    </div>`;
  }).join('');

  const mkCount=(gf.masterKills||[]).length;
  const champName = gf.champion;
  const noChampYet = !champName && mkCount < 5;
  const canAddMK = isAdmin && canPlay && noChampYet;

  const addMKHtml = canAddMK ? `<div class="fl-add-mk">
    <div class="fl-add-mk-title">+ Saisir Master Kill ${mkCount+1}</div>
    <div class="fl-mk-inputs">
      ${finalistes.map(p=>`
        <div class="fl-mk-input-item">
          <label>${p}</label>
          <input type="number" min="0" value="0" id="mk_${p}" class="fl-kinput">
        </div>`).join('')}
    </div>
    <button class="fl-btn-primary" onclick="FinaleApp.saveMK(${mkCount})">Valider Master Kill ${mkCount+1}</button>
  </div>`:'';

  const scoresHtml = finalistes.map(p=>{
    const w=mkWins[p]||0;
    const isChamp=p===champName;
    return `<div class="fl-gf-player-score ${isChamp?'fl-gf-champion':''}">
      ${playerPill(p)}
      <div class="fl-gf-mk-score">${w}</div>
      <div class="fl-gf-mk-label">MK gagnés</div>
      ${isChamp?`<div class="fl-champ-badge">👑 CHAMPION</div>`:''}
    </div>`;
  }).join('');

  const champHtml = champName ? `<div class="fl-champion">
    <div class="fl-champ-crown">👑</div>
    <div class="fl-champ-label">CHAMPION WARZONE LEAGUE 2026</div>
    <div class="fl-champ-team">${champName}</div>
  </div>` : '';

  // ── Bracket ──────────────────────────────────────────────────────────
  const mpiR=Finale.rankMatch(f.masterPlayIn);
  const mpi1=mpiR.find(p=>p.rank===1)?.name||'?';
  const mpi2=mpiR.find(p=>p.rank===2)?.name||'?';
  const piR=Finale.rankMatch(f.playIn);
  const pi1=piR.find(p=>p.rank===1)?.name||'?';
  const pi2=piR.find(p=>p.rank===2)?.name||'?';
  const cl=WZ.getStats();
  const cn=i=>cl[i]?.name||'?';

  const bslot=(n,lbl,hl='')=>{
    if(!n||n==='?') return `<div class="br-slot br-tbd"><span class="br-slot-label">${lbl}</span><span class="br-tbd-txt">?</span></div>`;
    const ph=WZ.getPhoto(n);
    const av=ph?`<img src="${ph}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0">`:`<span class="br-av">${n[0]}</span>`;
    return `<div class="br-slot ${hl}"><span class="br-slot-label">${lbl}</span>${av}<span class="br-slot-name">${n}</span></div>`;
  };

  const bracketHtml=`<div class="bracket-wrap"><div class="bracket-scroll"><div class="bracket">
    <div class="br-col">
      <div class="br-col-title">MASTER PLAY-IN</div>
      <div class="br-section">
        <div class="br-match">
          ${bslot(cn(8),'#9')}${bslot(cn(9),'#10')}${bslot(cn(10),'#11')}${bslot(cn(11),'#12')}
        </div>
        <div class="br-arrow">→ Top 2 qualifiés</div>
      </div>
    </div>
    <div class="br-col">
      <div class="br-col-title">PLAY-IN FINAL</div>
      <div class="br-section">
        <div class="br-match">
          ${bslot(cn(6),'#7')}${bslot(cn(7),'#8')}${bslot(mpi1,'1er MPI')}${bslot(mpi2,'2e MPI')}
        </div>
        <div class="br-arrow">→ Top 2 qualifiés</div>
      </div>
    </div>
    <div class="br-col">
      <div class="br-col-title">FINAL 8 — GROUPES</div>
      <div class="br-section">
        <div class="br-groupe-box">
          <div class="br-groupe-title" style="color:var(--red)">🔴 G1</div>
          ${bslot(cn(0),'1er','br-direct')}${bslot(pi2,'2e PI')}
          ${bslot(cn(3),'4e','br-direct')}${bslot(cn(4),'5e','br-direct')}
        </div>
        <div class="br-groupe-box" style="margin-top:8px">
          <div class="br-groupe-title" style="color:#4be8ff">🔵 G2</div>
          ${bslot(cn(1),'2e','br-direct')}${bslot(pi1,'1er PI')}
          ${bslot(cn(2),'3e','br-direct')}${bslot(cn(5),'6e','br-direct')}
        </div>
      </div>
    </div>
    <div class="br-col">
      <div class="br-col-title">GRANDE FINALE</div>
      <div class="br-section">
        <div class="br-finale-box">
          <div class="br-finale-team">
            ${bslot(f.grandeFinale.g1q1||'?','G1 Q1','br-qualify')}
            ${bslot(f.grandeFinale.g1q2||'?','G1 Q2','br-qualify')}
          </div>
          <div class="br-finale-vs">VS</div>
          <div class="br-finale-team">
            ${bslot(f.grandeFinale.g2q1||'?','G2 Q1','br-qualify')}
            ${bslot(f.grandeFinale.g2q2||'?','G2 Q2','br-qualify')}
          </div>
          ${gf.champion?`<div class="br-champion">👑 ${gf.champion}</div>`:''}
        </div>
      </div>
    </div>
  </div></div></div>`;

  // ── CSS manquant pour les nouveaux éléments ──────────────────────────
  if (!document.getElementById('finale-extra-css')) {
    const style = document.createElement('style');
    style.id = 'finale-extra-css';
    style.textContent = `
      .fl-4match { background:var(--glass);backdrop-filter:blur(18px);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:8px;transition:border-color .2s; }
      .fl-4match.fl-done { border-color:rgba(75,232,128,0.25); }
      .fl-4match-head { display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:rgba(255,255,255,0.03);border-bottom:1px solid var(--border); }
      .fl-4match-label { font-family:var(--font-title);font-size:13px;font-weight:700;color:var(--gold); }
      .fl-4match-sub { font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;padding:6px 18px;border-bottom:1px solid rgba(255,255,255,0.04); }
      .fl-done-badge { font-family:var(--font-mono);font-size:9px;color:var(--green);border:1px solid rgba(75,232,128,.3);background:rgba(75,232,128,.07);padding:2px 8px;border-radius:99px; }
      .fl-pending-badge { font-family:var(--font-mono);font-size:9px;color:var(--text3);border:1px solid var(--border);padding:2px 8px;border-radius:99px; }
      .fl-4match-header-row { display:flex;align-items:center;padding:6px 18px;gap:10px;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.04); }
      .fl-4p-manches-head { font-family:var(--font-mono);font-size:8px;color:var(--text3);text-align:center;width:220px;flex-shrink:0; }
      .fl-4p-row { display:flex;align-items:center;padding:10px 18px;gap:10px;border-bottom:1px solid rgba(255,255,255,0.04);transition:background .15s; }
      .fl-4p-row:last-of-type { border-bottom:none; }
      .fl-4p-row.fl-top2 { background:rgba(75,232,128,0.05); }
      .fl-4p-rank { font-size:16px;width:30px;flex-shrink:0;text-align:center; }
      .fl-4p-player { flex:1; }
      .fl-4p-manches { display:flex;gap:5px;align-items:center;width:220px;flex-shrink:0; }
      .fl-manche-val { font-family:var(--font-mono);font-size:12px;color:var(--text2);width:36px;text-align:center;background:rgba(255,255,255,0.04);border-radius:4px;padding:4px 2px; }
      .fl-4p-total { font-family:var(--font-title);font-size:15px;font-weight:800;width:52px;text-align:right;flex-shrink:0; }
      .fl-4p-validate { padding:10px 18px;border-top:1px solid var(--border);display:flex;gap:8px; }
      .fl-btn-cancel { background:rgba(232,75,106,0.15);color:var(--red);border:1px solid rgba(232,75,106,.3);border-radius:var(--r-sm);padding:6px 14px;font-size:12px;cursor:pointer;font-weight:600; }
      .fl-4p-result { padding:12px 18px;display:flex;gap:10px;flex-wrap:wrap;border-top:1px solid rgba(75,232,128,.15);background:rgba(75,232,128,.04); }
      .fl-qual-badge { font-family:var(--font-mono);font-size:10px;padding:4px 10px;border-radius:99px;border:1px solid; }
      .fl-qual-badge.gold { color:var(--gold);border-color:var(--gold-border);background:var(--gold-glow); }
      .fl-qual-badge.silver { color:#c0c0cd;border-color:rgba(192,192,205,.3);background:rgba(192,192,205,.07); }
      .fl-gf-scores { display:flex;gap:12px;flex-wrap:wrap;padding:20px 24px;border-bottom:1px solid var(--gold-border);justify-content:center; }
      .fl-gf-player-score { display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 20px;border-radius:var(--r-lg);border:1px solid var(--border);background:var(--glass);min-width:120px; }
      .fl-gf-player-score.fl-gf-champion { border-color:var(--gold-border);background:var(--gold-glow);box-shadow:0 0 20px rgba(232,184,75,0.15); }
      .fl-gf-mk-score { font-family:var(--font-title);font-size:36px;font-weight:800;color:var(--gold);line-height:1; }
      .fl-gf-mk-label { font-family:var(--font-mono);font-size:8px;color:var(--text3);letter-spacing:1px;text-transform:uppercase; }
      .fl-champ-badge { font-family:var(--font-mono);font-size:9px;color:var(--gold);background:var(--gold-glow);border:1px solid var(--gold-border);padding:2px 8px;border-radius:99px; }
      .fl-mk-rows { display:flex;flex-direction:column;gap:6px;padding:10px 0; }
      .fl-mk-row { display:flex;align-items:center;gap:10px;padding:7px 16px;border-radius:var(--r-sm);transition:background .15s; }
      .fl-mk-row.fl-win { background:rgba(232,184,75,0.08);border:1px solid var(--gold-border); }
      .fl-mk-player { flex:1; }
      .fl-mk-kills { font-family:var(--font-title);font-size:15px;font-weight:800;color:var(--gold);min-width:48px;text-align:right; }
      .fl-mk-crown { font-family:var(--font-mono);font-size:10px;color:var(--gold);background:var(--gold-glow);padding:2px 8px;border-radius:99px; }
      .fl-groupe-wrap { margin-bottom:8px; }
      .fl-groupe-header { font-family:var(--font-title);font-size:13px;font-weight:800;padding:8px 0 6px;letter-spacing:1px; }
      .fl-groupe-labels { display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px; }
      .fl-gp-tag { background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:99px;padding:2px 10px; }
      .fl-gp-lbl { font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px; }
      @media(max-width:600px){
        .fl-4p-manches { width:auto;flex-wrap:wrap; }
        .fl-4p-manches-head { display:none; }
        .fl-4match-header-row { display:none; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Assemblage ────────────────────────────────────────────────────────
  wrap.innerHTML = `
    <div class="stats-section-label">// TABLEAU DE LA PHASE FINALE</div>
    ${bracketHtml}

    <div class="stats-section-label" style="margin-top:48px">
      // MASTER PLAY-IN &nbsp;<span style="color:var(--red);font-size:9px">4 joueurs · 5 manches · Les 2 premiers qualifiés</span>
    </div>
    ${render4Match(f.masterPlayIn,'masterPlayIn',
      'Master Play-In — 9e · 10e · 11e · 12e',
      '4 joueurs jouent ensemble sur 5 manches · 1er et 2e rejoignent le Play-In Final')}

    <div class="stats-section-label" style="margin-top:40px">
      // PLAY-IN FINAL &nbsp;<span style="color:var(--gold);font-size:9px">4 joueurs · 5 manches · Les 2 premiers qualifiés</span>
    </div>
    ${render4Match(f.playIn,'playIn',
      'Play-In Final — 7e · 8e · 1er MPI · 2e MPI',
      '4 joueurs jouent ensemble sur 5 manches · 1er et 2e rejoignent le Final 8')}

    <div class="stats-section-label" style="margin-top:40px">// FINAL 8 — PHASE DE GROUPES</div>
    <div class="fl-groupes-grid">
      ${renderGroupe('g1','🔴 GROUPE 1  ·  1er + 2e PI + 4e + 5e','var(--red)')}
      ${renderGroupe('g2','🔵 GROUPE 2  ·  2e + 1er PI + 3e + 6e','#4be8ff')}
    </div>

    <div class="stats-section-label" style="margin-top:40px">
      // GRANDE FINALE &nbsp;<span style="color:var(--gold);font-size:9px">4 joueurs individuels · Best of 5 MK · 1 seul Champion</span>
    </div>
    <div class="fl-grande-finale">
      <div class="fl-gf-scores">${scoresHtml}</div>
      <div class="fl-mk-list">${mkHtml}</div>
      ${addMKHtml}
      ${champHtml}
    </div>
    ${isAdmin?`<div style="margin-top:16px"><button class="btn-ghost" style="font-size:11px;color:var(--red)" onclick="FinaleApp.resetFinale()">↺ Reset Phase Finale</button></div>`:''}
    <div style="padding-bottom:56px"></div>`;
}


// ════════════════════════════════════════════════════════════════════════
// ACTIONS
// ════════════════════════════════════════════════════════════════════════
const FinaleApp = {
  setKills(phase, pi, ki, val) {
    // phase peut être 'masterPlayIn', 'playIn', 'groupes.g1', 'groupes.g2'
    let m;
    if (phase.startsWith('groupes.')) {
      const gk = phase.split('.')[1];
      m = Finale.getState().groupes[gk];
    } else {
      m = Finale.getState()[phase];
    }
    if (!m?.players?.[pi]) return;
    const kills = [...(m.players[pi].kills||[0,0,0,0,0])];
    kills[ki] = parseInt(val)||0;
    if (phase.startsWith('groupes.')) {
      const gk = phase.split('.')[1];
      Finale.getState().groupes[gk].players[pi].kills = kills;
      Finale.save();
    } else {
      Finale.setMatch4Kills(phase, pi, kills);
    }
  },
  validateMatch(phase, v) {
    if (phase.startsWith('groupes.')) {
      const gk = phase.split('.')[1];
      Finale.getState().groupes[gk].validated = v;
      Finale.autoFill();
      Finale.save();
    } else {
      Finale.setMatch4Validated(phase, v);
    }
    buildFinalePage();
  },
  saveMK(idx) {
    const gf=Finale.getState().grandeFinale;
    const finalistes=[gf.g1q1,gf.g1q2,gf.g2q1,gf.g2q2].filter(p=>p&&p!=='?');
    const scores={};
    finalistes.forEach(p=>{ scores[p]=parseInt(document.getElementById(`mk_${p}`)?.value)||0; });
    Finale.setGrandeFinaleResult(idx,scores); buildFinalePage();
  },
  resetFinale() { if(confirm('Réinitialiser toute la phase finale ?')){Finale.reset();buildFinalePage();} }
};
