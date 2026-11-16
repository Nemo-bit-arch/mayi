// Dessin du Pass d'entrée (1080×1920) sur un canvas, côté navigateur, dans le monde du faire-part :
// le velours bordeaux de l'enveloppe, un carton ivoire filet d'or, les prénoms à la plume,
// la ligne nominative et le QR d'entrée.

export const LARGEUR = 1080;
export const HAUTEUR = 1920;
export const MARGE_NOMS = 700; // largeur maximale des prénoms sur le carton
export const POLICE_NOMS = "400 {t}px 'Pinyon Script', 'Snell Roundhand', cursive";
const CAPITALES = "500 {t}px Jost, 'Helvetica Neue', Arial, sans-serif";
const BORDEAUX = '#6e1423';
const SEPIA = '#3a2418';
const IVOIRE = '#fbf7ef';

/** Plus grande taille (px) ≤ depart pour laquelle `texte` tient dans `max` px. */
export function taillePolice(ctx, texte, max, depart, famille = POLICE_NOMS) {
  let t = depart;
  while (t > 24) {
    ctx.font = famille.replace('{t}', t);
    if (ctx.measureText(texte).width <= max) return t;
    t -= 2;
  }
  return t;
}

function chargerImage(src) {
  return new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });
}
const espace = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`; };
const capitales = (t) => CAPITALES.replace('{t}', t);

/** Le QR d'entrée, si la bibliothèque est chargée ; sinon le Pass reste valable sans lui. */
function dessinerQr(ctx, texte, x, y, cote) {
  if (typeof window === 'undefined' || typeof window.qrcode !== 'function') return false;
  const q = window.qrcode(0, 'M'); q.addData(texte); q.make();
  const n = q.getModuleCount(); const m = cote / n;
  ctx.fillStyle = IVOIRE; ctx.fillRect(x - 26, y - 26, cote + 52, cote + 52);
  ctx.strokeStyle = '#b98b3e'; ctx.lineWidth = 2; ctx.strokeRect(x - 16, y - 16, cote + 32, cote + 32);
  ctx.fillStyle = SEPIA;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(x + c * m, y + r * m, Math.ceil(m), Math.ceil(m));
  return true;
}

export async function dessinerPass(canvas, { affichage, dateLongue, type, code, invite = 'Nadège', table = '7', lien = '' }, { fond = 'assets/img/v5/enveloppe.webp', encre = BORDEAUX, nuit = '#3d0b14' } = {}) {
  canvas.width = LARGEUR; canvas.height = HAUTEUR;
  const ctx = canvas.getContext('2d');
  await Promise.all([
    document.fonts.load("400 120px 'Pinyon Script'"),
    document.fonts.load('500 30px Jost'),
  ]).catch(() => {});

  // Le velours de l'enveloppe, assombri pour porter le carton.
  ctx.fillStyle = nuit; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  try {
    const img = await chargerImage(fond);
    const r = Math.max(LARGEUR / img.width, HAUTEUR / img.height);
    ctx.drawImage(img, (LARGEUR - img.width * r) / 2, (HAUTEUR - img.height * r) / 2, img.width * r, img.height * r);
  } catch { /* fond uni si l'image manque */ }
  ctx.fillStyle = 'rgba(40,6,12,.45)'; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  // Le filet d'or qui borde le Pass.
  ctx.strokeStyle = '#e2c486'; ctx.lineWidth = 3; ctx.strokeRect(36, 36, LARGEUR - 72, HAUTEUR - 72);
  ctx.lineWidth = 1; ctx.strokeRect(50, 50, LARGEUR - 100, HAUTEUR - 100);

  // Le carton ivoire : liseré d'or, filet intérieur.
  const ex = 120, ey = 250, ew = 840, eh = 800;
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
  ctx.fillStyle = IVOIRE; ctx.fillRect(ex, ey, ew, eh);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#b98b3e'; ctx.lineWidth = 3; ctx.strokeRect(ex + 18, ey + 18, ew - 36, eh - 36);
  ctx.lineWidth = 1; ctx.strokeRect(ex + 30, ey + 30, ew - 60, eh - 60);

  const cx = ex + ew / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = encre; ctx.font = capitales(28); espace(ctx, 12);
  ctx.fillText('PASS D’ENTRÉE', cx, ey + 120); espace(ctx, 0);

  ctx.fillStyle = encre;
  ctx.font = POLICE_NOMS.replace('{t}', taillePolice(ctx, affichage, MARGE_NOMS, 140));
  ctx.fillText(affichage, cx, ey + 320);

  const lib = { coutumier: 'Mariage coutumier', civil: 'Mariage civil', religieux: 'Mariage religieux' }[type] || 'Mariage';
  const ligne = `${lib} · ${dateLongue}`.toUpperCase();
  ctx.fillStyle = SEPIA; espace(ctx, 6);
  ctx.font = capitales(taillePolice(ctx, ligne, MARGE_NOMS, 30, CAPITALES));
  ctx.fillText(ligne, cx, ey + 420);
  ctx.fillText('LE GRAND SALON · LIBREVILLE', cx, ey + 470);

  ctx.fillStyle = '#b98b3e'; ctx.fillRect(cx - 260, ey + 530, 520, 2);
  const nominative = `INVITATION DE ${invite.toUpperCase()} · TABLE ${table}`;
  ctx.fillStyle = encre; espace(ctx, 8); ctx.font = capitales(taillePolice(ctx, nominative, MARGE_NOMS, 34, CAPITALES));
  ctx.fillText(nominative, cx, ey + 620);
  ctx.fillStyle = SEPIA; ctx.font = capitales(24);
  ctx.fillText(`RÉF. ${code}`, cx, ey + 690); espace(ctx, 0);

  // Le QR d'entrée, sur une réserve ivoire.
  const qr = dessinerQr(ctx, lien || `https://mayilabs.io/i/${code}`, cx - 150, 1190, 300);
  ctx.fillStyle = '#e2c486'; ctx.font = capitales(24); espace(ctx, 8);
  if (qr) ctx.fillText('À PRÉSENTER À L’ENTRÉE', cx, 1600);
  ctx.globalAlpha = .85; ctx.font = capitales(20);
  ctx.fillText('MAYI EXPÉRIENCES · PAR MAYILABS', cx, 1800);
  ctx.globalAlpha = 1; espace(ctx, 0);

  return new Promise((ok) => canvas.toBlob((b) => ok(b), 'image/png'));
}
