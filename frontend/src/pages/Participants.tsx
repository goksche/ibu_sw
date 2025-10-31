// Participants Page
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { participantService } from '../services/participantService';
import { Participant } from '../types';
import { useNavigate } from 'react-router-dom';

export default function Participants() {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{imported: number, skipped: number, errors: string[], skipped_items?: Array<{row: number, name: string, scolia_id?: string, reason: string}>} | null>(null);
  const [showSkippedItems, setShowSkippedItems] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    club: '',
    scolia_id: '',
    email: '',
    nickname: '',
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadParticipants();
  }, [navigate]);

  const loadParticipants = async () => {
    try {
      const data = await participantService.getAll();
      setParticipants(data);
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await participantService.update(editingId, formData);
      } else {
        await participantService.create(formData);
      }
      setShowCreateForm(false);
      setEditingId(null);
      resetForm();
      loadParticipants();
    } catch (err) {
      console.error('Failed to save participant:', err);
      alert('Fehler beim Speichern des Teilnehmers');
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      club: '',
      scolia_id: '',
      email: '',
      nickname: '',
    });
  };

  const handleEdit = (participant: Participant) => {
    setEditingId(participant.id);
    setFormData({
      first_name: participant.first_name,
      last_name: participant.last_name,
      club: participant.club || '',
      scolia_id: participant.scolia_id || '',
      email: participant.email || '',
      nickname: participant.nickname || '',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Möchten Sie diesen Teilnehmer wirklich löschen?')) {
      return;
    }

    try {
      await participantService.delete(id);
      loadParticipants();
    } catch (err) {
      console.error('Failed to delete participant:', err);
      alert('Fehler beim Löschen des Teilnehmers');
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingId(null);
    resetForm();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/v1/participants/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Import fehlgeschlagen');
      }

      const result = await response.json();
      setImportResult(result);
      loadParticipants();
    } catch (err) {
      console.error('Failed to import participants:', err);
      alert('Fehler beim Importieren der Teilnehmer');
    } finally {
      setImporting(false);
      // Reset file input
      e.target.value = '';
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Wird geladen...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Teilnehmer-Verwaltung</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{ padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Zurück
          </button>
          <button 
            onClick={() => { setShowImportForm(true); setShowSkippedItems(false); }}
            disabled={importing}
            style={{ padding: '0.5rem 1rem', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.5 : 1 }}
          >
            📥 CSV Import
          </button>
          <button 
            onClick={() => { setShowCreateForm(true); setEditingId(null); resetForm(); }}
            disabled={showCreateForm}
            style={{ padding: '0.5rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: showCreateForm ? 'not-allowed' : 'pointer', opacity: showCreateForm ? 0.5 : 1 }}
          >
            + Neuer Teilnehmer
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px' }}>
          <h2>{editingId ? 'Teilnehmer bearbeiten' : 'Neuer Teilnehmer'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Vorname *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Nachname *
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Verein
              </label>
              <input
                type="text"
                name="club"
                value={formData.club}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Scolia ID
              </label>
              <input
                type="text"
                name="scolia_id"
                value={formData.scolia_id}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                E-Mail
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Nickname
              </label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="submit"
                style={{ padding: '0.75rem 2rem', fontSize: '1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                {editingId ? 'Aktualisieren' : 'Erstellen'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={{ padding: '0.75rem 2rem', fontSize: '1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {showImportForm && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#e7f3ff', border: '1px solid #86cfff', borderRadius: '8px' }}>
          <h2>CSV Import</h2>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Importieren Sie eine CSV-Datei mit Teilnehmerdaten. Erforderliche Felder: Vorname, Nachname. Optionale Felder: E-Mail, Spitzname.
          </p>
          
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ marginBottom: '1rem', padding: '0.5rem', fontSize: '1rem' }}
          />
          
          {importing && (
            <div style={{ padding: '1rem', background: '#fff3cd', borderRadius: '4px' }}>
              ⏳ Wird importiert...
            </div>
          )}
          
          {importResult && (
            <div style={{ padding: '1rem', background: importResult.errors.length > 0 ? '#fff3cd' : '#d4edda', borderRadius: '4px', marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Import abgeschlossen</h3>
              <p>✅ Importiert: {importResult.imported} Teilnehmer</p>
              <p>⏭️ Übersprungen: {importResult.skipped} (bereits vorhanden oder ungültig)</p>
              
              {importResult.skipped > 0 && importResult.skipped_items && (
                <div style={{ marginTop: '1rem' }}>
                  <button
                    onClick={() => setShowSkippedItems(!showSkippedItems)}
                    style={{ padding: '0.5rem 1rem', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {showSkippedItems ? '▼' : '▶'} Übersprungene Details anzeigen
                  </button>
                  
                  {showSkippedItems && (
                    <div style={{ marginTop: '1rem', background: 'white', padding: '1rem', borderRadius: '4px', border: '1px solid #ddd' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #ddd' }}>
                            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Zeile</th>
                            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
                            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Scolia ID</th>
                            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Grund</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.skipped_items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '0.5rem' }}>{item.row}</td>
                              <td style={{ padding: '0.5rem' }}>{item.name}</td>
                              <td style={{ padding: '0.5rem' }}>{item.scolia_id || '-'}</td>
                              <td style={{ padding: '0.5rem', color: '#666' }}>{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              
              {importResult.errors.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Fehler ({importResult.errors.length}):</strong>
                  <ul>
                    {importResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={() => { setShowImportForm(false); setImportResult(null); setShowSkippedItems(false); }}
            style={{ padding: '0.75rem 2rem', fontSize: '1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Schließen
          </button>
        </div>
      )}

      <div>
        <h2>Teilnehmer ({participants.length})</h2>
        {participants.length === 0 ? (
          <p>Noch keine Teilnehmer vorhanden.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', background: '#f8f9fa' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Verein</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Scolia ID</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>E-Mail</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Nickname</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{participant.id}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                    {participant.first_name} {participant.last_name}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{participant.club || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{participant.scolia_id || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{participant.email || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{participant.nickname || '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleEdit(participant)}
                      style={{ marginRight: '0.5rem', padding: '0.25rem 0.75rem', background: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(participant.id)}
                      style={{ padding: '0.25rem 0.75rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

