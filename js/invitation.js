// L'invitation v5 « Le faire-part ». Logique pure : carton.js (testée). Moteur de défilement : scrollcraft.js.
import { normaliserPrenoms, validerCarton, dateLongue, codeDemo, messageWhatsApp, messageAccueil, lienWhatsApp, libelleType, programme, ajouterMot, fichierAgenda, momentEnCours, familleDe, codeInvitation, domaineMariage, themeValide, cheminTheme } from './carton.js';
import { dessinerPass } from './pass.js';

const PIXEL_ID = '2104600966851329'; // ensemble de données « MayiLabs Expériences »
const PARAMS = new URLSearchParams(location.search);
const LOCAL = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
const PIXEL_ACTIF = !LOCAL || PARAMS.has('pixel');
const RAPIDE = PARAMS.has('rapide');
const T = (ms) => (RAPIDE ? Math.min(ms, 120) : ms);
const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const etat = { invite: 'Nadège', table: '7' };
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Le stockage local peut être refusé (navigation privée, navigateur intégré) : la page continue sans. */
function memoire(f, repli = null) { try { return f(); } catch { return repli; } }

/* ---------- Pixel Meta (rien depuis un poste local) ---------- */
function pixel(evt, perso = false) {
  if (!PIXEL_ID || !PIXEL_ACTIF) return;
  if (!window.fbq) {
    const f = (window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); });
    f.push = f; f.loaded = true; f.version = '2.0'; f.queue = [];
    const s = document.createElement('script'); s.async = true; s.src = 'https://connect.facebook.net/fr_FR/fbevents.js';
    document.head.append(s);
    window.fbq('init', PIXEL_ID); window.fbq('track', 'PageView');
  }
  window.fbq(perso ? 'trackCustom' : 'track', evt);
}
pixel('ViewContent');

const liensWa = () => $$('.lien-whatsapp');
liensWa().forEach((a) => { a.href = lienWhatsApp(messageAccueil()); a.addEventListener('click', () => pixel('Contact')); });

/* =================================================== 0 · Le carton ==== */
const form = $('.carton');
const aide = $('.aide');
const zone = $('.signature-zone');
const sig = $('.signature');
const champDate = form.elements.date;
champDate.min = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const MESSAGES = { prenom: 'Le carton attend au moins un prénom.', longueur: 'Chaque prénom tient en vingt-quatre lettres au plus.', type: 'Choisissez le type de mariage.', date: 'Choisissez une date à venir.' };
const lireCarton = () => ({ a: form.elements.a.value, b: form.elements.b.value, type: form.elements.type.value, date: champDate.value, theme: form.elements.theme.value });

/* ===================================== Le thème des mariés ======== */
// Chaque média marqué data-theme-media a sa version du thème dans un sous-dossier à son nom.
// Les films sont permutés avant le montage du moteur, qui ne lit data-sc-src qu'à l'ouverture.
const ATTRS_MEDIA = ['src', 'srcset', 'data-sc-src', 'data-sc-src-mobile'];
const defautsMedia = new Map($$('[data-theme-media]').map((el) => [el, Object.fromEntries(ATTRS_MEDIA.filter((a) => el.hasAttribute(a)).map((a) => [a, el.getAttribute(a)]).concat(el.hasAttribute('alt') ? [['alt', el.alt]] : []))]));
function appliquerTheme(theme) {
  const t = themeValide(theme);
  etat.theme = t;
  document.documentElement.dataset.theme = t;
  defautsMedia.forEach((defaut, el) => {
    for (const [att, valeur] of Object.entries(defaut)) {
      if (att === 'alt') el.alt = el.dataset[`alt${t[0].toUpperCase()}${t.slice(1)}`] || valeur;
      else el.setAttribute(att, cheminTheme(valeur, t));
    }
  });
}
form.addEventListener('change', (e) => { if (e.target.name === 'theme') appliquerTheme(e.target.value); });
{
  const demande = themeValide(PARAMS.get('theme'));
  const radio = form.querySelector(`input[name=theme][value=${demande}]`);
  if (radio) radio.checked = true;
  appliquerTheme(demande);
}

