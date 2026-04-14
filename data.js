// ── WARZONE LEAGUE 2026 — DATA LAYER (v final) ───────────────────────────────
const WZ = (() => {

  const NAMES = ["Erico","Sallah","Adjimal","Mika","Daniel","Mehdi","Ali","Florian",
                 "Theo","Sofiane","Nassim","Souleymane","Okan"];
  const TOP3  = new Set(["Ali","Sofiane","Mehdi"]);

  const SCHEDULE = [
    {j:1,  exempt:"Erico",      g1:["Ali","Okan","Mehdi","Sofiane"],         g2:["Sallah","Daniel","Florian","Nassim"],     g3:["Souleymane","Mika","Theo","Adjimal"]},
    {j:2,  exempt:"Sallah",     g1:["Erico","Adjimal","Florian","Okan"],      g2:["Mika","Theo","Nassim","Sofiane"],         g3:["Ali","Daniel","Souleymane","Mehdi"]},
    {j:3,  exempt:"Adjimal",    g1:["Sofiane","Ali","Florian","Souleymane"],  g2:["Mehdi","Erico","Sallah","Theo"],          g3:["Daniel","Okan","Mika","Nassim"]},
    {j:4,  exempt:"Mika",       g1:["Mehdi","Adjimal","Sallah","Sofiane"],    g2:["Florian","Ali","Daniel","Theo"],          g3:["Erico","Souleymane","Nassim","Okan"]},
    {j:5,  exempt:"Daniel",     g1:["Souleymane","Theo","Sofiane","Sallah"],  g2:["Erico","Nassim","Ali","Adjimal"],         g3:["Florian","Mehdi","Okan","Mika"]},
    {j:6,  exempt:"Mehdi",      g1:["Theo","Sofiane","Okan","Daniel"],        g2:["Souleymane","Adjimal","Florian","Nassim"],g3:["Erico","Mika","Sallah","Ali"]},
    {j:7,  exempt:"Ali",        g1:["Erico","Mehdi","Florian","Theo"],        g2:["Daniel","Sofiane","Mika","Adjimal"],      g3:["Souleymane","Sallah","Nassim","Okan"]},
    {j:8,  exempt:"Florian",    g1:["Sofiane","Nassim","Mehdi","Mika"],       g2:["Okan","Ali","Theo","Adjimal"],            g3:["Sallah","Daniel","Erico","Souleymane"]},
    {j:9,  exempt:"Theo",       g1:["Sofiane","Nassim","Erico","Ali"],        g2:["Florian","Okan","Mika","Sallah"],         g3:["Daniel","Souleymane","Adjimal","Mehdi"]},
    {j:10, exempt:"Sofiane",    g1:["Ali","Sallah","Adjimal","Okan"],         g2:["Mehdi","Theo","Nassim","Daniel"],         g3:["Mika","Erico","Florian","Souleymane"]},
    {j:11, exempt:"Nassim",     g1:["Sofiane","Okan","Daniel","Erico"],       g2:["Souleymane","Mika","Ali","Theo"],         g3:["Adjimal","Florian","Mehdi","Sallah"]},
    {j:12, exempt:"Souleymane", g1:["Ali","Mika","Sallah","Daniel"],          g2:["Nassim","Theo","Okan","Florian"],         g3:["Mehdi","Adjimal","Sofiane","Erico"]},
    {j:13, exempt:"Okan",       g1:["Mehdi","Ali","Souleymane","Nassim"],     g2:["Daniel","Sallah","Florian","Sofiane"],    g3:["Mika","Adjimal","Erico","Theo"]},
  ];

  const BONUS = {1:60, 2:40, 3:20, 4:10};

  // ── Storage — UNE SEULE CLÉ pour tout (résultats + sanctions) ─────────────
  const K = { state:'wz_state_v5', photos:'wz_photos_v3', logo:'wz_logo_v3' };
  const ls = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
  const ss = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  function initState() {
    const results = {};
    SCHEDULE.forEach(day => {
      results[day.j] = {
        A: {validated:false, players: day.g1.map(n => ({name:n, kills:[0,0,0,0,0]}))},
        B: {validated:false, players: day.g2.map(n => ({name:n, kills:[0,0,0,0,0]}))},
        C: {validated:false, players: day.g3.map(n => ({name:n, kills:[0,0,0,0,0]}))},
      };
    });
    return { results, sanctions: {} };
  }

  // Charger depuis localStorage au démarrage
  let state = ls(K.state, null) || initState();
  if (!state.sanctions) state.sanctions = {}; // compat ancienne version

  function save() { ss(K.state, state); }

  // ── Calculs ────────────────────────────────────────────────────────────────
  const sumKills = arr => (arr||[]).reduce((s,k) => s + (parseInt(k)||0), 0);

  function rankPartie(players) {
    const ranked = players.map(p => ({
      ...p,
      total:    sumKills(p.kills),
      bestGame: Math.max(...(p.kills||[0]).map(k => parseInt(k)||0))
    }));
    ranked.sort((a,b) => b.total !== a.total ? b.total - a.total : b.bestGame - a.bestGame);
    ranked.forEach((p,i) => { p.rank = i+1; });
    return ranked;
  }

  function getStats() {
    const sanctions = state.sanctions || {};
    const map = {};
    NAMES.forEach(n => { map[n] = {name:n, kills:0, bonus:0, partiesJouees:0, sanction:0, total:0}; });
    SCHEDULE.forEach(day => {
      ['A','B','C'].forEach(p => {
        const partie = state.results[day.j]?.[p];
        if (!partie?.validated) return;
        rankPartie(partie.players).forEach(pl => {
          if (!map[pl.name]) return;
          map[pl.name].kills        += pl.total;
          map[pl.name].bonus        += BONUS[pl.rank] || 0;
          map[pl.name].partiesJouees += 1;
        });
      });
    });
    NAMES.forEach(n => {
      const s = sanctions[n] || 0;
      map[n].sanction = s;
      map[n].total    = map[n].kills + map[n].bonus + s;
    });
    return Object.values(map).sort((a,b) => b.total - a.total).map((p,i) => ({...p, rank:i+1}));
  }

  function getJourneeStatus(j) {
    const r = state.results[j];
    if (!r) return 'pending';
    const v = ['A','B','C'].map(p => r[p]?.validated);
    if (v.every(Boolean)) return 'done';
    if (v.some(Boolean))  return 'partial';
    return 'pending';
  }
  function getNextJournee()        { return SCHEDULE.find(d => getJourneeStatus(d.j) !== 'done') || null; }
  function getTotalPartiesJouees() { return SCHEDULE.reduce((s,day) => s + ['A','B','C'].filter(p => state.results[day.j]?.[p]?.validated).length, 0); }

  // ── Import Excel ───────────────────────────────────────────────────────────
  function importExcel(workbook) {
    // 1. Lire les kills depuis J1-J13
    for (let j = 1; j <= 13; j++) {
      const ws = workbook.Sheets[`J${j}`];
      if (!ws) continue;
      const cv = addr => { const c = ws[addr]; return c ? c.v : null; };
      const valA = String(cv('M3')  || '').includes('Jou');
      const valB = String(cv('M10') || '').includes('Jou');
      const valC = String(cv('M17') || '').includes('Jou');
      const readPartie = (startRow, validated) => {
        const players = [];
        for (let ri = startRow; ri < startRow+4; ri++) {
          const nameRaw = cv(`B${ri}`);
          if (!nameRaw) continue;
          const name  = String(nameRaw).replace(/^★\s*/, '').trim();
          const kills = [3,4,5,6,7].map(ci => parseInt((ws[XLSX.utils.encode_cell({r:ri-1, c:ci-1})]||{}).v||0)||0);
          players.push({name, kills});
        }
        return {validated, players};
      };
      if (!state.results[j]) state.results[j] = {};
      state.results[j].A = readPartie(5,  valA);
      state.results[j].B = readPartie(12, valB);
      state.results[j].C = readPartie(19, valC);
    }

    // 2. Lire les sanctions depuis feuille "🏆 Classement" col U (index 20, 0-based)
    const wsClass = workbook.Sheets['🏆 Classement'];
    if (wsClass) {
      const newSanctions = {};
      for (let r = 4; r <= 16; r++) {
        const nameCell = wsClass[XLSX.utils.encode_cell({r: r-1, c: 15})]; // col P
        const sancCell = wsClass[XLSX.utils.encode_cell({r: r-1, c: 20})]; // col U
        const name = nameCell ? String(nameCell.v || '').trim() : '';
        const pts  = sancCell ? (parseInt(sancCell.v) || 0) : 0;
        if (name) newSanctions[name] = pts; // on stocke TOUS les joueurs (même 0)
      }
      state.sanctions = newSanctions; // remplace complètement les sanctions
    }

    // 3. Sauvegarder tout en une seule clé
    save();
    return { ok: 13, fail: 0 };
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  function setValidation(j, p, v) {
    if (!state.results[j]) state.results[j] = {};
    if (!state.results[j][p]) {
      const day = SCHEDULE.find(d => d.j === j);
      const grp = p==='A'?day.g1:p==='B'?day.g2:day.g3;
      state.results[j][p] = {validated:false, players: grp.map(n => ({name:n, kills:[0,0,0,0,0]}))};
    }
    state.results[j][p].validated = v;
    save();
  }
  function setKills(j, p, pi, kills) {
    state.results[j][p].players[pi].kills = kills;
    save();
  }
  function addSanction(name, pts)  { if (!state.sanctions) state.sanctions={}; state.sanctions[name] = (state.sanctions[name]||0) + pts; save(); }
  function clearSanction(name)     { if (!state.sanctions) state.sanctions={}; state.sanctions[name] = 0; save(); }
  function getSanctions()          { return state.sanctions || {}; }

  // ── Photos / Logo ──────────────────────────────────────────────────────────
  function savePhoto(name, dataUrl) { const p=ls(K.photos,{}); p[name]=dataUrl; ss(K.photos,p); }
  function getPhoto(name)           { return ls(K.photos,{})[name] || null; }
  function saveLogo(url)            { localStorage.setItem(K.logo, url); }
  function getLogo()                { return localStorage.getItem(K.logo) || null; }
  function getState()               { return state; }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetData() { state = initState(); save(); }
  function resetAll()  {
    state = initState();
    [K.state, K.photos, K.logo, 'wz_data_v3','wz_sanc_v3'].forEach(k => { try{localStorage.removeItem(k);}catch{} });
  }

  // ── GitHub : chargement (lecture) ─────────────────────────────────────────
  async function loadFromGitHub() {
    const urls = [
      window.location.origin + '/warzone-ligue2K26/data.json?t=' + Date.now(),
      'https://cdn.jsdelivr.net/gh/Souleyyyy/warzone-ligue2K26@main/data.json?t=' + Date.now()
    ];
    for (const url of urls) {
      try {
        const res  = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        if (!data.results) continue;
        state.results   = data.results;
        state.sanctions = data.sanctions || {};
        save();
        return { ok: true };
      } catch(e) { continue; }
    }
    return { ok: false };
  }

  // ── GitHub : télécharger data.json ────────────────────────────────────────
  function downloadJSON() {
    // Tout est dans state — une seule source de vérité
    const payload = JSON.stringify({
      version:    1,
      lastUpdate: new Date().toISOString(),
      results:    state.results,
      sanctions:  state.sanctions || {}
    }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'data.json'; a.click();
    URL.revokeObjectURL(url);
  }

  return {
    NAMES, TOP3, SCHEDULE, BONUS,
    loadFromGitHub, downloadJSON,
    getStats, getJourneeStatus, getNextJournee, getTotalPartiesJouees,
    importExcel, setValidation, setKills,
    addSanction, clearSanction, getSanctions,
    savePhoto, getPhoto, saveLogo, getLogo,
    getState, sumKills, rankPartie,
    resetData, resetAll
  };
})();
