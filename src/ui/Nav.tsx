export type Onglet = 'aujourdhui' | 'plan' | 'activite';

const ONGLETS: { id: Onglet; nom: string }[] = [
  { id: 'aujourdhui', nom: "Aujourd'hui" },
  { id: 'plan', nom: 'Plan' },
  { id: 'activite', nom: 'Activité' },
];

export function Nav({ actif, onChoisir }: { actif: Onglet; onChoisir: (o: Onglet) => void }) {
  return (
    <nav class="nav" aria-label="Navigation principale">
      {ONGLETS.map((o) => (
        <button key={o.id} class={actif === o.id ? 'on' : ''} aria-current={actif === o.id ? 'page' : undefined} onClick={() => onChoisir(o.id)}>
          {o.nom}
        </button>
      ))}
    </nav>
  );
}
