/**
 * Informations légales affichées sur /confidentialite et /conditions-utilisation.
 * À mettre à jour si le cadre change (activité professionnelle, nouvelle adresse de contact…).
 */
export const LEGAL = {
  /** Date affichée en tête des deux pages ; à mettre à jour à chaque modification du contenu. */
  updatedAt: '20 novembre 2026',
  siteName: 'Oh My Desk',
  siteUrl: 'https://ohmydesk.ludovicnouvel.com',
  publisher: {
    /** Particulier : prénom et nom. Entreprise : raison sociale. */
    name: 'Ludovic Nouvel',
    /** Ex. « Particulier » ou « Entreprise individuelle, SIREN 123 456 789 ». */
    status: 'particulier, site personnel non professionnel',
    /**
     * Vide pour un particulier agissant à titre non professionnel (LCEN, art. 6, III, 2) :
     * l'adresse n'est pas publiée, l'hébergeur dispose des éléments d'identification.
     */
    address: '',
    /** Adresse de contact pour les questions et les demandes liées aux données personnelles. */
    email: 'ohmydesk@ludovicnouvel.com',
    director: 'Ludovic Nouvel',
  },
  host: {
    name: 'Vercel Inc.',
    address: '440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
    url: 'https://vercel.com',
  },
} as const
