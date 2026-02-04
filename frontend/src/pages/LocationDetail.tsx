import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';
import { locationService } from '../services/locationService';
import { Location, Spielfeld } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme/theme';
import { PencilSimple, Trash, ArrowLeft, Plus, Check, X } from 'phosphor-react';

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [newSpielfeldName, setNewSpielfeldName] = useState('');
  const [addingSpielfeld, setAddingSpielfeld] = useState(false);
  const [editingSpielfeldId, setEditingSpielfeldId] = useState<number | null>(null);
  const [editSpielfeldName, setEditSpielfeldName] = useState('');

  useEffect(() => {
    loadLocation();
  }, [id]);

  const loadLocation = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await locationService.getById(Number(id));
      setLocation(data);
    } catch (err) {
      console.warn('Spielort konnte nicht geladen werden.', err);
      setLocation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!location || !canEdit) return;
    const confirmed = window.confirm(`Spielort "${location.name}" und alle Spielfelder wirklich löschen?`);
    if (!confirmed) return;
    setDeleting(true);
    try {
      await locationService.delete(location.id);
      navigate('/locations');
    } catch (err) {
      console.warn('Spielort konnte nicht gelöscht werden.', err);
      setDeleting(false);
    }
  };

  const handleAddSpielfeld = async () => {
    if (!location || !canEdit || !newSpielfeldName.trim()) return;
    setAddingSpielfeld(true);
    try {
      await locationService.addSpielfeld(location.id, { name: newSpielfeldName.trim() });
      setNewSpielfeldName('');
      await loadLocation();
    } catch (err) {
      console.warn('Spielfeld konnte nicht hinzugefügt werden.', err);
    } finally {
      setAddingSpielfeld(false);
    }
  };

  const handleEditSpielfeld = (s: Spielfeld) => {
    setEditingSpielfeldId(s.id);
    setEditSpielfeldName(s.name);
  };

  const handleSaveSpielfeld = async () => {
    if (editingSpielfeldId == null || !editSpielfeldName.trim()) return;
    try {
      await locationService.updateSpielfeld(editingSpielfeldId, { name: editSpielfeldName.trim() });
      setEditingSpielfeldId(null);
      setEditSpielfeldName('');
      await loadLocation();
    } catch (err) {
      console.warn('Spielfeld konnte nicht gespeichert werden.', err);
    }
  };

  const handleDeleteSpielfeld = async (s: Spielfeld) => {
    if (!canEdit) return;
    const confirmed = window.confirm(`Spielfeld "${s.name}" löschen?`);
    if (!confirmed) return;
    try {
      await locationService.deleteSpielfeld(s.id);
      await loadLocation();
    } catch (err) {
      console.warn('Spielfeld konnte nicht gelöscht werden.', err);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Wird geladen...</div>;
  }

  if (!location) {
    return (
      <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Spielort nicht gefunden.</div>
    );
  }

  const spielfelderSorted = [...(location.spielfelder || [])].sort(
    (a, b) => a.sort_order - b.sort_order || a.id - b.id
  );

  return (
    <div style={{ padding: '2rem', background: '#000000', minHeight: '100vh', color: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Button variant="secondary" onClick={() => navigate('/locations')}>
          <ArrowLeft size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Zurück
        </Button>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => navigate(`/locations/${location.id}/edit`)}>
              <PencilSimple size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Bearbeiten
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              <Trash size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Löschen
            </Button>
          </div>
        )}
      </div>

      <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0, color: '#ffd700' }}>{location.name}</h2>
      </Card>

      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Spielfelder</h3>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <Input
              value={newSpielfeldName}
              onChange={(e) => setNewSpielfeldName(e.target.value)}
              placeholder="Name (z.B. Scheibe 1)"
              style={{ maxWidth: '200px' }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSpielfeld()}
            />
            <Button onClick={handleAddSpielfeld} disabled={addingSpielfeld || !newSpielfeldName.trim()}>
              <Plus size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Hinzufügen
            </Button>
          </div>
        )}
        {spielfelderSorted.length === 0 ? (
          <span style={{ color: '#888888' }}>Keine Spielfelder. Fügen Sie Spielfelder hinzu.</span>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'none' }}>
            {spielfelderSorted.map((s) => (
              <li
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  color: '#cccccc',
                }}
              >
                {editingSpielfeldId === s.id ? (
                  <>
                    <Input
                      value={editSpielfeldName}
                      onChange={(e) => setEditSpielfeldName(e.target.value)}
                      style={{ maxWidth: '180px' }}
                      autoFocus
                    />
                    <Button onClick={handleSaveSpielfeld} style={{ padding: '0.35rem 0.5rem' }}>
                      <Check size={16} />
                    </Button>
                    <Button variant="secondary" onClick={() => { setEditingSpielfeldId(null); setEditSpielfeldName(''); }} style={{ padding: '0.35rem 0.5rem' }}>
                      <X size={16} />
                    </Button>
                  </>
                ) : (
                  <>
                    <span>{s.name}</span>
                    {canEdit && (
                      <>
                        <Button variant="secondary" onClick={() => handleEditSpielfeld(s)} style={{ padding: '0.35rem 0.5rem' }}>
                          <PencilSimple size={14} />
                        </Button>
                        <Button variant="danger" onClick={() => handleDeleteSpielfeld(s)} style={{ padding: '0.35rem 0.5rem' }}>
                          <Trash size={14} />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
