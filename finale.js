// ── WARZONE LEAGUE 2026 — PHASE FINALE ──────────────────────────────────────

// Structure de la phase finale :
// - Master Play-In : 9e, 10e, 11e, 12e → 2 qualifiés
// - Play-In Final  : 7e, 8e + 2 gagnants Master PI → 2 qualifiés
// - Final 8        : 6 premiers + 2 qualifiés Play-In
//   Groupe 1 : 1er ligue, 2e Play-In, 3e ligue, 6e ligue
//   Groupe 2 : 2e ligue, 1er Play-In, 4e ligue, 5e ligue
// - Grande Finale  : 2 gagnants G1 vs 2 gagnants G2
//   Best-of-5 Master Kills (5 games chacun), gagner 2 MK pour être champion

const Finale = (() => {

  // Storage key
  const K = 'wz_finale_v1';
  const ls = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
  const ss = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  function initFinaleState() {
    return {
      // Master Play-In : matchs entre 9,10,11,12 → 2 qualifiés
      // Format: round-robin ou bracket? On fait bracket simple:
      // Match 1 : 9e vs 12e, Match 2 : 10e vs 11e → gagnants qualifiés
      masterPlayIn: {
        match1: { p1: null, p2: null, kills1: 0, kills2: 0, winner: null }, // 9e vs 12e
        match2: { p1: null, p2: null, kills1: 0, kills2: 0, winner: null }, // 10e vs 11e
      },
      // Play-In Final : 7e, 8e + 2 gagnants Master PI → 2 qualifiés
      // Match 1 : 7e vs gagnant2_masterPI, Match 2 : 8e vs gagnant1_masterPI
      playIn: {
        match1: { p1: null, p2: null, kills1: 0, kills2: 0, winner: null },
        match2: { p1: null, p2: null, kills1: 0, kills2: 0, winner: null },
      },
      // Groupes Final 8
      groupes: {
        // G1: 1er, 2e playin, 3e, 6e — chacun joue contre les autres, 2 premiers qualifiés
        g1: {
          players: [null, null, null, null], // [1er, 2e-playin, 3e, 6e]
          matchs: {
            // 6 matchs round-robin: p0vsp1, p0vsp2, p0vsp3, p1vsp2, p1vsp3, p2vsp3
            'm0v1': { kills0: 0, kills1: 0, winner: null },
            'm0v2': { kills0: 0, kills2: 0, winner: null },
            'm0v3': { kills0: 0, kills3: 0, winner: null },
            'm1v2': { kills1: 0, kills2: 0, winner: null },
            'm1v3': { kills1: 0, kills3: 0, winner: null },
            'm2v3': { kills2: 0, kills3: 0, winner: null },
          },
          qualifies: [null, null] // 2 premiers du groupe
        },
        g2: {
          players: [null, null, null, null], // [2e, 1er-playin, 4e, 5e]
          matchs: {
            'm0v1': { kills0: 0, kills1: 0, winner: null },
            'm0v2': { kills0: 0, kills2: 0, winner: null },
            'm0v3': { kills0: 0, kills3: 0, winner: null },
            'm1v2': { kills1: 0, kills2: 0, winner: null },
            'm1v3': { kills1: 0, kills3: 0, winner: null },
            'm2v3': { kills2: 0, kills3: 0, winner: null },
          },
          qualifies: [null, null]
        }
      },
      // Grande Finale : 2 de G1 vs 2 de G2, best-of-5 MK
      grandeFinale: {
        // finalists: [gagnant1_G1, gagnant2_G1, gagnant1_G2, gagnant2_G2]
        // Format: chaque "MK" = 1 master kill (5 games)
        // On stocke les scores de chaque MK (jusqu'à 5)
        masterKills: [
          // { winner: null, kills: {p1: 0, p2: 0, p3: 0, p4: 0} } x5 max
        ],
        scores: { g1p1: 0, g1p2: 0, g2p1: 0, g2p2: 0 }, // victoires MK
        champion: null
      }
    };
  }

  let finaleState = ls(K, null) || initFinaleState();

  function save() { ss(K, finaleState); }
  function getState() { return finaleState; }
  function reset() { finaleState = initFinaleState(); save(); }

  // Calcule les joueurs qualifiés depuis le classement saison régulière
  function getQualifies() {
    const classement = WZ.getStats();
    const top12 = classement.slice(0, 12);
    return {
      directs: top12.slice(0, 6),      // 1-6 : qualifiés directs
      playIn78: top12.slice(6, 8),     // 7-8 : Play-In Final
      masterPI: top12.slice(8, 12),    // 9-12 : Master Play-In
    };
  }

  // Auto-remplir les brackets depuis le classement
  function autoFill() {
    const q = getQualifies();
    const f = finaleState;

    // Master Play-In
    if (q.masterPI.length >= 4) {
      f.masterPlayIn.match1.p1 = q.masterPI[0].name; // 9e
      f.masterPlayIn.match1.p2 = q.masterPI[3].name; // 12e
      f.masterPlayIn.match2.p1 = q.masterPI[1].name; // 10e
      f.masterPlayIn.match2.p2 = q.masterPI[2].name; // 11e
    }
    // Play-In (les opponents dépendent des gagnants Master PI)
    if (q.playIn78.length >= 2) {
      f.playIn.match1.p1 = q.playIn78[0].name; // 7e
      f.playIn.match2.p1 = q.playIn78[1].name; // 8e
    }
    // Si Master PI a des gagnants, compléter Play-In
    if (f.masterPlayIn.match1.winner) f.playIn.match2.p2 = f.masterPlayIn.match1.winner;
    if (f.masterPlayIn.match2.winner) f.playIn.match1.p2 = f.masterPlayIn.match2.winner;

    // Groupes — remplir avec gagnants Play-In si disponibles
    const pi1 = f.playIn.match1.winner; // 1er qualifié play-in
    const pi2 = f.playIn.match2.winner; // 2e qualifié play-in
    if (q.directs.length >= 6) {
      f.groupes.g1.players[0] = q.directs[0].name; // 1er
      f.groupes.g1.players[1] = pi2 || '?';         // 2e play-in
      f.groupes.g1.players[2] = q.directs[2].name; // 3e
      f.groupes.g1.players[3] = q.directs[5].name; // 6e
      f.groupes.g2.players[0] = q.directs[1].name; // 2e
      f.groupes.g2.players[1] = pi1 || '?';         // 1er play-in
      f.groupes.g2.players[2] = q.directs[3].name; // 4e
      f.groupes.g2.players[3] = q.directs[4].name; // 5e
    }
    save();
  }

  // Sauvegarder un résultat de match
  function setMatchResult(phase, matchKey, kills1, kills2) {
    const winner = kills1 > kills2
      ? finaleState[phase === 'masterPlayIn' ? 'masterPlayIn' : 'playIn'][matchKey].p1
      : finaleState[phase === 'masterPlayIn' ? 'masterPlayIn' : 'playIn'][matchKey].p2;

    const m = phase === 'masterPlayIn'
      ? finaleState.masterPlayIn[matchKey]
      : finaleState.playIn[matchKey];

    m.kills1 = kills1;
    m.kills2 = kills2;
    m.winner = winner;
    autoFill(); // re-propage les résultats
    save();
  }

  function setGroupeMatch(g, matchKey, kills0, kills1) {
    const groupe = finaleState.groupes[g];
    const m = groupe.matchs[matchKey];
    // Déterminer les indices des joueurs depuis la clé (ex: m0v2 -> 0 vs 2)
    const parts = matchKey.replace('m','').split('v');
    const i0 = parseInt(parts[0]);
    const i1 = parseInt(parts[1]);
    m['kills'+i0] = kills0;
    m['kills'+i1] = kills1;
    m.winner = kills0 > kills1 ? groupe.players[i0] : groupe.players[i1];
    // Recalculer classement groupe
    calcGroupeClassement(g);
    save();
  }

  function calcGroupeClassement(g) {
    const groupe = finaleState.groupes[g];
    const pts = {};
    groupe.players.forEach((p, i) => { if (p) pts[p] = { wins: 0, kills: 0 }; });

    Object.entries(groupe.matchs).forEach(([key, m]) => {
      if (!m.winner) return;
      const parts = key.replace('m','').split('v');
      const i0 = parseInt(parts[0]);
      const i1 = parseInt(parts[1]);
      const p0 = groupe.players[i0];
      const p1 = groupe.players[i1];
      if (!p0 || !p1) return;
      if (!pts[p0]) pts[p0] = { wins: 0, kills: 0 };
      if (!pts[p1]) pts[p1] = { wins: 0, kills: 0 };
      pts[p0].kills += m['kills'+i0] || 0;
      pts[p1].kills += m['kills'+i1] || 0;
      if (m.winner === p0) pts[p0].wins++;
      else pts[p1].wins++;
    });

    const ranked = groupe.players
      .filter(p => p && p !== '?')
      .sort((a, b) => {
        if (!pts[a]) return 1;
        if (!pts[b]) return -1;
        return pts[b].wins !== pts[a].wins
          ? pts[b].wins - pts[a].wins
          : pts[b].kills - pts[a].kills;
      });

    groupe.qualifies = [ranked[0] || null, ranked[1] || null];
    groupe.pts = pts;

    // Mettre à jour Grande Finale
    const gf = finaleState.grandeFinale;
    if (finaleState.groupes.g1.qualifies[0]) gf.g1q1 = finaleState.groupes.g1.qualifies[0];
    if (finaleState.groupes.g1.qualifies[1]) gf.g1q2 = finaleState.groupes.g1.qualifies[1];
    if (finaleState.groupes.g2.qualifies[0]) gf.g2q1 = finaleState.groupes.g2.qualifies[0];
    if (finaleState.groupes.g2.qualifies[1]) gf.g2q2 = finaleState.groupes.g2.qualifies[1];
  }

  function setGrandeFinaleResult(mkIndex, scores) {
    // scores: {p1: kills, p2: kills, p3: kills, p4: kills}
    if (!finaleState.grandeFinale.masterKills) finaleState.grandeFinale.masterKills = [];
    finaleState.grandeFinale.masterKills[mkIndex] = { scores, winner: null };
    // Calculer le vainqueur du MK
    const gf = finaleState.grandeFinale;
    const g1 = (scores[gf.g1q1]||0) + (scores[gf.g1q2]||0);
    const g2 = (scores[gf.g2q1]||0) + (scores[gf.g2q2]||0);
    if (g1 > g2) {
      gf.masterKills[mkIndex].winner = 'G1';
      gf.scores.g1 = (gf.scores.g1||0) + 1;
    } else {
      gf.masterKills[mkIndex].winner = 'G2';
      gf.scores.g2 = (gf.scores.g2||0) + 1;
    }
    // Champion si 2 victoires
    if (gf.scores.g1 >= 2) gf.champion = 'G1';
    if (gf.scores.g2 >= 2) gf.champion = 'G2';
    save();
  }

  return {
    getState, getQualifies, autoFill, save, reset,
    setMatchResult, setGroupeMatch, setGrandeFinaleResult
  };
})();

