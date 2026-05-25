// Edit Tournament Page
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tournamentService } from '../services/tournamentService';
import { authService } from '../services/authService';
import { participantService } from '../services/participantService';
import { qualificationService } from '../services/qualificationService';
import { locationService } from '../services/locationService';
import { Participant, LeagueVariant, KOStartRound, QualificationPlan, Location, KOStructure, KODrawMethod, Tournament } from '../types';
import { formatApiErrorMessage } from '../utils/apiErrors';
import { sanitizeTournamentWritePayload } from '../utils/tournamentPayload';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from '../components/ui';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'phosphor-react';
import TournamentModeVisualization from '../components/tournament/TournamentModeVisualization';

export default function EditTournament() {
  type KODrawModeValue = 'random_first_round' | 'random_each_round' | 'predefined_slots' | 'cross' | 'draw';

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tournamentId = id ? parseInt(id) : 0;
  const [loading, setLoading] = useState(false);
  const [loadingTournament, setLoadingTournament] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [qualificationPlan, setQualificationPlan] = useState<QualificationPlan | null>(null);
  const [loadingQualificationPlan, setLoadingQualificationPlan] = useState(false);
  
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
    ko_participants: 4,  // Legacy
    ko_first_round_size: 4,  // Legacy
    ko_start_round: null as KOStartRound | null,
    ko_fallback_qualifiers: null as Array<{position: number; count: number; selection: 'best'}> | null,
    ko_distribution: 'random_first_round' as KODrawModeValue,  // Deprecated, kept for backward compatibility
    ko_structure: null as KOStructure | null,
    ko_draw_method: null as KODrawMethod | null,
    ko_third_place_match: false,
    ko_group_winner_advantage: false,
    ko_block_same_group: true,
    ko_block_same_position: false,
    ko_random_seed: null as number | null,
    league_scoring_system: null as 'points' | 'difference' | 'wins' | null,
    tie_breaking_rules: [] as string[],
    league_variant: 'classic' as LeagueVariant,
    league_rounds_multiplier: 1,
    is_template: false,
    seeded_participant_ids: [] as number[],
    location_id: null as number | null,
    spielfeld_assignment_mode: 'random' as 'random' | 'group_fixed' | 'group_random',
  });
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    if (!id || tournamentId <= 0) {
      setLoadingTournament(false);
      setError('Ungültige Turnier-ID');
      return;
    }
    loadTournament();
  }, [navigate, tournamentId, id]);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const list = await locationService.getAll();
        setLocations(list);
      } catch {
        setLocations([]);
      }
    };
    loadLocations();
  }, []);

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
        ko_participants: tournament.ko_participants || 4,  // Legacy
        ko_first_round_size: tournament.ko_first_round_size || 4,  // Legacy
        ko_start_round: tournament.ko_start_round || null,
        ko_fallback_qualifiers: tournament.ko_fallback_qualifiers || null,
        ko_distribution: normalizeDrawMode(tournament.ko_distribution),
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
        location_id: tournament.location_id ?? null,
        spielfeld_assignment_mode: (tournament.spielfeld_assignment_mode as 'random' | 'group_fixed' | 'group_random') || 'random',
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

  // Calculate qualification plan when groups_count or ko_start_round changes
  useEffect(() => {
    if (formData.mode === 'combined' && formData.has_group_phase && formData.groups_count > 0 && formData.ko_start_round) {
      const calculatePlan = async () => {
        try {
          setLoadingQualificationPlan(true);
          const plan = await qualificationService.calculateQualificationPlan(
            formData.groups_count,
            formData.ko_start_round!
          );
          setQualificationPlan(plan);
          // Set ko_fallback_qualifiers in formData
          setFormData(prev => ({
            ...prev,
            ko_fallback_qualifiers: plan.fallback_rules.length > 0 ? plan.fallback_rules : null,
            ko_participants: plan.required_participants,  // Set legacy field for backward compatibility
            ko_first_round_size: plan.required_participants,  // Set legacy field
          }));
        } catch (err) {
          console.error('Failed to calculate qualification plan:', err);
          setQualificationPlan(null);
        } finally {
          setLoadingQualificationPlan(false);
        }
      };
      calculatePlan();
    } else {
      setQualificationPlan(null);
    }
  }, [formData.mode, formData.has_group_phase, formData.groups_count, formData.ko_start_round]);

  // Migrate legacy data: if ko_start_round is null but ko_first_round_size is set
  useEffect(() => {
    if (formData.mode === 'combined' && !formData.ko_start_round && formData.ko_first_round_size) {
      let migratedRound: KOStartRound | null = null;
      if (formData.ko_first_round_size === 32) migratedRound = 'round_of_32';
      else if (formData.ko_first_round_size === 16) migratedRound = 'round_of_16';
      else if (formData.ko_first_round_size === 8) migratedRound = 'quarterfinal';
      else if (formData.ko_first_round_size === 4) migratedRound = 'semifinal';
      else if (formData.ko_first_round_size === 2) migratedRound = 'final';
      
      if (migratedRound) {
        setFormData(prev => ({
          ...prev,
          ko_start_round: migratedRound,
        }));
      }
    }
  }, [formData.mode, formData.ko_start_round, formData.ko_first_round_size]);


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
      const updateBody = sanitizeTournamentWritePayload({
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
        ko_participants: (formData.has_ko_phase && formData.mode === 'combined') ? formData.ko_participants : 0,  // Legacy
        ko_first_round_size: formData.has_ko_phase ? parseInt(formData.ko_first_round_size.toString()) : undefined,  // Legacy
        ko_start_round: formData.has_ko_phase && formData.mode === 'combined' ? (formData.ko_start_round as any) : undefined,
        ko_fallback_qualifiers: formData.has_ko_phase && formData.mode === 'combined' ? (formData.ko_fallback_qualifiers as any) : undefined,
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
        location_id: formData.location_id || undefined,
        spielfeld_assignment_mode: formData.has_group_phase ? formData.spielfeld_assignment_mode : undefined,
      });
      await tournamentService.update(tournamentId, updateBody as Partial<Tournament>);
      navigate(`/tournaments/${tournamentId}`);
    } catch (err: any) {
      setError(formatApiErrorMessage(err, 'Fehler beim Aktualisieren des Turniers'));
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
    'diff': 'Differenz',
    'goals_for': 'LF',
    'direct_encounter': 'Direktbegegnung',
    'decision_match': 'Entscheidungsspiel'
  };

  const koStartRoundLabels: Record<string, string> = {
    round_of_32: 'Runde der 32',
    round_of_16: 'Runde der 16',
    quarterfinal: 'Viertelfinale',
    semifinal: 'Halbfinale',
    final: 'Finale'
  };

  const groupDistributionLabels: Record<string, string> = {
    random: 'Zufällig',
    seeded: 'Gesetzt'
  };

  // Verfügbare Gleichstandsregeln (abhängig von Wertungssystem)
  const getAvailableTieBreakingRules = () => {
    return ['wins', 'diff', 'goals_for', 'direct_encounter', 'decision_match'];
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

  const normalizeDrawMode = (value: string | null | undefined): KODrawModeValue => {
    if (!value || value === 'cross' || value === 'draw') {
      return 'random_first_round';
    }
    return value as KODrawModeValue;
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
      value: 'overall_seeding', 
      label: 'Gesamt-Seeding', 
      description: 'Teilnehmer werden nach Ranking/Seeding gepaart (Bester vs. Schlechtester).' 
    },
    { 
      value: 'random_each_round', 
      label: 'Jede Runde neu zufällig', 
      description: 'Nach jeder KO-Runde werden die Sieger neu ausgelost.' 
    },
    { 
      value: 'pot_system', 
      label: 'Topf-System (Stärketöpfe)', 
      description: 'Teilnehmer werden in Stärketöpfe eingeteilt (z.B. basierend auf Weltrangliste oder vorherigen Leistungen) und dann mit Regeln ausgelost. Stärkere Teilnehmer treffen später aufeinander.' 
    },
    { 
      value: 'predefined_bracket', 
      label: 'Vorgegebener Turnierbaum', 
      description: 'Fester KO-Baum; Teilnehmer belegen die Slots.' 
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
    },
    { 
      value: 'random_each_round', 
      label: 'Jede Runde neu zufällig', 
      description: 'Nach jeder KO-Runde werden die Sieger neu ausgelost (kein Auto-Advance ohne Aktion).' 
    },
    { 
      value: 'manual', 
      label: 'Manuelle Paarungen', 
      description: 'Paarungen werden nach Abschluss der Gruppenphase mit den qualifizierten Teilnehmern festgelegt. Runde für Runde befüllbar (Runde 1 speichern, dann Runde 2, …).' 
    }
  ];

  const koDrawModeOptions = [
    {
      value: 'random_first_round',
      label: 'a) Erste Runde zufällig, danach fester Turnierbaum',
      description: 'Die erste KO-Runde wird ausgelost. Ab dann bleibt der Baum fest (klassischer Bracket-Flow).'
    },
    {
      value: 'random_each_round',
      label: 'b) Jede Runde neu zufällig',
      description: 'Nach jeder Runde werden die Sieger neu ausgelost. Finale ohne weitere Auslosung.'
    },
    {
      value: 'predefined_slots',
      label: 'c) Fester Turnierbaum mit Slot-Bezeichnungen',
      description: 'Der Baum ist von Anfang an fix. Spätere Runden zeigen nur Slot-Bezeichnungen, bis die Qualifikanten feststehen.'
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
  const needsDrawMethod = (structure: string | null, _drawMethod: string | null) => {
    // Wenn keine Struktur ausgewählt, keine Auslosung nötig
    if (!structure) return false;
    // Bei manuellen Paarungen ist die Auslosung optional (wird später im Turnier-Bereich gemacht)
    // Aber wir zeigen sie trotzdem an, damit der Benutzer "Manuelle Paarungen" auswählen kann
    // Die Auslosung ist nur required, wenn nicht "manual" ausgewählt ist
    return true;
  };

  const needsGroupWinnerAdvantage = (_structure: string | null, _mode: string) => {
    // Option entfernt für Kombi-Modus
    // Nur relevant für spezifische gruppenphase-integrierte Strukturen (die nicht mehr verfügbar sind)
    return false;
  };

  const getKoStructureLabel = (value: string | null) => {
    if (!value) return null;
    const found = koStructureOptions.find(o => o.value === value);
    return found ? found.label : value;
  };

  const getKoDrawMethodLabel = (value: string | null) => {
    if (!value) return null;
    const list = formData.mode === 'combined' ? combinedDrawMethods : koOnlyDrawMethods;
    const found = list.find(o => o.value === value);
    return found ? found.label : value;
  };

  const tieRulesLabel = (formData.tie_breaking_rules || [])
    .map((rule) => tieBreakingRuleLabels[rule] || rule)
    .join(' > ');

  const groupSettingsSummary: string[] = [];
  if (formData.has_group_phase) {
    if (formData.groups_count) {
      groupSettingsSummary.push(`Gruppen: ${formData.groups_count}`);
    }
    if (formData.participants_per_group) {
      groupSettingsSummary.push(`Teilnehmer pro Gruppe: ${formData.participants_per_group}`);
    }
    if (formData.group_distribution) {
      const label = groupDistributionLabels[formData.group_distribution] || formData.group_distribution;
      groupSettingsSummary.push(`Verteilung: ${label}`);
    }
    if (formData.league_scoring_system) {
      groupSettingsSummary.push(`Wertung: ${formData.league_scoring_system === 'points' ? 'Punkte' : 'Differenz'}`);
    }
    if (tieRulesLabel) {
      groupSettingsSummary.push(`Gleichstandsregeln: ${tieRulesLabel}`);
    }
  }

  const koSettingsSummary: string[] = [];
  if (formData.has_ko_phase) {
    if (formData.ko_start_round) {
      const label = koStartRoundLabels[formData.ko_start_round] || formData.ko_start_round;
      koSettingsSummary.push(`KO-Start: ${label}`);
    } else if (formData.ko_first_round_size) {
      koSettingsSummary.push(`KO-Startgroesse: ${formData.ko_first_round_size}`);
    }
    const structureLabel = getKoStructureLabel(formData.ko_structure);
    if (structureLabel) {
      koSettingsSummary.push(`Struktur: ${structureLabel}`);
    }
    const drawLabel = getKoDrawMethodLabel(formData.ko_draw_method);
    if (drawLabel) {
      koSettingsSummary.push(`Auslosung: ${drawLabel}`);
    }
  }

  return (
    <div className="p-8 flex gap-8 max-w-[1400px] mx-auto bg-background min-h-screen">
      {/* Linke Seite - Formular */}
      <div className="flex-1">
        <div className="flex justify-between mb-8 items-center">
          <h1 className="m-0 text-foreground">Turnier bearbeiten</h1>
          <Button variant="secondary" onClick={() => navigate(`/tournaments/${tournamentId}`)}>
            <ArrowLeft size={20} className="mr-2 align-middle" />
            Zurück
          </Button>
        </div>

        {loadingTournament && (
          <div className="p-8 text-center text-muted-foreground">Turnier wird geladen...</div>
        )}

        {error && (
          <div className="p-4 bg-destructive/20 text-destructive rounded-lg mb-4 border border-destructive">
            {error}
          </div>
        )}

        {!loadingTournament && (
          <div className="mb-6 p-4 bg-warning/20 rounded-lg border border-warning">
            <p className="m-0 text-sm text-warning">
              <strong>Hinweis:</strong> Wenn Sie Konfigurationseinstellungen ändern (z.B. Modus, Anzahl Gruppen, KO-Struktur), werden alle vorhandenen Gruppen und Spiele gelöscht. 
              Sie müssen diese nach dem Speichern neu generieren.
            </p>
          </div>
        )}

        {!loadingTournament && (
        <Card>
          <CardContent className="p-8">
        <form onSubmit={handleSubmit}>
          <Input
            label="Turnier-Name *"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <Textarea
            label="Beschreibung"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4 mb-6">
            <Input
              label="Startdatum *"
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
            />
            <Input
              label="Enddatum"
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
            />
          </div>

          <div className="mb-6">
            <label className="block mb-2 font-bold text-foreground">
              Spielort (optional)
            </label>
            <select
              name="location_id"
              value={formData.location_id ?? ''}
              onChange={(e) => setFormData(prev => ({ ...prev, location_id: e.target.value === '' ? null : Number(e.target.value) }))}
              className="w-full p-3 text-base bg-muted text-foreground border border-border rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">— Kein Spielort —</option>
              {(locations ?? []).map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            {formData.location_id != null && (formData.mode === 'round_robin' || formData.mode === 'combined') && (
              <div className="mt-4">
                <label className="block mb-2 font-bold text-foreground">
                  Spielfeld-Zuweisung (Gruppenphase)
                </label>
                <select
                  name="spielfeld_assignment_mode"
                  value={formData.spielfeld_assignment_mode}
                  onChange={(e) => setFormData(prev => ({ ...prev, spielfeld_assignment_mode: e.target.value as 'random' | 'group_fixed' | 'group_random' }))}
                  className="w-full p-3 text-base bg-muted text-foreground border border-border rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="random">Gesamtspielplan (fair) – rundenbasiert über alle Gruppen</option>
                  <option value="group_fixed">Gruppen Zuweisung Fix – pro Gruppe ein Spielfeld (im Gruppen-Tab festlegen)</option>
                  <option value="group_random">Gruppe Zufällig – jeder Gruppe zufällig ein Spielfeld</option>
                </select>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block mb-2 font-bold text-foreground">
              Turnier-Modus *
            </label>
            <select
              name="mode"
              value={formData.mode}
              onChange={handleChange}
              required
              className="w-full p-3 text-base bg-muted text-foreground border border-border rounded-md outline-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="round_robin">Liga</option>
              <option value="knockout">KO-Phase</option>
              <option value="combined">Kombiniert</option>
            </select>
          </div>

        {(formData.mode === 'round_robin' || formData.mode === 'combined') && (
          <div className="mb-4 ml-0">
            <h3 className="mb-2 font-bold text-foreground">Gruppenphase</h3>
            <div className="ml-8">
              <Input
                label="Anzahl Gruppen"
                type="number"
                name="groups_count"
                value={formData.groups_count}
                onChange={handleChange}
                min={1}
              />
            
            {formData.groups_count > 1 && (
              <>
                <label className="block mt-4 mb-2 text-foreground">
                  Auslosungsart
                </label>
                <select
                  name="group_distribution"
                  value={formData.group_distribution}
                  onChange={handleChange}
                  className="w-full p-2 text-base border border-border rounded-md bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="random">Zufällig (Random)</option>
                  <option value="seeded">Gesetzt (Seeded)</option>
                </select>

                {formData.group_distribution === 'seeded' && (
                  <div className="mt-4 p-4 bg-card rounded-lg border border-border">
                    <label className="block mb-2 font-bold text-foreground">
                      Gesetzte Spieler auswählen *
                    </label>
                    <p className="mb-3 text-sm text-muted-foreground">
                      Wählen Sie die Spieler aus, die vor der Auslosung in Gruppen eingeteilt werden sollen. Die anderen Spieler werden dann zufällig zugeteilt.
                    </p>
                    {loadingParticipants ? (
                      <div className="p-4 text-center text-muted-foreground">Lade Teilnehmer...</div>
                    ) : allParticipants.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Keine Teilnehmer verfügbar. Bitte erstellen Sie zuerst Teilnehmer in der Teilnehmer-Verwaltung.
                      </div>
                    ) : (
                      <>
                        <div className="max-h-[300px] overflow-y-auto border border-border rounded-lg p-2">
                          {allParticipants.map(participant => {
                            const isSelected = formData.seeded_participant_ids.includes(participant.id);
                            return (
                              <label
                                key={participant.id}
                                className={cn(
                                  "flex items-center gap-2 p-2 cursor-pointer rounded-lg mb-1",
                                  isSelected && "bg-primary/10"
                                )}
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
                                <span className="text-foreground">
                                  {participant.first_name} {participant.last_name}
                                  {participant.club && ` (${participant.club})`}
                                  {participant.nickname && ` - "${participant.nickname}"`}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <p className={cn(
                          "mt-2 text-sm",
                          formData.seeded_participant_ids.length === 0 ? "text-destructive" : "text-muted-foreground"
                        )}>
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

            <div className="mt-6">
              <label className="block mb-2 font-bold text-foreground">
                Ligatabelle Wertung *
              </label>
              <select
                name="league_scoring_system"
                value={formData.league_scoring_system || ''}
                onChange={handleChange}
                required
                className="w-full p-2 text-base border border-border rounded-md bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">-- Bitte wählen --</option>
                <option value="points">Punkte</option>
                <option value="difference">Differenz</option>
              </select>
              {formData.league_scoring_system === 'points' && (
                <p className="mt-2 text-sm text-muted-foreground italic">
                  Standard-Punkteverteilung: Sieg 3, Remis 1, Niederlage 0.
                </p>
              )}
            </div>

            {formData.mode === 'round_robin' && (
              <>
                <div className="mt-6">
                  <label className="block mb-2 font-bold text-foreground">
                    Liga-Variante
                  </label>
                  <select
                    name="league_variant"
                    value={formData.league_variant}
                    onChange={handleChange}
                    className="w-full p-2 text-base border border-border rounded-md bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="classic">Klassische Liga (Round Robin)</option>
                    <option value="double">Doppelte Liga</option>
                    <option value="multiple">Mehrfache Liga</option>
                  </select>
                  <p className="mt-2 text-sm text-muted-foreground italic">
                    {formData.league_variant === 'classic' && 'Jeder gegen jeden einmal (Standard Round Robin)'}
                    {formData.league_variant === 'double' && 'Jeder gegen jeden zweimal (2x Round Robin)'}
                    {formData.league_variant === 'multiple' && 'Jeder gegen jeden mehrfach (konfigurierbarer Multiplikator)'}
                  </p>
                </div>

                {formData.league_variant === 'multiple' && (
                  <div className="mt-4">
                    <label className="block mb-2 font-bold text-foreground">
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
                      className="w-full p-2 text-base border border-border rounded-md bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <p className="mt-2 text-sm text-muted-foreground italic">
                      Wie oft die komplette Round-Robin-Runde wiederholt wird (min: 2, max: 10)
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="mt-4">
              <label className="block mb-2 font-bold text-foreground">
                Gleichstandsregeln *
              </label>
              
              {/* Verfügbare Regeln (Checkboxen mit exklusiver Logik für Entscheidungsspiel) */}
              <div className="mb-4 p-3 bg-card rounded-lg border border-border">
                <p className="m-0 mb-2 text-sm font-bold">Verfügbare Regeln:</p>
                <div className="flex flex-col gap-2">
                  {getAvailableTieBreakingRules().map(rule => {
                    const isDecisionMatch = rule === 'decision_match';
                    const hasDecisionMatch = formData.tie_breaking_rules.includes('decision_match');
                    const hasOtherRules = formData.tie_breaking_rules.some(r => r !== 'decision_match');
                    const isChecked = formData.tie_breaking_rules.includes(rule);
                    const isDisabled = (isDecisionMatch && hasOtherRules) || (!isDecisionMatch && hasDecisionMatch);
                    
                    return (
                      <label 
                        key={rule} 
                        className={cn(
                          "flex items-center gap-2",
                          isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                        )}
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
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    Bei Gleichstand wird ein Entscheidungsspiel generiert.
                  </p>
                )}
              </div>

              {/* Ausgewählte Regeln mit Reihenfolge (nur wenn kein Entscheidungsspiel) */}
              {formData.tie_breaking_rules.length > 0 && !formData.tie_breaking_rules.includes('decision_match') && (
                <div className="p-3 bg-muted rounded-lg border border-border">
                  <p className="m-0 mb-2 text-sm font-bold text-foreground">Reihenfolge (1. = höchste Priorität):</p>
                  <div className="flex flex-col gap-2">
                    {formData.tie_breaking_rules.map((rule, index) => (
                      <div key={`${rule}-${index}`} className="flex items-center gap-2 p-2 bg-card rounded-lg border border-border">
                        <span className="min-w-[2rem] font-bold text-muted-foreground">{index + 1}.</span>
                        <span className="flex-1">{tieBreakingRuleLabels[rule]}</span>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveTieBreakingRule(index, 'up')}
                            disabled={index === 0}
                            className={cn(
                              "w-6 h-5 p-0 text-xs border-none rounded-sm",
                              index === 0 
                                ? "bg-muted-foreground/50 text-white cursor-not-allowed" 
                                : "bg-success text-white cursor-pointer hover:bg-success/90"
                            )}
                            title="Nach oben"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTieBreakingRule(index, 'down')}
                            disabled={index === formData.tie_breaking_rules.length - 1}
                            className={cn(
                              "w-6 h-5 p-0 text-xs border-none rounded-sm",
                              index === formData.tie_breaking_rules.length - 1 
                                ? "bg-muted-foreground/50 text-white cursor-not-allowed" 
                                : "bg-success text-white cursor-pointer hover:bg-success/90"
                            )}
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
          <div className="mb-4 ml-0 p-4 bg-card rounded-lg border border-border">
            <h3 className="mb-2 font-bold text-foreground">
              {formData.mode === 'knockout' ? 'KO-Phase (Reine Ausscheidungsrunde)' : 'KO-Phase (Nach Gruppenphase)'}
            </h3>
            {formData.mode === 'combined' && (
              <p className="mb-4 text-sm text-muted-foreground italic">
                Hinweis: Ligatabelle Wertung und Gleichstandsregeln werden in der Gruppenphase konfiguriert.
              </p>
            )}
            <div className="ml-4">
              {formData.mode === 'combined' && (
                <div className="mb-4">
                  <label className="block mb-2 font-bold text-foreground">
                    KO-Start-Runde *
                  </label>
                  <select
                    name="ko_start_round"
                    value={formData.ko_start_round || ''}
                    onChange={handleChange}
                    required
                    className="w-full p-2 text-base border border-border rounded-md bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">-- Bitte wählen --</option>
                    <option value="round_of_32">Sechzehntelfinale (32 Teilnehmer)</option>
                    <option value="round_of_16">Achtelfinale (16 Teilnehmer)</option>
                    <option value="quarterfinal">Viertelfinale (8 Teilnehmer)</option>
                    <option value="semifinal">Halbfinale (4 Teilnehmer)</option>
                    <option value="final">Finale (2 Teilnehmer)</option>
                  </select>
                  
                  {/* Qualification Plan Display */}
                  {loadingQualificationPlan && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Berechne Qualifikationsplan...
                    </p>
                  )}
                  {qualificationPlan && !loadingQualificationPlan && (
                    <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
                      <div className="text-sm font-bold text-foreground mb-2">
                        Qualifikationsplan
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {qualificationPlan.required_participants} Teilnehmer gesamt
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Basis: {qualificationPlan.basis_per_group} Teilnehmer pro Gruppe
                      </div>
                      {qualificationPlan.fallback_rules.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-bold text-foreground mb-1">
                            Zusätzliche Qualifikanten:
                          </div>
                          {qualificationPlan.fallback_rules.map((rule, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground">
                              • {rule.count}x bester {rule.position}. Platzierter
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {formData.mode === 'knockout' && (
                <div className="mb-4 p-3 bg-muted rounded-lg border border-border">
                  <p className="m-0 text-sm text-foreground">
                    Die Teilnehmeranzahl wird automatisch basierend auf den hinzugefügten Teilnehmern ermittelt. 
                    Der Turnierbaum wird erstellt, sobald Teilnehmer zum Turnier hinzugefügt wurden.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-2 font-bold text-foreground">
                    Turnierstruktur *
                  </label>
                  <select
                    name="ko_structure"
                    value={formData.ko_structure || ''}
                    onChange={handleChange}
                    required
                    className="w-full p-2 text-base border border-border rounded-md bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">-- Bitte wählen --</option>
                    {getAllowedKOStructures(formData.mode).map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-start pt-7">
                  {formData.ko_structure && (
                    <p className="m-0 text-sm text-muted-foreground italic">
                      {getAllowedKOStructures(formData.mode).find(o => o.value === formData.ko_structure)?.description}
                    </p>
                  )}
                </div>
              </div>

              {needsDrawMethod(formData.ko_structure, formData.ko_draw_method) && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block mb-2 font-bold text-foreground">
                      Auslosung {formData.ko_draw_method !== 'manual' ? '*' : ''}
                    </label>
                    <select
                      name="ko_draw_method"
                      value={formData.ko_draw_method || ''}
                      onChange={handleChange}
                      required={formData.ko_draw_method !== 'manual'}
                      className="w-full p-2 text-base border border-border rounded-md bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">-- Bitte wählen --</option>
                      {getAllowedKODrawMethods(formData.mode, formData.has_group_phase).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-start pt-7">
                    {formData.ko_draw_method && (
                      <p className="m-0 text-sm text-muted-foreground italic">
                        {getAllowedKODrawMethods(formData.mode, formData.has_group_phase).find(o => o.value === formData.ko_draw_method)?.description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* KO-Auslosungsmodus nur anzeigen, wenn nicht manuelle Paarungen */}
              {formData.ko_draw_method !== 'manual' && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block mb-2 font-bold text-foreground">
                      KO-Auslosungsmodus *
                    </label>
                    <select
                      name="ko_distribution"
                      value={formData.ko_distribution || 'random_first_round'}
                      onChange={handleChange}
                      required
                      className="w-full p-2 text-base border border-border rounded-md bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {koDrawModeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-start pt-7">
                    <p className="m-0 text-sm text-muted-foreground italic">
                      {koDrawModeOptions.find(o => o.value === formData.ko_distribution)?.description}
                    </p>
                  </div>
                </div>
              )}

              {formData.has_group_phase && formData.ko_draw_method && (
                <div className="mb-4 p-3 bg-card rounded-lg border border-border">
                  <label className="block mb-2 font-bold text-foreground">
                    Auslosungs-Restriktionen
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      name="ko_block_same_group"
                      checked={formData.ko_block_same_group}
                      onChange={handleChange}
                    />
                    <span>Keine Paarung aus der gleichen Gruppe</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="ko_block_same_position"
                      checked={formData.ko_block_same_position}
                      onChange={handleChange}
                    />
                    <span>Keine Paarung mit gleicher Gruppenplatzierung</span>
                  </label>
                </div>
              )}


              {needsGroupWinnerAdvantage(formData.ko_structure, formData.mode) && (
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="ko_group_winner_advantage"
                      checked={formData.ko_group_winner_advantage}
                      onChange={handleChange}
                    />
                    <span className="font-bold text-foreground">Vorteil für Gruppensieger</span>
                  </label>
                </div>
              )}


              {(formData.ko_draw_method === 'pot_system' || formData.ko_draw_method === 'full_random') && (
                <div className="mb-4">
                  <label className="block mb-2 font-bold text-foreground">
                    Zufalls-Seed (optional)
                  </label>
                  <input
                    type="number"
                    name="ko_random_seed"
                    value={formData.ko_random_seed || ''}
                    onChange={handleChange}
                    min={0}
                    placeholder="Leer = zufällig"
                    className="w-full p-2 text-base border border-border rounded-md bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Optional: Fester Seed für reproduzierbare Zufallsauslosungen
                  </p>
                </div>
              )}

              {formData.ko_draw_method === 'manual' && (
                <div className="mb-4 p-4 bg-warning/20 rounded-lg border border-warning">
                  <p className="m-0 mb-4 text-sm text-warning">
                    {formData.mode === 'combined'
                      ? 'Paarungen werden nach Abschluss der Gruppenphase mit den qualifizierten Teilnehmern festgelegt (Spiele → KO-Phase). Runde 1 speichern, dann Runde 2, …'
                      : 'Paarungen werden im Turnier-Bereich "Spiele" / "KO-Phase" manuell festgelegt (Runde 1 speichern, dann Runde 2, …).'}
                  </p>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Bei Änderung der Auslosungsart muss das KO-Bracket ggf. neu generiert werden (Spiele → KO-Phase).
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          <Button
            type="submit"
            variant="success"
            disabled={loading || loadingTournament}
          >
            {loading ? 'Aktualisiere...' : 'Turnier aktualisieren'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
            disabled={loadingTournament}
          >
            Abbrechen
          </Button>
        </div>
      </form>
      </CardContent>
      </Card>
        )}
      </div>

      {/* Rechte Seite - Erklärungen */}
      <div className="flex-1 max-w-[400px]">
        <div className="sticky top-8">
          <Card className="mb-4 border-primary">
            <CardHeader>
              <CardTitle className="mt-0 text-primary">Turnier bearbeiten</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Hier können Sie die Einstellungen des Turniers anpassen. Bitte beachten Sie die folgenden Hinweise:
              </p>
              <ul className="m-0 pl-6 text-muted-foreground">
                <li className="mb-2">Änderungen an Basisinformationen (Name, Beschreibung, Daten) sind jederzeit möglich.</li>
                <li className="mb-2">Konfigurationsänderungen löschen automatisch alle Gruppen und Spiele.</li>
                <li className="mb-2">Nach Konfigurationsänderungen müssen Gruppen und Spiele neu generiert werden.</li>
                <li className="mb-2">Teilnehmer werden nicht gelöscht, bleiben aber ohne Gruppen-Zuordnung.</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="mt-0 text-warning">Aktueller Modus: {currentMode.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2 text-sm">{currentMode.description}</p>
            </CardContent>
          </Card>
          <Card className="mt-4 border-warning">
            <CardHeader>
              <CardTitle className="mt-0 text-warning">Aktuelle Einstellungen</CardTitle>
            </CardHeader>
            <CardContent>
              {groupSettingsSummary.length > 0 ? (
                <>
                  <div className="font-bold text-foreground mb-2">Gruppenphase</div>
                  <ul className="m-0 pl-6 text-muted-foreground text-sm">
                    {groupSettingsSummary.map((item) => (
                      <li key={item} className="mb-1.5">{item}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="text-muted-foreground mb-3">Keine Gruppenphase aktiv.</div>
              )}
              {koSettingsSummary.length > 0 ? (
                <>
                  <div className="font-bold text-foreground mt-4 mb-2">KO-Phase</div>
                  <ul className="m-0 pl-6 text-muted-foreground text-sm">
                    {koSettingsSummary.map((item) => (
                      <li key={item} className="mb-1.5">{item}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="text-muted-foreground mt-3">Keine KO-Phase aktiv.</div>
              )}
              <div className="mt-4">
                <TournamentModeVisualization
                  mode={formData.mode}
                  hasGroupPhase={formData.has_group_phase}
                  hasKoPhase={formData.has_ko_phase}
                  groupsCount={formData.groups_count}
                  participantsPerGroup={formData.participants_per_group}
                  groupDistribution={formData.group_distribution}
                  koStartRound={formData.ko_start_round}
                  koStructure={formData.ko_structure}
                  koDrawMethod={formData.ko_draw_method}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
