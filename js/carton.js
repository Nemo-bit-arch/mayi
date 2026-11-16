// Logique pure du carton : aucune dépendance au DOM, testée par tests/carton.test.mjs.

export const NUMERO_WHATSAPP = '24166711861';
export const TYPES = ['coutumier', 'civil', 'religieux'];
const LIBELLES = { coutumier: 'mariage coutumier', civil: 'mariage civil', religieux: 'mariage religieux' };
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
  'septembre', 'octobre', 'novembre', 'décembre'];
const MAX = 24;

function capitaliser(nom) {
  return nom
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('fr')
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep, l) => sep + l.toLocaleUpperCase('fr'));
}

export function normaliserPrenoms(a = '', b = '') {
  const na = capitaliser(a);
  const nb = capitaliser(b);
  const affichage = [na, nb].filter(Boolean).join(' & ');
  return { a: na, b: nb, affichage };
}

export function validerCarton({ a = '', b = '', type, date } = {}) {
  const erreurs = [];
  const ta = a.trim();
  const tb = b.trim();
  if (!ta) erreurs.push('prenom');
  if (ta.length > MAX || tb.length > MAX) erreurs.push('longueur');
  if (!TYPES.includes(type)) erreurs.push('type');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || Number.isNaN(Date.parse(date))) {
    erreurs.push('date');
  } else {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    if (date <= aujourdhui) erreurs.push('date');
  }
  return { ok: erreurs.length === 0, erreurs };
}

export function dateLongue(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const jour = d === 1 ? '1er' : String(d);
  return `${jour} ${MOIS[m - 1]} ${y}`;
}

export function codeDemo({ a = '', b = '', type = '', date = '' }) {
  const s = `${a.trim().toLowerCase()}|${b.trim().toLowerCase()}|${type}|${date}`;
  let h = 2166136261;
  for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) { code += alphabet[h % alphabet.length]; h = Math.floor(h / alphabet.length) || (h ^ 0x9e3779b9) >>> 0; }
  return code;
}

export function libelleType(type) {
  return LIBELLES[type] || 'mariage';
}

export function messageWhatsApp({ affichage, type, date, code }) {
  return [
    'Bonjour Mayi Expériences,',
    `je viens de découvrir l'invitation de ${affichage}.`,
    `Notre ${libelleType(type)} est envisagé pour le ${dateLongue(date)}.`,
    'Nous aimerions créer une invitation à notre image.',
    `Référence : ${code}`,
  ].join('\n');
}

/** Message du cachet présent dès le premier écran, avant que le carton soit rempli. */
export function messageAccueil() {
  return [
    'Bonjour Mayi Expériences,',
    "nous préparons notre mariage et aimerions découvrir votre invitation.",
  ].join('\n');
}

/** Temps restant jusqu'au jour J à 15 h (heure de l'accueil), jamais négatif. */
export function compteARebours(iso, maintenant = new Date()) {
  const [y, m, d] = iso.split('-').map(Number);
  const reste = Math.max(0, new Date(y, m - 1, d, 15, 0).getTime() - maintenant.getTime());
  const minutesTotales = Math.floor(reste / 60000);
  return { jours: Math.floor(minutesTotales / 1440), heures: Math.floor((minutesTotales % 1440) / 60), minutes: minutesTotales % 60 };
}

const PROGRAMMES = {
  coutumier: [['15 h 00', 'Accueil des familles', 'lieu'], ['16 h 00', 'Cérémonie de la dot', 'dot'], ['19 h 30', 'Dîner', 'diner'], ['22 h 00', 'Soirée dansante', 'soiree']],
  civil: [['10 h 00', 'Cérémonie à la mairie', 'alliance'], ['13 h 00', "Vin d'honneur", 'lieu'], ['19 h 30', 'Dîner', 'diner'], ['22 h 00', 'Soirée dansante', 'soiree']],
  religieux: [['14 h 00', 'Célébration religieuse', 'alliance'], ['16 h 30', "Vin d'honneur", 'lieu'], ['19 h 30', 'Dîner', 'diner'], ['22 h 00', 'Soirée dansante', 'soiree']],
};
export function programme(type) {
  return (PROGRAMMES[type] || PROGRAMMES.coutumier).map(([heure, titre, image]) => ({ heure, titre, image }));
}

