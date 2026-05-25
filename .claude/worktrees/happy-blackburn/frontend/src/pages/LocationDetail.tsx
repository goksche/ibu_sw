import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { locationService } from '../services/locationService';
import { Location, Spielfeld } from '../types';
import { useAuth } from '../contexts/AuthContext';
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
    return <div className="p-8 text-foreground">Wird geladen...</div>;
  }

  if (!location) {
    return (
      <div className="p-8 text-foreground">Spielort nicht gefunden.</div>
    );
  }

  const spielfelderSorted = [...(location.spielfelder || [])].sort(
    (a, b) => a.sort_order - b.sort_order || a.id - b.id
  );

  return (
    <div className="p-8 bg-background min-h-screen text-foreground">
      <div className="flex justify-between items-center mb-6">
        <Button variant="secondary" onClick={() => navigate('/locations')}>
          <ArrowLeft size={18} className="mr-2 align-middle" />
          Zurück
        </Button>
        {canEdit && (
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => navigate(`/locations/${location.id}/edit`)}>
              <PencilSimple size={18} className="mr-2 align-middle" />
              Bearbeiten
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              <Trash size={18} className="mr-2 align-middle" />
              Löschen
            </Button>
          </div>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mt-0 text-foreground">{location.name}</h2>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="mt-0 mb-4">Spielfelder</h3>
          {canEdit && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <Input
                value={newSpielfeldName}
                onChange={(e) => setNewSpielfeldName(e.target.value)}
                placeholder="Name (z.B. Scheibe 1)"
                className="max-w-[200px]"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSpielfeld()}
              />
              <Button onClick={handleAddSpielfeld} disabled={addingSpielfeld || !newSpielfeldName.trim()}>
                <Plus size={18} className="mr-2 align-middle" />
                Hinzufügen
              </Button>
            </div>
          )}
          {spielfelderSorted.length === 0 ? (
            <span className="text-muted-foreground">Keine Spielfelder. Fügen Sie Spielfelder hinzu.</span>
          ) : (
            <ul className="m-0 pl-5 list-none">
              {spielfelderSorted.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 mb-2 text-muted-foreground"
                >
                  {editingSpielfeldId === s.id ? (
                    <>
                      <Input
                        value={editSpielfeldName}
                        onChange={(e) => setEditSpielfeldName(e.target.value)}
                        className="max-w-[180px]"
                        autoFocus
                      />
                      <Button onClick={handleSaveSpielfeld} className="p-1.5">
                        <Check size={16} />
                      </Button>
                      <Button variant="secondary" onClick={() => { setEditingSpielfeldId(null); setEditSpielfeldName(''); }} className="p-1.5">
                        <X size={16} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span>{s.name}</span>
                      {canEdit && (
                        <>
                          <Button variant="secondary" onClick={() => handleEditSpielfeld(s)} className="p-1.5">
                            <PencilSimple size={14} />
                          </Button>
                          <Button variant="danger" onClick={() => handleDeleteSpielfeld(s)} className="p-1.5">
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
        </CardContent>
      </Card>
    </div>
  );
}
