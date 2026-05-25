// Edit Tournament Page
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tournamentService } from '../services/tournamentService';
import { authService } from '../services/authService';
import { participantService } from '../services/participantService';
import { Participant, LeagueVariant } from '../types';

export default function EditTournament() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tournamentId = id ? parseInt(id) : 0;
  const [loading, setLoading] = useState(false);
  const [loadingTournament, setLoadingTournament] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    mode: 'round_robin' as 'round_robin' | 'knockout' | 'combined',
    has_group_phase: true,
    groups_count: 2,
    participants_per_group: null as number | null,
    group_distribution: 'random' as 'random' | 'seeded',
    has_ko_phase: false,
    ko_participants: 4,
    ko_first_round_size: 4,
    ko_distribution: 'cross' as 'cross' | 'draw',  // Deprecated, kept for backward compatibility
    ko_structure: null as 'single_elimination' | 'single_elimination_with_third' | 'double_elimination' | 'group_then_single_ko' | 'group_then_double_ko' | 'ko_with_group_winner_advantage' | 'page_playoff' | null,
    ko_draw_method: null as 'fixed_cross' | 'same_position_cross' | 'overall_seeding' | 'pot_system' | 'full_random' | 'bonus_draw_for_winners' | 'predefined_bracket' | 'manual' | null,
    ko_third_place_match: false,
    ko_group_winner_advantage: false,
    ko_block_same_group: true,
    ko_block_same_position: false,
    ko_random_seed: null as number | null,
    league_scoring_system: null as 'points' | 'difference' | null,
    tie_breaking_rules: [] as string[],
    league_variant: 'classic' as LeagueVariant,
    league_rounds_multiplier: 1,
    is_template: false,
    seeded_participant_ids: [] as number[],
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    if (tournamentId) {
      loadTournament();
    }
  }, [navigate, tournamentId]);

  // Load tournament data on mount
  const loadTournament = async () => {
    try {
      setLoadingTournament(true);
      const tournament = await tournamentService.getById(tournamentId);
      
      // Populate form with tournament data
      setFormData({
        name: tournament.name,
        description: tournament.description || '',
        start_date: tournament.start_date,
        end_date: tournament.end_date || '',
        mode: tournament.mode,
        has_group_phase: tournament.has_group_phase,
        groups_count: tournament.groups_count || 2,
        participants_per_group: tournament.participants_per_group || null,
        group_distribution: tournament.group_distribution as 'random' | 'seeded',
        has_ko_phase: tournament.has_ko_phase,
        ko_participants: tournament.ko_participants || 4,
        ko_first_round_size: tournament.ko_first_round_size || 4,
        ko_distribution: tournament.ko_distribution as 'cross' | 'draw' || 'cross',
        ko_structure: tournament.ko_structure,
        ko_draw_method: tournament.ko_draw_method,
        ko_third_place_match: tournament.ko_third_place_match || false,
        ko_group_winner_advantage: tournament.ko_group_winner_advantage || false,
        ko_block_same_group: tournament.ko_block_same_group !== undefined ? tournament.ko_block_same_group : true,
        ko_block_same_position: tournament.ko_block_same_position || false,
        ko_random_seed: tournament.ko_random_seed,
        league_scoring_system: tournament.league_scoring_system,
        tie_breaking_rules: tournament.tie_breaking_rules || [],
        league_variant: tournament.league_variant || 'classic',
        league_rounds_multiplier: tournament.league_rounds_multiplier || 1,
        is_template: false, // Not editable
        seeded_participant_ids: tournament.seeded_participant_ids || [],
      });
    } catch (err) {
      console.error('Failed to load tournament:', err);
      setError('Fehler beim Laden des Turniers');
      navigate('/dashboard');
    } finally {
      setLoadingTournament(false);
    }
  };

  // Load participants when seeded distribution is selected
  useEffect(() => {
    if (formData.group_distribution === 'seeded' && formData.groups_count > 1) {
      const loadParticipants = async () => {
        try {
          setLoadingParticipants(true);
          const participants = await participantService.getAll();
          setAllParticipants(participants);
        } catch (err) {
          console.error('Failed to load participants:', err);
        } finally {
          setLoadingParticipants(false);
        }
      };
      loadParticipants();
    }
  }, [formData.group_distribution, formData.groups_count]);

  // Auto-set has_group_phase and has_ko_phase based on mode
  useEffect(() => {
    if (formData.mode === 'round_robin') {
      setFormData(prev => ({ ...prev, has_group_phase: true, has_ko_phase: false }));
    } else if (formData.mode === 'knockout') {
      setFormData(prev => ({ ...prev, has_group_phase: false, has_ko_phase: true }));
    } else if (formData.mode === 'combined') {
      setFormData(prev => ({ ...prev, has_group_phase: true, has_ko_phase: true }));
    }
  }, [formData.mode]);

  // Reset ko_draw_method if it's not allowed for current mode
  useEffect(() => {
    if (formData.ko_draw_method && formData.mode === 'knockout' && !formData.has_group_phase) {
      const allowedMethods = getAllowedKODrawMethods(formData.mode, formData.has_group_phase);
      if (!allowedMethods.find(m => m.value === formData.ko_draw_method)) {
        setFormData(prev => ({ ...prev, ko_draw_method: null }));
      }
    }
  }, [formData.mode, formData.has_group_phase]);

  // Remove 'wins' from tie_breaking_rules if league_scoring_system is 'points'
  useEffect(() => {
    if (formData.league_scoring_system === 'points' && formData.tie_breaking_rules.includes('wins')) {
      setFormData(prev => ({
        ...prev,
        tie_breaking_rules: prev.tie_breaking_rules.filter(r => r !== 'wins')
      }));
    }
  }, [formData.league_scoring_system]);

  // Handle exclusive logic: decision_match vs other rules
  useEffect(() => {
    const hasDecisionMatch = formData.tie_breaking_rules.includes('decision_match');
    const hasOtherRules = formData.tie_breaking_rules.some(r => r !== 'decision_match');
    
    if (hasDecisionMatch && hasOtherRules) {
      // If decision_match is selected, remove all other rules
      setFormData(prev => ({
        ...prev,
        tie_breaking_rules: ['decision_match']
      }));
    }
  }, [formData.tie_breaking_rules]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (value === '' ? null : value)
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validierung: Bei Liga/Kombiniert-Modus müssen Wertung und Gleichstandsregeln gesetzt sein (nur für Gruppenphase)
    if (formData.mode === 'round_robin' || (formData.mode === 'combined' && formData.has_group_phase)) {
      if (!formData.league_scoring_system) {
        setError('Bitte wählen Sie ein Ligatabelle Wertungssystem aus.');
        setLoading(false);
        return;
      }
      if (!formData.tie_breaking_rules || formData.tie_breaking_rules.length === 0) {
        setError('Bitte wählen Sie mindestens eine Gleichstandsregel aus.');
        setLoading(false);
        return;
      }
    }

    // Validierung: Bei 'multiple' Variante muss Multiplikator gesetzt sein
    if (formData.mode === 'round_robin' && formData.league_variant === 'multiple') {
      if (!formData.league_rounds_multiplier || formData.league_rounds_multiplier < 2 || formData.league_rounds_multiplier > 10) {
        setError('Bitte geben Sie einen Multiplikator zwischen 2 und 10 ein.');
        setLoading(false);
        return;
      }
    }

    // Validierung: Bei gesetzter Auslosung müssen gesetzte Spieler ausgewählt sein
    if (formData.group_distribution === 'seeded' && formData.groups_count > 1) {
      if (!formData.seeded_participant_ids || formData.seeded_participant_ids.length === 0) {
        setError('Bitte wählen Sie mindestens einen gesetzten Spieler aus.');
        setLoading(false);
        return;
      }
    }

    try {
      await tournamentService.update(tournamentId, {
        name: formData.name,
        description: formData.description || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        mode: formData.mode,
        has_group_phase: formData.has_group_phase,
        groups_count: formData.has_group_phase ? formData.groups_count : 0,
        participants_per_group: formData.has_group_phase ? formData.participants_per_group : undefined,
        group_distribution: formData.has_group_phase ? formData.group_distribution : 'random',
        has_ko_phase: formData.has_ko_phase,
        ko_participants: (formData.has_ko_phase && formData.mode === 'combined') ? formData.ko_participants : 0,
        ko_first_round_size: formData.has_ko_phase ? parseInt(formData.ko_first_round_size.toString()) : undefined,
        ko_distribution: formData.has_ko_phase ? formData.ko_distribution : undefined,  // Deprecated
        ko_structure: formData.has_ko_phase ? formData.ko_structure : undefined,
        ko_draw_method: formData.has_ko_phase ? formData.ko_draw_method : undefined,
        ko_third_place_match: formData.has_ko_phase ? formData.ko_third_place_match : false,
        ko_group_winner_advantage: formData.has_ko_phase ? formData.ko_group_winner_advantage : false,
        ko_block_same_group: formData.has_ko_phase ? formData.ko_block_same_group : true,
        ko_block_same_position: formData.has_ko_phase ? formData.ko_block_same_position : false,
        ko_random_seed: formData.has_ko_phase && formData.ko_random_seed ? formData.ko_random_seed : undefined,
        league_scoring_system: (formData.mode === 'round_robin' || formData.mode === 'combined') ? formData.league_scoring_system : undefined,
        tie_breaking_rules: (formData.mode === 'round_robin' || formData.mode === 'combined') && formData.tie_breaking_rules.length > 0 ? formData.tie_breaking_rules : undefined,
        league_variant: formData.mode === 'round_robin' ? formData.league_variant : undefined,
        league_rounds_multiplier: formData.mode === 'round_robin' && formData.league_variant === 'multiple' ? formData.league_rounds_multiplier : undefined,
        seeded_participant_ids: formData.group_distribution === 'seeded' && formData.seeded_participant_ids.length > 0 ? formData.seeded_participant_ids : undefined,
      });
      navigate(`/tournaments/${tournamentId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Fehler beim Aktualisieren des Turniers');
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

  // Labels für Gleichstandsregeln
  const tieBreakingRuleLabels: Record<string, string> = {
    'wins': 'Siege',
    'direct_encounter': 'Direktbegegnung',
    'decision_match': 'Entscheidungsspiel'
  };

  // Verfügbare Gleichstandsregeln (abhängig von Wertungssystem)
  const getAvailableTieBreakingRules = () => {
    const allRules = ['wins', 'direct_encounter', 'decision_match'];
    if (formData.league_scoring_system === 'points') {
      return allRules.filter(r => r !== 'wins');
    }
    return allRules;
  };

  // Hilfsfunktionen für Reihenfolge der Gleichstandsregeln
  const moveTieBreakingRule = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formData.tie_breaking_rules.length - 1) return;
    
    const newRules = [...formData.tie_breaking_rules];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newRules[index], newRules[newIndex]] = [newRules[newIndex], newRules[index]];
    
    setFormData(prev => ({
      ...prev,
      tie_breaking_rules: newRules
    }));
  };

  // KO-Struktur-Optionen mit Beschreibungen
  const koStructureOptions = [
    { 
      value: 'single_elimination', 
      label: 'Einfach-KO (Single Elimination)', 
      description: 'Prinzip: 1 Niederlage = ausgeschieden. Schnell und einfach. Verlierer jeder Partie scheidet sofort aus. Unterstützt Byes/Freilose wenn Teilnehmerzahl nicht Potenz von 2 ist. Spiel um Platz 3 optional konfigurierbar.' 
    },
    { 
      value: 'single_elimination_with_third', 
      label: 'Einfach-KO mit Spiel um Platz 3 (Bronze-Spiel)', 
      description: 'Wie Einfach-KO, aber die Halbfinal-Verlierer spielen um Rang 3. Ideal wenn der 3. Platz wichtig ist (Preise, Punkte). Bronze-Spiel separat konfigurierbar (z.B. kürzeres Best-of als Finale).' 
    },
    { 
      value: 'consolation_bracket', 
      label: 'Trostturnier (Consolation Bracket) nach Einfach-KO', 
      description: 'Wer verliert, fällt in ein zweites KO-Tableau (Trost), um dort weiterzuspielen. Es gibt dann Hauptsieger und Trostsieger. Mehr Spielzeit für alle, besser für Teilnehmerzufriedenheit. Konfigurierbar ab welcher Runde das Trostturnier startet.' 
    },
    { 
      value: 'double_elimination', 
      label: 'Doppel-KO (Double Elimination)', 
      description: 'Prinzip: 2 Niederlagen = ausgeschieden. Es gibt zwei Schienen: Winner Bracket (ungeschlagen) und Loser Bracket (nach erster Niederlage). Sehr fair, weil ein Ausrutscher nicht sofort rauswirft. Komplexer Plan, mehr Spiele. Finale mit optionalem Bracket Reset konfigurierbar.' 
    },
    { 
      value: 'triple_elimination', 
      label: 'Triple-KO (Three-Life / Triple Elimination)', 
      description: 'Prinzip: 3 Niederlagen = ausgeschieden (drei Leben). In der Praxis selten, maximale Fairness. Nur sinnvoll wenn sehr viel Zeit vorhanden ist. Finale-Logik wie beim Doppel-KO, nur mit mehr Stufen.' 
    },
    { 
      value: 'aggregate_ko', 
      label: 'KO mit Hin- und Rückpiel (Aggregate KO)', 
      description: 'Jede Runde besteht aus 2 Legs/2 Matches (Hin und Rück). Sieger wird über Summe/Aggregate Score bestimmt. Tie-Breaker bei Gleichstand: Decider-Leg, Sudden Death, oder drittes Match. Eher Fußball-inspiriert.' 
    },
    { 
      value: 'group_then_single_ko', 
      label: 'Gruppenphase mit anschließendem Einfach-KO', 
      description: 'Zuerst spielt jeder mehrere Gruppenspiele. Danach kommen die besten Spieler in eine klassische KO-Runde. Typisch für große Turniere (WM, EM).' 
    },
    { 
      value: 'group_then_double_ko', 
      label: 'Gruppenphase mit anschließendem Doppel-KO', 
      description: 'Nach der Gruppenphase darf man sich auch in der KO-Phase eine Niederlage erlauben. Kombiniert Gruppenphase mit doppeltem KO-System.' 
    },
    { 
      value: 'ko_with_group_winner_advantage', 
      label: 'KO mit Vorteil für Gruppensieger', 
      description: 'Wer seine Gruppe gewinnt, bekommt in der KO-Phase einen Bonus als Belohnung für gute Leistung in der Gruppenphase.' 
    },
    { 
      value: 'page_playoff', 
      label: 'Page-Playoff-System', 
      description: 'Die besten Teilnehmer haben einen Vorteil und dürfen sich eine Niederlage erlauben, die anderen nicht. Spezielles System für kleine Teilnehmerfelder.' 
    },
  ];

  // Auslosungsmethode-Optionen für reinen KO-Modus (ohne Gruppenphase)
  const koOnlyDrawMethods = [
    { 
      value: 'full_random', 
      label: 'Vollzufällige Auslosung', 
      description: 'Alle Teilnehmer werden zufällig gepaart. Keine Vorsortierung oder Seeding-Regeln. Jeder kann gegen jeden treffen.' 
    },
    { 
      value: 'pot_system', 
      label: 'Topf-System (Stärketöpfe)', 
      description: 'Teilnehmer werden in Stärketöpfe eingeteilt (z.B. basierend auf Weltrangliste oder vorherigen Leistungen) und dann mit Regeln ausgelost. Stärkere Teilnehmer treffen später aufeinander.' 
    },
    { 
      value: 'manual', 
      label: 'Manuelle Paarungen', 
      description: 'Die Paarungen der ersten KO-Runde werden manuell festgelegt. Verfügbar im Turnier-Bereich nach dem Hinzufügen der Teilnehmer.' 
    }
  ];

  // Auslosungsmethode-Optionen für Kombiniert-Modus (mit Gruppenphase)
  const combinedDrawMethods = [
    { 
      value: 'fixed_cross', 
      label: 'Feste Kreuzpaarung', 
      description: 'Gruppenplätze bestimmen die Paarungen fest: A1 vs B2, B1 vs A2 (bei 2 Gruppen). Keine Auslosung nötig. Klassisches System bei Turnieren mit Gruppenphase.' 
    },
    { 
      value: 'same_position_cross', 
      label: 'Platzgleiches Kreuzen', 
      description: 'Alle Gruppenersten spielen gegeneinander, alle Gruppenzweiten ebenfalls. Beispiel: A1, B1, C1, D1 in einem Halbfinal, A2, B2, C2, D2 im anderen.' 
    },
    { 
      value: 'overall_seeding', 
      label: 'Gesamt-Seeding (Nach Gruppenphase)', 
      description: 'Nach der Gruppenphase werden Teilnehmer nach Gesamtleistung geseedet und dann gepaart (Bester vs. Schlechtester). Berücksichtigt Gruppenphase-Ergebnisse.' 
    },
    { 
      value: 'pot_system', 
      label: 'Topf-System (Nach Gruppenphase)', 
      description: 'Teilnehmer werden nach Gruppenphase-Leistung in Töpfe eingeteilt und dann ausgelost. Gruppenphase-Ergebnisse fließen in die Topf-Einteilung ein.' 
    },
    { 
      value: 'full_random', 
      label: 'Vollzufällige Auslosung', 
      description: 'Alle qualifizierten Teilnehmer werden zufällig gepaart, unabhängig von Gruppenplatzierung oder Leistung in der Gruppenphase.' 
    },
    { 
      value: 'bonus_draw_for_winners', 
      label: 'Bonus-Auslosung für Gruppensieger', 
      description: 'Gruppensieger bekommen in der ersten KO-Runde gezielt einen leichteren Gegner (z.B. Gruppensieger vs. Gruppenzweite/Dritte). Belohnung für Gruppenphase-Erfolg.' 
    },
    { 
      value: 'predefined_bracket', 
      label: 'Vorgegebener Turnierbaum', 
      description: 'Der KO-Baum steht bereits fest. Die Gruppenphase bestimmt nur, welche Teilnehmer welche Positionen im Bracket einnehmen. Struktur ist vorab definiert.' 
    }
  ];

  // Helper-Funktion für erlaubte KO-Strukturen basierend auf Modus
  const getAllowedKOStructures = (mode: string) => {
    if (mode === 'combined') {
      // Bei Kombi-Modus nur einfache KO-Strukturen (ohne Gruppenphase-integrierte)
      return koStructureOptions.filter(option => 
        ['single_elimination', 'single_elimination_with_third', 'consolation_bracket', 'double_elimination', 'triple_elimination', 'aggregate_ko'].includes(option.value)
      );
    } else if (mode === 'knockout') {
      // Bei reinem KO-Modus nur reine KO-Strukturen (ohne Gruppenphase-bezogene)
      return koStructureOptions.filter(option => 
        !['group_then_single_ko', 'group_then_double_ko', 'ko_with_group_winner_advantage'].includes(option.value)
      );
    }
    // Bei Liga-Modus keine KO-Strukturen (sollte nicht vorkommen, aber zur Sicherheit)
    return [];
  };

  // Helper-Funktion für erlaubte KO-Auslosungsmethoden basierend auf Modus
  const getAllowedKODrawMethods = (mode: string, hasGroupPhase: boolean) => {
    if (mode === 'knockout' && !hasGroupPhase) {
      // Reiner KO-Modus: nur Methoden die ohne Gruppenphase funktionieren
      return koOnlyDrawMethods;
    } else if (mode === 'combined') {
      // Kombiniert-Modus: nur Methoden die Gruppenplatzierungen berücksichtigen
      return combinedDrawMethods;
    }
    // Fallback: sollte nicht vorkommen
    return [];
  };

  // Helper-Funktionen für bedingte Anzeige
  const needsDrawMethod = (structure: string | null) => {
    // Alle Strukturen benötigen eine Auslosungsmethode
    return structure !== null;
  };

  const needsGroupWinnerAdvantage = (_structure: string | null, _mode: string) => {
    // Option entfernt für Kombi-Modus
    // Nur relevant für spezifische gruppenphase-integrierte Strukturen (die nicht mehr verfügbar sind)
    return false;
  };


  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Linke Seite - Formular */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <h1>Turnier bearbeiten</h1>
          <button onClick={() => navigate(`/tournaments/${tournamentId}`)}>Zurück</button>
        </div>

        {loadingTournament && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Turnier wird geladen...</div>
        )}

        {error && (
          <div style={{ padding: '1rem', background: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {!loadingTournament && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#856404' }}>
              <strong>Hinweis:</strong> Wenn Sie Konfigurationseinstellungen ändern (z.B. Modus, Anzahl Gruppen, KO-Struktur), werden alle vorhandenen Gruppen und Spiele gelöscht. 
              Sie müssen diese nach dem Speichern neu generieren.
            </p>
          </div>
        )}

        {!loadingTournament && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Turnier-Name *
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

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Beschreibung
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
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
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Enddatum
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Turnier-Modus *
            </label>
            <select
              name="mode"
              value={formData.mode}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="round_robin">Liga</option>
              <option value="knockout">KO-Phase</option>
              <option value="combined">Kombiniert</option>
            </select>
          </div>

        {(formData.mode === 'round_robin' || formData.mode === 'combined') && (
          <div style={{ marginBottom: '1rem', marginLeft: '0' }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057' }}>Gruppenphase</h3>
            <div style={{ marginLeft: '2rem' }}>
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
            
            {formData.groups_count > 1 && (
              <>
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

                {formData.group_distribution === 'seeded' && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Gesetzte Spieler auswählen *
                    </label>
                    <p style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                      Wählen Sie die Spieler aus, die vor der Auslosung in Gruppen eingeteilt werden sollen. Die anderen Spieler werden dann zufällig zugeteilt.
                    </p>
                    {loadingParticipants ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>Lade Teilnehmer...</div>
                    ) : allParticipants.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                        Keine Teilnehmer verfügbar. Bitte erstellen Sie zuerst Teilnehmer in der Teilnehmer-Verwaltung.
                      </div>
                    ) : (
                      <>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '0.5rem' }}>
                          {allParticipants.map(participant => {
                            const isSelected = formData.seeded_participant_ids.includes(participant.id);
                            return (
                              <label
                                key={participant.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  background: isSelected ? '#e7f3ff' : 'transparent',
                                  marginBottom: '0.25rem'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData(prev => ({
                                        ...prev,
                                        seeded_participant_ids: [...prev.seeded_participant_ids, participant.id]
                                      }));
                                    } else {
                                      setFormData(prev => ({
                                        ...prev,
                                        seeded_participant_ids: prev.seeded_participant_ids.filter(id => id !== participant.id)
                                      }));
                                    }
                                  }}
                                />
                                <span>
                                  {participant.first_name} {participant.last_name}
                                  {participant.club && ` (${participant.club})`}
                                  {participant.nickname && ` - "${participant.nickname}"`}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: formData.seeded_participant_ids.length === 0 ? '#dc3545' : '#666' }}>
                          {formData.seeded_participant_ids.length === 0 
                            ? 'Bitte wählen Sie mindestens einen gesetzten Spieler aus.'
                            : `${formData.seeded_participant_ids.length} Spieler ausgewählt.`
                          }
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Ligatabelle Wertung *
              </label>
              <select
                name="league_scoring_system"
                value={formData.league_scoring_system || ''}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">-- Bitte wählen --</option>
                <option value="points">Punkte</option>
                <option value="difference">Differenz</option>
              </select>
            </div>

            {formData.mode === 'round_robin' && (
              <>
                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Liga-Variante
                  </label>
                  <select
                    name="league_variant"
                    value={formData.league_variant}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="classic">Klassische Liga (Round Robin)</option>
                    <option value="double">Doppelte Liga</option>
                    <option value="multiple">Mehrfache Liga</option>
                  </select>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666', fontStyle: 'italic' }}>
                    {formData.league_variant === 'classic' && 'Jeder gegen jeden einmal (Standard Round Robin)'}
                    {formData.league_variant === 'double' && 'Jeder gegen jeden zweimal (2x Round Robin)'}
                    {formData.league_variant === 'multiple' && 'Jeder gegen jeden mehrfach (konfigurierbarer Multiplikator)'}
                  </p>
                </div>

                {formData.league_variant === 'multiple' && (
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Anzahl Runden (Multiplikator) *
                    </label>
                    <input
                      type="number"
                      name="league_rounds_multiplier"
                      value={formData.league_rounds_multiplier}
                      onChange={(e) => setFormData(prev => ({ ...prev, league_rounds_multiplier: parseInt(e.target.value) || 1 }))}
                      min={2}
                      max={10}
                      required
                      style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666', fontStyle: 'italic' }}>
                      Wie oft die komplette Round-Robin-Runde wiederholt wird (min: 2, max: 10)
                    </p>
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Gleichstandsregeln *
              </label>
              
              {/* Verfügbare Regeln (Checkboxen mit exklusiver Logik für Entscheidungsspiel) */}
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 'bold' }}>Verfügbare Regeln:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {getAvailableTieBreakingRules().map(rule => {
                    const isDecisionMatch = rule === 'decision_match';
                    const hasDecisionMatch = formData.tie_breaking_rules.includes('decision_match');
                    const hasOtherRules = formData.tie_breaking_rules.some(r => r !== 'decision_match');
                    const isChecked = formData.tie_breaking_rules.includes(rule);
                    const isDisabled = (isDecisionMatch && hasOtherRules) || (!isDecisionMatch && hasDecisionMatch);
                    
                    return (
                      <label 
                        key={rule} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.5 : 1
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (isDecisionMatch) {
                                // Wenn Entscheidungsspiel gewählt wird, nur diese Regel setzen
                                setFormData(prev => ({
                                  ...prev,
                                  tie_breaking_rules: ['decision_match']
                                }));
                              } else {
                                // Wenn andere Regel gewählt wird, Entscheidungsspiel entfernen
                                setFormData(prev => ({
                                  ...prev,
                                  tie_breaking_rules: prev.tie_breaking_rules.filter(r => r !== 'decision_match').concat(rule)
                                }));
                              }
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                tie_breaking_rules: prev.tie_breaking_rules.filter(r => r !== rule)
                              }));
                            }
                          }}
                        />
                        <span>{tieBreakingRuleLabels[rule]}</span>
                      </label>
                    );
                  })}
                </div>
                {formData.tie_breaking_rules.includes('decision_match') && (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
                    Bei Gleichstand wird ein Entscheidungsspiel generiert.
                  </p>
                )}
              </div>

              {/* Ausgewählte Regeln mit Reihenfolge (nur wenn kein Entscheidungsspiel) */}
              {formData.tie_breaking_rules.length > 0 && !formData.tie_breaking_rules.includes('decision_match') && (
                <div style={{ padding: '0.75rem', background: '#e7f3ff', borderRadius: '4px', border: '1px solid #b3d9ff' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 'bold' }}>Reihenfolge (1. = höchste Priorität):</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {formData.tie_breaking_rules.map((rule, index) => (
                      <div key={`${rule}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'white', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <span style={{ minWidth: '2rem', fontWeight: 'bold', color: '#666' }}>{index + 1}.</span>
                        <span style={{ flex: 1 }}>{tieBreakingRuleLabels[rule]}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <button
                            type="button"
                            onClick={() => moveTieBreakingRule(index, 'up')}
                            disabled={index === 0}
                            style={{
                              width: '24px',
                              height: '20px',
                              padding: 0,
                              fontSize: '0.75rem',
                              background: index === 0 ? '#ccc' : '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '2px',
                              cursor: index === 0 ? 'not-allowed' : 'pointer'
                            }}
                            title="Nach oben"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTieBreakingRule(index, 'down')}
                            disabled={index === formData.tie_breaking_rules.length - 1}
                            style={{
                              width: '24px',
                              height: '20px',
                              padding: 0,
                              fontSize: '0.75rem',
                              background: index === formData.tie_breaking_rules.length - 1 ? '#ccc' : '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '2px',
                              cursor: index === formData.tie_breaking_rules.length - 1 ? 'not-allowed' : 'pointer'
                            }}
                            title="Nach unten"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        )}

        {(formData.mode === 'knockout' || formData.mode === 'combined') && (
          <div style={{ marginBottom: '1rem', marginLeft: '0', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057' }}>
              {formData.mode === 'knockout' ? 'KO-Phase (Reine Ausscheidungsrunde)' : 'KO-Phase (Nach Gruppenphase)'}
            </h3>
            {formData.mode === 'combined' && (
              <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#666', fontStyle: 'italic' }}>
                Hinweis: Ligatabelle Wertung und Gleichstandsregeln werden in der Gruppenphase konfiguriert.
              </p>
            )}
            <div style={{ marginLeft: '1rem' }}>
              {formData.mode === 'combined' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
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
                </div>
              )}
              {formData.mode === 'knockout' && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#e7f3ff', borderRadius: '4px', border: '1px solid #b3d9ff' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#004085' }}>
                    Die Teilnehmeranzahl wird automatisch basierend auf den hinzugefügten Teilnehmern ermittelt. 
                    Der Turnierbaum wird erstellt, sobald Teilnehmer zum Turnier hinzugefügt wurden.
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Turnierstruktur *
                  </label>
                  <select
                    name="ko_structure"
                    value={formData.ko_structure || ''}
                    onChange={handleChange}
                    required
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="">-- Bitte wählen --</option>
                    {getAllowedKOStructures(formData.mode).map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '1.75rem' }}>
                  {formData.ko_structure && (
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#666', fontStyle: 'italic' }}>
                      {getAllowedKOStructures(formData.mode).find(o => o.value === formData.ko_structure)?.description}
                    </p>
                  )}
                </div>
              </div>

              {needsDrawMethod(formData.ko_structure) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Auslosung *
                    </label>
                    <select
                      name="ko_draw_method"
                      value={formData.ko_draw_method || ''}
                      onChange={handleChange}
                      required
                      style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="">-- Bitte wählen --</option>
                      {getAllowedKODrawMethods(formData.mode, formData.has_group_phase).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '1.75rem' }}>
                    {formData.ko_draw_method && (
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#666', fontStyle: 'italic' }}>
                        {getAllowedKODrawMethods(formData.mode, formData.has_group_phase).find(o => o.value === formData.ko_draw_method)?.description}
                      </p>
                    )}
                  </div>
                </div>
              )}


              {needsGroupWinnerAdvantage(formData.ko_structure, formData.mode) && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="ko_group_winner_advantage"
                      checked={formData.ko_group_winner_advantage}
                      onChange={handleChange}
                    />
                    <span style={{ fontWeight: 'bold' }}>Vorteil für Gruppensieger</span>
                  </label>
                </div>
              )}


              {(formData.ko_draw_method === 'pot_system' || formData.ko_draw_method === 'full_random') && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Zufalls-Seed (optional)
                  </label>
                  <input
                    type="number"
                    name="ko_random_seed"
                    value={formData.ko_random_seed || ''}
                    onChange={handleChange}
                    min={0}
                    placeholder="Leer = automatisch"
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#666' }}>
                    Optional: Fester Seed für reproduzierbare Zufallsauslosungen
                  </p>
                </div>
              )}

              {formData.ko_draw_method === 'manual' && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#856404' }}>
                    Bei manueller Auslosung werden die Paarungen der ersten KO-Runde erst nach dem Hinzufügen der Teilnehmer festgelegt. 
                    Sie können die Paarungen dann im Turnier-Bereich "Spiele" oder "KO-Phase" manuell definieren.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button
            type="submit"
            disabled={loading || loadingTournament}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              background: (loading || loadingTournament) ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (loading || loadingTournament) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Aktualisiere...' : 'Turnier aktualisieren'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
            disabled={loadingTournament}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loadingTournament ? 'not-allowed' : 'pointer'
            }}
          >
            Abbrechen
          </button>
        </div>
      </form>
        )}
      </div>

      {/* Rechte Seite - Erklärungen */}
      <div style={{ flex: 1, maxWidth: '400px' }}>
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div style={{ background: '#e7f3ff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #86cfff', marginBottom: '1rem' }}>
            <h2 style={{ marginTop: 0, color: '#004085' }}>Turnier bearbeiten</h2>
            <p style={{ color: '#004085', marginBottom: '1rem' }}>
              Hier können Sie die Einstellungen des Turniers anpassen. Bitte beachten Sie die folgenden Hinweise:
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#004085' }}>
              <li style={{ marginBottom: '0.5rem' }}>Änderungen an Basisinformationen (Name, Beschreibung, Daten) sind jederzeit möglich.</li>
              <li style={{ marginBottom: '0.5rem' }}>Konfigurationsänderungen löschen automatisch alle Gruppen und Spiele.</li>
              <li style={{ marginBottom: '0.5rem' }}>Nach Konfigurationsänderungen müssen Gruppen und Spiele neu generiert werden.</li>
              <li style={{ marginBottom: '0.5rem' }}>Teilnehmer werden nicht gelöscht, bleiben aber ohne Gruppen-Zuordnung.</li>
            </ul>
          </div>
          <div style={{ background: '#fff3cd', padding: '1.5rem', borderRadius: '8px', border: '1px solid #ffc107' }}>
            <h3 style={{ marginTop: 0, color: '#856404' }}>Aktueller Modus: {currentMode.title}</h3>
            <p style={{ color: '#856404', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{currentMode.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
