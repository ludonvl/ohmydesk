<script setup lang="ts">
import { LEGAL } from '~/lib/legal'

useSeoMeta({
  title: 'Politique de confidentialité · Oh My Desk',
  description: 'Quelles données Oh My Desk collecte, pourquoi, combien de temps elles sont conservées et comment exercer tes droits.',
})

const toc = [
  { id: 'responsable', label: 'Qui est responsable de tes données' },
  { id: 'donnees', label: 'Les données collectées et leurs usages' },
  { id: 'public', label: 'Ce qui est visible publiquement' },
  { id: 'prestataires', label: 'Prestataires et transferts hors de l’UE' },
  { id: 'conservation', label: 'Durées de conservation' },
  { id: 'cookies', label: 'Cookies et stockage local' },
  { id: 'securite', label: 'Sécurité' },
  { id: 'droits', label: 'Tes droits' },
  { id: 'modifications', label: 'Modifications de cette politique' },
]
</script>

<template>
  <LegalPage
    title="Politique de confidentialité"
    intro="Oh My Desk collecte uniquement ce qui est nécessaire pour faire fonctionner ton compte et tes setups. Pas de publicité, pas de revente de données, pas d’outil de mesure d’audience."
    :toc="toc"
  >
    <h2 id="responsable">1. Qui est responsable de tes données</h2>
    <p>
      Le responsable du traitement est <strong>{{ LEGAL.publisher.name }}</strong> ({{ LEGAL.publisher.status }}){{ LEGAL.publisher.address ? `, ${LEGAL.publisher.address}` : '' }}.
    </p>
    <p>
      Pour toute question sur tes données ou pour exercer tes droits, écris à <strong>{{ LEGAL.publisher.email }}</strong>.
    </p>

    <h2 id="donnees">2. Les données collectées et leurs usages</h2>
    <table>
      <thead>
        <tr><th scope="col">Données</th><th scope="col">Pourquoi</th><th scope="col">Base légale</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Nom ou pseudo, adresse email, mot de passe (stocké uniquement sous forme chiffrée irréversible, jamais en clair)</td>
          <td>Créer et sécuriser ton compte, te connecter</td>
          <td>Exécution du contrat (les conditions d’utilisation)</td>
        </tr>
        <tr>
          <td>Si tu te connectes avec Google : identifiant de compte Google, nom, email et photo de profil transmis par Google</td>
          <td>Te connecter sans mot de passe, afficher ta photo dans ton menu de compte</td>
          <td>Exécution du contrat</td>
        </tr>
        <tr>
          <td>Tes setups : nom, description, composition de la scène (objets, positions, couleurs), leurs versions successives et une image d’aperçu générée par l’éditeur</td>
          <td>Sauvegarder ton travail, le publier si tu le choisis, l’afficher dans la galerie</td>
          <td>Exécution du contrat</td>
        </tr>
        <tr>
          <td>Ton profil public : identifiant (<code>@pseudo</code>), bio facultative ; les setups que tu as aimés</td>
          <td>Présenter tes setups publiés, compter les « j’aime » et classer la galerie</td>
          <td>Exécution du contrat</td>
        </tr>
        <tr>
          <td>Signalements que tu envoies : setup concerné, motif, précisions éventuelles</td>
          <td>Traiter les contenus signalés et retirer ceux qui enfreignent les conditions</td>
          <td>Intérêt légitime (modération) ; obligation légale (retrait des contenus illicites)</td>
        </tr>
        <tr>
          <td>Emails qui te sont envoyés (confirmation d’adresse, changement d’email ou de mot de passe, réinitialisation)</td>
          <td>Vérifier ton adresse et te prévenir de toute action sensible sur ton compte</td>
          <td>Exécution du contrat ; intérêt légitime (sécurité du compte)</td>
        </tr>
        <tr>
          <td>Sessions de connexion : adresse IP, type de navigateur et d’appareil, date d’expiration</td>
          <td>Te garder connecté, déconnecter tes autres appareils si besoin</td>
          <td>Exécution du contrat ; intérêt légitime (sécurité)</td>
        </tr>
        <tr>
          <td>Adresse IP associée à un compteur de tentatives</td>
          <td>Limiter les abus : inscriptions en masse, tentatives de connexion répétées</td>
          <td>Intérêt légitime (protection du service)</td>
        </tr>
        <tr>
          <td>Journaux techniques de l’hébergeur (adresse IP, page demandée, date, navigateur)</td>
          <td>Faire fonctionner le site, diagnostiquer les erreurs, se protéger des attaques</td>
          <td>Intérêt légitime</td>
        </tr>
      </tbody>
    </table>
    <p>
      Aucune décision automatisée produisant des effets juridiques ne t’est appliquée, et tes données ne sont ni vendues ni utilisées à des fins publicitaires.
    </p>

    <h2 id="public">3. Ce qui est visible publiquement</h2>
    <p>Par défaut, un setup est <strong>privé</strong> : toi seul le vois. Quand tu le publies :</p>
    <ul>
      <li>son nom, sa description, sa scène 3D, son aperçu et le <strong>nom ou pseudo</strong> de ton compte deviennent visibles par tout le monde, dans la galerie et via son lien ;</li>
      <li>ton <strong>profil public</strong> (nom, identifiant, bio, setups publiés, nombre de « j’aime » reçus) est accessible depuis le setup ;</li>
      <li>il peut être affiché sur d’autres sites via le code d’intégration (iframe) ;</li>
      <li>d’autres utilisateurs peuvent en créer une copie pour la modifier (« Remixer »).</li>
    </ul>
    <p>
      Le nombre de « j’aime » d’un setup est public, mais pas la liste des personnes qui l’ont aimé. Ton adresse email n’est jamais affichée publiquement,
      et la personne dont tu signales un setup ne sait pas qui l’a signalé. Tu peux retirer la publication à tout moment depuis l’éditeur.
    </p>

    <h2 id="prestataires">4. Prestataires et transferts hors de l’Union européenne</h2>
    <p>Tes données sont traitées par les prestataires techniques suivants, uniquement pour faire fonctionner le service :</p>
    <ul>
      <li><strong>Vercel Inc.</strong> (États-Unis) : hébergement de l’application, exécution du code serveur et stockage des fichiers (aperçus des setups, modèles 3D).</li>
      <li><strong>Neon</strong> : base de données, hébergée dans l’Union européenne (Francfort, Allemagne).</li>
      <li><strong>Resend</strong> (Plus Five Five, Inc., États-Unis) : envoi des emails de compte.</li>
      <li><strong>Google</strong> : uniquement si tu choisis de te connecter avec Google.</li>
      <li><strong>Google Fonts</strong> : les polices de caractères du site sont chargées depuis les serveurs de Google, qui reçoivent à cette occasion ton adresse IP.</li>
    </ul>
    <p>
      Certains de ces prestataires sont situés aux États-Unis. Ces transferts sont encadrés par le cadre de protection des données UE–États-Unis
      (Data Privacy Framework) lorsque le prestataire y adhère, ou par les clauses contractuelles types de la Commission européenne.
    </p>

    <h2 id="conservation">5. Durées de conservation</h2>
    <ul>
      <li><strong>Compte, profil, setups et « j’aime »</strong> : tant que ton compte existe. Quand tu supprimes ton compte depuis les paramètres, ils sont effacés immédiatement, aperçus compris.</li>
      <li><strong>Signalements</strong> : tant que le setup signalé existe ; ils sont effacés avec lui, ou avec ton compte.</li>
      <li><strong>Sessions de connexion</strong> : 30 jours maximum, ou jusqu’à la déconnexion.</li>
      <li><strong>Liens envoyés par email</strong> (confirmation, réinitialisation, suppression du compte) : valables 1 heure, puis inutilisables.</li>
      <li><strong>Compteurs anti-abus</strong> : quelques minutes à une heure.</li>
      <li><strong>Journaux techniques</strong> : selon la durée de conservation propre à l’hébergeur, généralement de quelques jours.</li>
    </ul>

    <h2 id="cookies">6. Cookies et stockage local</h2>
    <p>Oh My Desk n’utilise <strong>aucun cookie publicitaire ni de mesure d’audience</strong>. Seuls des éléments strictement nécessaires sont utilisés, ce qui ne demande pas de consentement :</p>
    <ul>
      <li>un <strong>cookie de session</strong>, qui te garde connecté (30 jours maximum) ;</li>
      <li>une donnée en <strong>stockage local</strong> de ton navigateur pendant un changement d’adresse email, pour afficher la bonne étape ; elle est effacée une fois le changement terminé.</li>
    </ul>
    <p>Le viewer intégré sur d’autres sites (iframe) ne dépose aucun cookie.</p>

    <h2 id="securite">7. Sécurité</h2>
    <p>
      Les échanges sont chiffrés (HTTPS), les mots de passe sont stockés sous forme chiffrée irréversible, chaque nouvelle adresse email doit être confirmée,
      et un email t’avertit de tout changement de mot de passe ou d’adresse. Les tentatives répétées de connexion ou d’inscription sont limitées automatiquement.
    </p>

    <h2 id="droits">8. Tes droits</h2>
    <p>Conformément au RGPD et à la loi Informatique et Libertés, tu disposes des droits suivants sur tes données :</p>
    <ul>
      <li><strong>accès</strong> : obtenir une copie des données te concernant ;</li>
      <li><strong>rectification</strong> : tu peux modifier ton nom, ton identifiant, ta bio, ton adresse email et ton mot de passe directement dans les paramètres ;</li>
      <li><strong>effacement</strong> : tu peux supprimer ton compte et toutes tes données toi-même, depuis les paramètres (« Supprimer mon compte ») ;</li>
      <li><strong>portabilité</strong> : recevoir tes setups dans un format lisible par une machine (JSON) ;</li>
      <li><strong>opposition et limitation</strong> pour les traitements fondés sur l’intérêt légitime ;</li>
      <li><strong>directives post-mortem</strong> : indiquer ce que deviennent tes données après ton décès.</li>
    </ul>
    <p>
      Pour exercer les autres droits, ou si tu ne peux plus accéder à ton compte, écris à <strong>{{ LEGAL.publisher.email }}</strong> depuis l’adresse liée à ton compte. Une réponse t’est apportée dans un délai d’un mois.
      Si tu estimes que tes droits ne sont pas respectés, tu peux adresser une réclamation à la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).
    </p>

    <h2 id="modifications">9. Modifications de cette politique</h2>
    <p>
      Cette politique peut évoluer avec le service. La date de dernière mise à jour figure en haut de la page.
      En cas de changement important, tu en seras informé par email avant son entrée en vigueur.
    </p>
  </LegalPage>
</template>