// ── RENDER PHASE FINALE ──────────────────────────────────────────────────────
function buildFinalePage() {
  const wrap = document.getElementById('finale-content');
  if (!wrap) return;

  Finale.autoFill();
  const f = Finale.getState();
  const q = Finale.getQualifies();
  const isAdmin = sessionStorage.getItem('wz_ok') === '1';

  // Helper : carte joueur
  const playerCard = (name, rank, cls='') => {
    if (!name || name === '?') return `<div class="fl-player fl-tbd ${cls}"><span class="fl-tbd-icon">?</span><span class="fl-tbd-txt">À déterminer</span></div>`;
    const photo = WZ.getPhoto(name);
    const isT3 = WZ.TOP3.has(name);
    const avIn = photo
      ? `<img src="${photo}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : name.charAt(0);
    const rankBadge = rank ? `<span class="fl-rank">#${rank}</span>` : '';
    return `<div class="fl-player ${cls}">
      <div class="fl-av">${avIn}</div>
      <span class="fl-name ${isT3?'is-top3':''}">${isT3?'★ ':''}${name}</span>
      ${rankBadge}
    </div>`;
  };

  // Trouver le rang d'un joueur
  const stats = WZ.getStats();
  const getRank = (name) => {
    const idx = stats.findIndex(p => p.name === name);
    return idx >= 0 ? idx + 1 : null;
  };

  // ── MASTER PLAY-IN ──────────────────────────────────────────────────────
  const renderMiniMatch = (matchData, phase, matchKey, label) => {
    const m = matchData;
    const done = m.winner !== null;
    const adminInput = isAdmin && !done ? `
      <div class="fl-match-input">
        <input type="number" min="0" placeholder="Kills ${m.p1||'J1'}" id="k1_${phase}_${matchKey}" class="fl-kinput">
        <span>vs</span>
        <input type="number" min="0" placeholder="Kills ${m.p2||'J2'}" id="k2_${phase}_${matchKey}" class="fl-kinput">
        <button class="fl-btn-ok" onclick="FinaleApp.saveMatch('${phase}','${matchKey}')">✓</button>
      </div>` : '';
    return `
      <div class="fl-match ${done?'fl-done':''}">
        <div class="fl-match-label">${label}</div>
        <div class="fl-match-body">
          <div class="fl-match-side ${m.winner===m.p1?'fl-win':''}">
            ${playerCard(m.p1, getRank(m.p1))}
            ${done ? `<span class="fl-kills">${m.kills1}K</span>` : ''}
          </div>
          <div class="fl-match-vs">VS</div>
          <div class="fl-match-side ${m.winner===m.p2?'fl-win':''}">
            ${playerCard(m.p2, getRank(m.p2))}
            ${done ? `<span class="fl-kills">${m.kills2}K</span>` : ''}
          </div>
        </div>
        ${done ? `<div class="fl-match-result">🏆 ${m.winner} se qualifie</div>` : adminInput}
      </div>`;
  };

  // ── GROUPES ─────────────────────────────────────────────────────────────
  const renderGroupe = (gKey, label) => {
    const g = f.groupes[gKey];
    const pts = g.pts || {};
    const matchPairs = [
      ['m0v1','0','1'],['m0v2','0','2'],['m0v3','0','3'],
      ['m1v2','1','2'],['m1v3','1','3'],['m2v3','2','3']
    ];
    const matchesHtml = matchPairs.map(([key, i0, i1]) => {
      const m = g.matchs[key];
      const p0 = g.players[parseInt(i0)];
      const p1 = g.players[parseInt(i1)];
      if (!p0 || p0 === '?' || !p1 || p1 === '?') return '';
      const done = m && m.winner;
      const adminInput = isAdmin && !done ? `
        <div class="fl-match-input">
          <input type="number" min="0" placeholder="Kills" id="kg0_${gKey}_${key}" class="fl-kinput sm">
          <input type="number" min="0" placeholder="Kills" id="kg1_${gKey}_${key}" class="fl-kinput sm">
          <button class="fl-btn-ok" onclick="FinaleApp.saveGroupeMatch('${gKey}','${key}')">✓</button>
        </div>` : '';
      return `<div class="fl-g-match ${done?'fl-done':''}">
        <div class="fl-g-side ${done&&m.winner===p0?'fl-win':''}">${p0} ${done?`<b>${m['kills'+i0]}K</b>`:''}</div>
        <div class="fl-g-vs">vs</div>
        <div class="fl-g-side ${done&&m.winner===p1?'fl-win':''}">${p1} ${done?`<b>${m['kills'+i1]}K</b>`:''}</div>
        ${adminInput}
      </div>`;
    }).join('');

    // Classement groupe
    const classHtml = g.players.filter(p => p && p !== '?').map(p => {
      const s = pts[p] || { wins: 0, kills: 0 };
      const isQ = g.qualifies.includes(p);
      return `<div class="fl-g-row ${isQ?'fl-qualified':''}">
        <span class="fl-g-name">${isQ?'✓ ':''} ${p}</span>
        <span class="fl-g-pts">${s.wins}V · ${s.kills}K</span>
      </div>`;
    }).join('');

    return `<div class="fl-groupe">
      <div class="fl-groupe-head">${label}</div>
      <div class="fl-groupe-players">
        ${g.players.map((p, i) => {
          const labels = ['1er Ligue','2e Play-In','3e Ligue','6e Ligue'];
          const labels2 = ['2e Ligue','1er Play-In','4e Ligue','5e Ligue'];
          const lbl = gKey === 'g1' ? labels[i] : labels2[i];
          return `<div class="fl-gp-row">${playerCard(p, getRank(p))}<span class="fl-gp-lbl">${lbl}</span></div>`;
        }).join('')}
      </div>
      <div class="fl-groupe-matchs">${matchesHtml}</div>
      <div class="fl-groupe-classement">
        <div class="fl-g-head-row"><span>Classement</span><span>V · Kills</span></div>
        ${classHtml}
      </div>
    </div>`;
  };

  // ── GRANDE FINALE ────────────────────────────────────────────────────────
  const gf = f.grandeFinale;
  const g1q1 = gf.g1q1 || '?', g1q2 = gf.g1q2 || '?';
  const g2q1 = gf.g2q1 || '?', g2q2 = gf.g2q2 || '?';
  const g1Score = gf.scores?.g1 || 0;
  const g2Score = gf.scores?.g2 || 0;

  const mkHtml = (gf.masterKills || []).map((mk, i) => {
    if (!mk) return '';
    const s = mk.scores || {};
    return `<div class="fl-mk ${mk.winner?'fl-done':''}">
      <div class="fl-mk-label">Master Kill ${i+1}</div>
      <div class="fl-mk-teams">
        <div class="fl-mk-team ${mk.winner==='G1'?'fl-win':''}">
          <span>${g1q1}</span><b>${s[g1q1]||0}K</b>
          <span>${g1q2}</span><b>${s[g1q2]||0}K</b>
        </div>
        <div class="fl-mk-sep">vs</div>
        <div class="fl-mk-team ${mk.winner==='G2'?'fl-win':''}">
          <span>${g2q1}</span><b>${s[g2q1]||0}K</b>
          <span>${g2q2}</span><b>${s[g2q2]||0}K</b>
        </div>
      </div>
    </div>`;
  }).join('');

  // Admin : ajouter un MK
  const mkCount = (gf.masterKills || []).length;
  const canAddMK = isAdmin && mkCount < 5 && g1Score < 2 && g2Score < 2
    && g1q1 !== '?' && g2q1 !== '?';
  const addMKHtml = canAddMK ? `
    <div class="fl-add-mk">
      <div class="fl-add-mk-title">+ Saisir Master Kill ${mkCount+1}</div>
      <div class="fl-mk-inputs">
        <div class="fl-mk-input-group">
          <label>${g1q1}</label><input type="number" min="0" id="mk_${g1q1}" class="fl-kinput">
          <label>${g1q2}</label><input type="number" min="0" id="mk_${g1q2}" class="fl-kinput">
        </div>
        <div class="fl-mk-input-group">
          <label>${g2q1}</label><input type="number" min="0" id="mk_${g2q1}" class="fl-kinput">
          <label>${g2q2}</label><input type="number" min="0" id="mk_${g2q2}" class="fl-kinput">
        </div>
      </div>
      <button class="fl-btn-primary" onclick="FinaleApp.saveMK(${mkCount})">Valider Master Kill ${mkCount+1}</button>
    </div>` : '';

  const champHtml = gf.champion ? `
    <div class="fl-champion">
      <div class="fl-champ-crown">👑</div>
      <div class="fl-champ-label">CHAMPION WARZONE LEAGUE 2026</div>
      <div class="fl-champ-team">${gf.champion === 'G1' ? `${g1q1} & ${g1q2}` : `${g2q1} & ${g2q2}`}</div>
    </div>` : '';

  // ── BRACKET VISUEL (style NBA) ───────────────────────────────────────────
  const bracketHtml = buildBracket(f, q, getRank, playerCard);

  wrap.innerHTML = `
    <!-- BRACKET -->
    <div class="stats-section-label">// TABLEAU DE LA PHASE FINALE</div>
    ${bracketHtml}

    <!-- MASTER PLAY-IN -->
    <div class="stats-section-label" style="margin-top:48px">// MASTER PLAY-IN <span style="color:var(--red);font-size:9px;margin-left:8px">9e · 10e · 11e · 12e</span></div>
    <div class="fl-matchs-grid">
      ${renderMiniMatch(f.masterPlayIn.match1, 'masterPlayIn', 'match1', 'Match 1 — 9e vs 12e')}
      ${renderMiniMatch(f.masterPlayIn.match2, 'masterPlayIn', 'match2', 'Match 2 — 10e vs 11e')}
    </div>

    <!-- PLAY-IN FINAL -->
    <div class="stats-section-label" style="margin-top:40px">// PLAY-IN FINAL <span style="color:var(--gold);font-size:9px;margin-left:8px">7e · 8e + 2 gagnants Master PI</span></div>
    <div class="fl-matchs-grid">
      ${renderMiniMatch(f.playIn.match1, 'playIn', 'match1', 'Match 1 — 7e vs Gagnant Master PI 2')}
      ${renderMiniMatch(f.playIn.match2, 'playIn', 'match2', 'Match 2 — 8e vs Gagnant Master PI 1')}
    </div>

    <!-- GROUPES -->
    <div class="stats-section-label" style="margin-top:40px">// FINAL 8 — PHASE DE GROUPES</div>
    <div class="fl-groupes-grid">
      ${renderGroupe('g1', '🔴 GROUPE 1')}
      ${renderGroupe('g2', '🔵 GROUPE 2')}
    </div>

    <!-- GRANDE FINALE -->
    <div class="stats-section-label" style="margin-top:40px">// GRANDE FINALE <span style="color:var(--gold);font-size:9px;margin-left:8px">Best of 5 Master Kills</span></div>
    <div class="fl-grande-finale">
      <div class="fl-gf-header">
        <div class="fl-gf-team ${g1Score >= 2 ? 'fl-champion-team':''}">
          <div class="fl-gf-names">${g1q1 !== '?' ? playerCard(g1q1) : '<div class="fl-player fl-tbd"><span>?</span></div>'}${g1q2 !== '?' ? playerCard(g1q2) : '<div class="fl-player fl-tbd"><span>?</span></div>'}</div>
          <div class="fl-gf-score">${g1Score}</div>
          <div class="fl-gf-label">Groupe 1</div>
        </div>
        <div class="fl-gf-center">
          <div class="fl-gf-bo">BEST OF 5</div>
          <div class="fl-gf-dots">
            ${[0,1,2,3,4].map(i => `<div class="fl-dot ${i < (g1Score+g2Score) ? (i < g1Score ? 'fl-dot-g1' : 'fl-dot-g2') : ''}"></div>`).join('')}
          </div>
        </div>
        <div class="fl-gf-team ${g2Score >= 2 ? 'fl-champion-team':''}">
          <div class="fl-gf-names">${g2q1 !== '?' ? playerCard(g2q1) : '<div class="fl-player fl-tbd"><span>?</span></div>'}${g2q2 !== '?' ? playerCard(g2q2) : '<div class="fl-player fl-tbd"><span>?</span></div>'}</div>
          <div class="fl-gf-score">${g2Score}</div>
          <div class="fl-gf-label">Groupe 2</div>
        </div>
      </div>
      <div class="fl-mk-list">${mkHtml}</div>
      ${addMKHtml}
      ${champHtml}
    </div>

    ${isAdmin ? `<div style="margin-top:20px;padding-bottom:8px"><button class="btn-ghost" style="font-size:11px;color:var(--red)" onclick="FinaleApp.resetFinale()">↺ Reset Phase Finale</button></div>` : ''}
    <div style="padding-bottom:56px"></div>
  `;
}

