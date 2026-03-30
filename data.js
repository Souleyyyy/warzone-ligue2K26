// ── WARZONE LEAGUE 2026 — DATA LAYER (v4 fixed) ─────────────────────────────
const WZ = (() => {

  const NAMES = ["Erico","Sallah","Adjimal","Mika","Daniel","Mehdi","Ali","Florian",
                 "Theo","Sofiane","Nassim","Souleymane","Okan"];
  const TOP3  = new Set(["Ali","Sofiane","Mehdi"]);

  const SCHEDULE = [
    {j:1,  exempt:"Erico",      g1:["Ali","Okan","Mehdi","Sofiane"],         g2:["Sallah","Daniel","Florian","Nassim"],     g3:["Souleymane","Mika","Theo","Adjimal"]},
    {j:2,  exempt:"Sallah",     g1:["Erico","Adjimal","Florian","Okan"],      g2:["Mika","Theo","Nassim","Sofiane"],         g3:["Ali","Daniel","Souleymane","Mehdi"]},
    {j:3,  exempt:"Adjimal",    g1:["Sofiane","Ali","Florian","Souleymane"],  g2:["Mehdi","Erico","Sallah","Theo"],          g3:["Daniel","Okan","Mika","Nassim"]},
    {j:4,  exempt:"Mika",       g1:["Mehdi","Adjimal","Sallah","Sofiane"],    g2:["Florian","Ali","Daniel","Theo"],           g3:["Erico","Souleymane","Nassim","Okan"]},
    {j:5,  exempt:"Daniel",     g1:["Souleymane","Theo","Sofiane","Sallah"],  g2:["Erico","Nassim","Ali","Adjimal"],          g3:["Florian","Mehdi","Okan","Mika"]},
    {j:6,  exempt:"Mehdi",      g1:["Theo","Sofiane","Okan","Daniel"],        g2:["Souleymane","Adjimal","Florian","Nassim"], g3:["Erico","Mika","Sallah","Ali"]},
    {j:7,  exempt:"Ali",        g1:["Erico","Mehdi","Florian","Theo"],        g2:["Daniel","Sofiane","Mika","Adjimal"],       g3:["Souleymane","Sallah","Nassim","Okan"]},
    {j:8,  exempt:"Florian",    g1:["Sofiane","Nassim","Mehdi","Mika"],       g2:["Okan","Ali","Theo","Adjimal"],             g3:["Sallah","Daniel","Erico","Souleymane"]},
    {j:9,  exempt:"Theo",       g1:["Sofiane","Nassim","Erico","Ali"],        g2:["Florian","Okan","Mika","Sallah"],          g3:["Daniel","Souleymane","Adjimal","Mehdi"]},
    {j:10, exempt:"Sofiane",    g1:["Ali","Sallah","Adjimal","Okan"],         g2:["Mehdi","Theo","Nassim","Daniel"],          g3:["Mika","Erico","Florian","Souleymane"]},
    {j:11, exempt:"Nassim",     g1:["Sofiane","Okan","Daniel","Erico"],       g2:["Souleymane","Mika","Ali","Theo"],          g3:["Adjimal","Florian","Mehdi","Sallah"]},
    {j:12, exempt:"Souleymane", g1:["Ali","Mika","Sallah","Daniel"],          g2:["Nassim","Theo","Okan","Florian"],          g3:["Mehdi","Adjimal","Sofiane","Erico"]},
    {j:13, exempt:"Okan",       g1:["Mehdi","Ali","Souleymane","Nassim"],     g2:["Daniel","Sallah","Florian","Sofiane"],     g3:["Mika","Adjimal","Erico","Theo"]},
  ];

  const BONUS = {1:60, 2:40, 3:20, 4:10};

  // Lignes Excel exactes (vérifiées sur le fichier réel)
  // Partie A : lignes 5-8   | validation M3
  // Partie B : lignes 12-15 | validation M10
  // Partie C : lignes 19-22 | validation M17
  const XL = {
    A: { rows:[5,6,7,8],     val:'M3'  },
    B: { rows:[12,13,14,15], val:'M10' },
    C: { rows:[19,20,21,22], val:'M17' },
  };

  // ── Storage ────────────────────────────────────────────────────────────────
  const K = {data:'wz_data_v4', sanc:'wz_sanc_v4', photos:'wz_photos_v4', logo:'wz_logo_v4'};
  const ls = (k, fb) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch{return fb;} };
  const ss = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){ console.warn(e); } };

  // ── State ──────────────────────────────────────────────────────────────────
  function initState() {
    const results = {};
    SCHEDULE.forEach(day => {
      results[day.j] = {
        A:{validated:false, players:day.g1.map(n=>({name:n,kills:[0,0,0,0,0]}))},
        B:{validated:false, players:day.g2.map(n=>({name:n,kills:[0,0,0,0,0]}))},
        C:{validated:false, players:day.g3.map(n=>({name:n,kills:[0,0,0,0,0]}))},
      };
    });
    return {results};
  }

  let state = ls(K.data, null) || initState();

  // ── Calculs ────────────────────────────────────────────────────────────────
  const sumKills = arr => (arr||[]).reduce((s,k)=>s+(parseInt(k)||0), 0);

  function rankPartie(players) {
    const r = players.map(p=>({...p, total:sumKills(p.kills)}));
    r.sort((a,b)=>b.total-a.total);
    r.forEach((p,i)=>{ p.rank=i+1; });
    return r;
  }

  function getStats() {
    const sancs = ls(K.sanc, {});
    const map   = {};
    NAMES.forEach(n=>{ map[n]={name:n,kills:0,bonus:0,partiesJouees:0,sanction:0,total:0}; });

    SCHEDULE.forEach(day=>{
      ['A','B','C'].forEach(p=>{
        const partie = state.results[day.j]?.[p];
        if (!partie?.validated) return;
        rankPartie(partie.players).forEach(pl=>{
          if (!map[pl.name]) return;
          map[pl.name].kills        += pl.total;
          map[pl.name].bonus        += BONUS[pl.rank]||0;
          map[pl.name].partiesJouees+= 1;
        });
      });
    });

    NAMES.forEach(n=>{
      const s = sancs[n]||0;
      map[n].sanction = s;
      map[n].total    = map[n].kills + map[n].bonus + s;
    });

    return Object.values(map)
      .sort((a,b)=>b.total-a.total)
      .map((p,i)=>({...p, rank:i+1}));
  }

  function getJourneeStatus(j) {
    const r = state.results[j];
    if (!r) return 'pending';
    const v = ['A','B','C'].map(p=>r[p]?.validated);
    if (v.every(Boolean)) return 'done';
    if (v.some(Boolean))  return 'partial';
    return 'pending';
  }

  function getNextJournee()       { return SCHEDULE.find(d=>getJourneeStatus(d.j)!=='done')||null; }
  function getTotalPartiesJouees(){ return SCHEDULE.reduce((s,d)=>s+['A','B','C'].filter(p=>state.results[d.j]?.[p]?.validated).length,0); }

  // ── Import Excel (corrigé) ─────────────────────────────────────────────────
  // SheetJS retourne {v: valeurCachée, f: formule} pour les cellules à formule.
  // On lit toujours .v (cached value) – si le fichier a été sauvegardé par Excel,
  // les valeurs calculées sont disponibles même pour les formules.
  function cellVal(ws, addr) {
    const c = ws[addr];
    if (!c) return null;
    return (c.v !== undefined && c.v !== null) ? c.v : (c.w||null);
  }
  function cellNum(ws, addr) { return parseInt(cellVal(ws,addr))||0; }
  function cellStr(ws, addr) {
    const v = cellVal(ws,addr);
    return (v!==null && v!==undefined) ? String(v).trim() : '';
  }

  function importExcel(workbook) {
    let ok=0, fail=0;

    for (let j=1; j<=13; j++) {
      const ws = workbook.Sheets[`J${j}`];
      if (!ws) { fail++; continue; }

      // Statut validation (dropdown M3/M10/M17)
      const valA = cellStr(ws, XL.A.val).includes('Jou');
      const valB = cellStr(ws, XL.B.val).includes('Jou');
      const valC = cellStr(ws, XL.C.val).includes('Jou');

      const readPartie = (rows, validated) => {
        const players = [];
        rows.forEach(ri => {
          // Colonne B (index 1) = nom joueur
          const nameAddr = XLSX.utils.encode_cell({r:ri-1, c:1});
          const rawName  = cellStr(ws, nameAddr);
          if (!rawName) return;
          // Supprimer le préfixe "★ " ajouté pour les top3
          const name = rawName.replace(/^[★\*\s]+/, '').trim();
          if (!name) return;
          // Colonnes C-G (index 2 à 6) = kills manches 1 à 5
          const kills = [2,3,4,5,6].map(c => cellNum(ws, XLSX.utils.encode_cell({r:ri-1, c})));
          players.push({name, kills});
        });
        return {validated, players};
      };

      if (!state.results[j]) state.results[j] = {};
      state.results[j].A = readPartie(XL.A.rows, valA);
      state.results[j].B = readPartie(XL.B.rows, valB);
      state.results[j].C = readPartie(XL.C.rows, valC);
      ok++;
    }

    ss(K.data, state);
    return {ok, fail, total:ok+fail};
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  function setValidation(j, p, v) {
    if (!state.results[j]) state.results[j]={};
    if (!state.results[j][p]) {
      const day=SCHEDULE.find(d=>d.j===j);
      const grp=p==='A'?day.g1:p==='B'?day.g2:day.g3;
      state.results[j][p]={validated:false, players:grp.map(n=>({name:n,kills:[0,0,0,0,0]}))};
    }
    state.results[j][p].validated = v;
    ss(K.data, state);
  }

  function setKills(j, p, pi, kills) {
    if (state.results[j]?.[p]?.players?.[pi]) {
      state.results[j][p].players[pi].kills = kills;
      ss(K.data, state);
    }
  }

  function addSanction(name, pts) {
    const s=ls(K.sanc,{}); s[name]=(s[name]||0)+pts; ss(K.sanc,s);
  }
  function clearSanction(name) {
    const s=ls(K.sanc,{}); s[name]=0; ss(K.sanc,s);
  }

  // ── RESET ─────────────────────────────────────────────────────────────────
  // resetData : remet à zéro scores + sanctions UNIQUEMENT (garde photos/logo)
  function resetData() {
    state = initState();
    ss(K.data, state);
    ss(K.sanc, {});
  }

  // resetAll : tout effacer (scores + sanctions + photos + logo + anciennes clés)
  function resetAll() {
    state = initState();
    const allKeys = [
      K.data, K.sanc, K.photos, K.logo,
      'wz_data_v2','wz_data_v3','wz_sanc_v2','wz_sanc_v3',
      'wz_photos_v2','wz_photos_v3','wz_logo_v2','wz_logo_v3',
    ];
    allKeys.forEach(k=>{ try{localStorage.removeItem(k);}catch{} });
  }

  function savePhoto(name, dataUrl) { const p=ls(K.photos,{}); p[name]=dataUrl; ss(K.photos,p); }
  function getPhoto(name)  { return ls(K.photos,{})[name]||null; }
  function saveLogo(url)   { localStorage.setItem(K.logo, url); }
  function getLogo()       { return localStorage.getItem(K.logo)||null; }
  function getSanctions()  { return ls(K.sanc,{}); }
  function getState()      { return state; }

  return {
    NAMES, TOP3, SCHEDULE, BONUS,
    getStats, getJourneeStatus, getNextJournee, getTotalPartiesJouees,
    importExcel, setValidation, setKills,
    addSanction, clearSanction, getSanctions,
    savePhoto, getPhoto, saveLogo, getLogo,
    getState, sumKills, rankPartie,
    resetData, resetAll
  };
})();
