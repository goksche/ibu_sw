// Tournament Overview Tab
import { Tournament } from '../../types';

interface TournamentOverviewProps {
  tournament: Tournament;
}

export default function TournamentOverview({ tournament }: TournamentOverviewProps) {
  return (
    <div>
      {/* Basic Information */}
      <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Turnier-Informationen</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <strong>Name:</strong>
            <p style={{ margin: '0.25rem 0', color: '#666' }}>{tournament.name}</p>
          </div>
          
          <div>
            <strong>Modus:</strong>
            <p style={{ margin: '0.25rem 0', color: '#666' }}>
              {tournament.mode === 'round_robin' ? 'Round Robin (Nur Gruppenphase)' :
               tournament.mode === 'knockout' ? 'KO-Phase (Ohne Gruppenphase)' :
               'Kombiniert (Gruppenphase + KO-Phase)'}
            </p>
          </div>
          
          <div>
            <strong>Startdatum:</strong>
            <p style={{ margin: '0.25rem 0', color: '#666' }}>{tournament.start_date}</p>
          </div>
          
          {tournament.end_date && (
            <div>
              <strong>Enddatum:</strong>
              <p style={{ margin: '0.25rem 0', color: '#666' }}>{tournament.end_date}</p>
            </div>
          )}
        </div>
        
        {tournament.description && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Beschreibung:</strong>
            <p style={{ margin: '0.25rem 0', color: '#666' }}>{tournament.description}</p>
          </div>
        )}
      </div>

      {/* Tournament Settings */}
      <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Turnier-Einstellungen</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Groups Phase */}
          <div>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Gruppenphase</h3>
            <div style={{ padding: '1rem', background: 'white', borderRadius: '4px' }}>
              {tournament.has_group_phase ? (
                <div>
                  <p style={{ margin: '0.25rem 0' }}>✓ Aktiviert</p>
                  <p style={{ margin: '0.25rem 0', color: '#666' }}>Anzahl Gruppen: {tournament.groups_count}</p>
                  <p style={{ margin: '0.25rem 0', color: '#666' }}>
                    Verteilung: {tournament.group_distribution === 'random' ? 'Zufällig' : 'Gesetzt'}
                  </p>
                </div>
              ) : (
                <p style={{ margin: 0, color: '#666' }}>Deaktiviert</p>
              )}
            </div>
          </div>

          {/* KO Phase */}
          <div>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>KO-Phase</h3>
            <div style={{ padding: '1rem', background: 'white', borderRadius: '4px' }}>
              {tournament.has_ko_phase ? (
                <div>
                  <p style={{ margin: '0.25rem 0' }}>✓ Aktiviert</p>
                  <p style={{ margin: '0.25rem 0', color: '#666' }}>
                    Teilnehmer: {tournament.ko_participants} aus Gruppenphase
                  </p>
                  {tournament.ko_first_round_size && (
                    <p style={{ margin: '0.25rem 0', color: '#666' }}>
                      Erste Runde: Top {tournament.ko_first_round_size}
                    </p>
                  )}
                  {tournament.ko_distribution && (
                    <p style={{ margin: '0.25rem 0', color: '#666' }}>
                      Auslosung: {tournament.ko_distribution === 'cross' ? 'Überkreuz' : 'Draw'}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, color: '#666' }}>Deaktiviert</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1rem' }}>Anzeige-Einstellungen</h2>
        
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <strong>Spiele:</strong>
            <p style={{ margin: '0.25rem 0', color: '#666' }}>
              {tournament.show_matches ? '✓ Anzeigen' : '✗ Verstecken'}
            </p>
          </div>
          
          <div>
            <strong>Tabellen:</strong>
            <p style={{ margin: '0.25rem 0', color: '#666' }}>
              {tournament.show_tables ? '✓ Anzeigen' : '✗ Verstecken'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

