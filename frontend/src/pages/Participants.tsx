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
  const [editingId, setEditingId] = useState<number | null>(null);

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

  if (loading) return <div style={{ padding: '2rem' }}>Wird geladen...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Teilnehmer-Verwaltung</h1>
        <div>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Zurück
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

