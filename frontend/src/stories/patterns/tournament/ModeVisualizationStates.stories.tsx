import type { Meta, StoryObj } from '@storybook/react-vite';
import TournamentModeVisualization from '@/components/tournament/TournamentModeVisualization';

const meta: Meta<typeof TournamentModeVisualization> = {
  title: 'Patterns/Tournament/States/ModeVisualization',
  component: TournamentModeVisualization,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof TournamentModeVisualization>;

export const LigaL4Swiss: Story = {
  args: {
    mode: 'round_robin',
    modeVariant: 'L4',
    hasGroupPhase: true,
    hasKoPhase: false,
    groupsCount: 1,
    participantsPerGroup: 16,
    groupDistribution: 'seeded',
  },
};

export const KnockoutK2Seeding: Story = {
  args: {
    mode: 'knockout',
    modeVariant: 'K2',
    hasGroupPhase: false,
    hasKoPhase: true,
    koStructure: 'double_elimination',
    koDrawMethod: 'overall_seeding',
    koPairingMode: 'P2',
  },
};

export const CombinedC3Page: Story = {
  args: {
    mode: 'combined',
    modeVariant: 'C3',
    hasGroupPhase: true,
    hasKoPhase: true,
    groupsCount: 2,
    participantsPerGroup: 8,
    koStructure: 'page_playoff',
    koDrawMethod: 'fixed_cross',
    koPairingMode: 'P3',
  },
};

export const InvalidPairingHint: Story = {
  args: {
    mode: 'knockout',
    modeVariant: 'K1',
    hasGroupPhase: false,
    hasKoPhase: true,
    koStructure: 'single_elimination',
    koDrawMethod: 'fixed_cross',
    koPairingMode: 'P3',
  },
};