export function lienWhatsApp(message) {
  return `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/* ---------- Livre d'or ---------- */
export function nettoyerMot(texte) {
  return String(texte || '').replace(/\s+/g, ' ').trim().slice(0, 140);
}
/** Ajoute un mot en tête (le plus frais d'abord), 30 mots au plus ; un mot vide laisse la liste intacte. */
export function ajouterMot(liste, { nom, texte }, quand = Date.now()) {
  const t = nettoyerMot(texte);
  if (!t) return liste;
  return [{ nom: nettoyerMot(nom).slice(0, 40) || 'Un invité', texte: t, quand }, ...liste].slice(0, 30);
}

/* ---------- Agenda (.ics) ---------- */
const echapperIcs = (s) => String(s).replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n');
export function fichierAgenda({ affichage, date, lieu }) {
  const j = date.replace(/-/g, '');
  const lendemain = new Date(`${date}T12:00:00`); lendemain.setDate(lendemain.getDate() + 1);
  const fin = lendemain.toISOString().slice(0, 10).replace(/-/g, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mayi Experiences//Invitation//FR', 'BEGIN:VEVENT',
    `UID:${j}-${encodeURIComponent(affichage)}@mayilabs`, `DTSTART:${j}T150000`, `DTEND:${fin}T020000`,
    `SUMMARY:${echapperIcs(`Mariage d’${affichage}`)}`, `LOCATION:${echapperIcs(lieu)}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

/* ---------- Jour J ---------- */
const minutes = (h) => { const m = String(h).match(/(\d{1,2})\s*h?\s*:?\s*(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
/** Index du dernier moment commencé à l'heure donnée (« HH:MM »), -1 avant le premier. */
export function momentEnCours(type, heure) {
  const t = minutes(heure);
  let i = -1;
  programme(type).forEach((l, k) => { if (minutes(l.heure) <= t) i = k; });
  return i;
}

/* ---------- Familles et code d'invitation ---------- */
/** « d’Awa », « de Karl » : l'élision devant une voyelle ou un h muet. */
export function deLiaison(prenom = '') {
  const p = prenom.trim();
  if (!p) return '';
  return /^[aeiouyhàâäéèêëîïôöùûüœæ]/i.test(p) ? `d’${p}` : `de ${p}`;
}
/** La famille d'un des deux prénoms ; sans second prénom, « L’autre famille ». */
export function familleDe(prenom = '') {
  return prenom.trim() ? `Famille ${deLiaison(prenom)}` : 'L’autre famille';
}
/** Code d'invitation lisible (AK-12) : initiales des prénoms, sans accent, et jour du mariage. */
export function codeInvitation({ a = '', b = '', date = '' } = {}) {
  const initiale = (n) => n.normalize('NFD').replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase();
  const i1 = initiale(a) || 'M';
  const i2 = initiale(b) || i1;
  const jour = (date.split('-')[2] || '01').padStart(2, '0');
  return `${i1}${i2}-${jour}`;
}
/** L'adresse du site aux prénoms du couple : awa-et-karl.com. */
export function domaineMariage({ a = '', b = '' } = {}) {
  const propre = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return [propre(a), propre(b)].filter(Boolean).join('-et-') + '.com';
}

/** Les thèmes que les mariés choisissent sur le carton. Le premier est celui par défaut. */
export const THEMES = Object.freeze({ bordeaux: 'Bordeaux et or', emeraude: 'Émeraude et or' });

/** Un thème inconnu (ou absent) retombe sur le bordeaux. */
export function themeValide(theme) {
  return Object.hasOwn(THEMES, theme) ? theme : 'bordeaux';
}

/**
 * Le média d'un thème vit dans un sous-dossier à son nom, à côté du média par défaut :
 * assets/img/v5/enveloppe.webp → assets/img/v5/emeraude/enveloppe.webp.
 */
export function cheminTheme(chemin, theme) {
  const t = themeValide(theme);
  if (t === 'bordeaux') return chemin;
  const i = chemin.lastIndexOf('/');
  return `${chemin.slice(0, i + 1)}${t}/${chemin.slice(i + 1)}`;
}
