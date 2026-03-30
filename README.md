# ⚔️ Warzone League 2026

Site officiel de la Warzone League 2026 — hébergé sur GitHub Pages.

## 🚀 Mise en ligne sur GitHub Pages (5 minutes)

### Étape 1 — Extraire le ZIP
Décompresse `warzone-league.zip` sur ton ordinateur.

### Étape 2 — Créer le dépôt GitHub
1. Va sur **github.com** → bouton **"+"** en haut à droite → **New repository**
2. Nom du dépôt : **`warzone-league`**
3. Visibilité : **Public**
4. Cliquer **Create repository**

### Étape 3 — Uploader les fichiers
1. Dans ton nouveau dépôt, clique **"uploading an existing file"**
2. Ouvre le dossier `warzone-league/` extrait
3. **Sélectionne tout** (Ctrl+A / Cmd+A) → glisse dans GitHub
4. Clique **"Commit changes"**

### Étape 4 — Activer GitHub Pages
1. Dans le dépôt → **Settings** → **Pages** (menu gauche)
2. Source : **Deploy from a branch**
3. Branch : **main** / **(root)**
4. Clique **Save**

### Étape 5 — Ton site est en ligne !
Adresse : `https://TON_USERNAME.github.io/warzone-league/`

---

## 🔐 Accès Admin
**Mot de passe par défaut : `warzone2026`**

Pour le changer → `js/app.js` → ligne `const PASS = 'warzone2026';`

---

## 📊 Workflow recommandé

1. **Remplis l'Excel** `warzone_league_final_v3.xlsx` après chaque journée
2. **Valide** chaque partie avec "Jouée ✅" dans la colonne M
3. **Importe** sur le site : Admin → Import Excel → glisser le fichier
4. Le classement se met à jour automatiquement ✅

---

## 🖼️ Ajouter les photos et le logo
Admin → **Photos & Logo** → importer logo + photos joueurs

---

## 📁 Structure
```
warzone-league/
├── index.html     ← Page principale
├── css/style.css  ← Design glassmorphism
├── js/data.js     ← Données + calculs + import Excel
├── js/app.js      ← Interface + rendu + admin
└── README.md
```

---

*Warzone League 2026 — Saison officielle*
