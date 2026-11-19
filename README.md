# Oh My Desk

Crée, personnalise et partage ton setup de bureau sous forme de scène 3D isométrique.

## Démarrer

```bash
npm install
cp .env.example .env     # puis renseigner DATABASE_URL et BETTER_AUTH_SECRET (npm run auth:secret)
npm run db:generate      # génère la migration SQL à partir de server/db/schema.ts
npm run db:migrate       # applique les migrations sur Neon
npm run db:seed          # catalogue + setups de démonstration
npm run dev              # http://localhost:3000
```

### Base de données

| Script | Rôle |
|---|---|
| `db:generate` | Crée un fichier de migration dans `server/db/migrations` après une modification du schéma |
| `db:migrate` | Applique les migrations en attente |
| `db:push` | Synchronise directement le schéma (prototypage, sans migration) |
| `db:studio` | Explorateur de données Drizzle |
| `db:seed` | Catalogue et setups de démo (idempotent) |

Tables : `user`, `session`, `account`, `verification` (Better Auth), `setup` (dont `preview_url`), `setup_version` (scène en JSONB), `catalog_category`, `catalog_item`.
Les sauvegardes automatiques rapprochées (moins de 10 min) mettent à jour la même `setup_version` ; au-delà, une nouvelle version est créée.

### Fichiers (Vercel Blob)

Aperçus PNG des setups et modèles GLB du catalogue. `server/utils/storage.ts` choisit le stockage :
- **Vercel Blob** dès que `BLOB_READ_WRITE_TOKEN` est défini (production, ou en local après `vercel env pull`) ;
- sinon **disque local** dans `.data/blob`, servi sur `/blob/**` : rien à configurer pour développer.

**Aperçus PNG** : l'éditeur capture la scène (`engine.capture()`, 1200 × 900, pièce entière, sans grille ni sélection)
5 s après la dernière sauvegarde, et à la sortie de l'éditeur, puis l'envoie à `PUT /api/setups/:id/preview`
(PNG vérifié : signature, dimensions ≤ 2400 px, 3 Mo max). Chaque aperçu a un nom unique (cache CDN d'un an) ;
l'ancien est supprimé. Un setup sans aperçu en reçoit un dès son ouverture dans l'éditeur.
Utilisés par le tableau de bord et comme image de partage (`og:image`) du viewer public ; l'aperçu SVG reste le repli.

**Modèles GLB** : un objet du catalogue peut déclarer `glb: { path: 'models/mug-v1.glb' }`. Le moteur charge
`<assetsBaseUrl>/<path>` et retombe sur le modèle procédural si le fichier est absent ou invalide.
`assetsBaseUrl` est déduit du jeton Blob (`https://<store>.public.blob.vercel-storage.com`), sinon `/blob`.

| Script | Rôle |
|---|---|
| `models:build` | Génère les GLB de `scripts/build-models.ts` dans `assets/models/` (tasse, succulente) |
| `assets:upload` | Publie `assets/models/*.glb` sous `models/` (Vercel Blob ou `.data/blob`) |

Conventions d'un GLB : mètres, origine au centre de la base, face avant vers +Z, matériaux personnalisables
nommés comme leur slot (`body`, `pot`…). Nouvelle version d'un modèle = nouveau nom de fichier (`-v2`).

### Authentification

Better Auth, email + mot de passe avec **confirmation obligatoire de l'email** (lien envoyé via Resend, valable 1 h, connexion automatique après clic).
Anti-abus : limitation de débit stockée en base (`rate_limit`), active en production : 5 inscriptions par heure et par IP, 5 connexions par minute, 3 renvois d'email par 5 minutes.
Sans `RESEND_API_KEY`, en local, le lien de confirmation est affiché dans le terminal de `npm run dev`.

Paramètres (`/settings`) :
- **Changement d'email** en deux étapes : approbation depuis l'adresse actuelle, puis confirmation de la nouvelle adresse.
- **Changement de mot de passe** (avec option « déconnecter mes autres appareils »), suivi d'un email de notification.
- **Mot de passe oublié** (`/forgot-password` → email → `/reset-password`), avec email de confirmation et déconnexion de tous les appareils.

**Connexion Google** : le bouton « Continuer avec Google » apparaît dès que `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont renseignés.
Un compte email existant avec la même adresse est associé automatiquement. Depuis `/settings`, on peut associer Google à un compte existant,
et un compte créé avec Google peut se créer un mot de passe (lien par email).
URI de redirection à déclarer dans Google Cloud : `http://localhost:3000/api/auth/callback/google` et `https://ohmydesk.ludovicnouvel.com/api/auth/callback/google`.
`/editor/**` et `/dashboard` exigent une session ; l'API des setups vérifie que l'utilisateur en est propriétaire.

- `/` : page d'accueil
- `/signup`, `/login` : compte
- `/dashboard` : mes setups
- `/confidentialite`, `/conditions-utilisation` : pages légales (informations éditeur à compléter dans `app/lib/legal.ts`)
- `/settings` : email et mot de passe · `/forgot-password`, `/reset-password`
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
- [x] Étape 2 : Neon + Drizzle (User, Setup, SetupVersion, CatalogItem, CatalogCategory), Better Auth (email/mot de passe, OAuth Google prêt), routes protégées
- [x] Étape 3 : Vercel Blob (repli local), aperçus PNG via `engine.capture()`, premiers modèles GLB (tasse, succulente) avec repli procédural. Textures : chargement KTX2 prêt, aucune texture publiée pour l'instant
- [ ] Étape 4 : galerie publique, profils, likes

## Déploiement Vercel

Variables à définir dans le projet : `DATABASE_URL` (ajoutée automatiquement par l'intégration Neon), `BLOB_READ_WRITE_TOKEN`
(ajoutée en créant un store Blob dans Vercel → Storage, puis `npm run assets:upload` avec ce jeton pour publier les GLB), `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL` (production uniquement : les prévisualisations utilisent `VERCEL_URL`), `NUXT_PUBLIC_SITE_URL`.
Les migrations ne sont pas lancées au build : `npm run db:migrate` avec la `DATABASE_URL` de production avant de déployer un changement de schéma.
