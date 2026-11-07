/**
 * Rappels au format iCalendar (.ics), le format standard des agendas : Apple Calendrier, Google Agenda, Nextcloud…
 * Tout est fabriqué sur l'appareil, rien n'est envoyé nulle part. Les heures sont « flottantes » (sans fuseau) :
 * l'agenda les lit dans son propre fuseau horaire. Chaque événement a un identifiant stable, pour qu'un nouvel
 * import mette à jour les événements au lieu de les dupliquer.
 */
import type { Jour } from '../donnees/types';

export interface OptionsICS {
  /** Moment de la fabrication (sert à dater le fichier et à trouver la prochaine occurrence). */
  maintenant: Date;
  /** Adresse de l'application, rappelée dans chaque événement. */
  lien: string;
  /** Alertes avant le début, en minutes (ex. [30, 10]). */
  alertesMin: number[];
}

export interface RappelHebdo {
  /** 1 = lundi … 7 = dimanche. */
  jour: number;
  /** 'HH:MM'. */
  heure: string;
  dureeMin: number;
}

export interface EvenementPlan {
  jour: Jour;
  heure: string;
  dureeMin: number;
  titre: string;
  description: string;
}

const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const p2 = (n: number) => String(n).padStart(2, '0');

const echapper = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Coupe une ligne à 75 octets au plus (les suites commencent par une espace), sans couper un caractère en deux. */
function plier(ligne: string): string[] {
  const enc = new TextEncoder();
  const morceaux: string[] = [];
  let courant = '';
  let octets = 0;
  let limite = 75;
  for (const c of ligne) {
    const n = enc.encode(c).length;
    if (octets + n > limite) {
      morceaux.push(courant);
      courant = ' ';
      octets = 1;
      limite = 75;
    }
    courant += c;
    octets += n;
  }
  morceaux.push(courant);
  return morceaux;
}

const jourCompact = (j: Jour) => j.replace(/-/g, '');
const ajouterJour = (j: Jour, n: number): Jour => {
  const [a, m, d] = j.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
};
const jourLocalDe = (d: Date): Jour => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
/** 1 = lundi … 7 = dimanche. */
const jourDeSemaine = (j: Jour): number => {
  const [a, m, d] = j.split('-').map(Number) as [number, number, number];
  return ((new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7) + 1;
};

function debutFin(jour: Jour, heure: string, dureeMin: number): { debut: string; fin: string } {
  const [h, m] = heure.split(':').map(Number) as [number, number];
  const total = h * 60 + m + dureeMin;
  const jourFin = ajouterJour(jour, Math.floor(total / 1440));
  const reste = total % 1440;
  return {
    debut: `${jourCompact(jour)}T${p2(h)}${p2(m)}00`,
    fin: `${jourCompact(jourFin)}T${p2(Math.floor(reste / 60))}${p2(reste % 60)}00`,
  };
}

const horodatage = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const PAS_LE_TEMPS = "Pas le temps ? 5 minutes comptent aussi : ouvre l'application, « Le point sur ta semaine », pour choisir une version courte.";

function evenement(o: {
  uid: string;
  jour: Jour;
  heure: string;
  dureeMin: number;
  titre: string;
  description: string;
  rrule?: string;
}, opts: OptionsICS): string[] {
  const { debut, fin } = debutFin(o.jour, o.heure, o.dureeMin);
  const texte = [o.description, PAS_LE_TEMPS, opts.lien].filter(Boolean).join('\n\n');
  const lignes = [
    'BEGIN:VEVENT',
    `UID:${o.uid}`,
    `DTSTAMP:${horodatage(opts.maintenant)}`,
    `DTSTART:${debut}`,
    `DTEND:${fin}`,
    ...(o.rrule ? [`RRULE:${o.rrule}`] : []),
    `SUMMARY:${echapper(o.titre)}`,
    `DESCRIPTION:${echapper(texte)}`,
    `URL:${opts.lien}`,
  ];
  for (const min of opts.alertesMin) {
    lignes.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${echapper(`${o.titre} dans ${min} minutes`)}`, `TRIGGER:-PT${min}M`, 'END:VALARM');
  }
  lignes.push('END:VEVENT');
  return lignes;
}

function calendrier(evenements: string[][]): string {
  const toutes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bouge de la//Rappels//FR',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Bouge de là !',
    ...evenements.flat(),
    'END:VCALENDAR',
  ];
  return `${toutes.flatMap(plier).join('\r\n')}\r\n`;
}

/** Un rappel qui se répète chaque semaine pour chaque créneau, à partir de la prochaine occurrence. */
export function rappelsHebdoICS(rappels: RappelHebdo[], opts: OptionsICS): string {
  const aujourdhui = jourLocalDe(opts.maintenant);
  const evts = rappels.map((r) => {
    const ecart = (r.jour - jourDeSemaine(aujourdhui) + 7) % 7;
    return evenement({
      uid: `bouge-creneau-${r.jour}@bouge-de-la`,
      jour: ajouterJour(aujourdhui, ecart),
      heure: r.heure,
      dureeMin: r.dureeMin,
      titre: 'Séance Bouge de là !',
      description: "Ton créneau d'entraînement de la semaine.",
      rrule: `FREQ=WEEKLY;BYDAY=${BYDAY[r.jour - 1]}`,
    }, opts);
  });
  return calendrier(evts);
}

/** Les séances prévues par le plan, une par jour (sans répétition). */
export function evenementsICS(evts: EvenementPlan[], opts: OptionsICS): string {
  return calendrier(evts.map((e) => evenement({
    uid: `bouge-plan-${e.jour}@bouge-de-la`,
    jour: e.jour,
    heure: e.heure,
    dureeMin: e.dureeMin,
    titre: `Bouge de là ! · ${e.titre}`,
    description: e.description,
  }, opts)));
}