let trace = { min: Infinity, max: -Infinity, actif: false };
const ctxSig = zone.getContext('2d');
function tailleZone() { const r = zone.getBoundingClientRect(); zone.width = r.width * devicePixelRatio; zone.height = r.height * devicePixelRatio; ctxSig.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
tailleZone();
function effacer() { ctxSig.clearRect(0, 0, zone.width, zone.height); trace = { min: Infinity, max: -Infinity, actif: false }; sig.classList.remove('signee'); zone.setAttribute('aria-valuenow', '0'); }
function point(e) { const r = zone.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r.width]; }
function encre() { ctxSig.strokeStyle = '#3a2418'; ctxSig.lineWidth = 2.2; ctxSig.lineCap = 'round'; ctxSig.lineJoin = 'round'; }
zone.addEventListener('pointerdown', (e) => {
  zone.setPointerCapture(e.pointerId);
  const [x, y] = point(e); trace.actif = true; trace.min = Math.min(trace.min, x); trace.max = Math.max(trace.max, x);
  encre(); ctxSig.beginPath(); ctxSig.moveTo(x, y);
});
zone.addEventListener('pointermove', (e) => {
  if (!trace.actif) return;
  const [x, y, w] = point(e); ctxSig.lineTo(x, y); ctxSig.stroke();
  trace.min = Math.min(trace.min, x); trace.max = Math.max(trace.max, x);
  zone.setAttribute('aria-valuenow', String(Math.round(((trace.max - trace.min) / w) * 100)));
});
function finTrace() {
  if (!trace.actif) return; trace.actif = false;
  if ((trace.max - trace.min) / zone.getBoundingClientRect().width >= 0.45) sceller();
}
zone.addEventListener('pointerup', finTrace);
zone.addEventListener('pointercancel', finTrace);
zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); signerAuClavier(); } });
function signerAuClavier() {
  const r = zone.getBoundingClientRect();
  encre(); ctxSig.beginPath();
  ctxSig.moveTo(r.width * .15, r.height * .55);
  ctxSig.bezierCurveTo(r.width * .35, r.height * .2, r.width * .55, r.height * .8, r.width * .85, r.height * .45); ctxSig.stroke();
  sceller();
}
form.addEventListener('submit', (e) => { e.preventDefault(); signerAuClavier(); });
['a', 'b'].forEach((k) => form.elements[k].addEventListener('blur', () => { form.elements[k].value = normaliserPrenoms(form.elements[k].value, '').a; }));

function sceller() {
  const brut = lireCarton();
  const v = validerCarton(brut);
  if (!v.ok) {
    aide.textContent = MESSAGES[v.erreurs[0]];
    form.classList.remove('refuse'); void form.offsetWidth; form.classList.add('refuse');
    setTimeout(effacer, T(700));
    return;
  }
  aide.textContent = '';
  sig.classList.add('signee');
  Object.assign(etat, brut, normaliserPrenoms(brut.a, brut.b), { code: codeDemo(brut), dateLongue: dateLongue(brut.date) });
  etat.lien = lienWhatsApp(messageWhatsApp(etat));
  liensWa().forEach((a) => { a.href = etat.lien; });
  pixel('Lead');
  remplir();
  setTimeout(ouvrirInvitation, T(800));
}

/* ======================================= Remplir l'invitation ===== */
const capitale = (t) => t.replace(/^./, (l) => l.toUpperCase());
/** Les prénoms en pile, l'esperluette entre les deux. */
function noms(el) {
  el.replaceChildren(...[etat.a, etat.b].filter(Boolean).flatMap((n, i) => {
    const s = document.createElement('span'); s.textContent = n;
    if (i === 0) return [s];
    const et = document.createElement('span'); et.className = 'et'; et.textContent = '&';
    return [et, s];
  }));
  el.setAttribute('aria-label', etat.affichage);
}

