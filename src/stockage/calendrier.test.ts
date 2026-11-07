import { describe, expect, it } from 'vitest';
import { evenementsICS, rappelsHebdoICS, type EvenementPlan, type RappelHebdo } from './calendrier';

const OPTIONS = { maintenant: new Date('2026-11-07T15:04:05Z'), lien: 'https://exemple.test/app/', alertesMin: [30, 10] };
const lignes = (ics: string) => ics.split('\r\n');

describe('calendrier — format iCalendar', () => {
  const rappels: RappelHebdo[] = [{ jour: 6, heure: '08:30', dureeMin: 60 }, { jour: 7, heure: '10:00', dureeMin: 90 }];
  const ics = rappelsHebdoICS(rappels, OPTIONS);

  it('est un calendrier valide, avec des fins de ligne CRLF', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:');
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('un événement par créneau, qui se répète chaque semaine le bon jour', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=SA');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=SU');
  });

  it('commence à la prochaine occurrence, à l\'heure choisie, sans fuseau (heure locale de l\'agenda)', () => {
    // le 7 novembre 2026 est un samedi : le créneau du samedi commence ce jour-là, celui du dimanche demain
    expect(ics).toContain('DTSTART:20261107T083000');
    expect(ics).toContain('DTEND:20261107T093000');
    expect(ics).toContain('DTSTART:20261108T100000');
    expect(ics).not.toMatch(/DTSTART:[0-9T]+Z/);
  });

  it('prévient 30 minutes puis 10 minutes avant', () => {
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(4);
    expect(ics.match(/TRIGGER:-PT30M/g)).toHaveLength(2);
    expect(ics.match(/TRIGGER:-PT10M/g)).toHaveLength(2);
    expect(ics).toContain('ACTION:DISPLAY');
  });

  it('a un identifiant stable : réimporter met à jour au lieu de dupliquer', () => {
    const encore = rappelsHebdoICS(rappels, { ...OPTIONS, maintenant: new Date('2026-12-01T10:00:00Z') });
    const uids = (t: string) => lignes(t).filter((l) => l.startsWith('UID:'));
    expect(uids(encore)).toEqual(uids(ics));
    expect(uids(ics)).toEqual(['UID:bouge-creneau-6@bouge-de-la', 'UID:bouge-creneau-7@bouge-de-la']);
  });

  it('dit « pas le temps ? 5 minutes comptent » et donne le lien de l\'application', () => {
    expect(ics.replace(/\r\n /g, '')).toContain('5 minutes comptent');
    expect(ics.replace(/\r\n /g, '')).toContain('https://exemple.test/app/');
  });

  it('coupe les lignes à 75 octets au plus (RFC 5545), accents compris', () => {
    for (const l of lignes(ics)) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
  });

  it('un calendrier sans créneau est vide mais valide', () => {
    const vide = rappelsHebdoICS([], OPTIONS);
    expect(vide).toContain('BEGIN:VCALENDAR');
    expect(vide).not.toContain('BEGIN:VEVENT');
  });
});

describe('calendrier — le plan des prochains jours', () => {
  const ev: EvenementPlan[] = [
    { jour: '2026-11-08', heure: '10:00', dureeMin: 45, titre: 'Force et boxe', description: 'Force courte, puis boxe, avec échauffement; étirements, merci.' },
  ];
  const ics = evenementsICS(ev, OPTIONS);

  it('un événement daté, sans répétition', () => {
    expect(ics).toContain('DTSTART:20261108T100000');
    expect(ics).toContain('DTEND:20261108T104500');
    expect(ics).not.toContain('RRULE');
    expect(ics).toContain('UID:bouge-plan-2026-11-08@bouge-de-la');
  });

  it('échappe les virgules, points-virgules et retours à la ligne', () => {
    const texte = ics.replace(/\r\n /g, '');
    expect(texte).toContain('SUMMARY:Bouge de là ! · Force et boxe');
    expect(texte).toContain('avec échauffement\; étirements\\, merci.');
  });

  it('gère une séance qui passe minuit', () => {
    const tard = evenementsICS([{ jour: '2026-11-08', heure: '23:30', dureeMin: 60, titre: 'Marche', description: '' }], OPTIONS);
    expect(tard).toContain('DTEND:20261109T003000');
  });
});
