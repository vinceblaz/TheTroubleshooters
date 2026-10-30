/**
 * Tables de création (LdB p. 35 et 37) : idées de conception et lieux de rencontre (d%, 1 à 100).
 */
export const DESIGN_IDEAS = Object.freeze([
  "Accessoire bleu", "Accessoire jaune", "Accessoire rouge", "Accessoire vert", "Athlétique", "Bandana", "Bandeau", "Barbe en pointe",
  "Barbe fournie", "Bas en laine", "Bas nylon", "Baskets", "Béret", "Blouson d’aviateur", "Bottes de l’armée", "Bottes de randonnée",
  "Bracelets", "Casquette militaire", "Chapeau à larges bords", "Chapeau de paille", "Chapeau de soleil", "Chapeau melon",
  "Chaussettes montantes", "Chaussures à talon", "Chaussures bateau", "Chaussures de ville", "Chauve", "Chemise psychédélique",
  "Chemisier à motifs fleuris", "Chevelure rebelle", "Cheveux courts", "Cheveux en bataille", "Cheveux gras", "Cheveux tressés",
  "Chignon", "Col roulé", "Collier de perles", "Costume/tailleur", "Coupe-vent", "Cravate", "Écharpe", "Épingle à cheveux", "Fédora",
  "Formes généreuses", "Foulard", "Gilet", "Grande taille", "Grosses boucles d’oreille", "Haut-de-forme", "Jean", "Jupe à volants",
  "Jupe ample", "Jupe courte", "Jupe longue", "Lorgnon", "Lunettes carrées", "Lunettes larges", "Lunettes rondes", "Maigre", "Manie",
  "Mocassins", "Monocle", "Moustache broussailleuse", "Moustache de morse", "Moustache en guidon de vélo", "Moustache fine",
  "Musculature développée", "Nez crochu", "Nez long", "Nez pointu", "Nœud papillon", "Ombrelle", "Pantalon baggy", "Pantalon moulant",
  "Parapluie", "Petit nez", "Petite taille", "Pommettes saillantes", "Pull en laine", "Robe chic", "Robe de soirée", "Robe psychédélique",
  "Robe tricotée", "Sac à main", "Sandales", "Short", "Silhouette remarquable", "Stetson", "Surpoids", "Taches de rousseur", "Tennis",
  "Trench-coat", "Uniforme", "Veste en jean", "Veste rayée", "Visage anguleux", "Visage carré", "Visage étroit", "Visage plat", "Visage rond"
]);

export const MEETING_PLACES = Object.freeze([
  "Addis-Abeba, Éthiopie", "Amman, Jordanie", "Amsterdam, Pays-Bas", "Angkor Vat, Cambodge", "Ankara, Turquie", "Assouan, Égypte",
  "Bagdad, Irak", "Barcelone, Espagne", "Beijing, Chine", "Belgrade, Yougoslavie", "Berlin-Est, Allemagne de l’Est",
  "Berlin-Ouest, enclave de la RFA en Allemagne de l’Est", "Boston, Massachusetts, États-Unis", "Brighton, Royaume-Uni",
  "Bruxelles, Belgique", "Station spatiale soviétique Budushcheye-1, orbite terrestre", "Le Caire, Égypte", "Cardiff, Royaume-Uni",
  "Casablanca, Maroc", "Le Cervin, Italie/Suisse", "Chicago, Illinois, États-Unis", "Colombo, Sri Lanka", "Copenhague, Danemark",
  "Cuzco, Pérou", "Delhi, Inde", "Dublin, Irlande", "Dubrovnik, Yougoslavie", "Édimbourg, Royaume-Uni", "Genève, Suisse",
  "Gizeh, Égypte", "Helsinki, Finlande", "Honolulu, Hawaï, États-Unis", "Istanbul, Turquie", "Jéricho, Israël", "Jérusalem, Israël",
  "Kiev, URSS", "Kiruna, Suède", "Kisumu, lac Victoria, Kenya", "Kourou, Guyane française", "Kyoto, Japon", "La Rochelle, France",
  "Las Vegas, Nevada, États-Unis", "Léningrad, URSS", "Lillehammer, Norvège", "Lisbonne, Portugal", "Londres, Royaume-Uni",
  "Longyearbyen, Svalbard, Norvège", "Los Angeles, Californie, États-Unis", "Lübeck, Allemagne", "Machu Picchu, Pérou",
  "Madrid, Espagne", "Malmö, Suède", "Marseille, France", "Station McMurdo, Antarctique", "Melbourne, Australie",
  "Miami, Floride, États-Unis", "Monaco, Monaco", "Moscou, URSS", "Munich, Allemagne", "New York, New York, États-Unis",
  "Nouvelle Orléans, Louisiane, États-Unis", "Oslo, Norvège", "Östersund, Suède", "Oulan-Bator, Mongolie", "Paris, France",
  "Pétra, Jordanie", "Ponta Delgada, Açores, Portugal", "Port-au-Prince, Haïti", "Prague, Tchécoslovaquie", "Pripyat, URSS",
  "Reykjavik, Islande", "Rio de Janeiro, Brésil", "Rome, Italie", "San Francisco, Californie, États-Unis", "Salzbourg, Autriche",
  "Serengeti, Tanzanie", "Skara Brae, Royaume-Uni", "Smolensk, URSS", "Sofia, Bulgarie", "Split, Yougoslavie", "Stockholm, Suède",
  "Strasbourg, France", "Sydney, Australie", "Téhéran, Iran", "Tel-Aviv, Israël", "Tenerife, îles Canaries, Espagne",
  "Tenochtitlan, Mexique", "Teotihuacan, Mexique", "Tijuana, Mexique", "Tokyo, Japon", "Vancouver, Canada", "Val-d’Isère, France",
  "La Valette, Malte", "Vatican, enclave à Rome, Italie", "Varsovie, Pologne", "Venise, Italie", "Vienne, Autriche",
  "Vladivostok, URSS", "Zell am See, Autriche", "Zürich, Suisse"
]);

/** Entrée d'une table pour un résultat d% (1-100). */
export function tableEntry(table, result) {
  const r = Math.min(100, Math.max(1, Math.trunc(Number(result) || 1)));
  return table[r - 1];
}
