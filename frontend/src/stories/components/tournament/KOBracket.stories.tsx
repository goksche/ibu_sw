import type { Meta, StoryObj } from '@storybook/react-vite';
import KOBracket from '@/components/tournament/KOBracket';
import type { KnockoutMatch } from '@/services/matchService';
import type { Participant } from '@/types';

const participants8: Participant[] = [
  { id: 1, first_name: 'Thomas', last_name: 'Indergand', club: null, scolia_id: null, email: null, nickname: null, created_at: '', updated_at: '' },
  { id: 2, first_name: 'Roger', last_name: 'Baumann', club: null, scolia_id: null, email: null, nickname: null, created_at: '', updated_at: '' },
  { id: 3, first_name: 'Erkan', last_name: 'Cokicli', club: null, scolia_id: null, email: null, nickname: null, created_at: '', updated_at: '' },
  { id: 4, first_name: 'Luca', last_name: 'Gisler', club: null, scolia_id: null, email: null, nickname: null, created_at: '', updated_at: '' },
  { id: 5, first_name: 'Oli', last_name: 'Baumann', club: null, scolia_id: null, email: null, nickname: null, created_at: '', updated_at: '' },
  { id: 6, first_name: 'Sulki', last_name: 'Bilic', club: null, scolia_id: null, email: null, nickname: null, created_at: '', updated_at: '' },
  { id: 7, first_name: 'Scott', last_name: 'Gamma', club: null, scolia_id: null, email: null, nickname: null, created_at: '', updated_at: '' },
  { id: 8, first_name: 'Livio', last_name: 'Zberg', club: null, scolia_id: null, email: null, nickname: null, created_at: '', updated_at: '' },
];

const bracket8WithBronze: KnockoutMatch[] = [
  { id: 1, tournament_id: 21, round: 1, match_no: 1, player1_id: 1, player2_id: 8, score1: 3, score2: 1, spielfeld_id: null },
  { id: 2, tournament_id: 21, round: 1, match_no: 2, player1_id: 4, player2_id: 5, score1: 3, score2: 2, spielfeld_id: null },
  { id: 3, tournament_id: 21, round: 1, match_no: 3, player1_id: 2, player2_id: 7, score1: 3, score2: 0, spielfeld_id: null },
  { id: 4, tournament_id: 21, round: 1, match_no: 4, player1_id: 3, player2_id: 6, score1: 3, score2: 2, spielfeld_id: null },
  { id: 5, tournament_id: 21, round: 2, match_no: 1, player1_id: 1, player2_id: 4, score1: 3, score2: 1, spielfeld_id: null },
  { id: 6, tournament_id: 21, round: 2, match_no: 2, player1_id: 2, player2_id: 3, score1: 3, score2: 2, spielfeld_id: null },
  { id: 7, tournament_id: 21, round: 3, match_no: 1, player1_id: 1, player2_id: 2, score1: 3, score2: 2, spielfeld_id: null },
  { id: 8, tournament_id: 21, round: 99, match_no: 1, player1_id: 4, player2_id: 3, score1: 1, score2: 3, spielfeld_id: null },
];

const participants16: Participant[] = Array.from({ length: 16 }, (_, idx) => ({
  id: idx + 1,
  first_name: `Spieler`,
  last_name: `${idx + 1}`,
  club: null,
  scolia_id: null,
  email: null,
  nickname: null,
  created_at: '',
  updated_at: '',
}));

const bracket16Pending: KnockoutMatch[] = [
  { id: 101, tournament_id: 22, round: 1, match_no: 1, player1_id: 1, player2_id: 16, score1: null, score2: null, spielfeld_id: null },
  { id: 102, tournament_id: 22, round: 1, match_no: 2, player1_id: 8, player2_id: 9, score1: null, score2: null, spielfeld_id: null },
  { id: 103, tournament_id: 22, round: 1, match_no: 3, player1_id: 4, player2_id: 13, score1: null, score2: null, spielfeld_id: null },
  { id: 104, tournament_id: 22, round: 1, match_no: 4, player1_id: 5, player2_id: 12, score1: null, score2: null, spielfeld_id: null },
  { id: 105, tournament_id: 22, round: 1, match_no: 5, player1_id: 2, player2_id: 15, score1: null, score2: null, spielfeld_id: null },
  { id: 106, tournament_id: 22, round: 1, match_no: 6, player1_id: 7, player2_id: 10, score1: null, score2: null, spielfeld_id: null },
  { id: 107, tournament_id: 22, round: 1, match_no: 7, player1_id: 3, player2_id: 14, score1: null, score2: null, spielfeld_id: null },
  { id: 108, tournament_id: 22, round: 1, match_no: 8, player1_id: 6, player2_id: 11, score1: null, score2: null, spielfeld_id: null },
  { id: 109, tournament_id: 22, round: 2, match_no: 1, player1_id: null, player2_id: null, score1: null, score2: null, spielfeld_id: null },
  { id: 110, tournament_id: 22, round: 2, match_no: 2, player1_id: null, player2_id: null, score1: null, score2: null, spielfeld_id: null },
  { id: 111, tournament_id: 22, round: 2, match_no: 3, player1_id: null, player2_id: null, score1: null, score2: null, spielfeld_id: null },
  { id: 112, tournament_id: 22, round: 2, match_no: 4, player1_id: null, player2_id: null, score1: null, score2: null, spielfeld_id: null },
  { id: 113, tournament_id: 22, round: 3, match_no: 1, player1_id: null, player2_id: null, score1: null, score2: null, spielfeld_id: null },
  { id: 114, tournament_id: 22, round: 3, match_no: 2, player1_id: null, player2_id: null, score1: null, score2: null, spielfeld_id: null },
  { id: 115, tournament_id: 22, round: 4, match_no: 1, player1_id: null, player2_id: null, score1: null, score2: null, spielfeld_id: null },
];

const bracketWithConsolation: KnockoutMatch[] = [
  ...bracket8WithBronze,
  { id: 201, tournament_id: 23, round: -1, match_no: 1, player1_id: 8, player2_id: 5, score1: 2, score2: 1, spielfeld_id: null },
  { id: 202, tournament_id: 23, round: -1, match_no: 2, player1_id: 7, player2_id: 6, score1: 0, score2: 2, spielfeld_id: null },
  { id: 203, tournament_id: 23, round: -2, match_no: 1, player1_id: 8, player2_id: 6, score1: 2, score2: 0, spielfeld_id: null },
];

const meta: Meta<typeof KOBracket> = {
  title: 'Components/Tournament/KOBracket',
  component: KOBracket,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const EightParticipantsWithBronze: Story = {
  args: {
    matches: bracket8WithBronze,
    participants: participants8,
    drawMode: 'predefined_slots',
  },
};

export const SixteenParticipantsPending: Story = {
  args: {
    matches: bracket16Pending,
    participants: participants16,
    drawMode: 'predefined_slots',
  },
};

export const WithConsolationBracket: Story = {
  args: {
    matches: bracketWithConsolation,
    participants: participants8,
    drawMode: 'predefined_slots',
  },
};

export const PresentationMode: Story = {
  args: {
    matches: bracket8WithBronze,
    participants: participants8,
    presentationMode: true,
    drawMode: 'predefined_slots',
  },
};
