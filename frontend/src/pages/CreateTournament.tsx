// Create Tournament Page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tournamentService } from '../services/tournamentService';
import { authService } from '../services/authService';
import { qualificationService } from '../services/qualificationService';
import { locationService } from '../services/locationService';
import { Tournament, LeagueVariant, KOStartRound, QualificationPlan, Location, KOStructure, TournamentModeVariant, KOPairingVariant } from '../types';
import { Button, Card, Input, Textarea } from '../components/ui';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'phosphor-react';
import TournamentModeVisualization from '../components/tournament/TournamentModeVisualization';
import { MODE_VARIANTS, PAIRING_VARIANTS } from '../domain/tournamentModeMatrix';
import { koStructureIncludesThirdPlace } from '../domain/koThirdPlace';
import { formatApiErrorMessage } from '../utils/apiErrors';
import { sanitizeTournamentWritePayload } from '../utils/tournamentPayload';

export default function CreateTournament() {
  type KODrawModeValue = 'random_first_round' | 'random_each_round' | 'predefined_slots' | 'cross' | 'draw';

  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Tournament[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_loadingTemplates, setLoadingTemplates] = useState(false);
  const [qualificationPlan, setQualificationPlan] = useState<QualificationPlan | null>(null);
  const [loadingQualificationPlan, setLoadingQualificationPlan] = useState(false);
  const [wizardMode, setWizardMode] = useState(true);
  const [wizardStep, setWizardStep] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    mode: 'round_robin' as 'round_robin' | 'knockout' | 'combined',
    mode_variant: 'L1' as TournamentModeVariant,
    has_group_phase: true,
    groups_count: 2,
    participants_per_group: null as number | null,
    group_distribution: 'random' as 'random' | 'seeded' | 'manual',
    has_ko_phase: false,
    ko_participants: 4,  // Legacy
    ko_first_round_size: 4,  // Legacy
    ko_start_round: null as KOStartRound | null,
    ko_fallback_qualifiers: null as Array<{position: number; count: number; selection: 'best'}> | null,
    ko_distribution: 'random_first_round' as KODrawModeValue,  // Deprecated, kept for backward compatibility
    ko_pairing_mode: 'P1' as KOPairingVariant,
    ko_structure: null as KOStructure | null,
    ko_draw_method: null as 'fixed_cross' | 'same_position_cross' | 'overall_seeding' | 'pot_system' | 'full_random' | 'random_each_round' | 'bonus_draw_for_winners' | 'predefined_bracket' | 'manual' | null,
    ko_third_place_match: false,
    ko_group_winner_advantage: false,
    ko_block_same_group: true,
    ko_block_same_position: false,
    ko_random_seed: null as number | null,
    league_scoring_system: null as 'points' | 'difference' | 'wins' | null,
    league_points_win: 3,
    league_points_draw: 1,
    league_points_loss: 0,
    tie_breaking_rules: [] as string[],
    head_referee: '',
    scorekeeper: '',
    league_variant: 'classic' as LeagueVariant,
    league_rounds_multiplier: 1,
    is_template: false,
    visibility: 'public' as 'public' | 'shared' | 'private',
    seeded_participant_ids: [] as number[],
    location_id: null as number | null,
    spielfeld_assignment_mode: 'random' as 'random' | 'group_fixed' | 'group_random',
  });
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  // Load locations on mount
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locationList = await locationService.getAll();
        setLocations(locationList);
      } catch (err) {
        console.warn('Spielorte konnten nicht geladen werden:', err);
        setLocations([]);
      }
    };
    loadLocations();
  }, []);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const templateList = await tournamentService.getTemplates();
        setTemplates(templateList);
      } catch (err: any) {
        if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
          console.warn('Templates konnten nicht geladen werden (Netzwerkfehler). Die Seite funktioniert weiterhin ohne Vorlagen.');
        } else {
          const errorMsg = formatApiErrorMessage(err, 'Unbekannter Fehler');
          console.warn(`Templates konnten nicht geladen werden (${errorMsg}). Die Seite funktioniert weiterhin ohne Vorlagen.`);
        }
        setTemplates([]);
      } finally {
        setLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

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

  // Handle exclusive logic: decision_match vs other rules
  useEffect(() => {
    const hasDecisionMatch = formData.tie_breaking_rules.includes('decision_match');
    const hasOtherRules = formData.tie_breaking_rules.some(r => r !== 'decision_match');

    if (hasDecisionMatch && hasOtherRules) {
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
          setFormData(prev => ({
            ...prev,
            ko_fallback_qualifiers: plan.fallback_rules.length > 0 ? plan.fallback_rules : null,
            ko_participants: plan.required_participants,
            ko_first_round_size: plan.required_participants,
          }));
        } catch (err) {
          if ((err as any)?.response?.status !== 422) {
            console.error('Failed to calculate qualification plan:', err);
          }
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


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value === '' ? null : value,
    }));
  };

  // Handle template selection
  const handleTemplateSelect = async (templateId: number) => {
    try {
      setLoadingTemplates(true);
      const template = await tournamentService.getById(templateId);

      // Populate form with template data
      setFormData({
        name: template.name,
        description: template.description || '',
        start_date: template.start_date,
        end_date: template.end_date || '',
        mode: template.mode,
        mode_variant: template.mode_variant || 'L1',
        has_group_phase: template.has_group_phase,
        groups_count: template.groups_count || 2,
        participants_per_group: template.participants_per_group,
        group_distribution: template.group_distribution as 'random' | 'seeded' | 'manual',
        has_ko_phase: template.has_ko_phase,
        ko_participants: template.ko_participants || 4,
        ko_first_round_size: template.ko_first_round_size || 4,
        ko_start_round: template.ko_start_round || null,
        ko_fallback_qualifiers: template.ko_fallback_qualifiers || null,
        ko_distribution: normalizeDrawMode(template.ko_distribution),
        ko_pairing_mode: template.ko_pairing_mode || 'P1',
        ko_structure: template.ko_structure,
        ko_draw_method: template.ko_draw_method,
        ko_third_place_match: template.ko_third_place_match || false,
        ko_group_winner_advantage: template.ko_group_winner_advantage || false,
        ko_block_same_group: template.ko_block_same_group !== undefined ? template.ko_block_same_group : true,
        ko_block_same_position: template.ko_block_same_position || false,
        ko_random_seed: template.ko_random_seed,
        league_scoring_system: template.league_scoring_system,
        league_points_win: (template as any).league_points_win ?? 3,
        league_points_draw: (template as any).league_points_draw ?? 1,
        league_points_loss: (template as any).league_points_loss ?? 0,
        tie_breaking_rules: template.tie_breaking_rules || [],
        head_referee: (template as any).head_referee || '',
        scorekeeper: (template as any).scorekeeper || '',
        league_variant: template.league_variant || 'classic',
        league_rounds_multiplier: template.league_rounds_multiplier || 1,
        is_template: false,
        seeded_participant_ids: [],
        visibility: (template as any).visibility || 'public',
        location_id: template.location_id ?? null,
        spielfeld_assignment_mode: (template.spielfeld_assignment_mode as 'random' | 'group_fixed' | 'group_random') || 'random',
      });
    } catch (err) {
      console.error('Failed to load template:', err);
      alert(t('tournament.create.templateError'));
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.mode === 'round_robin' || (formData.mode === 'combined' && formData.has_group_phase)) {
      if (!formData.league_scoring_system) {
        setError(t('tournament.create.validation.scoringRequired'));
        setLoading(false);
        return;
      }
      if (!formData.tie_breaking_rules || formData.tie_breaking_rules.length === 0) {
        setError(t('tournament.create.validation.tieBreakingRequired'));
        setLoading(false);
        return;
      }
    }

    if (formData.mode === 'round_robin') {
      if (!formData.league_rounds_multiplier || formData.league_rounds_multiplier < 1 || formData.league_rounds_multiplier > 10) {
        setError(t('tournament.create.validation.multiplierRange'));
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        mode: formData.mode,
        mode_variant: formData.mode_variant,
        has_group_phase: formData.has_group_phase,
        groups_count: formData.has_group_phase ? formData.groups_count : 0,
        participants_per_group: formData.has_group_phase ? formData.participants_per_group : undefined,
        group_distribution: formData.has_group_phase ? formData.group_distribution : 'random',
        has_ko_phase: formData.has_ko_phase,
        ko_participants: (formData.has_ko_phase && formData.mode === 'combined') ? formData.ko_participants : 0,
        ko_first_round_size: formData.has_ko_phase ? parseInt(formData.ko_first_round_size.toString()) : undefined,
        ko_start_round: formData.has_ko_phase && formData.mode === 'combined' ? (formData.ko_start_round as any) : undefined,
        ko_fallback_qualifiers: formData.has_ko_phase && formData.mode === 'combined' ? (formData.ko_fallback_qualifiers as any) : undefined,
        ko_distribution: formData.has_ko_phase ? formData.ko_distribution : undefined,
        ko_pairing_mode: formData.has_ko_phase ? formData.ko_pairing_mode : undefined,
        ko_structure: formData.has_ko_phase ? formData.ko_structure : undefined,
        ko_draw_method: formData.has_ko_phase ? formData.ko_draw_method : undefined,
        ko_third_place_match: formData.has_ko_phase
          ? (formData.ko_structure === 'single_elimination_with_third' || formData.ko_third_place_match)
          : false,
        ko_group_winner_advantage: formData.has_ko_phase ? formData.ko_group_winner_advantage : false,
        ko_block_same_group: formData.has_ko_phase ? formData.ko_block_same_group : true,
        ko_block_same_position: formData.has_ko_phase ? formData.ko_block_same_position : false,
        ko_random_seed: formData.has_ko_phase && formData.ko_random_seed ? formData.ko_random_seed : undefined,
        league_scoring_system: (formData.mode === 'round_robin' || formData.mode === 'combined') ? formData.league_scoring_system : undefined,
        league_points_win: (formData.mode === 'round_robin' || formData.mode === 'combined') ? formData.league_points_win : undefined,
        league_points_draw: (formData.mode === 'round_robin' || formData.mode === 'combined') ? formData.league_points_draw : undefined,
        league_points_loss: (formData.mode === 'round_robin' || formData.mode === 'combined') ? formData.league_points_loss : undefined,
        tie_breaking_rules: (formData.mode === 'round_robin' || formData.mode === 'combined') && formData.tie_breaking_rules.length > 0 ? formData.tie_breaking_rules : undefined,
        head_referee: formData.head_referee?.trim() ? formData.head_referee.trim() : undefined,
        scorekeeper: formData.scorekeeper?.trim() ? formData.scorekeeper.trim() : undefined,
        league_variant: (formData.mode === 'round_robin' || formData.mode === 'combined') ? formData.league_variant : undefined,
        league_rounds_multiplier: formData.mode === 'round_robin' ? formData.league_rounds_multiplier : undefined,
        is_template: formData.is_template,
        visibility: formData.visibility,
        location_id: formData.location_id || undefined,
        spielfeld_assignment_mode: formData.has_group_phase ? formData.spielfeld_assignment_mode : undefined,
      };

      const apiPayload = sanitizeTournamentWritePayload(payload);
      await tournamentService.create(apiPayload as Partial<Tournament>);

      navigate('/dashboard');
    } catch (err: any) {
      setError(formatApiErrorMessage(err, t('tournament.create.error')));
    } finally {
      setLoading(false);
    }
  };

  const modeExplanations = {
    round_robin: {
      title: t('tournament.mode.roundRobin.title'),
      description: t('tournament.mode.roundRobin.description'),
      features: [
        t('tournament.mode.roundRobin.features.allPlay'),
        t('tournament.mode.roundRobin.features.groups'),
        t('tournament.mode.roundRobin.features.ranking'),
        t('tournament.mode.roundRobin.features.tieBreaking'),
        t('tournament.mode.roundRobin.features.noKO'),
        t('tournament.mode.roundRobin.features.suitable'),
      ]
    },
    knockout: {
      title: t('tournament.mode.knockout.title'),
      description: t('tournament.mode.knockout.description'),
      features: [
        t('tournament.mode.knockout.features.direct'),
        t('tournament.mode.knockout.features.losers'),
        t('tournament.mode.knockout.features.quick'),
        t('tournament.mode.knockout.features.bronze'),
        t('tournament.mode.knockout.features.suitable'),
      ]
    },
    combined: {
      title: t('tournament.mode.combined.title'),
      description: t('tournament.mode.combined.description'),
      features: [
        t('tournament.mode.combined.features.phase1'),
        t('tournament.mode.combined.features.qualify'),
        t('tournament.mode.combined.features.phase2'),
        t('tournament.mode.combined.features.bronze'),
        t('tournament.mode.combined.features.suitable'),
      ]
    }
  };

  const selectedVariantSpec = MODE_VARIANTS.find((variant) => variant.id === formData.mode_variant);
  const currentMode = modeExplanations[selectedVariantSpec?.baseMode || formData.mode];

  const tieBreakingRuleLabels: Record<string, string> = {
    'wins': t('common.tieBreaking.wins'),
    'diff': t('common.tieBreaking.diff'),
    'goals_for': t('common.tieBreaking.goalsFor'),
    'direct_encounter': t('common.tieBreaking.directEncounter'),
    'decision_match': t('common.tieBreaking.decisionMatch'),
  };

  const koStartRoundLabels: Record<string, string> = {
    round_of_32: t('common.koStartRound.roundOf32'),
    round_of_16: t('common.koStartRound.roundOf16'),
    quarterfinal: t('common.koStartRound.quarterfinal'),
    semifinal: t('common.koStartRound.semifinal'),
    final: t('common.koStartRound.final'),
  };

  const groupDistributionLabels: Record<string, string> = {
    random: t('common.groupDistribution.random'),
    seeded: t('common.groupDistribution.seeded'),
    manual: 'Manuell',
  };

  const getAvailableTieBreakingRules = () => {
    return ['wins', 'diff', 'goals_for', 'direct_encounter', 'decision_match'];
  };

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

  const deriveDrawMethodFromPairing = (pairing: KOPairingVariant) => {
    if (pairing === 'P2') return 'overall_seeding';
    if (pairing === 'P3') return 'fixed_cross';
    if (pairing === 'P5') return 'pot_system';
    if (pairing === 'P6') return 'manual';
    if (pairing === 'P7') return 'random_each_round';
    return 'full_random';
  };

  const variantToPreset = (variant: TournamentModeVariant) => {
    const base = MODE_VARIANTS.find((item) => item.id === variant);
    const mode = base?.baseMode ?? 'round_robin';
    const presets: Partial<typeof formData> = {
      mode,
      has_group_phase: mode !== 'knockout',
      has_ko_phase: mode !== 'round_robin',
      league_variant: variant === 'L4' || variant === 'C2' ? 'multiple' : 'classic',
      ko_structure:
        variant === 'K2' || variant === 'C4' ? 'double_elimination' :
        variant === 'K3' ? 'triple_elimination' :
        variant === 'K4' || variant === 'C3' ? 'page_playoff' :
        variant === 'K5' ? 'single_elimination_with_third' :
        variant === 'K6' ? 'consolation_bracket' :
        variant === 'C5' ? 'group_then_single_ko' :
        mode === 'round_robin' ? null : 'single_elimination',
      ko_third_place_match: variant === 'K5',
    };
    return presets;
  };

  const koStructureOptions = [
    {
      value: 'single_elimination',
      label: t('tournament.ko.structure.singleElimination'),
      description: t('tournament.ko.structure.singleEliminationDesc')
    },
    {
      value: 'single_elimination_with_third',
      label: t('tournament.ko.structure.singleEliminationWithThird'),
      description: t('tournament.ko.structure.singleEliminationWithThirdDesc')
    },
    {
      value: 'single_elimination_with_ranking',
      label: t('tournament.ko.structure.singleEliminationWithRanking'),
      description: t('tournament.ko.structure.singleEliminationWithRankingDesc')
    },
    {
      value: 'consolation_bracket',
      label: t('tournament.ko.structure.consolationBracket'),
      description: t('tournament.ko.structure.consolationBracketDesc')
    },
    {
      value: 'double_elimination',
      label: t('tournament.ko.structure.doubleElimination'),
      description: t('tournament.ko.structure.doubleEliminationDesc')
    },
    {
      value: 'triple_elimination',
      label: t('tournament.ko.structure.tripleElimination'),
      description: t('tournament.ko.structure.tripleEliminationDesc')
    },
    {
      value: 'aggregate_ko',
      label: t('tournament.ko.structure.aggregateKo'),
      description: t('tournament.ko.structure.aggregateKoDesc')
    },
    {
      value: 'group_then_single_ko',
      label: t('tournament.ko.structure.groupThenSingleKo'),
      description: t('tournament.ko.structure.groupThenSingleKoDesc')
    },
    {
      value: 'group_then_double_ko',
      label: t('tournament.ko.structure.groupThenDoubleKo'),
      description: t('tournament.ko.structure.groupThenDoubleKoDesc')
    },
    {
      value: 'ko_with_group_winner_advantage',
      label: t('tournament.ko.structure.koWithGroupAdvantage'),
      description: t('tournament.ko.structure.koWithGroupAdvantageDesc')
    },
    {
      value: 'page_playoff',
      label: t('tournament.ko.structure.pagePlayoff'),
      description: t('tournament.ko.structure.pagePlayoffDesc')
    },
  ];

  const koOnlyDrawMethods = [
    {
      value: 'full_random',
      label: t('tournament.ko.draw.fullRandom'),
      description: t('tournament.ko.draw.fullRandomDesc')
    },
    {
      value: 'random_each_round',
      label: t('tournament.ko.drawMode.randomEachRound'),
      description: t('tournament.ko.drawMode.randomEachRoundDesc')
    },
    {
      value: 'pot_system',
      label: t('tournament.ko.draw.potSystem'),
      description: t('tournament.ko.draw.potSystemDesc')
    },
    {
      value: 'manual',
      label: t('tournament.ko.draw.manual'),
      description: t('tournament.ko.draw.manualKODesc')
    }
  ];

  const combinedDrawMethods = [
    {
      value: 'fixed_cross',
      label: t('tournament.ko.draw.fixedCross'),
      description: t('tournament.ko.draw.fixedCrossDesc')
    },
    {
      value: 'same_position_cross',
      label: t('tournament.ko.draw.samePositionCross'),
      description: t('tournament.ko.draw.samePositionCrossDesc')
    },
    {
      value: 'overall_seeding',
      label: t('tournament.ko.draw.overallSeeding'),
      description: t('tournament.ko.draw.overallSeedingDesc')
    },
    {
      value: 'pot_system',
      label: t('tournament.ko.draw.potSystem'),
      description: t('tournament.ko.draw.potSystemGroupDesc')
    },
    {
      value: 'full_random',
      label: t('tournament.ko.draw.fullRandom'),
      description: t('tournament.ko.draw.fullRandomQualifiedDesc')
    },
    {
      value: 'bonus_draw_for_winners',
      label: t('tournament.ko.draw.bonusDrawForWinners'),
      description: t('tournament.ko.draw.bonusDrawForWinnersDesc')
    },
    {
      value: 'predefined_bracket',
      label: t('tournament.ko.draw.predefinedBracket'),
      description: t('tournament.ko.draw.predefinedBracketDesc')
    },
    {
      value: 'manual',
      label: t('tournament.ko.draw.manual'),
      description: t('tournament.ko.draw.manualCombinedDesc')
    }
  ];

  const koDrawModeOptions = [
    {
      value: 'random_first_round',
      label: t('tournament.ko.drawMode.randomFirst'),
      description: t('tournament.ko.drawMode.randomFirstDesc')
    },
    {
      value: 'random_each_round',
      label: t('tournament.ko.drawMode.randomEachRound'),
      description: t('tournament.ko.drawMode.randomEachRoundDesc')
    },
    {
      value: 'predefined_slots',
      label: t('tournament.ko.drawMode.predefinedSlots'),
      description: t('tournament.ko.drawMode.predefinedSlotsDesc')
    }
  ];

  const getAllowedKOStructures = (mode: string) => {
    if (mode === 'combined') {
      return koStructureOptions.filter(option =>
        ['single_elimination', 'single_elimination_with_third', 'single_elimination_with_ranking', 'consolation_bracket', 'double_elimination', 'triple_elimination', 'aggregate_ko'].includes(option.value)
      );
    } else if (mode === 'knockout') {
      return koStructureOptions.filter(option =>
        !['group_then_single_ko', 'group_then_double_ko', 'ko_with_group_winner_advantage'].includes(option.value)
      );
    }
    return [];
  };

  const needsDrawMethod = (structure: string | null, _drawMethod: string | null) => {
    if (!structure) return false;
    return true;
  };

  const needsKoDistribution = (pairing: KOPairingVariant, drawMethod: string | null) => {
    if (drawMethod === 'manual') return false;
    return ['P1', 'P2', 'P5', 'P7'].includes(pairing);
  };


  const needsGroupWinnerAdvantage = (_structure: string | null, _mode: string) => {
    return false;
  };

  const getKoStructureLabel = (value: string | null) => {
    if (!value) return null;
    const found = koStructureOptions.find(o => o.value === value);
    return found ? found.label : value;
  };

  const getKoDrawMethodLabel = (value: string | null) => {
    if (!value) return null;
    const list = [...combinedDrawMethods, ...koOnlyDrawMethods];
    const found = list.find(o => o.value === value);
    return found ? found.label : value;
  };

  const tieRulesLabel = (formData.tie_breaking_rules || [])
    .map((rule) => tieBreakingRuleLabels[rule] || rule)
    .join(' > ');

  const groupSettingsSummary: string[] = [];
  if (formData.has_group_phase) {
    if (formData.groups_count) {
      groupSettingsSummary.push(t('tournament.overview.groups', { count: formData.groups_count }));
    }
    if (formData.participants_per_group) {
      groupSettingsSummary.push(t('tournament.overview.participantsPerGroup', { count: formData.participants_per_group }));
    }
    if (formData.group_distribution) {
      const label = groupDistributionLabels[formData.group_distribution] || formData.group_distribution;
      groupSettingsSummary.push(t('tournament.overview.distribution', { label }));
    }
    if (formData.league_scoring_system) {
      const scoringLabel =
        formData.league_scoring_system === 'points'
          ? t('common.scoring.points')
          : formData.league_scoring_system === 'wins'
            ? t('common.scoring.wins')
            : t('common.scoring.difference');
      groupSettingsSummary.push(t('tournament.overview.scoring', { system: scoringLabel }));
    }
    if (tieRulesLabel) {
      groupSettingsSummary.push(t('tournament.overview.tieBreaking', { rules: tieRulesLabel }));
    }
  }

  const koSettingsSummary: string[] = [];
  if (formData.has_ko_phase) {
    if (formData.ko_start_round) {
      const label = koStartRoundLabels[formData.ko_start_round] || formData.ko_start_round;
      koSettingsSummary.push(t('tournament.overview.koStart', { round: label }));
    } else if (formData.ko_first_round_size) {
      koSettingsSummary.push(t('tournament.overview.koSize', { size: formData.ko_first_round_size }));
    }
    const structureLabel = getKoStructureLabel(formData.ko_structure);
    if (structureLabel) {
      koSettingsSummary.push(t('tournament.overview.structure', { label: structureLabel }));
    }
    const drawLabel = getKoDrawMethodLabel(formData.ko_draw_method);
    if (drawLabel) {
      koSettingsSummary.push(t('tournament.overview.draw', { label: drawLabel }));
    }
  }

  const totalWizardSteps = 5;
  const showStep = (step: number) => !wizardMode || wizardStep === step;

  /**
   * Wizard Schritt 4/5: feste dunkle Fläche mit Tailwind-`!` (schlägt lange Input-/Select-Ketten wie `bg-background`).
   * Sichtbarkeits-Dropdown und Gruppen-Auslosung teilen sich dieselbe Oberfläche.
   */
  const wizardControlSurface =
    '!border-[rgba(0,212,255,0.22)] !bg-[rgba(8,12,26,0.96)] !text-[#e8eaf0]';

  const wizardSelectClass = cn(
    wizardControlSurface,
    'w-full px-3 py-3 text-base rounded-md border font-medium',
    'transition-all duration-200 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  );

  /** Native-Zahlfeld (z. B. Multiplikator) — gleiche Lesbarkeit wie Select. */
  const wizardNumericFieldClass = cn(
    wizardControlSurface,
    'w-full min-h-[2.75rem] px-3 py-2 text-base rounded-md border font-medium',
    'transition-all duration-200 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  );

  /** Datum Schritt 1 — dunkle Fläche + klickbares Kalenderfeld (siehe index.css input[type=date]) */
  const wizardDateFieldClass = cn(
    wizardControlSurface,
    'w-full min-h-[2.75rem] px-3 py-2 text-base rounded-md border font-medium',
    'transition-all duration-200 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    'cursor-pointer',
  );

  /** Auslosungsart nur sinnvoll mit Gruppenphase und mindestens einer Gruppe (Zahl robust parsen). */
  const groupsCountNum = Math.max(0, Number(formData.groups_count) || 0);
  const showGroupDrawType =
    formData.has_group_phase &&
    (formData.mode === 'round_robin' || formData.mode === 'combined') &&
    groupsCountNum >= 1;

  const groupDrawTypeSelect = showGroupDrawType ? (
    <>
      <label className="block mt-4 mb-2 text-foreground">{t('tournament.create.drawType')}</label>
      <select
        name="group_distribution"
        value={formData.group_distribution}
        onChange={handleChange}
        className={wizardSelectClass}
      >
        <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="random">{t('common.groupDistribution.randomLabel')}</option>
        <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="seeded">{t('common.groupDistribution.seededLabel')}</option>
        <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="manual">Manuell (keine Auto-Verteilung)</option>
      </select>
      {formData.group_distribution === 'manual' && (
        <div className="mt-4 rounded border border-warning bg-warning/15 p-3 text-sm text-warning">
          Teilnehmer werden nach Gruppenerstellung manuell den Gruppen zugewiesen.
        </div>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        Gesetzte Spieler für die Gruppen-Auslosung sind hier nicht wählbar (Teilnehmer sind beim Anlegen noch unbekannt). Nach dem Anlegen: zuerst{' '}
        <strong>Turnier → Teilnehmer</strong>, dann optional unter <strong>Turnier → Gruppen</strong> vor der Gruppengenerierung.
      </p>
    </>
  ) : null;

  return (
    <div className="flex gap-8 max-w-[1400px] mx-auto bg-background min-h-screen p-8">
      {/* Linke Seite - Formular */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-8">
          <h1 className="m-0 text-foreground text-2xl font-semibold">{t('tournament.create.title')}</h1>
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={20} className="mr-2 align-middle" />
            {t('common.back')}
          </Button>
        </div>
        <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-card/60 p-3">
          <div className="text-sm text-muted-foreground">
            Geführter Assistent: Schritt {wizardStep} von {totalWizardSteps}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-foreground">
            <input
              type="checkbox"
              checked={wizardMode}
              onChange={(e) => setWizardMode(e.target.checked)}
            />
            Geführter Assistent
          </label>
        </div>
        {wizardMode && (
          <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(wizardStep / totalWizardSteps) * 100}%` }}
            />
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/20 text-destructive border border-destructive rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Vorlagen-Auswahl */}
        {showStep(1) && templates.length > 0 && (
          <Card className="mb-8">
            <label className="block mb-2 font-bold text-foreground">
              {t('tournament.create.templateLabel')}
            </label>
            <select
              value={selectedTemplate || ''}
              onChange={(e) => {
                const templateId = e.target.value ? parseInt(e.target.value) : null;
                setSelectedTemplate(templateId);
                if (templateId) {
                  handleTemplateSelect(templateId);
                }
              }}
              className={wizardSelectClass}
            >
              <option value="" className="!bg-[#080c1a] !text-[#e8eaf0]">{t('common.noTemplate')}</option>
              {templates.map(template => (
                <option key={template.id} value={template.id} className="!bg-[#080c1a] !text-[#e8eaf0]">
                  {template.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('tournament.create.templateHint')}
            </p>
          </Card>
        )}

        <Card className="p-8">
          <form onSubmit={handleSubmit}>
            {showStep(1) && (
              <>
                <Input
                  label={t('tournament.create.name')}
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />

                <Textarea
                  label={t('tournament.create.description')}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                />

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Input
                    label={t('tournament.create.startDate')}
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className={wizardDateFieldClass}
                    required
                  />
                  <Input
                    label={t('tournament.create.endDate')}
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className={wizardDateFieldClass}
                  />
                </div>
              </>
            )}

            {showStep(2) && (
            <div className="mb-6">
              <label className="block mb-2 font-bold text-foreground">
                {t('tournament.create.location')}
              </label>
              <select
                name="location_id"
                value={formData.location_id ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location_id: e.target.value === '' ? null : Number(e.target.value) }))}
                className={wizardSelectClass}
              >
                <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="">{t('common.noLocation')}</option>
                {locations.map(loc => (
                  <option key={loc.id} className="!bg-[#080c1a] !text-[#e8eaf0]" value={loc.id}>{loc.name}</option>
                ))}
              </select>
              {formData.location_id != null && (formData.mode === 'round_robin' || formData.mode === 'combined') && (
                <div className="mt-4">
                  <label className="block mb-2 font-bold text-foreground">
                    {t('tournament.create.spielfeldAssignment')}
                  </label>
                  <select
                    name="spielfeld_assignment_mode"
                    value={formData.spielfeld_assignment_mode}
                    onChange={(e) => setFormData(prev => ({ ...prev, spielfeld_assignment_mode: e.target.value as 'random' | 'group_fixed' | 'group_random' }))}
                    className={wizardSelectClass}
                  >
                    <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="random">{t('common.spielfeldAssignment.random')}</option>
                    <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="group_fixed">{t('common.spielfeldAssignment.groupFixed')}</option>
                    <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="group_random">{t('common.spielfeldAssignment.groupRandom')}</option>
                  </select>
                </div>
              )}
            </div>
            )}

            {showStep(3) && (
            <div className="mb-6">
              <label className="block mb-2 font-bold text-foreground">
                Modusfamilie und Variante (L/K/C)
              </label>
              <select
                value={formData.mode_variant}
                onChange={(e) => {
                  const nextVariant = e.target.value as TournamentModeVariant;
                  setFormData((prev) => ({
                    ...prev,
                    mode_variant: nextVariant,
                    ...variantToPreset(nextVariant),
                  }));
                }}
                className={cn(wizardSelectClass, 'mb-3')}
              >
                {MODE_VARIANTS.map((variant) => (
                  <option key={variant.id} className="!bg-[#080c1a] !text-[#e8eaf0]" value={variant.id}>
                    {variant.title}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-muted-foreground">
                Grundmodus wird automatisch aus der Variante abgeleitet: <strong>{formData.mode}</strong>
              </p>
            </div>
            )}

        {showStep(4) && (formData.mode === 'round_robin' || formData.mode === 'combined') && (
          <Card className="mt-6 mb-6">
            <h3 className="mb-4 font-bold text-foreground text-lg mt-0">{t('tournament.create.groupPhase')}</h3>
            <Input
              label={t('tournament.create.groupsCount')}
              type="number"
              name="groups_count"
              value={formData.groups_count}
              onChange={handleChange}
              min={1}
            />

            {groupDrawTypeSelect}

            <div className="mt-6">
              <label className="block mb-2 font-bold text-foreground">
                {t('tournament.create.leagueScoring')}
              </label>
              <select
                name="league_scoring_system"
                value={formData.league_scoring_system || ''}
                onChange={handleChange}
                required
                className={wizardSelectClass}
              >
                <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="">{t('common.selectPlaceholder')}</option>
                <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="points">{t('common.scoring.points')}</option>
                <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="difference">{t('common.scoring.difference')}</option>
                <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="wins">{t('common.scoring.wins')}</option>
              </select>
              {formData.league_scoring_system === 'points' && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Input
                    label="Punkte Sieg"
                    type="number"
                    name="league_points_win"
                    value={formData.league_points_win}
                    onChange={(e) => setFormData(prev => ({ ...prev, league_points_win: Number(e.target.value) || 0 }))}
                    min={0}
                  />
                  <Input
                    label="Punkte Unentschieden"
                    type="number"
                    name="league_points_draw"
                    value={formData.league_points_draw}
                    onChange={(e) => setFormData(prev => ({ ...prev, league_points_draw: Number(e.target.value) || 0 }))}
                    min={0}
                  />
                  <Input
                    label="Punkte Niederlage"
                    type="number"
                    name="league_points_loss"
                    value={formData.league_points_loss}
                    onChange={(e) => setFormData(prev => ({ ...prev, league_points_loss: Number(e.target.value) || 0 }))}
                    min={0}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Input
                label="Schiedsrichter (optional)"
                type="text"
                name="head_referee"
                value={formData.head_referee}
                onChange={handleChange}
              />
              <Input
                label="Schreiber (optional)"
                type="text"
                name="scorekeeper"
                value={formData.scorekeeper}
                onChange={handleChange}
              />
            </div>

            {formData.mode === 'round_robin' && (
              <div className="mt-6">
                <label className="block mb-2 font-bold text-foreground">
                  {t('tournament.create.leagueVariant')}
                </label>
                <div className="w-full rounded border border-border bg-muted px-3 py-2 text-sm text-foreground">
                  {formData.league_variant === 'classic' && t('common.leagueVariant.classic')}
                  {formData.league_variant === 'double' && t('common.leagueVariant.double')}
                  {formData.league_variant === 'multiple' && t('common.leagueVariant.multiple')}
                </div>
                <p className="mt-2 text-xs text-muted-foreground italic">
                  {t('tournament.create.leagueVariantDerivedHint')}
                </p>
                <p className="mt-2 text-sm text-muted-foreground italic">
                  {formData.league_variant === 'classic' && t('common.leagueVariant.classicDesc')}
                  {formData.league_variant === 'double' && t('common.leagueVariant.doubleDesc')}
                  {formData.league_variant === 'multiple' && t('common.leagueVariant.multipleDesc')}
                </p>
              </div>
            )}

            {formData.mode === 'round_robin' && (
              <div className="mt-4">
                <label className="block mb-2 font-bold text-foreground">
                  {t('tournament.create.roundsMultiplier')}
                </label>
                <input
                  type="number"
                  name="league_rounds_multiplier"
                  value={formData.league_rounds_multiplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, league_rounds_multiplier: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={10}
                  required
                  className={wizardNumericFieldClass}
                />
                <p className="mt-2 text-sm text-muted-foreground italic">
                  {t('tournament.create.roundsMultiplierHint')}
                </p>
              </div>
            )}

            <div className="mt-4">
              <label className="block mb-2 font-bold text-foreground">
                {t('tournament.create.tieBreakingRules')}
              </label>

              <div className="mb-4 p-3 bg-muted rounded border border-border">
                <p className="m-0 mb-2 text-sm font-bold text-foreground">{t('tournament.create.availableRules')}</p>
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
                                setFormData(prev => ({
                                  ...prev,
                                  tie_breaking_rules: ['decision_match']
                                }));
                              } else {
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
                    {t('tournament.create.decisionMatchHint')}
                  </p>
                )}
              </div>

              {formData.tie_breaking_rules.length > 0 && !formData.tie_breaking_rules.includes('decision_match') && (
                <div className="p-3 bg-info/20 rounded-lg border border-info">
                  <p className="m-0 mb-2 text-sm font-bold text-foreground">{t('tournament.create.ruleOrder')}</p>
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
                                ? "bg-muted-foreground/60 text-white cursor-not-allowed"
                                : "bg-success text-white cursor-pointer"
                            )}
                            title={t('tournament.create.moveUp')}
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
                                ? "bg-muted-foreground/60 text-white cursor-not-allowed"
                                : "bg-success text-white cursor-pointer"
                            )}
                            title={t('tournament.create.moveDown')}
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
          </Card>
        )}

        {showStep(4) && (formData.mode === 'knockout' || formData.mode === 'combined') && (
          <div className="mb-4 ml-0 p-4 bg-muted rounded-lg border border-border">
            <h3 className="mb-2 font-bold text-foreground">
              {formData.mode === 'knockout' ? t('tournament.create.koPhaseOnly') : t('tournament.create.koPhaseAfterGroup')}
            </h3>
            {formData.mode === 'combined' && (
              <p className="mb-4 text-sm text-muted-foreground italic">
                {t('tournament.create.koScoringHint')}
              </p>
            )}
            <div className="ml-4">
              {formData.mode === 'combined' && (
                <div className="mb-4">
                  <label className="block mb-2 font-bold text-foreground">
                    {t('tournament.create.koStartRound')}
                  </label>
                  <select
                    name="ko_start_round"
                    value={formData.ko_start_round || ''}
                    onChange={handleChange}
                    required
                    className={wizardSelectClass}
                  >
                    <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="">{t('common.selectPlaceholder')}</option>
                    <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="round_of_32">{t('tournament.create.koStartRoundOptions.roundOf32')}</option>
                    <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="round_of_16">{t('tournament.create.koStartRoundOptions.roundOf16')}</option>
                    <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="quarterfinal">{t('tournament.create.koStartRoundOptions.quarterfinal')}</option>
                    <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="semifinal">{t('tournament.create.koStartRoundOptions.semifinal')}</option>
                    <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="final">{t('tournament.create.koStartRoundOptions.final')}</option>
                  </select>

                  {loadingQualificationPlan && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('tournament.create.calculatingPlan')}
                    </p>
                  )}
                  {qualificationPlan && !loadingQualificationPlan && (
                    <div className="mt-4 p-4 bg-info/20 rounded border border-border">
                      <div className="text-sm font-bold text-foreground mb-2">
                        {t('tournament.create.qualificationPlan')}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {t('tournament.create.qualificationTotal', { count: qualificationPlan.required_participants })}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {t('tournament.create.qualificationBasis', { count: qualificationPlan.basis_per_group })}
                      </div>
                      {qualificationPlan.fallback_rules.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-bold text-foreground mb-1">
                            {t('tournament.create.additionalQualifiers')}
                          </div>
                          {qualificationPlan.fallback_rules.map((rule, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground">
                              • {t('tournament.create.bestPositioned', { count: rule.count, position: rule.position })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {formData.mode === 'knockout' && (
                <div className="mb-4 p-3 bg-info/20 rounded border border-border">
                  <p className="m-0 text-sm text-info">
                    {t('tournament.create.koAutoParticipants')}
                  </p>
                </div>
              )}

              <div className="mb-4 rounded border border-border bg-muted px-3 py-3">
                <label className="block mb-2 font-bold text-foreground">
                  {t('tournament.create.koStructure')}
                </label>
                <div className="text-sm text-foreground">
                  {getKoStructureLabel(formData.ko_structure) || '—'}
                </div>
                <p className="mt-2 mb-0 text-xs text-muted-foreground italic">
                  {t('tournament.create.koStructureDerivedHint')}
                </p>
                {formData.ko_structure && (
                  <p className="mt-2 mb-0 text-sm text-muted-foreground italic">
                    {getAllowedKOStructures(formData.mode).find(o => o.value === formData.ko_structure)?.description}
                  </p>
                )}
              </div>

              {formData.has_ko_phase && (
                <div className="mb-4 rounded border border-border bg-muted px-3 py-3">
                  {koStructureIncludesThirdPlace(formData.ko_structure) ? (
                    <p className="m-0 text-sm text-muted-foreground">
                      {t('tournament.create.thirdPlaceIncludedInStructure')}
                    </p>
                  ) : (
                    <label className="flex items-start gap-2 cursor-pointer mb-0">
                      <input
                        type="checkbox"
                        name="ko_third_place_match"
                        checked={formData.ko_third_place_match}
                        onChange={handleChange}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-bold text-foreground">{t('tournament.ko.thirdPlaceMatch')}</span>
                        <span className="block text-xs text-muted-foreground mt-1">
                          {t('tournament.create.thirdPlaceMatchHint')}
                        </span>
                      </span>
                    </label>
                  )}
                </div>
              )}

              {needsDrawMethod(formData.ko_structure, formData.ko_draw_method) && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block mb-2 font-bold text-foreground">
                      KO Paarungsart (P1-P7)
                    </label>
                    <select
                      value={formData.ko_pairing_mode}
                      onChange={(e) => {
                        const pairing = e.target.value as KOPairingVariant;
                        const derivedDrawMethod = deriveDrawMethodFromPairing(pairing);
                        setFormData((prev) => ({
                          ...prev,
                          ko_pairing_mode: pairing,
                          ko_draw_method: derivedDrawMethod as any,
                          ko_distribution:
                            derivedDrawMethod === 'manual'
                              ? 'predefined_slots'
                              : derivedDrawMethod === 'fixed_cross'
                                ? 'cross'
                                : derivedDrawMethod === 'random_each_round'
                                  ? 'random_each_round'
                                : prev.ko_distribution,
                          ko_block_same_group: pairing === 'P4' ? true : prev.ko_block_same_group,
                        }));
                      }}
                      className={`${wizardSelectClass} mb-3`}
                    >
                      {PAIRING_VARIANTS.map((variant) => (
                        <option key={variant.id} className="!bg-[#080c1a] !text-[#e8eaf0]" value={variant.id}>
                          {variant.label}
                        </option>
                      ))}
                    </select>
                    <div className="rounded border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                      Abgeleitete Auslosung:{' '}
                      <span className="font-semibold text-foreground">
                        {getKoDrawMethodLabel(formData.ko_draw_method) || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start pt-7">
                    {formData.ko_draw_method && (
                      <p className="m-0 text-sm text-muted-foreground italic">
                        Die Auslosungslogik wird aus der Paarungsart abgeleitet.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {needsKoDistribution(formData.ko_pairing_mode, formData.ko_draw_method) && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block mb-2 font-bold text-foreground">
                      {t('tournament.create.koDrawMode')}
                    </label>
                    <select
                      name="ko_distribution"
                      value={formData.ko_distribution || 'random_first_round'}
                      onChange={handleChange}
                      required
                      className={wizardSelectClass}
                    >
                      {koDrawModeOptions.map(option => (
                        <option key={option.value} className="!bg-[#080c1a] !text-[#e8eaf0]" value={option.value}>
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
                <div className="mb-4 p-3 bg-muted rounded border border-border">
                  <label className="block mb-2 font-bold text-foreground">
                    {t('tournament.create.drawRestrictions')}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      name="ko_block_same_group"
                      checked={formData.ko_block_same_group}
                      onChange={handleChange}
                    />
                    <span>{t('tournament.create.noSameGroup')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="ko_block_same_position"
                      checked={formData.ko_block_same_position}
                      onChange={handleChange}
                    />
                    <span>{t('tournament.create.noSamePosition')}</span>
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
                    <span className="font-bold text-foreground">{t('tournament.create.groupWinnerAdvantage')}</span>
                  </label>
                </div>
              )}


              {(formData.ko_draw_method === 'pot_system' || formData.ko_draw_method === 'full_random') && (
                <div className="mb-4">
                  <label className="block mb-2 font-bold text-foreground">
                    {t('tournament.create.randomSeed')}
                  </label>
                  <input
                    type="number"
                    name="ko_random_seed"
                    value={formData.ko_random_seed || ''}
                    onChange={handleChange}
                    min={0}
                    placeholder={t('tournament.create.randomSeedPlaceholder')}
                    className="w-full px-2 py-2 text-base border border-border rounded"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('tournament.create.randomSeedHint')}
                  </p>
                </div>
              )}

              {formData.ko_draw_method === 'manual' && (
                <div className="mb-4 p-4 bg-warning/20 rounded-md border border-warning">
                  <p className="m-0 mb-4 text-sm text-warning">
                    {formData.mode === 'combined'
                      ? t('tournament.create.manualPairingsCombined')
                      : t('tournament.create.manualPairingsKO')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {showStep(5) && (
        <div className="mt-8 mb-4 space-y-4">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">{t('common.visibility.label')}</label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
              className={wizardSelectClass}
            >
              <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="public">{t('common.visibility.public')}</option>
              <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="shared">{t('common.visibility.shared')}</option>
              <option className="!bg-[#080c1a] !text-[#e8eaf0]" value="private">{t('common.visibility.private')}</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_template"
              checked={formData.is_template}
              onChange={handleChange}
            />
            <span className="font-bold text-foreground">{t('tournament.create.saveAsTemplate')}</span>
          </label>
          <p className="mt-1 text-sm text-muted-foreground ml-6">
            {t('tournament.create.saveAsTemplateHint')}
          </p>
          <Card className="mt-6 mb-6">
            <h3 className="mb-3 mt-0 font-bold text-foreground text-lg">Zusammenfassung</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground">{formData.name || '—'}</span></div>
              <div><span className="text-muted-foreground">Modus:</span> <span className="text-foreground">{formData.mode}</span></div>
              <div><span className="text-muted-foreground">Gruppenphase:</span> <span className="text-foreground">{formData.has_group_phase ? 'Ja' : 'Nein'}</span></div>
              {showGroupDrawType && (
                <div><span className="text-muted-foreground">Anzahl Gruppen:</span> <span className="text-foreground">{groupsCountNum}</span></div>
              )}
              <div><span className="text-muted-foreground">KO-Phase:</span> <span className="text-foreground">{formData.has_ko_phase ? 'Ja' : 'Nein'}</span></div>
              <div><span className="text-muted-foreground">Sichtbarkeit:</span> <span className="text-foreground">{formData.visibility}</span></div>
            </div>
            {wizardMode && showGroupDrawType && (
              <div className="mt-4 rounded-md border border-border bg-muted/40 p-4">
                <p className="mt-0 mb-3 text-sm font-semibold text-foreground">Auslosungsart (Gruppenphase)</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Im Assistenten hier die Auswahl prüfen oder ändern — dieselbe Einstellung wie in Schritt 4.
                </p>
                <div className="[&_label]:mt-0 [&_p]:hidden">{groupDrawTypeSelect}</div>
              </div>
            )}
          </Card>
        </div>
        )}

        <div className="flex gap-4 mt-8">
          {wizardMode && wizardStep > 1 && (
            <Button type="button" variant="secondary" onClick={() => setWizardStep((prev) => Math.max(1, prev - 1))}>
              Zurück
            </Button>
          )}
          {wizardMode && wizardStep < totalWizardSteps && (
            <Button type="button" variant="primary" onClick={() => setWizardStep((prev) => Math.min(totalWizardSteps, prev + 1))}>
              Weiter
            </Button>
          )}
          {(!wizardMode || wizardStep === totalWizardSteps) && (
            <Button
              type="submit"
              variant="success"
              disabled={loading}
            >
              {loading ? t('tournament.create.submitting') : t('tournament.create.submit')}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/dashboard')}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </form>
      </Card>
      </div>

      {/* Rechte Seite - Erklärungen */}
      <div className="flex-1 max-w-[400px]">
        <div className="sticky top-8">
          <Card className="mb-4 border border-info">
            <h2 className="mt-0 text-info text-xl font-semibold">{t('tournament.create.infoTitle')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('tournament.create.infoDescription')}
            </p>
            <ul className="m-0 pl-6 text-muted-foreground list-disc">
              <li className="mb-2">{t('tournament.create.infoRequired')}</li>
              <li className="mb-2">{t('tournament.create.infoParticipants')}</li>
              <li className="mb-2">{t('tournament.create.infoGroups')}</li>
              <li className="mb-2">{t('tournament.create.infoTemplate')}</li>
            </ul>
          </Card>
          <Card className="border border-success">
            <h3 className="mt-0 text-success text-lg font-semibold">
              {t('tournament.create.selectedMode', { mode: selectedVariantSpec?.title || currentMode.title })}
            </h3>
            <p className="text-muted-foreground mb-3 text-sm">{currentMode.description}</p>
            <ul className="m-0 pl-6 text-muted-foreground text-sm list-disc">
              {currentMode.features.map((feature, idx) => (
                <li key={idx} className="mb-1.5">{feature}</li>
              ))}
            </ul>
          </Card>
          <Card className="mt-4 border border-warning">
            <h3 className="mt-0 text-warning text-lg font-semibold">{t('tournament.create.currentSettings')}</h3>
            {groupSettingsSummary.length > 0 ? (
              <>
                <div className="font-bold text-foreground mb-2">{t('common.mode.groupPhase')}</div>
                <ul className="m-0 pl-6 text-muted-foreground text-sm list-disc">
                  {groupSettingsSummary.map((item) => (
                    <li key={item} className="mb-1.5">{item}</li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="text-muted-foreground mb-3">{t('tournament.create.noGroupPhase')}</div>
            )}
            {koSettingsSummary.length > 0 ? (
              <>
                <div className="font-bold text-foreground mt-4 mb-2">{t('common.mode.koPhase')}</div>
                <ul className="m-0 pl-6 text-muted-foreground text-sm list-disc">
                  {koSettingsSummary.map((item) => (
                    <li key={item} className="mb-1.5">{item}</li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="text-muted-foreground mt-3">{t('tournament.create.noKoPhase')}</div>
            )}
            <div className="mt-4">
              <TournamentModeVisualization
                mode={formData.mode}
                modeVariant={formData.mode_variant}
                hasGroupPhase={formData.has_group_phase}
                hasKoPhase={formData.has_ko_phase}
                groupsCount={formData.groups_count}
                participantsPerGroup={formData.participants_per_group}
                groupDistribution={formData.group_distribution}
                koStartRound={formData.ko_start_round}
                koStructure={formData.ko_structure}
                koDrawMethod={formData.ko_draw_method}
                koPairingMode={formData.ko_pairing_mode}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
