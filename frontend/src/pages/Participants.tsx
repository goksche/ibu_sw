// Participants Page
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { participantService } from '../services/participantService';
import { Participant } from '../types';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';
import { cn } from '@/lib/utils';
import { ArrowLeft, Upload, Plus, PencilSimple, Trash, CheckCircle, XCircle } from 'phosphor-react';

// BASE_PATH für Plattform-Integration
function getBasePath(): string {
  // Prüfe ob BASE_PATH bereits gesetzt ist (wird von der Plattform gesetzt)
  if (typeof window !== 'undefined' && (window as any).BASE_PATH) {
    return (window as any).BASE_PATH;
  }

  // Fallback: Extrahiere aus URL (z.B. /App-4/...)
  if (typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/');
    if (parts.length > 1 && parts[1].startsWith('App-')) {
      return '/' + parts[1];
    }
  }

  // Lokale Entwicklung ohne Prefix
  return '';
}

export default function Participants() {
  const navigate = useNavigate();
  const { isAuthenticated, canEdit } = useAuth();
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
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadParticipants();
  }, [isAuthenticated, navigate]);

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

      // BASE_PATH für Plattform-Integration
      const basePath = getBasePath();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const baseApiUrl = apiUrl.replace(/\/api\/v1\/?$/, '');

      // Wenn BASE_PATH gesetzt ist (Plattform), verwende BASE_PATH für API-Requests
      // Wenn BASE_PATH leer ist (lokale Entwicklung), verwende API_URL
      const importUrl = basePath
        ? `${basePath}/api/v1/participants/import`
        : `${baseApiUrl}/api/v1/participants/import`;

      const response = await fetch(importUrl, {
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

  if (loading) return <div className="p-8 text-foreground">Wird geladen...</div>;

  return (
    <div className="p-8 max-w-[1200px] mx-auto bg-background min-h-screen">
      <div className="flex justify-between mb-8 items-center">
        <h1 className="m-0 text-foreground">Teilnehmer-Verwaltung</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/settings')}
          >
            <ArrowLeft size={20} className="mr-2 align-middle" />
            Zurück
          </Button>
          {canEdit && (
            <>
              <Button
                variant="info"
                onClick={() => { setShowImportForm(true); setShowSkippedItems(false); }}
                disabled={importing}
              >
                <Upload size={20} className="mr-2 align-middle" />
                CSV Import
              </Button>
              <Button
                variant="success"
                onClick={() => { setShowCreateForm(true); setEditingId(null); resetForm(); }}
                disabled={showCreateForm}
              >
                <Plus size={20} className="mr-2 align-middle" />
                Neuer Teilnehmer
              </Button>
            </>
          )}
        </div>
      </div>

      {showCreateForm && (
        <Card className="mb-8">
          <h2 className="mt-0 text-foreground">{editingId ? 'Teilnehmer bearbeiten' : 'Neuer Teilnehmer'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
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

            <div className="col-span-2 flex gap-4 mt-4">
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
        <Card className="mb-8 border border-info">
          <h2 className="mt-0 text-foreground">CSV Import</h2>
          <p className="mb-4 text-muted-foreground">
            Importieren Sie eine CSV-Datei mit Teilnehmerdaten. Erforderliche Felder: Vorname, Nachname. Optionale Felder: E-Mail, Spitzname.
          </p>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="mb-4 p-2 text-base bg-muted text-foreground border border-border rounded-md"
          />

          {importing && (
            <div className="p-4 bg-warning/10 border border-warning rounded-lg text-foreground">
              Wird importiert...
            </div>
          )}

          {importResult && (
            <div
              className={cn(
                'p-4 rounded-lg mb-4 text-foreground',
                importResult.errors.length > 0 ? 'bg-warning/10 border border-warning' : 'bg-success/10 border border-success'
              )}
            >
              <h3 className="mb-2 mt-0">Import abgeschlossen</h3>
              <p><CheckCircle size={16} className="align-middle mr-2" /> Importiert: {importResult.imported} Teilnehmer</p>
              <p><XCircle size={16} className="align-middle mr-2" /> Übersprungen: {importResult.skipped} (bereits vorhanden oder ungültig)</p>

              {importResult.skipped > 0 && importResult.skipped_items && (
                <div className="mt-4">
                  <Button
                    variant="info"
                    onClick={() => setShowSkippedItems(!showSkippedItems)}
                    className="py-2 px-4"
                  >
                    {showSkippedItems ? '▼' : '▶'} Übersprungene Details anzeigen
                  </Button>

                  {showSkippedItems && (
                    <Card className="mt-4 p-0 overflow-hidden">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="p-2 text-left text-foreground">Zeile</th>
                            <th className="p-2 text-left text-foreground">Name</th>
                            <th className="p-2 text-left text-foreground">Scolia ID</th>
                            <th className="p-2 text-left text-foreground">Grund</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.skipped_items.map((item, idx) => (
                            <tr key={idx} className="border-b border-border">
                              <td className="p-2 text-foreground">{item.row}</td>
                              <td className="p-2 text-foreground">{item.name}</td>
                              <td className="p-2 text-foreground">{item.scolia_id || '-'}</td>
                              <td className="p-2 text-muted-foreground">{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  )}
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="mt-2">
                  <strong className="text-destructive">Fehler ({importResult.errors.length}):</strong>
                  <ul className="text-foreground">
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
        <h2 className="text-foreground">Teilnehmer ({participants.length})</h2>
        {participants.length === 0 ? (
          <p className="text-muted-foreground">Noch keine Teilnehmer vorhanden.</p>
        ) : (
          <Card className="p-0 overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted">
                  <th className="p-3 text-left text-foreground">ID</th>
                  <th className="p-3 text-left text-foreground">Name</th>
                  <th className="p-3 text-left text-foreground">Verein</th>
                  <th className="p-3 text-left text-foreground">Scolia ID</th>
                  <th className="p-3 text-left text-foreground">E-Mail</th>
                  <th className="p-3 text-left text-foreground">Nickname</th>
                  <th className="p-3 text-right text-foreground">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((participant, index) => (
                  <tr key={participant.id} className={cn(index < participants.length - 1 && 'border-b border-border')}>
                    <td className="p-3 text-foreground">{participant.id}</td>
                    <td className="p-3 font-bold text-foreground">
                      {participant.first_name} {participant.last_name}
                    </td>
                    <td className="p-3 text-muted-foreground">{participant.club || '-'}</td>
                    <td className="p-3 text-muted-foreground">{participant.scolia_id || '-'}</td>
                    <td className="p-3 text-muted-foreground">{participant.email || '-'}</td>
                    <td className="p-3 text-muted-foreground">{participant.nickname || '-'}</td>
                    <td className="p-3 text-right">
                      {canEdit && (
                        <>
                          <Button
                            variant="warning"
                            onClick={() => handleEdit(participant)}
                            className="mr-2 py-2 px-3 text-sm"
                          >
                            <PencilSimple size={16} className="mr-1 align-middle" />
                            Bearbeiten
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleDelete(participant.id)}
                            className="py-2 px-3 text-sm"
                          >
                            <Trash size={16} className="mr-1 align-middle" />
                            Löschen
                          </Button>
                        </>
                      )}
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