// ── BRACKET VISUEL ───────────────────────────────────────────────────────────
function buildBracket(f, q, getRank, playerCard) {
  const stats = WZ.getStats();
  const top12 = stats.slice(0, 12);
  const name = (i) => top12[i] ? top12[i].name : '?';
  const pts  = (i) => top12[i] ? top12[i].total + 'pts' : '';

  const slot = (n, label, highlight='') => {
    if (!n || n === '?') return `<div class="br-slot br-tbd"><span class="br-slot-label">${label||''}</span><span class="br-tbd-txt">?</span></div>`;
    const photo = WZ.getPhoto(n);
    const av = photo ? `<img src="${photo}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0">` : `<span class="br-av">${n[0]}</span>`;
    return `<div class="br-slot ${highlight}"><span class="br-slot-label">${label||''}</span>${av}<span class="br-slot-name">${n}</span></div>`;
  };

  return `
    <div class="bracket-wrap">
      <div class="bracket-scroll">
        <div class="bracket">

          <!-- COL 1: Master Play-In -->
          <div class="br-col">
            <div class="br-col-title">MASTER PLAY-IN</div>
            <div class="br-section">
              <div class="br-match">
                ${slot(name(8), '#9')}
                ${slot(name(11), '#12')}
              </div>
              <div class="br-arrow">→</div>
              <div class="br-match">
                ${slot(name(9), '#10')}
                ${slot(name(10), '#11')}
              </div>
            </div>
          </div>

          <!-- COL 2: Play-In Final -->
          <div class="br-col">
            <div class="br-col-title">PLAY-IN FINAL</div>
            <div class="br-section">
              <div class="br-match">
                ${slot(name(6), '#7')}
                ${slot(f.masterPlayIn.match2.winner, 'Gag. MPI')}
              </div>
              <div class="br-arrow">→</div>
              <div class="br-match">
                ${slot(name(7), '#8')}
                ${slot(f.masterPlayIn.match1.winner, 'Gag. MPI')}
              </div>
            </div>
          </div>

          <!-- COL 3: Groupes -->
          <div class="br-col">
            <div class="br-col-title">FINAL 8 — GROUPES</div>
            <div class="br-section">
              <div class="br-groupe-box">
                <div class="br-groupe-title">🔴 G1</div>
                ${slot(name(0), '1er', 'br-direct')}
                ${slot(f.playIn.match2.winner||'?', '2e PI')}
                ${slot(name(2), '3e', 'br-direct')}
                ${slot(name(5), '6e', 'br-direct')}
              </div>
              <div class="br-groupe-box">
                <div class="br-groupe-title">🔵 G2</div>
                ${slot(name(1), '2e', 'br-direct')}
                ${slot(f.playIn.match1.winner||'?', '1er PI')}
                ${slot(name(3), '4e', 'br-direct')}
                ${slot(name(4), '5e', 'br-direct')}
              </div>
            </div>
          </div>

          <!-- COL 4: Grande Finale -->
          <div class="br-col">
            <div class="br-col-title">GRANDE FINALE</div>
            <div class="br-section">
              <div class="br-finale-box">
                <div class="br-finale-team">
                  ${slot(f.groupes.g1.qualifies[0]||'?', 'G1 Q1', 'br-qualify')}
                  ${slot(f.groupes.g1.qualifies[1]||'?', 'G1 Q2', 'br-qualify')}
                </div>
                <div class="br-finale-vs">VS</div>
                <div class="br-finale-team">
                  ${slot(f.groupes.g2.qualifies[0]||'?', 'G2 Q1', 'br-qualify')}
                  ${slot(f.groupes.g2.qualifies[1]||'?', 'G2 Q2', 'br-qualify')}
                </div>
                ${f.grandeFinale.champion ? `<div class="br-champion">👑 ${f.grandeFinale.champion==='G1'?`${f.grandeFinale.g1q1||''}&${f.grandeFinale.g1q2||''}`:f.grandeFinale.g2q1||''}</div>` : ''}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>`;
}

