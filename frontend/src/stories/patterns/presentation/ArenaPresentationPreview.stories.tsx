import type { Meta, StoryObj } from '@storybook/react-vite';
import { LiveTickerSlideTitle, LiveTickerSlideGroups } from '@/components/patterns/presentation/LiveTickerSlides';
import '@/styles/arena-theme.css';

function ArenaPresentationPreview() {
  return (
    <div className="fs-arena-root">
      <div className="fs-arena-content p-8 space-y-8">
        <LiveTickerSlideTitle
          tournamentName="FinalStage Arena Cup"
          subtitle="Presentation UI - Arena"
          refreshHint="Auto-Refresh alle 20 Sekunden"
        />

        <div className="fs-surface-hero p-6">
          <LiveTickerSlideGroups title="Gruppenübersicht" subtitle="Für Distanzlesbarkeit optimiert">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="fs-surface-base p-4">
                <h4 className="m-0 text-base font-semibold">Gruppe A</h4>
                <p className="mt-2 mb-0 fs-text-2">4 Spiele • 3 Ergebnisse</p>
              </div>
              <div className="fs-surface-base p-4">
                <h4 className="m-0 text-base font-semibold">Gruppe B</h4>
                <p className="mt-2 mb-0 fs-text-2">4 Spiele • 4 Ergebnisse</p>
              </div>
            </div>
          </LiveTickerSlideGroups>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof ArenaPresentationPreview> = {
  title: 'Patterns/Presentation/Arena/Preview',
  component: ArenaPresentationPreview,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
