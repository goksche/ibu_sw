// Tournament Tables Tab (Placeholder)
import { Tournament } from '../../types';

interface TournamentTablesProps {
  tournamentId: number;
  tournament: Tournament;
}

export default function TournamentTables({ tournamentId, tournament }: TournamentTablesProps) {
  return (
    <div style={{ padding: '3rem', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px' }}>
      <h2 style={{ marginBottom: '1rem' }}>📊 Tabellen & Rankings</h2>
      <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '0.5rem' }}>
        Diese Funktion wird in v1.3.3 implementiert
      </p>
      <p style={{ color: '#999' }}>
        Hier erscheinen später: Gruppenranglisten, KO-Bracket-Übersicht, Gesamtplatzierungen
      </p>
    </div>
  );
}

