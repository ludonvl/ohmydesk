/**
 * Informations légales affichées sur /confidentialite et /conditions-utilisation.
 * ⚠ À compléter avant la mise en production : remplace chaque valeur entre crochets.
 */
export const LEGAL = {
  /** Date affichée en tête des deux pages ; à mettre à jour à chaque modification du contenu. */
  updatedAt: '17 novembre 2026',
  siteName: 'Oh My Desk',
  siteUrl: 'https://oh-my-desk.ludovicnouvel.com',
  publisher: {
    /** Particulier : prénom et nom. Entreprise : raison sociale. */
    name: '[Prénom Nom ou raison sociale]',
    /** Ex. « Particulier » ou « Entreprise individuelle, SIREN 123 456 789 ». */
    status: '[Statut : particulier, ou forme juridique et SIREN]',
    address: '[Adresse postale]',
    /** Adresse de contact pour les questions et les demandes liées aux données personnelles. */
    email: '[Adresse email de contact]',
    director: '[Nom du directeur de la publication]',
  },
  host: {
    name: 'Vercel Inc.',
    address: '440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
    url: 'https://vercel.com',
  },
} as const