const ICONES = {
  lieu: '<path d="M3 21h18M5 21V10l7-5 7 5v11M10 21v-5h4v5"/>',
  dot: '<path d="M4 9h16v11H4zM4 9l8-5 8 5M12 9v11M4 14h16"/>',
  alliance: '<circle cx="9" cy="14" r="5"/><circle cx="15" cy="14" r="5"/><path d="M8 6l1-2h2l1 2"/>',
  diner: '<circle cx="12" cy="13" r="6"/><path d="M3 6v6M3 9h2M5 6v6M21 6c-2 2-2 5 0 7v7M4 12v8"/>',
  soiree: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
};

function calendrier() {
  const [y, m, d] = etat.date.split('-').map(Number);
  $('[data-mois]').textContent = MOIS[m - 1];
  $('[data-annee]').textContent = String(y);
  const premier = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lundi = 0
  const total = new Date(y, m, 0).getDate();
  const items = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((j) => { const li = document.createElement('li'); li.className = 'entete'; li.textContent = j; return li; });
  for (let i = 0; i < premier; i++) { const li = document.createElement('li'); li.className = 'vide'; items.push(li); }
  for (let j = 1; j <= total; j++) {
    const li = document.createElement('li'); li.textContent = String(j);
    if (j === d) {
      li.className = 'jour-j';
      li.insertAdjacentHTML('beforeend', '<svg class="coeur" viewBox="0 0 60 56" aria-hidden="true"><path pathLength="1" d="M30 52 C 8 38, 2 24, 8 13 C 14 2, 27 4, 30 15 C 33 4, 46 2, 52 13 C 58 24, 52 38, 30 52 C 26 49, 22 46, 19 43"/></svg>');
    }
    items.push(li);
  }
  $('.calendrier__jours').replaceChildren(...items);
  $('.calendrier').setAttribute('aria-label', `Calendrier de ${MOIS[m - 1]} ${y} : le ${etat.dateLongue} est entouré d'un cœur.`);
}

