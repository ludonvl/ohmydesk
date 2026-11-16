# Oh My Desk

Crée, personnalise et partage ton setup de bureau sous forme de scène 3D isométrique.

## Démarrer

```bash
npm install        # ou pnpm install
cp .env.example .env
npm run dev        # http://localhost:3000
```

- `/` : page d'accueil
- `/editor/new` : crée un setup puis ouvre l'éditeur (`?template=studio|neon|scandi`, `?from=<slug>` pour remixer)
- `/editor/:id` : éditeur
- `/setup/:slug` : viewer public (deux setups de démo : `bureau-du-dimanche`, `station-de-nuit`)
- `/embed/:slug` : viewer embarqué

### Paramètres du viewer embarqué

| Paramètre | Défaut | Effet |
|---|---|---|
| `transparent` | `false` | Fond transparent |
| `autorotate` | `false` | Rotation automatique de la caméra |
| `speed` | `10` | Vitesse de rotation (°/s) |
| `controls` | `true` | Rotation au glisser |
| `zoom` | `false` | Zoom à la molette (désactivé pour ne pas bloquer le défilement de la page hôte) |
| `angle` | celui du setup | Azimut initial en degrés |
| `branding` | `true` | Lien « Voir sur Oh My Desk » |

```html
<iframe src="https://app.example.com/embed/mon-setup?transparent=true&autorotate=true&controls=false"
  width="100%" height="600" frameborder="0" allowfullscreen loading="lazy"></iframe>
```

**postMessage** (optionnel) : renseigner `NUXT_PUBLIC_EMBED_ALLOWED_ORIGINS`. Les messages ne sont acceptés que s'ils viennent de `window.parent` **et** d'une origine autorisée, puis sont validés par schéma.

```js
iframe.contentWindow.postMessage({ source: 'ohmydesk', type: 'setAutoRotate', value: true }, 'https://app.example.com')
// types : ping, setAutoRotate, rotateCamera {degrees}, zoom {factor}, resetCamera, highlight {objectId}
// événements renvoyés : ready, pong, objectClick {objectId, catalogId}
```

## Architecture

```
app/
  engine/            Moteur 3D en Three.js pur (aucune dépendance Vue/Nuxt)
    Engine.ts        Façade utilisée par les 3 expériences (options : mode, transparent, autoRotate, controls, zoom, grid)
    SceneManager     Renderer, boucle de rendu à la demande, pause hors écran
    CameraManager    Caméra orthographique isométrique (35,26°), cadrage auto stable, rotation, zoom
    LightingManager  Ciel/sol + soleil à ombres douces + lumière d'ambiance par thème
    EnvironmentManager  Socle, murs (masqués côté caméra), grille, ombre de contact
    AssetManager     Modèles procéduraux (géométries partagées) ou GLB (Draco, Meshopt, KTX2)
    ObjectManager    Diff SceneObject → Object3D, couleurs par slot, finitions
    InteractionManager  Raycasting, sélection, glisser contraint sol / surface / mur, orbite, zoom
    SelectionManager Boîte englobante + empreinte au sol
    SceneSerializer  Validation (zod) et sérialisation
  components/scene/SceneCanvas.vue   Seul pont Vue ↔ moteur
  stores/editor.ts   Pinia : scène (source de vérité), historique annuler/rétablir, sauvegarde auto
shared/              Code partagé client/serveur
  types/scene.ts     Schéma zod du JSON de scène (= futur SetupVersion.sceneData)
  catalog/           Catalogue et métadonnées (dimensions, slots de matériaux, placement, surfaces)
  iso.ts             Rendu SVG isométrique (vignettes, placeholders SSR) sans WebGL
server/              API Nitro
```

### Choix techniques

- **Three.js pur plutôt que TresJS pour le moteur.** Le brief exige un moteur indépendant des interfaces et réutilisable dans trois contextes. Une classe `Engine` sans Vue se teste, s'embarque et s'optimise plus facilement que des composants déclaratifs. Vue n'intervient que via `SceneCanvas.vue`. TresJS reste utilisable plus tard pour des scènes annexes (vignettes, configurateur d'objet).
- **Modèles procéduraux en attendant les GLB.** Chaque objet du catalogue a une source `model` : `procedural` (boîtes arrondies, cylindres) ou `gltf`. Remplacer un modèle ne touche ni l'éditeur ni les scènes sauvegardées : les couleurs sont liées à des *slots* de matériaux.
- **Placement contraint.** `floor` (au sol, dans la pièce), `surface` (sur un objet qui déclare `surface`, sinon au sol), `wall` (accroché au mur visible, orienté automatiquement). Aimantation à 5 cm, désactivable avec Alt.

## Feuille de route

- [x] Étape 1 : fondations Nuxt 4, moteur 3D, éditeur, viewer public, viewer embarqué, catalogue procédural
- [ ] Étape 2 : Neon + Drizzle (User, Setup, SetupVersion, CatalogItem, CatalogCategory), Better Auth (email/mot de passe, OAuth Google prêt), routes protégées
- [ ] Étape 3 : Vercel Blob (GLB, textures, aperçus PNG via `engine.screenshot()`), premiers modèles GLB
- [ ] Étape 4 : galerie publique, profils, likes

> Étape 1 : les setups sont stockés via le stockage Nitro (`.data/setups` en dev, mémoire en prod). Aucune authentification : toute personne connaissant l'identifiant d'un setup peut le modifier.
