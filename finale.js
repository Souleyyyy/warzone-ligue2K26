// ── WARZONE LEAGUE 2026 — PAGE FINALE (lecture seule depuis data.json) ───────
//
// Les données sont lues depuis WZ.getFinale() qui charge data.json via GitHub.
// Workflow admin : Excel → Import → Publier → data.json → GitHub → page se met à jour.
// Aucune saisie directe sur cette page.

function buildFinalePage() {
  const wrap = document.getElementById('finale-content');
  if (!wrap) return;

  const data = WZ.getFinale();
  const stats = WZ.getStats();
  const getRank = n => { const i = stats.findIndex(p => p.name === n); return i >= 0 ? i+1 : null; };

  // ── Vide si pas encore de données ──────────────────────────────────────
  if (!data) {
    wrap.innerHTML = `<div class="stats-empty">
      <div style="font-size:48px;margin-bottom:16px">⏳</div>
      <div style="font-family:var(--font-title);font-size:22px;color:var(--text2)">Phase finale non commencée</div>
      <div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-top:10px">
        // Les résultats apparaîtront après import Excel + publication du data.json
      </div>
    </div>`;
    return;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  const playerPill = (name, extra='') => {
    if (!name || name === '?') {
      return `<div class="fl-player fl-tbd"><span class="fl-tbd-icon">?</span><span class="fl-tbd-txt">À déterminer</span></div>`;
    }
    const photo = WZ.getPhoto(name);
    const isT3  = WZ.TOP3.has(name);
    const avIn  = photo
      ? `<img src="${photo}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : name[0];
    const r = getRank(name);
    return `<div class="fl-player ${extra}">
      <div class="fl-av">${avIn}</div>
      <span class="fl-name ${isT3?'is-top3':''}">${isT3?'★ ':''}${name}</span>
      ${r ? `<span class="fl-rank">#${r}</span>` : ''}
    </div>`;
  };

  const medals = ['🥇','🥈','🥉','4e'];
  const rankColors = ['var(--gold)','#c0c0cd','#cd7f32','var(--text2)'];

  // ── Render match 4 joueurs (lecture seule) ───────────────────────────
  const renderMatch4 = (matchData, title, sublabel) => {
    if (!matchData) return '';
    const m = matchData;

    // Calculer rangs depuis les kills
    const ranked = m.players
      .filter(p => p.name)
      .map(p => ({
        name:  p.name,
        total: (p.kills||[]).reduce((s,k)=>s+(parseInt(k)||0),0),
        best:  Math.max(...(p.kills||[0]).map(k=>parseInt(k)||0))
      }))
      .sort((a,b) => b.total !== a.total ? b.total-a.total : b.best-a.best);
    ranked.forEach((p,i) => p.rank = i+1);

    const rows = m.players.map(pl => {
      const r = ranked.find(x => x.name === pl.name);
      const total = (pl.kills||[]).reduce((s,k)=>s+(parseInt(k)||0),0);
      const rn = r?.rank;
      const rc = rankColors[(rn||4)-1];

      const mancheCells = (pl.kills||[0,0,0,0,0]).map(k =>
        `<span class="fl-manche-val">${k||0}</span>`
      ).join('');

      return `<div class="fl-4p-row ${m.validated && rn <= 2 ? 'fl-top2' : ''}">
        <div class="fl-4p-rank" style="color:${rc}">${m.validated && rn ? medals[rn-1] : '—'}</div>
        ${playerPill(pl.name, 'fl-4p-player')}
        <div class="fl-4p-manches">${mancheCells}</div>
        <div class="fl-4p-total" style="color:${m.validated ? rc : 'var(--text3)'}">
          ${m.validated ? total+'K' : '—'}
        </div>
      </div>`;
    }).join('');

    // Résultat qualifiés
    const result = m.validated && ranked.length >= 2
      ? `<div class="fl-4p-result">
          <span class="fl-qual-badge gold">🏆 1er qualifié → ${ranked[0].name} (${ranked[0].total}K)</span>
          <span class="fl-qual-badge silver">✅ 2e qualifié → ${ranked[1].name} (${ranked[1].total}K)</span>
        </div>`
      : '';

    return `<div class="fl-4match ${m.validated ? 'fl-done' : ''}">
      <div class="fl-4match-head">
        <div class="fl-4match-label">${title}</div>
        ${m.validated
          ? '<span class="fl-done-badge">✓ Validé</span>'
          : '<span class="fl-pending-badge">⏳ À jouer</span>'}
      </div>
      <div class="fl-4match-sub">${sublabel}</div>
      <div class="fl-4match-header-row">
        <div style="flex:0 0 30px"></div>
        <div style="flex:1;font-family:var(--font-mono);font-size:8px;color:var(--text3)">JOUEUR</div>
        <div class="fl-4p-manches-head">G.1 &nbsp; G.2 &nbsp; G.3 &nbsp; G.4 &nbsp; G.5</div>
        <div style="width:52px;text-align:right;font-family:var(--font-mono);font-size:8px;color:var(--text3)">TOTAL</div>
      </div>
      ${rows}
      ${result}
    </div>`;
  };

  // ── Render groupe ────────────────────────────────────────────────────
  const renderGroupe = (gData, label, color, lbls) => {
    if (!gData) return '';
    return `<div class="fl-groupe-wrap">
      <div class="fl-groupe-header" style="color:${color}">${label}</div>
      <div class="fl-groupe-labels">
        ${lbls.map(l=>`<div class="fl-gp-tag"><span class="fl-gp-lbl">${l}</span></div>`).join('')}
      </div>
      ${renderMatch4(gData, label, '4 joueurs · 5 manches · Kills only · Les 2 premiers qualifiés pour la Grande Finale')}
    </div>`;
  };

  // ── Grande Finale ────────────────────────────────────────────────────
  const gf = data.grandeFinale || {};
  const finalistes = [gf.g1q1, gf.g1q2, gf.g2q1, gf.g2q2].filter(p => p && p !== '?');
  const mkWins = gf.mkWins || {};

  const mkHtml = (gf.masterKills || []).map((mk, i) => {
    if (!mk) return '';
    const s = mk.scores || {};
    const rows = finalistes.map(p => {
      const isWinner = mk.winner === p;
      const w = mkWins[p] || 0;
      return `<div class="fl-mk-row ${isWinner ? 'fl-win' : ''}">
        ${playerPill(p, 'fl-mk-player')}
        <span class="fl-mk-kills">${s[p] || 0}K</span>
        ${isWinner ? `<span class="fl-mk-crown">👑 +1 (total: ${w})</span>` : ''}
      </div>`;
    }).join('');
    return `<div class="fl-mk fl-done">
      <div class="fl-mk-label">Master Kill ${i+1} — Gagné par <strong>${mk.winner || '?'}</strong></div>
      <div class="fl-mk-rows">${rows}</div>
    </div>`;
  }).join('');

  const scoresHtml = finalistes.length > 0
    ? finalistes.map(p => {
        const w = mkWins[p] || 0;
        const isChamp = p === gf.champion;
        return `<div class="fl-gf-player-score ${isChamp ? 'fl-gf-champion' : ''}">
          ${playerPill(p)}
          <div class="fl-gf-mk-score">${w}</div>
          <div class="fl-gf-mk-label">MK gagnés</div>
          ${isChamp ? `<div class="fl-champ-badge">👑 CHAMPION</div>` : ''}
        </div>`;
      }).join('')
    : `<div style="color:var(--text3);font-family:var(--font-mono);font-size:11px;padding:20px">
        // Les 4 finalistes apparaîtront après validation des groupes
      </div>`;

  const champHtml = gf.champion
    ? `<div class="fl-champion">
        <div class="fl-champ-crown">👑</div>
        <div class="fl-champ-label">CHAMPION WARZONE LEAGUE 2026</div>
        <div class="fl-champ-team">${gf.champion}</div>
      </div>` : '';

  // ── Bracket ──────────────────────────────────────────────────────────
  const mpi = data.masterPlayIn || {};
  const pi  = data.playIn || {};
  const g1  = data.groupes?.g1 || {};
  const g2  = data.groupes?.g2 || {};

  const rankM = (match) => {
    if (!match?.validated) return [];
    return [...(match.players||[])].filter(p=>p.name)
      .map(p => ({ name:p.name, total:(p.kills||[]).reduce((s,k)=>s+(parseInt(k)||0),0) }))
      .sort((a,b) => b.total-a.total);
  };

  const mpi1 = rankM(mpi)[0]?.name || '?';
  const mpi2 = rankM(mpi)[1]?.name || '?';
  const pi1  = rankM(pi)[0]?.name  || '?';
  const pi2  = rankM(pi)[1]?.name  || '?';
  const cl   = WZ.getStats();
  const cn   = i => cl[i]?.name || '?';

  const bslot = (n, lbl, hl='') => {
    if (!n || n === '?') return `<div class="br-slot br-tbd"><span class="br-slot-label">${lbl}</span><span class="br-tbd-txt">?</span></div>`;
    const ph = WZ.getPhoto(n);
    const av = ph
      ? `<img src="${ph}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0">`
      : `<span class="br-av">${n[0]}</span>`;
    return `<div class="br-slot ${hl}"><span class="br-slot-label">${lbl}</span>${av}<span class="br-slot-name">${n}</span></div>`;
  };

  // CSS inline pour les éléments manquants
  if (!document.getElementById('finale-extra-css')) {
    const style = document.createElement('style');
    style.id = 'finale-extra-css';
    style.textContent = `
      .fl-4match{background:var(--glass);backdrop-filter:blur(18px);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:8px}
      .fl-4match.fl-done{border-color:rgba(75,232,128,0.25)}
      .fl-4match-head{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:rgba(255,255,255,0.03);border-bottom:1px solid var(--border)}
      .fl-4match-label{font-family:var(--font-title);font-size:13px;font-weight:700;color:var(--gold)}
      .fl-4match-sub{font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;padding:6px 18px;border-bottom:1px solid rgba(255,255,255,0.04)}
      .fl-done-badge{font-family:var(--font-mono);font-size:9px;color:var(--green);border:1px solid rgba(75,232,128,.3);background:rgba(75,232,128,.07);padding:2px 8px;border-radius:99px}
      .fl-pending-badge{font-family:var(--font-mono);font-size:9px;color:var(--text3);border:1px solid var(--border);padding:2px 8px;border-radius:99px}
      .fl-4match-header-row{display:flex;align-items:center;padding:6px 18px;gap:10px;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.04)}
      .fl-4p-manches-head{font-family:var(--font-mono);font-size:8px;color:var(--text3);text-align:center;width:220px;flex-shrink:0}
      .fl-4p-row{display:flex;align-items:center;padding:10px 18px;gap:10px;border-bottom:1px solid rgba(255,255,255,0.04)}
      .fl-4p-row:last-child{border-bottom:none}
      .fl-4p-row.fl-top2{background:rgba(75,232,128,0.05)}
      .fl-4p-rank{font-size:16px;width:30px;flex-shrink:0;text-align:center}
      .fl-4p-player{flex:1}
      .fl-4p-manches{display:flex;gap:5px;align-items:center;width:220px;flex-shrink:0}
      .fl-manche-val{font-family:var(--font-mono);font-size:12px;color:var(--text2);width:36px;text-align:center;background:rgba(255,255,255,0.04);border-radius:4px;padding:4px 2px}
      .fl-4p-total{font-family:var(--font-title);font-size:15px;font-weight:800;width:52px;text-align:right;flex-shrink:0}
      .fl-4p-result{padding:12px 18px;display:flex;gap:10px;flex-wrap:wrap;border-top:1px solid rgba(75,232,128,.15);background:rgba(75,232,128,.04)}
      .fl-qual-badge{font-family:var(--font-mono);font-size:10px;padding:4px 10px;border-radius:99px;border:1px solid}
      .fl-qual-badge.gold{color:var(--gold);border-color:var(--gold-border);background:var(--gold-glow)}
      .fl-qual-badge.silver{color:#c0c0cd;border-color:rgba(192,192,205,.3);background:rgba(192,192,205,.07)}
      .fl-groupe-wrap{margin-bottom:8px}
      .fl-groupe-header{font-family:var(--font-title);font-size:13px;font-weight:800;padding:8px 0 6px;letter-spacing:1px}
      .fl-groupe-labels{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
      .fl-gp-tag{background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:99px;padding:2px 10px}
      .fl-gp-lbl{font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px}
      .fl-gf-scores{display:flex;gap:12px;flex-wrap:wrap;padding:20px 24px;border-bottom:1px solid var(--gold-border);justify-content:center}
      .fl-gf-player-score{display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 20px;border-radius:var(--r-lg);border:1px solid var(--border);background:var(--glass);min-width:120px}
      .fl-gf-player-score.fl-gf-champion{border-color:var(--gold-border);background:var(--gold-glow);box-shadow:0 0 20px rgba(232,184,75,0.15)}
      .fl-gf-mk-score{font-family:var(--font-title);font-size:36px;font-weight:800;color:var(--gold);line-height:1}
      .fl-gf-mk-label{font-family:var(--font-mono);font-size:8px;color:var(--text3);letter-spacing:1px;text-transform:uppercase}
      .fl-champ-badge{font-family:var(--font-mono);font-size:9px;color:var(--gold);background:var(--gold-glow);border:1px solid var(--gold-border);padding:2px 8px;border-radius:99px}
      .fl-mk-rows{display:flex;flex-direction:column;gap:6px;padding:10px 0}
      .fl-mk-row{display:flex;align-items:center;gap:10px;padding:7px 16px;border-radius:var(--r-sm)}
      .fl-mk-row.fl-win{background:rgba(232,184,75,0.08);border:1px solid var(--gold-border)}
      .fl-mk-player{flex:1}
      .fl-mk-kills{font-family:var(--font-title);font-size:15px;font-weight:800;color:var(--gold);min-width:48px;text-align:right}
      .fl-mk-crown{font-family:var(--font-mono);font-size:10px;color:var(--gold);background:var(--gold-glow);padding:2px 8px;border-radius:99px}
      @media(max-width:600px){.fl-4p-manches{width:auto;flex-wrap:wrap}.fl-4p-manches-head,.fl-4match-header-row{display:none}}
    `;
    document.head.appendChild(style);
  }

  // ── Assemblage ────────────────────────────────────────────────────────
  wrap.innerHTML = `
    <!-- BRACKET -->
    <div class="stats-section-label">// TABLEAU DE LA PHASE FINALE</div>
    <div class="bracket-wrap"><div class="bracket-scroll"><div class="bracket">
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
        <div class="br-col-title">FINAL 8</div>
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
              ${bslot(gf.g1q1||'?','G1 Q1','br-qualify')}
              ${bslot(gf.g1q2||'?','G1 Q2','br-qualify')}
            </div>
            <div class="br-finale-vs">VS</div>
            <div class="br-finale-team">
              ${bslot(gf.g2q1||'?','G2 Q1','br-qualify')}
              ${bslot(gf.g2q2||'?','G2 Q2','br-qualify')}
            </div>
            ${gf.champion ? `<div class="br-champion">👑 ${gf.champion}</div>` : ''}
          </div>
        </div>
      </div>
    </div></div></div>

    <!-- MASTER PLAY-IN -->
    <div class="stats-section-label" style="margin-top:48px">
      // MASTER PLAY-IN &nbsp;<span style="color:var(--red);font-size:9px">4 joueurs · 5 manches · Les 2 premiers qualifiés</span>
    </div>
    ${renderMatch4(mpi, 'Master Play-In — 9e · 10e · 11e · 12e', '4 joueurs jouent ensemble · 1er et 2e rejoignent le Play-In Final')}

    <!-- PLAY-IN FINAL -->
    <div class="stats-section-label" style="margin-top:40px">
      // PLAY-IN FINAL &nbsp;<span style="color:var(--gold);font-size:9px">4 joueurs · 5 manches · Les 2 premiers qualifiés</span>
    </div>
    ${renderMatch4(pi, 'Play-In Final — 7e · 8e · 1er MPI · 2e MPI', '4 joueurs jouent ensemble · 1er et 2e rejoignent le Final 8')}

    <!-- GROUPES -->
    <div class="stats-section-label" style="margin-top:40px">// FINAL 8 — PHASE DE GROUPES</div>
    <div class="fl-groupes-grid">
      ${renderGroupe(g1,'🔴 GROUPE 1  ·  1er + 2e PI + 4e + 5e','var(--red)',['1er Ligue','2e Play-In','4e Ligue','5e Ligue'])}
      ${renderGroupe(g2,'🔵 GROUPE 2  ·  2e + 1er PI + 3e + 6e','#4be8ff',['2e Ligue','1er Play-In','3e Ligue','6e Ligue'])}
    </div>

    <!-- GRANDE FINALE -->
    <div class="stats-section-label" style="margin-top:40px">
      // GRANDE FINALE &nbsp;<span style="color:var(--gold);font-size:9px">4 joueurs · Best of 5 MK · 1 seul Champion</span>
    </div>
    <div class="fl-grande-finale">
      <div class="fl-gf-scores">${scoresHtml}</div>
      <div class="fl-mk-list">${mkHtml || '<div style="padding:20px 24px;font-family:var(--font-mono);font-size:11px;color:var(--text3)">// Les Master Kills apparaîtront après validation</div>'}</div>
      ${champHtml}
    </div>

    <div style="margin-top:16px;font-family:var(--font-mono);font-size:10px;color:var(--text3);text-align:center">
      // Mise à jour via Admin → Import Excel → Publier → data.json → GitHub
    </div>
    <div style="padding-bottom:56px"></div>
  `;
}