function remplir() {
  $$('[data-noms]').forEach(noms);
  $$('[data-invite]').forEach((e) => { e.textContent = etat.invite; });
  $$('[data-table]').forEach((e) => { e.textContent = etat.table; });
  $('[data-type]').textContent = capitale(libelleType(etat.type));
  $('[data-date-longue]').textContent = etat.dateLongue;
  $('[data-accueil]').textContent = programme(etat.type)[0].heure;
  const avant = new Date(`${etat.date}T12:00:00`); avant.setDate(avant.getDate() - 21);
  $('[data-avant]').textContent = dateLongue(avant.toISOString().slice(0, 10));
  calendrier();
  $('.programme').replaceChildren(...programme(etat.type).map(({ heure, titre, image }, i) => {
    const li = document.createElement('li'); li.style.setProperty('--i', String(i));
    const h = document.createElement('span'); h.className = 'heure'; h.textContent = heure;
    const p = document.createElement('span'); p.className = 'perle';
    p.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[image] || ICONES.lieu}</svg>`;
    const t = document.createElement('span'); t.className = 'titre'; t.textContent = titre;
    li.append(h, p, t); return li;
  }));
  const jour = String(Number(etat.date.split('-')[2]));
  const mois = etat.dateLongue.split(' ')[1] || '';
  $('.feuillet-jour').textContent = jour; $('.feuillet-mois').textContent = mois;
  $('.feuille-jour').textContent = jour; $('.feuille-mois').textContent = mois.toUpperCase();
  const ics = new Blob([fichierAgenda({ affichage: etat.affichage, date: etat.date, lieu: 'Le Grand Salon, Libreville' })], { type: 'text/calendar' });
  const agenda = $('.agenda'); agenda.href = URL.createObjectURL(ics); agenda.download = `mariage-${etat.code}.ics`;
  // Le code personnel de l'invité, les familles des deux prénoms (pagnes, côté, registre).
  const code = codeInvitation(etat);
  $$('[data-domaine]').forEach((e) => { e.textContent = domaineMariage(etat); });
  $$('[data-code-invite]').forEach((e) => { e.textContent = code; });
  $('.cachet').setAttribute('aria-label', `Presser le cachet de cire : votre code ${code} est déjà inscrit`);
  ['a', 'b'].forEach((k) => {
    $$(`[data-famille="${k}"]`).forEach((e) => { e.textContent = familleDe(etat[k]); });
    $$(`[data-famille-min="${k}"]`).forEach((e) => { e.textContent = familleDe(etat[k]).replace(/^./, (l) => l.toLowerCase()); });
    $$(`[data-prenom="${k}"]`).forEach((e) => { e.textContent = etat[k] || etat.a; });
  });
  $('.enveloppe-envoi').href = etat.lien;
  chargerMots();
  majRebours();
}

/* ============================================ Ouvrir l'invitation ==== */
let moteur = null;
function ouvrirInvitation() {
  $('#invitation').hidden = false;
  document.body.dataset.etape = 'invitation';
  scrollTo({ top: 0, behavior: 'instant' });
  moteur = window.ScrollCraft ? window.ScrollCraft.mount(document.body) : null;
  setInterval(majRebours, 1000);
  if ('IntersectionObserver' in window) {
    const o = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { pixel('InvitationVue', true); o.disconnect(); } }, { threshold: 0.4 });
    o.observe($('.acte--reponse'));
  }
}

/* ===================================== 1 · L'enveloppe en relief ==== */
const enveloppe = $('.enveloppe');
const scene = $('.enveloppe-scene');
function incliner(x, y) { // x, y entre -1 et 1
  enveloppe.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
  enveloppe.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
  enveloppe.style.setProperty('--lx', x.toFixed(3));
  enveloppe.style.setProperty('--ly', y.toFixed(3));
}
if (!reduit) {
  scene.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = scene.getBoundingClientRect();
    incliner(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  });
  scene.addEventListener('pointerleave', () => incliner(0, 0));
  // Sur téléphone, l'enveloppe suit l'inclinaison de l'appareil (si le navigateur la donne sans permission).
  addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || document.body.dataset.etape !== 'invitation') return;
    incliner(Math.max(-1, Math.min(1, e.gamma / 25)), Math.max(-1, Math.min(1, (e.beta - 45) / 25)));
  });
}

const cachet = $('.cachet');
function briserCachet(defiler = true) {
  if (cachet.classList.contains('brise')) return;
  cachet.classList.add('brise');
  cachet.setAttribute('aria-label', 'Le cachet est brisé');
  $('.enveloppe__consigne').textContent = 'Le cachet cède, l’enveloppe s’ouvre.';
  if (defiler) setTimeout(() => $('.acte--ouverture').scrollIntoView({ behavior: reduit ? 'instant' : 'smooth' }), T(900));
}
cachet.addEventListener('click', () => briserCachet(true));
// Si le visiteur descend sans presser le cachet, le cachet cède de lui-même.
addEventListener('scroll', () => {
  if (document.body.dataset.etape !== 'invitation') return;
  if (scrollY > innerHeight * 0.35) briserCachet(false);
  const max = document.documentElement.scrollHeight - innerHeight;
  document.documentElement.style.setProperty('--lecture', max > 0 ? (scrollY / max).toFixed(3) : '0');
}, { passive: true });

/* ========================================== Le ruban (navigation) ==== */
const ruban = $('.ruban-nav__ruban');
const cartes = $('#ruban-cartes');
function basculerRuban(ouvrir = cartes.hidden) {
  cartes.hidden = !ouvrir;
  ruban.setAttribute('aria-expanded', String(ouvrir));
}
ruban.addEventListener('click', () => basculerRuban());
cartes.addEventListener('click', (e) => { if (e.target.closest('a')) basculerRuban(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !cartes.hidden) { basculerRuban(false); ruban.focus(); } });

/* ======================================== 4 · Le compte à rebours ==== */
function majRebours() {
  if (!etat.date) return;
  const [y, m, d] = etat.date.split('-').map(Number);
  const reste = Math.max(0, new Date(y, m - 1, d, 15, 0).getTime() - Date.now());
  const s = Math.floor(reste / 1000);
  const v = { jours: Math.floor(s / 86400), heures: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), secondes: s % 60 };
  const sing = { jours: 'jour', heures: 'heure', minutes: 'minute', secondes: 'seconde' };
  for (const k of Object.keys(v)) {
    $(`[data-rebours="${k}"]`).textContent = String(v[k]);
    $(`[data-unite="${k}"]`).textContent = v[k] >= 2 ? k : sing[k]; // 0 et 1 restent au singulier
  }
}

/* =============================================== 5 · Le jour J ==== */
const HEURE_JOUR_J = '16:40'; // heure simulée de la démonstration
const ephemeride = $('.ephemeride');
ephemeride.addEventListener('click', () => {
  const actif = ephemeride.getAttribute('aria-pressed') !== 'true';
  ephemeride.setAttribute('aria-pressed', String(actif));
  const i = momentEnCours(etat.type, HEURE_JOUR_J);
  $$('.programme li').forEach((li, k) => { li.classList.toggle('passe', actif && k < i); li.classList.toggle('maintenant', actif && k === i); });
  const enCours = programme(etat.type)[i];
  $('.jour-j-etat').textContent = actif
    ? `Le grand jour, 16 h 40. ${enCours ? `${enCours.titre} : vous y êtes.` : 'Les festivités commencent bientôt.'} Votre table vous attend, la ${etat.table}, côté mer.`
    : '';
  $('.ephemeride-texte').textContent = actif ? 'Revenez à l’invitation reçue avant le grand jour.' : 'Tournez la page : voici votre invitation le jour J.';
});

// Les pagnes des familles : le coupon se retourne en bon de commande, et revient au second toucher.
$$('.pagne').forEach((p) => p.addEventListener('click', () => {
  p.setAttribute('aria-pressed', String(p.getAttribute('aria-pressed') !== 'true'));
}));

// La cagnotte : l'enveloppe-cadeau s'ouvre et dit comment participer. Aucun paiement dans la page.
const cadeau = $('.enveloppe-cadeau');
cadeau.addEventListener('click', () => {
  const ouverte = cadeau.getAttribute('aria-expanded') !== 'true';
  cadeau.setAttribute('aria-expanded', String(ouverte));
  $('.cagnotte__suite').hidden = !ouverte;
});

/* ============================================= 7 · Les vœux ==== */
const EXEMPLES = [
  { nom: 'Tantine Odile', texte: 'Que votre foyer soit aussi généreux que la table de ce soir.', exemple: true },
  { nom: 'Marc Obiang', texte: 'Rendez-vous sur la piste, à vingt-deux heures précises.', exemple: true },
  { nom: 'Famille Ndong', texte: 'Tout notre amour vous accompagne, de Port-Gentil à Libreville.', exemple: true },
];
const cleMots = () => `mayi-mots-${etat.code}`;
let mots = [];
function afficherMots(frais = false) {
  $('.mots').replaceChildren(...mots.map((m, k) => {
    const li = document.createElement('li');
    if (m.exemple) li.classList.add('exemple');
    if (frais && k === 0) li.classList.add('frais');
    const q = document.createElement('q'); q.textContent = m.texte;
    const c = document.createElement('cite'); c.textContent = m.nom;
    li.append(q, c); return li;
  }));
}
function chargerMots() {
  const gardes = memoire(() => JSON.parse(localStorage.getItem(cleMots()) || '[]'), []);
  mots = [...(Array.isArray(gardes) ? gardes : []), ...EXEMPLES];
  afficherMots();
}
const formMot = $('.mot');
formMot.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!formMot.elements.texte.value.trim()) { formMot.elements.texte.focus(); return; }
  mots = ajouterMot(mots, { nom: formMot.elements.nom.value, texte: formMot.elements.texte.value });
  memoire(() => localStorage.setItem(cleMots(), JSON.stringify(mots.filter((m) => !m.exemple))));
  formMot.elements.texte.value = '';
  afficherMots(true);
  $('.mots').scrollTo({ left: 0, behavior: reduit ? 'instant' : 'smooth' });
});
// Les rangées se balaient du doigt (natif) et, sur ordinateur, à la souris.
// La capture ne commence qu'au-delà de 6 px : un simple clic atteint encore le tirage touché.
function balayable(el) {
  let prise = null;
  el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; prise = { x: e.clientX, depart: el.scrollLeft, bouge: false }; });
  el.addEventListener('pointermove', (e) => {
    if (!prise) return;
    const dx = e.clientX - prise.x;
    if (!prise.bouge && Math.abs(dx) > 6) { prise.bouge = true; el.setPointerCapture(e.pointerId); el.classList.add('saisie'); }
    if (prise.bouge) el.scrollLeft = prise.depart - dx;
  });
  const lacher = () => {
    if (prise?.bouge) { el.dataset.glisse = '1'; setTimeout(() => { delete el.dataset.glisse; }, 0); }
    prise = null; el.classList.remove('saisie');
  };
  el.addEventListener('pointerup', lacher);
  el.addEventListener('pointercancel', lacher);
}
balayable($('.mots'));

/* ============================================== 6 bis · L'album ==== */
const album = $('.album');
balayable(album);
const tirages = $$('.tirage[data-index]');
const visionneuse = $('.visionneuse');
let tirageCourant = 0;
function montrerTirage(i) {
  tirageCourant = (i + tirages.length) % tirages.length;
  const t = tirages[tirageCourant];
  const img = t.querySelector('img');
  const grand = $('.visionneuse__photo');
  grand.src = img.dataset.grand || img.getAttribute('src');
  grand.alt = img.alt;
  $('.visionneuse__legende').textContent = t.querySelector('.tirage__legende').textContent;
  $('.visionneuse__compte').textContent = `${tirageCourant + 1} / ${tirages.length}`;
}
tirages.forEach((t, i) => t.addEventListener('click', () => {
  if (album.dataset.glisse) return;
  montrerTirage(i);
  visionneuse.showModal();
}));
$('.coin-page--prec').addEventListener('click', () => montrerTirage(tirageCourant - 1));
$('.coin-page--suiv').addEventListener('click', () => montrerTirage(tirageCourant + 1));
$('.reposer').addEventListener('click', () => visionneuse.close());
visionneuse.addEventListener('click', (e) => { if (e.target === visionneuse) visionneuse.close(); });
visionneuse.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); montrerTirage(tirageCourant - 1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); montrerTirage(tirageCourant + 1); }
});
// Au doigt : un glissé horizontal franc tourne le tirage.
let depart = null;
visionneuse.addEventListener('pointerdown', (e) => { depart = { x: e.clientX, y: e.clientY }; });
visionneuse.addEventListener('pointerup', (e) => {
  if (!depart) return;
  const dx = e.clientX - depart.x, dy = e.clientY - depart.y; depart = null;
  if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) montrerTirage(tirageCourant + (dx < 0 ? 1 : -1));
});

/* =========================================== 8 · Votre réponse ==== */
let presence = null;
$$('.sceau').forEach((s) => s.addEventListener('click', () => {
  presence = s.dataset.presence;
  $$('.sceau').forEach((x) => x.setAttribute('aria-checked', String(x === s)));
  $('.reponse__aide').textContent = '';
}));
const acteReponse = $('.acte--reponse');
$('.enveloppe-reponse__fermer').addEventListener('click', () => {
  if (acteReponse.classList.contains('scellee')) return;
  if (!presence) { $('.reponse__aide').textContent = 'Apposez d’abord l’un des deux cachets.'; return; }
  const couverts = $('.couverts input:checked')?.value || '1';
  const cote = $('.cote input:checked')?.value || 'a';
  const famille = familleDe(etat[cote] || etat.a).replace(/^./, (l) => l.toLowerCase());
  acteReponse.classList.add('scellee');
  $('.enveloppe-reponse__consigne').textContent = 'Votre enveloppe est scellée.';
  const ligne = $('.registre__nadege');
  ligne.dataset.etat = presence === 'oui' ? 'confirme' : 'excuse';
  $('.r-etat', ligne).textContent = presence === 'oui'
    ? `confirmée à l’instant, ${couverts === '1' ? 'un couvert' : couverts === '2' ? 'deux couverts' : 'trois couverts'}, ${famille}`
    : `excusée à l’instant, ${famille}`;
  ligne.classList.add('frais');
  setTimeout(afficherApres, T(reduit ? 200 : 1500));
});

const imgPass = $('.pass-image');
let blobPass = null;
async function afficherApres() {
  const apres = $('.apres-reponse');
  apres.hidden = false;
  moteur?.layout?.();
  apres.scrollIntoView({ behavior: reduit ? 'instant' : 'smooth', block: 'start' });
  const c = document.createElement('canvas');
  blobPass = await dessinerPass(c, { ...etat }, { fond: cheminTheme('assets/img/v5/enveloppe.webp', etat.theme), encre: getComputedStyle(document.documentElement).getPropertyValue('--bordeaux').trim(), nuit: getComputedStyle(document.documentElement).getPropertyValue('--bordeaux-nuit').trim() });
  imgPass.src = URL.createObjectURL(blobPass);
  imgPass.dataset.pret = '1';
}
const integre = /FBAN|FBAV|FB_IAB|Instagram/i.test(navigator.userAgent);
$('.conserver').addEventListener('click', async () => {
  if (!blobPass) return;
  const fichier = new File([blobPass], `pass-mayilabs-${etat.code}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [fichier] })) { await navigator.share({ files: [fichier], title: 'Mon Pass d’entrée' }); return; }
  } catch { /* annulé ou refusé : on passe au repli */ }
  if (!integre) { const a = document.createElement('a'); a.href = imgPass.src; a.download = fichier.name; document.body.append(a); a.click(); a.remove(); }
  $('.pass-repli').hidden = false;
});

