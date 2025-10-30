// Create Tournament Page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tournamentService } from '../services/tournamentService';
import { authService } from '../services/authService';

export default function CreateTournament() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    mode: 'round_robin' as 'round_robin' | 'knockout' | 'combined',
    has_group_phase: true,
    groups_count: 2,
    group_distribution: 'random' as 'random' | 'seeded',
    has_ko_phase: false,
    ko_participants: 4,
    ko_first_round_size: 4,
    ko_distribution: 'cross' as 'cross' | 'draw',
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await tournamentService.create({
        ...formData,
        groups_count: parseInt(formData.groups_count.toString()),
        ko_participants: parseInt(formData.ko_participants.toString()),
        ko_first_round_size: formData.has_ko_phase ? parseInt(formData.ko_first_round_size.toString()) : undefined,
        ko_distribution: formData.has_ko_phase ? formData.ko_distribution : undefined,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Fehler beim Erstellen des Turniers');
    } finally {
      setLoading(false);
    }
  };

  // Modus-Erklärungen
  const modeExplanations = {
    round_robin: {
      title: "Round Robin (Nur Gruppenphase)",
      description: "Jeder spielt gegen jeden - KEINE KO-Phase.",
      features: [
        "Alle Teilnehmer spielen gegeneinander",
        "Gruppenphase mit vollständiger Round-Robin-Paarung",
        "Rangliste basierend auf Punkten und Differenz",
        "KEINE KO-Phase, KEIN Finale",
        "Geeignet für Liga-Meisterschaften oder kleine Turniere"
      ]
    },
    knockout: {
      title: "KO-Phase (Ohne Gruppenphase)",
      description: "Direkte Ausscheidungsrunde - KEINE Gruppenphase.",
      features: [
        "Direkte Ausscheidungsrunde ohne Gruppenphase",
        "Verlierer scheiden aus",
        "Schnelles Turnier mit klarem Gewinner",
        "Bronze-Match für Platz 3 verfügbar",
        "Geeignet für 4, 8, 16 oder 32 Teilnehmer"
      ]
    },
    combined: {
      title: "Kombiniert (Klassisches Turnier)",
      description: "Gruppenphase + KO-Phase - wie WM, EM, etc.",
      features: [
        "Phase 1: Gruppenphase mit Round-Robin",
        "Top-Teams qualifizieren sich für KO-Phase",
        "Phase 2: KO-Phase mit Finale",
        "Bronze-Match für Platz 3 verfügbar",
        "Geeignet für große Turniere mit vielen Teilnehmern"
      ]
    }
  };

  const currentMode = modeExplanations[formData.mode];

  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Linke Seite - Formular */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <h1>Neues Turnier erstellen</h1>
          <button onClick={() => navigate('/dashboard')}>Zurück</button>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: '#fee', color: '#c00', marginBottom: '1rem', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Turniername *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Beschreibung
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Startdatum *
          </label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Enddatum (optional)
          </label>
          <input
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Modus *
          </label>
          <select
            name="mode"
            value={formData.mode}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="round_robin">Round Robin</option>
            <option value="knockout">KO-Phase</option>
            <option value="combined">Kombiniert</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              name="has_group_phase"
              checked={formData.has_group_phase}
              onChange={handleChange}
            />
            <span style={{ fontWeight: 'bold' }}>Gruppenphase</span>
          </label>
        </div>

        {formData.has_group_phase && (
          <div style={{ marginBottom: '1rem', marginLeft: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Anzahl Gruppen
            </label>
            <input
              type="number"
              name="groups_count"
              value={formData.groups_count}
              onChange={handleChange}
              min={1}
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            
            <label style={{ display: 'block', marginTop: '1rem', marginBottom: '0.5rem' }}>
              Auslosungsart
            </label>
            <select
              name="group_distribution"
              value={formData.group_distribution}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="random">Zufällig (Random)</option>
              <option value="seeded">Gesetzt (Seeded)</option>
            </select>
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              name="has_ko_phase"
              checked={formData.has_ko_phase}
              onChange={handleChange}
            />
            <span style={{ fontWeight: 'bold' }}>KO-Phase</span>
          </label>
        </div>

        {formData.has_ko_phase && (
          <div style={{ marginBottom: '1rem', marginLeft: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Teilnehmer aus Gruppenphase
            </label>
            <input
              type="number"
              name="ko_participants"
              value={formData.ko_participants}
              onChange={handleChange}
              min={1}
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            
            <label style={{ display: 'block', marginTop: '1rem', marginBottom: '0.5rem' }}>
              Erste KO-Runde (Teilnehmer)
            </label>
            <select
              name="ko_first_round_size"
              value={formData.ko_first_round_size}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="4">Top 4</option>
              <option value="8">Top 8</option>
              <option value="16">Top 16</option>
            </select>
            
            <label style={{ display: 'block', marginTop: '1rem', marginBottom: '0.5rem' }}>
              KO-Auslosung
            </label>
            <select
              name="ko_distribution"
              value={formData.ko_distribution}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="cross">Cross (Überkreuz)</option>
              <option value="draw">Draw (Auslosung)</option>
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Wird erstellt...' : 'Turnier erstellen'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </button>
        </div>
      </form>
      </div>
      
      {/* Rechte Seite - Modus-Erklärung */}
      <div style={{ flex: 1, maxWidth: '400px' }}>
        <div style={{
          position: 'sticky',
          top: '2rem',
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '2rem'
        }}>
          <h2 style={{ marginBottom: '1rem', color: '#495057' }}>📋 {currentMode.title}</h2>
          <p style={{ marginBottom: '1.5rem', color: '#6c757d', fontSize: '1.1rem' }}>
            {currentMode.description}
          </p>
          
          <h3 style={{ marginBottom: '1rem', color: '#495057', fontSize: '1rem' }}>Merkmale:</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {currentMode.features.map((feature, index) => (
              <li key={index} style={{
                padding: '0.75rem 0',
                borderBottom: index < currentMode.features.length - 1 ? '1px solid #dee2e6' : 'none',
                color: '#495057'
              }}>
                ✓ {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

