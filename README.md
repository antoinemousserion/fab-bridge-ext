# Fab ↔ Step‑On Bridge (MV3)

- Activé sur :
  - `https://*.fab.com/library*` → écoute des réponses `GET /i/library/entitlements/search` et enregistre **uniquement** `results[]`.
  - `https://*.step-on.dev/*` → bouton flottant “Fab Library” pour lister les entrées stockées et les purger.
- Stockage dans l’IndexedDB **du service worker** pour partage cross‑domain.
- Aucune donnée perso collectée par défaut.

## Installation (Chrome/Edge)
1. Dézippez ou clonez ce dossier.
2. Ouvrez `chrome://extensions` → Activez *Developer mode*.
3. *Load unpacked* → sélectionnez le dossier.
4. Ouvrez `https://www.fab.com/library` et naviguez pour générer des hits sur l’endpoint cible.
5. Ouvrez `https://www.step-on.dev/` et cliquez sur **Fab Library** pour voir les éléments.

## Notes
- Le hook patch `fetch` et `XMLHttpRequest` uniquement lorsque `location.pathname === '/library'`.
- Filtre strict sur l’URL qui **contient** `/i/library/entitlements/search`.
- Déduplication par `uid` via `keyPath: 'uid'`.
- Vous êtes responsable du respect des CGU de Fab.