// ── APP ACTIONS (appelées depuis HTML) ───────────────────────────────────────
const FinaleApp = {
  saveMatch(phase, matchKey) {
    const k1 = parseInt(document.getElementById(`k1_${phase}_${matchKey}`)?.value) || 0;
    const k2 = parseInt(document.getElementById(`k2_${phase}_${matchKey}`)?.value) || 0;
    if (k1 === 0 && k2 === 0) return;
    const f = Finale.getState();
    const m = phase === 'masterPlayIn' ? f.masterPlayIn[matchKey] : f.playIn[matchKey];
    m.kills1 = k1; m.kills2 = k2;
    m.winner = k1 > k2 ? m.p1 : m.p2;
    Finale.autoFill();
    Finale.save();
    buildFinalePage();
  },
  saveGroupeMatch(gKey, matchKey) {
    const k0 = parseInt(document.getElementById(`kg0_${gKey}_${matchKey}`)?.value) || 0;
    const k1 = parseInt(document.getElementById(`kg1_${gKey}_${matchKey}`)?.value) || 0;
    Finale.setGroupeMatch(gKey, matchKey, k0, k1);
    buildFinalePage();
  },
  saveMK(idx) {
    const gf = Finale.getState().grandeFinale;
    const players = [gf.g1q1, gf.g1q2, gf.g2q1, gf.g2q2].filter(p => p && p !== '?');
    const scores = {};
    players.forEach(p => {
      scores[p] = parseInt(document.getElementById(`mk_${p}`)?.value) || 0;
    });
    Finale.setGrandeFinaleResult(idx, scores);
    buildFinalePage();
  },
  resetFinale() {
    if (confirm('Réinitialiser toute la phase finale ?')) {
      Finale.reset();
      buildFinalePage();
    }
  }
};
