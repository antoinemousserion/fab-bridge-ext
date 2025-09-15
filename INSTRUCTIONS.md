# Fab Bridge Extension - Instructions d'utilisation

## 🎯 Fonctionnalités

Cette extension Chrome capture automatiquement les données d'entitlements depuis `fab.com/library` et les stocke pour les afficher sur `step-on.dev` ou via l'interface popup.

## 📦 Installation

1. Ouvrez Chrome et allez dans `chrome://extensions/`
2. Activez le "Mode développeur" (en haut à droite)
3. Cliquez sur "Charger l'extension non empaquetée"
4. Sélectionnez le dossier contenant les fichiers de l'extension

## 🚀 Utilisation

### Interface Popup
- Cliquez sur l'icône de l'extension dans la barre d'outils Chrome
- Vous verrez :
  - Le nombre total d'entitlements capturés
  - La date de dernière mise à jour
  - Les 5 éléments les plus récents
  - Boutons pour actualiser, voir tout, ou vider les données

### Sur step-on.dev
- Visitez `https://step-on.dev`
- Un bouton "Fab Library" apparaîtra en bas à droite
- Cliquez dessus pour voir tous les entitlements capturés
- Utilisez le bouton "Export JSON" pour télécharger toutes les données

### Capture automatique
- Visitez `https://fab.com/library`
- L'extension capture automatiquement les requêtes vers `/i/library/entitlements/search`
- Les données sont stockées localement dans IndexedDB

## 🔧 Debugging

### Logs
Tous les logs sont visibles dans la console du navigateur :
- **Service Worker** : `chrome://extensions/` → Détails → Inspecter les vues : Service Worker
- **Content Scripts** : Console de la page web
- **Popup** : Clic droit sur le popup → Inspecter

### Niveaux de log
- `INFO` : Informations générales
- `WARN` : Avertissements
- `ERROR` : Erreurs
- `DEBUG` : Détails de débogage

### Vérification du fonctionnement
1. Ouvrez la console du navigateur
2. Visitez `https://fab.com/library`
3. Recherchez les logs `[CS-FAB-INFO]` et `[HOOK-INFO]`
4. Vérifiez que les requêtes vers `/i/library/entitlements/search` sont détectées

## 🛠️ Dépannage

### L'extension ne capture rien
1. Vérifiez que vous êtes sur `https://fab.com/library`
2. Regardez les logs dans la console
3. Vérifiez que les requêtes AJAX/fetch sont bien interceptées

### Le popup ne s'affiche pas
1. Vérifiez que l'extension est bien installée et activée
2. Rechargez l'extension si nécessaire
3. Vérifiez les permissions dans `chrome://extensions/`

### Données non sauvegardées
1. Vérifiez les logs du Service Worker
2. Vérifiez que IndexedDB fonctionne (onglet Application → Storage → IndexedDB)

## 📁 Structure des fichiers

- `manifest.json` : Configuration de l'extension
- `popup.html/js` : Interface popup
- `sw.js` : Service Worker (gestion des données)
- `cs_fab.js` : Content script pour fab.com
- `cs_site.js` : Content script pour step-on.dev
- `hook.js` : Script injecté pour intercepter les requêtes

## 🔒 Permissions

- `storage` : Stockage local des données
- `scripting` : Injection de scripts
- `activeTab` : Accès à l'onglet actif
- `tabs` : Gestion des onglets
- `host_permissions` : Accès aux domaines fab.com et step-on.dev

## 📊 Données capturées

L'extension capture les données d'entitlements avec les champs suivants :
- `uid` : Identifiant unique
- `title` : Titre de l'item
- `price` : Prix de départ
- `currency` : Devise
- `createdAt` : Date de création
- `seller` : Nom du vendeur
- `thumbnails` : Images miniatures

## 📤 Export JSON

### Fonctionnalité d'export
- **Bouton "Export JSON"** disponible dans le popup et sur step-on.dev
- **Téléchargement automatique** d'un fichier JSON formaté
- **Nom de fichier** : `fab-entitlements-YYYY-MM-DD.json`
- **Métadonnées incluses** : date d'export, version, nombre d'éléments

### Structure du fichier JSON
```json
{
  "metadata": {
    "exportDate": "2024-01-15T10:30:00.000Z",
    "version": "1.0",
    "source": "Fab Bridge Extension",
    "itemCount": 25
  },
  "entitlements": [
    {
      "uid": "12345",
      "title": "Item Title",
      "listing": {
        "startingPrice": {
          "price": "100",
          "currencyCode": "USD"
        }
      },
      "createdAt": "2024-01-15T09:00:00.000Z",
      "savedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```
