<script setup lang="ts">
import { LEGAL } from '~/lib/legal'

useSeoMeta({
  title: 'Conditions d’utilisation · Oh My Desk',
  description: 'Les règles d’utilisation d’Oh My Desk : compte, setups publiés, intégration sur d’autres sites, propriété intellectuelle.',
})

const toc = [
  { id: 'editeur', label: 'Éditeur et hébergement' },
  { id: 'objet', label: 'Objet du service' },
  { id: 'compte', label: 'Ton compte' },
  { id: 'contenus', label: 'Tes setups et contenus' },
  { id: 'publication', label: 'Publication, partage, intégration et remix' },
  { id: 'usage', label: 'Règles d’usage' },
  { id: 'propriete', label: 'Propriété intellectuelle d’Oh My Desk' },
  { id: 'marques', label: 'Produits et marques représentés' },
  { id: 'disponibilite', label: 'Disponibilité et évolution du service' },
  { id: 'responsabilite', label: 'Responsabilité' },
  { id: 'fin', label: 'Suppression du compte et suspension' },
  { id: 'modifications', label: 'Modifications des conditions' },
  { id: 'droit', label: 'Droit applicable' },
]
</script>

<template>
  <LegalPage
    title="Conditions d’utilisation"
    intro="Ces conditions encadrent l’utilisation d’Oh My Desk. En créant un compte, tu les acceptes. Elles sont écrites pour être lisibles : n’hésite pas à nous écrire si un point n’est pas clair."
    :toc="toc"
  >
    <h2 id="editeur">1. Éditeur et hébergement</h2>
    <p>
      Le site <strong>{{ LEGAL.siteUrl }}</strong> est édité par <strong>{{ LEGAL.publisher.name }}</strong> ({{ LEGAL.publisher.status }}){{ LEGAL.publisher.address ? `, ${LEGAL.publisher.address}` : '' }}.
      Contact : <strong>{{ LEGAL.publisher.email }}</strong>.
      Directeur de la publication : {{ LEGAL.publisher.director }}.
    </p>
    <p v-if="!LEGAL.publisher.address">
      Conformément à l’article 6, III, 2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique, l’éditeur, personne physique
      agissant à titre non professionnel, ne publie pas son adresse personnelle ; ses éléments d’identification ont été communiqués à l’hébergeur.
    </p>
    <p>
      Hébergement : <strong>{{ LEGAL.host.name }}</strong>, {{ LEGAL.host.address }}
      (<a :href="LEGAL.host.url" target="_blank" rel="noopener">vercel.com</a>).
    </p>

    <h2 id="objet">2. Objet du service</h2>
    <p>
      Oh My Desk permet de créer, personnaliser et partager des « setups » : des représentations en 3D isométrique d’espaces de travail ou de jeu,
      composées à partir d’un catalogue d’objets. Le service est actuellement <strong>gratuit</strong>.
      Si des fonctionnalités payantes apparaissent, elles feront l’objet de conditions spécifiques que tu devras accepter avant tout paiement.
    </p>

    <h2 id="compte">3. Ton compte</h2>
    <ul>
      <li>Le service est ouvert aux personnes âgées d’au moins 15 ans. En dessous, l’accord d’un parent ou tuteur est nécessaire.</li>
      <li>Tu t’engages à fournir une adresse email valide qui t’appartient : elle doit être confirmée pour activer le compte.</li>
      <li>Tu es responsable de la confidentialité de ton mot de passe et de l’activité de ton compte. Préviens-nous sans attendre en cas d’utilisation non autorisée.</li>
      <li>Ton nom ou pseudo ne doit pas usurper l’identité d’une autre personne ni être injurieux.</li>
    </ul>

    <h2 id="contenus">4. Tes setups et contenus</h2>
    <p>
      Tu restes <strong>propriétaire</strong> de ce que tu crées : le nom, la description et la composition de tes setups.
      Pour pouvoir faire fonctionner le service, tu accordes à Oh My Desk, gratuitement et pour le monde entier, le droit de stocker, reproduire et afficher ces contenus,
      uniquement dans le cadre du service : sauvegarde, affichage dans l’éditeur et, si tu les publies, affichage public et via les intégrations.
      Ce droit prend fin quand tu supprimes le contenu ou ton compte, sous réserve des copies créées par d’autres utilisateurs via le remix (voir ci-dessous).
    </p>
    <p>Tu garantis que tes contenus ne portent pas atteinte aux droits d’autrui et respectent la loi.</p>

    <h2 id="publication">5. Publication, partage, intégration et remix</h2>
    <ul>
      <li>Un setup est <strong>privé</strong> tant que tu ne le publies pas. Tu peux retirer la publication à tout moment.</li>
      <li>Un setup publié est accessible à toute personne disposant du lien, avec ton nom ou pseudo.</li>
      <li>Toute personne peut l’<strong>intégrer sur un autre site</strong> via le code d’intégration, sans le présenter de manière trompeuse (par exemple comme sa propre création).</li>
      <li>En publiant un setup, tu autorises les autres utilisateurs à en créer une <strong>copie modifiable</strong> (« Remixer ») dans leur propre compte. Ces copies restent sous leur responsabilité et ne sont pas supprimées si tu retires ton setup.</li>
    </ul>

    <h2 id="usage">6. Règles d’usage</h2>
    <p>Il est interdit d’utiliser Oh My Desk pour :</p>
    <ul>
      <li>publier des contenus illicites, haineux, violents, à caractère sexuel ou portant atteinte aux droits d’autrui (vie privée, droit d’auteur, marques) ;</li>
      <li>créer des comptes en masse, automatiser des inscriptions ou des connexions, ou contourner les limites techniques et les mesures de sécurité ;</li>
      <li>collecter de manière automatisée les contenus ou les données des autres utilisateurs ;</li>
      <li>perturber le fonctionnement du service ou tenter d’accéder à des données qui ne te sont pas destinées.</li>
    </ul>
    <p>
      Tu peux signaler un contenu publié qui te semble illicite en écrivant à <strong>{{ LEGAL.publisher.email }}</strong>, avec le lien du setup concerné.
    </p>

    <h2 id="propriete">7. Propriété intellectuelle d’Oh My Desk</h2>
    <p>
      L’application, son interface, son logo, son moteur 3D et les objets du catalogue sont protégés et restent la propriété de leur éditeur.
      Tu peux les utiliser dans le cadre normal du service (créer, publier et intégrer tes setups), mais pas les extraire, les copier ou les réutiliser en dehors du service.
    </p>

    <h2 id="marques">8. Produits et marques représentés</h2>
    <p>
      Les objets du catalogue sont des représentations stylisées. Les noms de produits ou de marques que tu peux associer à tes setups appartiennent à leurs propriétaires respectifs.
      Leur mention n’implique aucun partenariat ni aucune approbation de leur part.
    </p>

    <h2 id="disponibilite">9. Disponibilité et évolution du service</h2>
    <p>
      Le service est fourni tel quel. Nous faisons notre possible pour qu’il soit disponible et fiable, sans pouvoir le garantir :
      des interruptions peuvent survenir, notamment pour maintenance. Les fonctionnalités et le catalogue peuvent évoluer.
      Pense à conserver tes propres copies si un setup a une importance particulière pour toi.
    </p>

    <h2 id="responsabilite">10. Responsabilité</h2>
    <p>
      Dans les limites permises par la loi, l’éditeur n’est pas responsable des dommages indirects liés à l’utilisation du service, ni des contenus publiés par les utilisateurs,
      dont il assure seulement l’hébergement. Il s’engage à retirer promptement tout contenu manifestement illicite qui lui est signalé.
      Rien dans ces conditions ne limite les droits que tu tiens de la loi en tant que consommateur.
    </p>

    <h2 id="fin">11. Suppression du compte et suspension</h2>
    <ul>
      <li>Tu peux demander la suppression de ton compte à tout moment en écrivant à <strong>{{ LEGAL.publisher.email }}</strong>. Tes données sont alors effacées dans un délai d’un mois.</li>
      <li>En cas de manquement grave à ces conditions, ton compte peut être suspendu ou supprimé, après t’avoir prévenu par email lorsque c’est possible.</li>
    </ul>

    <h2 id="modifications">12. Modifications des conditions</h2>
    <p>
      Ces conditions peuvent évoluer. En cas de changement important, tu seras prévenu par email au moins 15 jours avant son entrée en vigueur.
      Si tu n’acceptes pas les nouvelles conditions, tu peux supprimer ton compte avant cette date.
    </p>

    <h2 id="droit">13. Droit applicable</h2>
    <p>
      Ces conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité ; à défaut, les tribunaux français seront compétents,
      sous réserve des règles protectrices applicables aux consommateurs.
    </p>
    <p>Pour tout ce qui concerne tes données personnelles, consulte la <NuxtLink to="/confidentialite">politique de confidentialité</NuxtLink>.</p>
  </LegalPage>
</template>