/* ================================= L'enveloppe glissée vers WhatsApp ==== */
const env = $('.enveloppe-envoi');
const piste = $('.enveloppe-piste');
let tire = null;
let ignorerClic = false;
function partir() { pixel('Contact'); location.href = etat.lien || env.href; }
const envoyer = () => window.__demo.partir();
env.addEventListener('click', (e) => { e.preventDefault(); if (ignorerClic) { ignorerClic = false; return; } envoyer(); });
env.addEventListener('pointerdown', (e) => { env.setPointerCapture(e.pointerId); tire = { x: e.clientX, max: piste.clientWidth - env.offsetWidth - 8, dx: 0 }; env.classList.add('glisse'); });
env.addEventListener('pointermove', (e) => { if (!tire) return; tire.dx = Math.max(0, Math.min(tire.max, e.clientX - tire.x)); env.style.setProperty('--x', `${tire.dx}px`); });
function lacher() {
  if (!tire) return;
  const { dx, max } = tire; tire = null; env.classList.remove('glisse');
  if (dx > 8) ignorerClic = true; // le geste a bougé : le clic qui suit n'est pas un toucher
  if (dx >= max * 0.5) { env.style.setProperty('--x', `${max}px`); envoyer(); }
  else env.style.setProperty('--x', '0px');
}
env.addEventListener('pointerup', lacher);
env.addEventListener('pointercancel', lacher);

window.__demo = { etat, partir };

/* Harnais de vérification scroll-craft (?harnais) : un carton d'exemple est signé d'office pour que le
   harnais trouve l'invitation montée. Sans ce paramètre, rien ne change. */
if (PARAMS.has('harnais')) {
  form.elements.a.value = 'Awa'; form.elements.b.value = 'Karl'; form.elements.date.value = '2027-06-12';
  form.querySelector('.types input[value=coutumier]').checked = true;
  signerAuClavier();
}
