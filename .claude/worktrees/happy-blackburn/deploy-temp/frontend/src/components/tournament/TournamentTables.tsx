// Tournament Tables Tab
import { useState, useEffect } from 'react';
import { Tournament } from '../../types';
import { tableService, GroupTable, TournamentStandings } from '../../services/tableService';
import { groupService, GroupWithParticipants } from '../../services/groupService';

interface TournamentTablesProps {
  tournamentId: number;
  tournament: Tournament;
}

export default function TournamentTables({ tournamentId, tournament }: TournamentTablesProps) {
  const [groups, setGroups] = useState<GroupWithParticipants[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupTable, setGroupTable] = useState<GroupTable | null>(null);
  const [tournamentStandings, setTournamentStandings] = useState<TournamentStandings | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'groups' | 'overall'>('groups');

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupTable();
    }
  }, [selectedGroupId]);

  const loadData = async () => {
    try {
      if (tournament.has_group_phase) {
        const groupsData = await groupService.getGroups(tournamentId);
        const fullGroups = await Promise.all(
          groupsData.map(async (g) => await groupService.getGroup(g.id))
        );
        setGroups(fullGroups);
        
        if (fullGroups.length > 0 && !selectedGroupId) {
          setSelectedGroupId(fullGroups[0].id);
        }
      }
      
      if (tournament.has_ko_phase) {
        const standings = await tableService.getTournamentStandings(tournamentId);
        setTournamentStandings(standings);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupTable = async () => {
    if (!selectedGroupId) return;
    
    try {
      const table = await tableService.getGroupTable(selectedGroupId);
      console.log('Group table data:', table);
      console.log('First row with won_decision_match:', table.table[0]?.won_decision_match);
      setGroupTable(table);
    } catch (err) {
      console.error('Failed to load group table:', err);
    }
  };

  if (loading) return <div>Wird geladen...</div>;

  return (
    <div>
      {/* View Mode Selection */}
      {tournament.has_group_phase && tournament.has_ko_phase && (
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Ansicht:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setViewMode('groups')}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode === 'groups' ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: viewMode === 'groups' ? 'bold' : 'normal'
              }}
            >
              Gruppen
            </button>
            <button
              onClick={() => setViewMode('overall')}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode === 'overall' ? '#dc3545' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: viewMode === 'overall' ? 'bold' : 'normal'
              }}
            >
              Gesamt
            </button>
          </div>
        </div>
      )}

      {/* Group Tables */}
      {viewMode === 'groups' && tournament.has_group_phase && (
        <>
          {groups.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px' }}>
              <p>Noch keine Gruppen vorhanden.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Gruppe auswählen
                </label>
                <select
                  value={selectedGroupId || ''}
                  onChange={(e) => setSelectedGroupId(parseInt(e.target.value))}
                  style={{ width: '100%', maxWidth: '300px', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              {groupTable && (
                <div style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
                  <h3 style={{ padding: '1rem', background: '#007bff', color: 'white', margin: 0 }}>
                    {groupTable.group_name}
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Rang</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Spieler</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Sp</th>
                        {tournament.league_scoring_system === 'points' && (
                          <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: 'bold' }}>Pkt</th>
                        )}
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>S</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>U</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>N</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>LF</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>LA</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: 'bold' }}>Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupTable.table.map((row, idx) => (
                        <tr key={row.participant_id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: idx < 2 ? 'bold' : 'normal', color: idx < 2 ? '#007bff' : 'inherit' }}>
                            {row.rank}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'left' }}>
                            {row.name}
                            {row.won_decision_match === true && (
                              <span style={{ color: '#28a745', fontWeight: 'bold', marginLeft: '0.25rem' }} title="Gewinner des Entscheidungsspiels">*</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{row.games}</td>
                          {tournament.league_scoring_system === 'points' && (
                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: '#007bff' }}>
                              {(row as any).points ?? 0}
                            </td>
                          )}
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{row.wins}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{(row as any).draws ?? 0}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{row.losses}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{row.goals_for}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{row.goals_against}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: row.diff > 0 ? '#28a745' : row.diff < 0 ? '#dc3545' : 'inherit' }}>
                            {row.diff > 0 ? '+' : ''}{row.diff}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Tournament Standings */}
      {viewMode === 'overall' && tournament.has_ko_phase && (
        <>
          {tournamentStandings && tournamentStandings.standings.length > 0 ? (
            <div style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
              <h3 style={{ padding: '1rem', background: '#dc3545', color: 'white', margin: 0 }}>
                Gesamtrangliste
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '80px' }}>Rang</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Spieler</th>
                  </tr>
                </thead>
                <tbody>
                  {tournamentStandings.standings.map((standing) => (
                    <tr key={standing.participant_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                        {standing.rank === 1 && '🥇'}
                        {standing.rank === 2 && '🥈'}
                        {standing.rank === 3 && '🥉'}
                        {' '}
                        {standing.rank}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'left' }}>{standing.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px' }}>
              <p>Noch keine Gesamtrangliste verfügbar.</p>
              {tournamentStandings?.status === 'final_not_played' && (
                <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                  Das Finale muss zuerst gespielt werden.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

