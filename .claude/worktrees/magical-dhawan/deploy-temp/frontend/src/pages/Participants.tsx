// Participants Page
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { participantService } from '../services/participantService';
import { Participant } from '../types';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';
import { theme } from '../theme/theme';
import { ArrowLeft, Upload, Plus, PencilSimple, Trash, CheckCircle, XCircle } from 'phosphor-react';

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

  if (loading) return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Wird geladen...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', background: theme.colors.background.primary, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h1 style={{ margin: 0, color: theme.colors.text.primary }}>Teilnehmer-Verwaltung</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button 
            variant="secondary"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Zurück
          </Button>
          <Button 
            variant="info"
            onClick={() => { setShowImportForm(true); setShowSkippedItems(false); }}
            disabled={importing}
          >
            <Upload size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            CSV Import
          </Button>
          <Button 
            variant="success"
            onClick={() => { setShowCreateForm(true); setEditingId(null); resetForm(); }}
            disabled={showCreateForm}
          >
            <Plus size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Neuer Teilnehmer
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginTop: 0, color: theme.colors.text.primary }}>{editingId ? 'Teilnehmer bearbeiten' : 'Neuer Teilnehmer'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Vorname *"
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />

            <Input
              label="Nachname *"
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
            />

            <Input
              label="Verein"
              type="text"
              name="club"
              value={formData.club}
              onChange={handleChange}
            />

            <Input
              label="Scolia ID"
              type="text"
              name="scolia_id"
              value={formData.scolia_id}
              onChange={handleChange}
            />

            <Input
              label="E-Mail"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />

            <Input
              label="Nickname"
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
            />

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button
                type="submit"
                variant="primary"
              >
                {editingId ? 'Aktualisieren' : 'Erstellen'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
              >
                Abbrechen
              </Button>
            </div>
          </form>
        </Card>
      )}

      {showImportForm && (
        <Card style={{ marginBottom: '2rem', border: `1px solid ${theme.colors.accent.info}` }}>
          <h2 style={{ marginTop: 0, color: theme.colors.text.primary }}>CSV Import</h2>
          <p style={{ marginBottom: '1rem', color: theme.colors.text.secondary }}>
            Importieren Sie eine CSV-Datei mit Teilnehmerdaten. Erforderliche Felder: Vorname, Nachname. Optionale Felder: E-Mail, Spitzname.
          </p>
          
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ 
              marginBottom: '1rem', 
              padding: '0.5rem', 
              fontSize: '1rem',
              background: theme.colors.background.secondary,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.standard}`,
              borderRadius: theme.borderRadius.input
            }}
          />
          
          {importing && (
            <div style={{ 
              padding: '1rem', 
              background: `${theme.colors.accent.warning}20`, 
              border: `1px solid ${theme.colors.accent.warning}`,
              borderRadius: theme.borderRadius.card,
              color: theme.colors.text.primary 
            }}>
              Wird importiert...
            </div>
          )}
          
          {importResult && (
            <div style={{ 
              padding: '1rem', 
              background: importResult.errors.length > 0 ? `${theme.colors.accent.warning}20` : `${theme.colors.accent.success}20`, 
              border: `1px solid ${importResult.errors.length > 0 ? theme.colors.accent.warning : theme.colors.accent.success}`,
              borderRadius: theme.borderRadius.card, 
              marginBottom: '1rem',
              color: theme.colors.text.primary
            }}>
              <h3 style={{ marginBottom: '0.5rem', marginTop: 0 }}>Import abgeschlossen</h3>
              <p><CheckCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Importiert: {importResult.imported} Teilnehmer</p>
              <p><XCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Übersprungen: {importResult.skipped} (bereits vorhanden oder ungültig)</p>
              
              {importResult.skipped > 0 && importResult.skipped_items && (
                <div style={{ marginTop: '1rem' }}>
                  <Button
                    variant="info"
                    onClick={() => setShowSkippedItems(!showSkippedItems)}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    {showSkippedItems ? '▼' : '▶'} Übersprungene Details anzeigen
                  </Button>
                  
                  {showSkippedItems && (
                    <Card style={{ marginTop: '1rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${theme.colors.border.standard}` }}>
                            <th style={{ padding: '0.5rem', textAlign: 'left', color: theme.colors.text.primary }}>Zeile</th>
                            <th style={{ padding: '0.5rem', textAlign: 'left', color: theme.colors.text.primary }}>Name</th>
                            <th style={{ padding: '0.5rem', textAlign: 'left', color: theme.colors.text.primary }}>Scolia ID</th>
                            <th style={{ padding: '0.5rem', textAlign: 'left', color: theme.colors.text.primary }}>Grund</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.skipped_items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: `1px solid ${theme.colors.border.standard}` }}>
                              <td style={{ padding: '0.5rem', color: theme.colors.text.primary }}>{item.row}</td>
                              <td style={{ padding: '0.5rem', color: theme.colors.text.primary }}>{item.name}</td>
                              <td style={{ padding: '0.5rem', color: theme.colors.text.primary }}>{item.scolia_id || '-'}</td>
                              <td style={{ padding: '0.5rem', color: theme.colors.text.secondary }}>{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  )}
                </div>
              )}
              
              {importResult.errors.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong style={{ color: theme.colors.accent.error }}>Fehler ({importResult.errors.length}):</strong>
                  <ul style={{ color: theme.colors.text.primary }}>
                    {importResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <Button
            variant="secondary"
            onClick={() => { setShowImportForm(false); setImportResult(null); setShowSkippedItems(false); }}
          >
            Schließen
          </Button>
        </Card>
      )}

      <div>
        <h2 style={{ color: theme.colors.text.primary }}>Teilnehmer ({participants.length})</h2>
        {participants.length === 0 ? (
          <p style={{ color: theme.colors.text.secondary }}>Noch keine Teilnehmer vorhanden.</p>
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.colors.border.standard}`, background: theme.colors.background.secondary }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>Verein</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>Scolia ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>E-Mail</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>Nickname</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: theme.colors.text.primary }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((participant, index) => (
                  <tr key={participant.id} style={{ borderBottom: index < participants.length - 1 ? `1px solid ${theme.colors.border.standard}` : 'none' }}>
                    <td style={{ padding: '0.75rem', color: theme.colors.text.primary }}>{participant.id}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold', color: theme.colors.text.primary }}>
                      {participant.first_name} {participant.last_name}
                    </td>
                    <td style={{ padding: '0.75rem', color: theme.colors.text.secondary }}>{participant.club || '-'}</td>
                    <td style={{ padding: '0.75rem', color: theme.colors.text.secondary }}>{participant.scolia_id || '-'}</td>
                    <td style={{ padding: '0.75rem', color: theme.colors.text.secondary }}>{participant.email || '-'}</td>
                    <td style={{ padding: '0.75rem', color: theme.colors.text.secondary }}>{participant.nickname || '-'}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <Button
                        variant="warning"
                        onClick={() => handleEdit(participant)}
                        style={{ marginRight: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                      >
                        <PencilSimple size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                        Bearbeiten
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDelete(participant.id)}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                      >
                        <Trash size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                        Löschen
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

