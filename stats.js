// ── WARZONE LEAGUE 2026 — STATS PAGE ────────────────────────────────────────

function buildStatsPage() {
  const state    = WZ.getState();
  const schedule = WZ.SCHEDULE;
  const NAMES    = WZ.NAMES;
  const TOP3     = WZ.TOP3;

  // ── Calcul de toutes les stats ──────────────────────────────────────────
  const playerStats = {};
  NAMES.forEach(n => {
    playerStats[n] = {
      name: n, isTop3: TOP3.has(n),
      totalKills: 0, totalBonus: 0,
      partiesJouees: 0,
      nb1er: 0, nb2e: 0,
      killsParGame: [],
      killsParJournee: {},
      killsMax1Game: 0, killsMax1Journee: 0,
      killsMin1Game: Infinity, killsMin1Journee: Infinity,
      // Pour l'évolution : points cumulés après chaque journée jouée
      evolutionPts: {}, // j -> total points après cette journée
    };
  });

  let recordKillsJournee       = { kills: 0, name: '', j: 0 };
  let recordKillsJourneeHorsT3 = { kills: 0, name: '', j: 0 };
  let recordKillsGame          = { kills: 0, name: '', j: 0, partie: '' };
  let worstKillsJournee        = { kills: Infinity, name: '', j: 0 };
  let worstKillsGame           = { kills: Infinity, name: '', j: 0, partie: '' };
  const top5Journees = [];

  // Points cumulés par joueur par journée (pour graphique évolution)
  const cumulPoints = {}; // name -> {j -> pts cumulés}
  NAMES.forEach(n => { cumulPoints[n] = {}; });
  const journeesJouees = []; // liste ordonnée des journées avec au moins 1 partie validée

  schedule.forEach(day => {
    const joueurs_journee = {};
    let hasPartieThisDay = false;

    ['A','B','C'].forEach(p => {
      const partie = state.results[day.j]?.[p];
      if (!partie?.validated) return;
      hasPartieThisDay = true;

      const ranked = WZ.rankPartie(partie.players);
      ranked.forEach(pl => {
        if (!playerStats[pl.name]) return;
        const ps = playerStats[pl.name];
        const k  = pl.total;

        ps.totalKills    += k;
        ps.totalBonus    += WZ.BONUS[pl.rank] || 0;
        ps.partiesJouees += 1;
        ps.killsParGame.push({ j: day.j, partie: p, kills: k });
        if (pl.rank === 1) ps.nb1er++;
        if (pl.rank === 2) ps.nb2e++;
        // Max/min sur UNE seule manche parmi les 5
        const manchesPlayer = pl.kills || [];
        manchesPlayer.forEach(mk => {
          const mkInt = parseInt(mk) || 0;
          if (mkInt > ps.killsMax1Game) ps.killsMax1Game = mkInt;
          if (mkInt < ps.killsMin1Game) ps.killsMin1Game = mkInt;
        });

        // Records sur UNE SEULE manche (1 des 5 games)
        const mancheKills = pl.kills || [];
        mancheKills.forEach((mk, mi) => {
          const mkInt = parseInt(mk) || 0;
          if (mkInt > recordKillsGame.kills)
            recordKillsGame = { kills: mkInt, name: pl.name, j: day.j, partie: p, manche: mi+1 };
          if (mkInt < worstKillsGame.kills && mkInt >= 0)
            worstKillsGame = { kills: mkInt, name: pl.name, j: day.j, partie: p, manche: mi+1 };
        });

        if (!joueurs_journee[pl.name]) joueurs_journee[pl.name] = 0;
        joueurs_journee[pl.name] += k;
        if (!ps.killsParJournee[day.j]) ps.killsParJournee[day.j] = 0;
        ps.killsParJournee[day.j] += k;
      });
    });

    if (hasPartieThisDay) journeesJouees.push(day.j);

    Object.entries(joueurs_journee).forEach(([name, kills]) => {
      const ps = playerStats[name];
      if (kills > ps.killsMax1Journee) ps.killsMax1Journee = kills;
      if (kills < ps.killsMin1Journee) ps.killsMin1Journee = kills;
      top5Journees.push({ name, j: day.j, kills });
      if (kills > recordKillsJournee.kills)
        recordKillsJournee = { kills, name, j: day.j };
      if (!TOP3.has(name) && kills > recordKillsJourneeHorsT3.kills)
        recordKillsJourneeHorsT3 = { kills, name, j: day.j };
      if (kills < worstKillsJournee.kills)
        worstKillsJournee = { kills, name, j: day.j };
    });
  });

  // Calcul des points cumulés pour l'évolution
  // On recalcule depuis 0 journée par journée
  const pointsCumuls = {};
  NAMES.forEach(n => { pointsCumuls[n] = 0; });

  journeesJouees.forEach(j => {
    ['A','B','C'].forEach(p => {
      const partie = state.results[j]?.[p];
      if (!partie?.validated) return;
      WZ.rankPartie(partie.players).forEach(pl => {
        if (pointsCumuls[pl.name] !== undefined) {
          pointsCumuls[pl.name] += pl.total + (WZ.BONUS[pl.rank] || 0);
        }
      });
    });
    NAMES.forEach(n => {
      if (!cumulPoints[n]) cumulPoints[n] = {};
      const sanc = state.sanctions?.[n] || 0;
      cumulPoints[n][j] = pointsCumuls[n] + sanc;
    });
  });

  // Finalize
  NAMES.forEach(n => {
    const ps = playerStats[n];
    ps.total = ps.totalKills + ps.totalBonus + (state.sanctions?.[n] || 0);
    ps.moyenne = ps.partiesJouees > 0 ? (ps.totalKills / ps.partiesJouees).toFixed(1) : '—';
    if (ps.killsMin1Game === Infinity) ps.killsMin1Game = 0;
    if (ps.killsMin1Journee === Infinity) ps.killsMin1Journee = 0;
    ps.killsMax1Game = ps.killsMax1Game || 0;
  });



  // Top 5 journées
  top5Journees.sort((a,b) => b.kills - a.kills);
  const top5 = top5Journees.slice(0, 5);

  const classement = WZ.getStats();
  const hasData = classement.some(p => p.partiesJouees > 0);

  const wrap = document.getElementById('stats-content');
  if (!wrap) return;

  if (!hasData) {
    wrap.innerHTML = `<div class="stats-empty">
      <div style="font-size:48px;margin-bottom:16px">📊</div>
      <div style="font-family:var(--font-title);font-size:22px;color:var(--text2)">Aucune partie jouée pour le moment</div>
      <div style="font-family:var(--font-mono);font-size:12px;color:var(--text3);margin-top:8px">// Les statistiques apparaîtront dès la première journée validée</div>
    </div>`;
    return;
  }

  // ── DBZ Badges ──────────────────────────────────────────────────────────
  const dbzBadge = (emoji, label, color, shadow) => `
    <div class="dbz-badge" style="--dbz-color:${color};--dbz-shadow:${shadow}">
      <div class="dbz-emoji">${emoji}</div>
      <div class="dbz-label">${label}</div>
    </div>`;

  const recordCard = (emoji, label, sublabel, title, name, value, unit, isNeg=false) => `
    <div class="record-card ${isNeg?'record-neg':'record-pos'}">
      <div class="record-dbz">${dbzBadge(emoji, label, isNeg?'#e84b6a':'#4be880', isNeg?'rgba(232,75,106,0.4)':'rgba(75,232,128,0.35)')}</div>
      <div class="record-body">
        <div class="record-title">${title}</div>
        <div class="record-sub">${sublabel}</div>
        <div class="record-name">${name||'—'}</div>
        <div class="record-value">${value}<span class="record-unit"> ${unit}</span></div>
      </div>
    </div>`;

  // Records spéciaux avec leurs couleurs DBZ
  const rec1 = `<div class="record-card record-pos" style="--accent:#e84b6a">
    <div class="dbz-img-wrap">
      <img src="dbz_goku_ssj4.png" alt="Goku SSJ4" class="dbz-img">
    </div>
    <div class="record-body">
      <div class="record-title">🔥 ROI DES KILLS</div>
      <div class="record-sub">Max kills sur une journée</div>
      <div class="record-name" style="color:#e84b6a">${recordKillsJournee.name||'—'}</div>
      <div class="record-value" style="color:#e84b6a">${recordKillsJournee.kills}<span class="record-unit"> kills · J${recordKillsJournee.j}</span></div>
    </div></div>`;

  const rec2 = `<div class="record-card record-pos" style="--accent:#4be8ff">
    <div class="dbz-img-wrap">
      <img src="dbz_gohan_ssj2.jpg" alt="Gohan SSJ2" class="dbz-img">
    </div>
    <div class="record-body">
      <div class="record-title">⚡ OUTSIDER</div>
      <div class="record-sub">Max kills hors TOP 3</div>
      <div class="record-name" style="color:#4be8ff">${recordKillsJourneeHorsT3.name||'—'}</div>
      <div class="record-value" style="color:#4be8ff">${recordKillsJourneeHorsT3.kills}<span class="record-unit"> kills · J${recordKillsJourneeHorsT3.j}</span></div>
    </div></div>`;

  const rec3 = `<div class="record-card record-pos">
    <div class="dbz-img-wrap">
      <img src="dbz_goku_ssj3.jpg" alt="Goku SSJ3" class="dbz-img">
    </div>
    <div class="record-body">
      <div class="record-title">✨ GAME PARFAITE</div>
      <div class="record-sub">Max kills sur une game</div>
      <div class="record-name" style="color:var(--gold)">${recordKillsGame.name||'—'}</div>
      <div class="record-value">${recordKillsGame.kills}<span class="record-unit"> kills · J${recordKillsGame.j}${recordKillsGame.partie} G.${recordKillsGame.manche||'?'}</span></div>
    </div></div>`;

  const rec4 = `<div class="record-card record-neg">
    <div class="dbz-img-wrap">
      <img src="dbz_krillin.webp" alt="Krillin" class="dbz-img">
    </div>
    <div class="record-body">
      <div class="record-title">😅 KRILLIN AWARD</div>
      <div class="record-sub">Min kills sur une journée</div>
      <div class="record-name">${worstKillsJournee.name||'—'}</div>
      <div class="record-value">${worstKillsJournee.kills===Infinity?0:worstKillsJournee.kills}<span class="record-unit"> kills · J${worstKillsJournee.j}</span></div>
    </div></div>`;

  const rec5 = `<div class="record-card record-neg">
    <div class="dbz-img-wrap">
      <img src="dbz_yamcha.jpg" alt="Yamcha" class="dbz-img">
    </div>
    <div class="record-body">
      <div class="record-title">💀 YAMCHA AWARD</div>
      <div class="record-sub">Min kills sur une game</div>
      <div class="record-name">${worstKillsGame.name||'—'}</div>
      <div class="record-value">${worstKillsGame.kills===Infinity?0:worstKillsGame.kills}<span class="record-unit"> kills · J${worstKillsGame.j}${worstKillsGame.partie} G.${worstKillsGame.manche||'?'}</span></div>
    </div></div>`;

  // ── Top 5 graphique ──────────────────────────────────────────────────────
  const maxK = top5[0]?.kills || 1;
  const barColors = ['var(--gold)','#c0c0cd','#cd7f32','var(--text2)','var(--text3)'];
  const medals    = ['🥇','🥈','🥉','4','5'];
  const top5Html  = top5.map((t,i) => `
    <div class="chart-row">
      <div class="chart-medal">${medals[i]}</div>
      <div class="chart-name">${t.name}<span class="chart-j">J${t.j}</span></div>
      <div class="chart-bar-wrap">
        <div class="chart-bar" style="--bar-w:${Math.round(t.kills/maxK*100)}%;background:${barColors[i]};animation-delay:${i*0.12}s"></div>
      </div>
      <div class="chart-val" style="color:${barColors[i]}">${t.kills}</div>
    </div>`).join('');

  // ── Focus joueurs ────────────────────────────────────────────────────────
  const focusRows = classement.filter(p => p.partiesJouees > 0).map((p,i) => {
    const ps  = playerStats[p.name];
    const isT3 = TOP3.has(p.name);
    const photo = WZ.getPhoto(p.name);
    const avIn = photo
      ? `<img src="${photo}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : p.name.charAt(0);
    return `
      <div class="focus-row fu" style="animation-delay:${i*0.04}s">
        <div class="focus-avatar ${isT3?'is-top3':''}">${avIn}</div>
        <div class="focus-name">${isT3?'★ ':''}${p.name}</div>
        <div class="focus-cell gold">${ps.nb1er}</div>
        <div class="focus-cell silver">${ps.nb2e}</div>
        <div class="focus-cell">${ps.moyenne}</div>
        <div class="focus-cell">${ps.killsMax1Game}</div>
        <div class="focus-cell">${ps.killsMax1Journee||0}</div>
      </div>`;
  }).join('');

  // ── Graphique évolution (SVG) ────────────────────────────────────────────
  const evoHtml = buildEvolutionChart(cumulPoints, journeesJouees, classement);

  // ── Régularité ───────────────────────────────────────────────────────────
  // Constance : % de fois dans le top 2 (1er ou 2e)
  const constancePlayers = classement
    .filter(p => p.partiesJouees >= 1)
    .map(p => {
      const ps = playerStats[p.name];
      const top2 = ps.nb1er + ps.nb2e;
      const pct  = Math.round(top2 / p.partiesJouees * 100);
      return { ...p, top2, pct };
    })
    .sort((a,b) => b.pct - a.pct);

  const constanceRows = constancePlayers.map((p, i) => {
    const color = p.pct >= 50 ? 'var(--green)' : p.pct >= 25 ? 'var(--gold)' : 'var(--red)';
    const label = i === 0 ? ' 🏅 Le plus constant' : '';
    return `
      <div class="reg-row">
        <div class="reg-name">${p.name}<span class="reg-badge" style="color:${color}">${label}</span></div>
        <div class="reg-bar-wrap">
          <div class="reg-bar" style="--bar-w:${p.pct}%;background:${color};animation-delay:${i*0.05}s"></div>
        </div>
        <div class="reg-val">
          <span style="color:${color}">${p.pct}%</span>
          <span class="reg-mean">${p.top2}/${p.partiesJouees} parties</span>
        </div>
      </div>`;
  }).join('');

  wrap.innerHTML = `
    <!-- RECORDS -->
    <div class="stats-section-label">// RECORDS</div>
    <div class="records-grid">${rec1}${rec2}${rec3}${rec4}${rec5}</div>

    <!-- TOP 5 -->
    <div class="stats-section-label" style="margin-top:48px">// TOP 5 PERFORMANCES — KILLS PAR JOURNÉE</div>
    <div class="chart-card">
      <div class="chart-title">🏆 Meilleures journées de tous les temps</div>
      <div class="chart-body">${top5Html}</div>
    </div>

    <!-- FOCUS JOUEURS -->
    <div class="stats-section-label" style="margin-top:48px">// FOCUS JOUEURS</div>
    <div class="focus-wrap">
      <div class="focus-head">
        <div></div>
        <div class="focus-name-head">Joueur</div>
        <div class="focus-cell-head">🥇 1er</div>
        <div class="focus-cell-head">🥈 2e</div>
        <div class="focus-cell-head">Moy K</div>
        <div class="focus-cell-head">⚡ Max manche</div>
        <div class="focus-cell-head">🔥 Max journée</div>
      </div>
      ${focusRows}
    </div>

    <!-- ÉVOLUTION -->
    <div class="stats-section-label" style="margin-top:48px">// ÉVOLUTION DU CLASSEMENT</div>
    ${evoHtml}

    <!-- CONSTANCE -->
    <div class="stats-section-label" style="margin-top:48px">// CONSTANCE — % de fois dans le TOP 2</div>
    <div class="chart-card">
      <div class="chart-title">🎯 Taux de podium — nombre de fois 1er ou 2e sur toutes les parties jouées</div>
      <div class="chart-body" style="gap:10px">${constanceRows}</div>
    </div>
    <div style="padding-bottom:56px"></div>
  `;

  // Rendre les barres animées (CSS animation sur --bar-w)
  requestAnimationFrame(() => {
    document.querySelectorAll('.chart-bar, .reg-bar').forEach(el => {
      el.style.width = el.style.getPropertyValue('--bar-w') ||
        getComputedStyle(el).getPropertyValue('--bar-w');
    });
  });
}

// ── Graphique SVG évolution ────────────────────────────────────────────────
function buildEvolutionChart(cumulPoints, journees, classement) {
  if (journees.length < 2) {
    return `<div class="chart-card"><div class="chart-title" style="color:var(--text2)">// Disponible après 2 journées jouées</div></div>`;
  }

  const W = 700, H = 280, PAD = { t:20, r:20, b:36, l:46 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  // Joueurs actifs (au moins 1 partie)
  const active = classement.filter(p => p.partiesJouees > 0).map(p => p.name);

  // Max points pour l'échelle
  let maxPts = 1;
  active.forEach(name => {
    journees.forEach(j => {
      const v = cumulPoints[name]?.[j] || 0;
      if (v > maxPts) maxPts = v;
    });
  });

  // Couleurs pour chaque joueur
  const palette = [
    '#e8b84b','#4be880','#4be8ff','#e84b6a','#b44bff',
    '#ff8c4b','#4b8cff','#ff4be8','#8cff4b','#ff4b8c',
    '#4bffb4','#ffb44b','#b4ff4b'
  ];

  // Axes X
  const xStep = innerW / (journees.length - 1);
  const yScale = v => innerH - (v / maxPts) * innerH;

  // Grille Y
  const yTicks = 4;
  let gridLines = '';
  let yLabels = '';
  for (let i = 0; i <= yTicks; i++) {
    const y = PAD.t + (i / yTicks) * innerH;
    const val = Math.round(maxPts * (1 - i/yTicks));
    gridLines += `<line x1="${PAD.l}" y1="${y}" x2="${W-PAD.r}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    yLabels   += `<text x="${PAD.l-6}" y="${y+4}" fill="#3d4a60" font-size="9" text-anchor="end" font-family="monospace">${val}</text>`;
  }

  // Labels X (journées)
  let xLabels = '';
  journees.forEach((j, i) => {
    const x = PAD.l + i * xStep;
    xLabels += `<text x="${x}" y="${H-8}" fill="#3d4a60" font-size="9" text-anchor="middle" font-family="monospace">J${j}</text>`;
  });

  // Lignes des joueurs
  let lines = '';
  let dots  = '';
  let legendItems = '';

  active.forEach((name, ni) => {
    const color = palette[ni % palette.length];
    let pathD = '';
    journees.forEach((j, i) => {
      const v = cumulPoints[name]?.[j] || 0;
      const x = PAD.l + i * xStep;
      const y = PAD.t + yScale(v);
      pathD += (i === 0 ? 'M' : 'L') + `${x.toFixed(1)},${y.toFixed(1)} `;
    });

    lines += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" class="evo-line" style="--line-color:${color}"/>`;

    // Point final
    const lastJ = journees[journees.length - 1];
    const lastV = cumulPoints[name]?.[lastJ] || 0;
    const lx = PAD.l + (journees.length - 1) * xStep;
    const ly = PAD.t + yScale(lastV);
    dots += `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4" fill="${color}" stroke="${color}" stroke-width="1.5"/>`;

    legendItems += `<div class="evo-legend-item">
      <div style="width:14px;height:3px;background:${color};border-radius:2px;flex-shrink:0"></div>
      <span>${name}</span>
    </div>`;
  });

  return `
    <div class="chart-card evo-card">
      <div class="chart-title">📈 Points cumulés journée par journée</div>
      <div class="evo-wrap">
        <svg viewBox="0 0 ${W} ${H}" class="evo-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="gridFade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="rgba(255,255,255,0.08)"/>
              <stop offset="100%" stop-color="transparent"/>
            </linearGradient>
          </defs>
          ${gridLines}${yLabels}${xLabels}${lines}${dots}
        </svg>
      </div>
      <div class="evo-legend">${legendItems}</div>
    </div>`;
}
