import type { Meta, StoryObj } from "@storybook/react-vite";
import "../styles/arena-theme.css";
import "../styles/arena-preview.css";

function StatTile(props: { label: string; value: string; hint?: string }) {
  return (
    <div className="fs-surface-base arena-card-pad">
      <div className="arena-row-between">
        <div className="fs-text-3 text-xs tracking-wide uppercase">
          {props.label}
        </div>
        {props.hint ? <div className="fs-text-3 text-xs">{props.hint}</div> : null}
      </div>
      <div className="mt-2.5 text-[22px] font-semibold tracking-[0.2px]">
        {props.value}
      </div>
    </div>
  );
}

function TableRow(props: { rank: number; team: string; w: number; d: number; l: number; pts: number }) {
  return (
    <div className="arena-table-row">
      <div className="fs-text-2 font-semibold">
        {props.rank}
      </div>
      <div className="arena-table-team">
        <div className="arena-team-mark" />
        <div className="font-semibold">{props.team}</div>
      </div>
      <div className="fs-text-2 arena-right">{props.w}</div>
      <div className="fs-text-2 arena-right">{props.d}</div>
      <div className="fs-text-2 arena-right">{props.l}</div>
      <div className="arena-right font-bold">{props.pts}</div>
    </div>
  );
}

function ArenaDashboardPreview() {
  return (
    <div className="fs-arena-root">
      <div className="fs-arena-content p-10">
        <div className="arena-topbar">
          <div className="arena-brand">
            <div className="arena-brand-mark" />
            <div>
              <div className="text-base font-bold tracking-[0.2px]">FinalStage</div>
              <div className="fs-text-3 text-xs">Design 2.0</div>
            </div>
          </div>

          <div className="arena-actions">
            <span className="fs-badge"><span className="fs-dot" /> Live</span>
            <button className="fs-btn-ghost" type="button">Search</button>
            <button className="fs-btn-primary" type="button">Create Tournament</button>
          </div>
        </div>

        <div className="arena-grid">
          <div className="arena-col">
            <div className="fs-surface-elevated arena-card-pad">
              <div className="arena-row-between">
                <div className="text-sm font-bold">Overview</div>
                <div className="fs-text-3 text-xs">Last 30 days</div>
              </div>
              <div className="arena-stat-grid">
                <StatTile label="Tournaments" value="18" hint="+3" />
                <StatTile label="Matches" value="246" hint="+18" />
                <StatTile label="Viewers" value="1'842" hint="+12%" />
              </div>
            </div>

            <div className="fs-surface-elevated arena-card-pad">
              <div className="text-sm font-bold">Prediction</div>
              <div className="fs-text-3 mt-1.5 text-xs">
                Minimal, focused, high contrast. One hero glass per screen.
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2.5">
                <span className="fs-badge">Status badges</span>
                <span className="fs-badge">Dense tables</span>
                <span className="fs-badge">Presentation ready</span>
              </div>
            </div>
          </div>

          <div className="arena-col">
            <div className="fs-surface-hero p-8">
              <div className="flex items-start justify-between gap-[18px]">
                <div>
                  <div className="fs-text-3 text-xs tracking-[0.8px] uppercase">
                    Current Match
                  </div>
                  <div className="arena-hero-title">
                    AA1 vs BB4
                  </div>
                  <div className="fs-text-2 mt-1.5 text-[13px]">
                    Quarterfinal - Board 2 - Best of 7
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2.5">
                  <span className="fs-badge"><span className="fs-dot" /> Live now</span>
                  <div className="arena-hero-score">
                    3 : 2
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-2.5">
                <button className="fs-btn-primary" type="button">Open LiveTicker</button>
                <button className="fs-btn-ghost" type="button">Match Details</button>
              </div>
            </div>

            <div className="arena-two-col">
              <div className="fs-surface-elevated arena-card-pad">
                <div className="text-sm font-bold">Upcoming</div>
                <div className="fs-text-3 mt-1.5 text-xs">Next 3 matches</div>
                <div className="arena-list">
                  <div className="fs-surface-base p-4">
                    <div className="flex justify-between gap-3">
                      <div className="font-bold">AA2 vs BB3</div>
                      <span className="fs-badge">19:30</span>
                    </div>
                    <div className="fs-text-3 mt-1.5 text-xs">Quarterfinal - Board 1</div>
                  </div>
                  <div className="fs-surface-base p-4">
                    <div className="flex justify-between gap-3">
                      <div className="font-bold">BB1 vs AA4</div>
                      <span className="fs-badge">20:00</span>
                    </div>
                    <div className="fs-text-3 mt-1.5 text-xs">Quarterfinal - Board 3</div>
                  </div>
                </div>
              </div>

              <div className="fs-surface-elevated arena-card-pad">
                <div className="text-sm font-bold">Standing</div>
                <div className="fs-text-3 mt-1.5 text-xs">Group A</div>
                <div className="arena-list">
                  <TableRow rank={1} team="Team Alpha" w={3} d={0} l={0} pts={9} />
                  <TableRow rank={2} team="Team Bravo" w={2} d={0} l={1} pts={6} />
                  <TableRow rank={3} team="Team Cobra" w={1} d={0} l={2} pts={3} />
                </div>
              </div>
            </div>
          </div>

          <div className="arena-col">
            <div className="fs-surface-elevated arena-card-pad">
              <div className="arena-row-between">
                <div className="text-sm font-bold">Live Match</div>
                <div className="fs-text-3 text-xs">Arena feed</div>
              </div>

              <div className="fs-surface-base mt-3.5">
                <div className="p-[18px]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-bold">FinalStage Cup</div>
                    <span className="fs-badge"><span className="fs-dot" /> Live</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="fs-text-2">AA1</div>
                    <div className="text-[26px] font-extrabold tracking-[1px]">3 : 2</div>
                    <div className="fs-text-2">BB4</div>
                  </div>
                  <div className="fs-text-3 mt-2.5 text-xs">
                    Quarterfinal - Board 2 - Best of 7
                  </div>
                </div>
              </div>

              <div className="mt-3.5 flex gap-2.5">
                <button className="fs-btn-primary" type="button">Watch</button>
                <button className="fs-btn-ghost" type="button">Share</button>
              </div>
            </div>

            <div className="fs-surface-elevated arena-card-pad">
              <div className="text-sm font-bold">Group Table</div>
              <div className="fs-text-3 mt-1.5 text-xs">Minimal, low-noise table</div>

              <div className="arena-list">
                <div className="arena-table-head fs-text-3">
                  <div>#</div><div>Team</div><div className="arena-right">W</div><div className="arena-right">D</div><div className="arena-right">L</div><div className="arena-right">Pts</div>
                </div>

                <TableRow rank={1} team="Team Alpha" w={3} d={0} l={0} pts={9} />
                <TableRow rank={2} team="Team Bravo" w={2} d={0} l={1} pts={6} />
                <TableRow rank={3} team="Team Cobra" w={1} d={0} l={2} pts={3} />
                <TableRow rank={4} team="Team Delta" w={0} d={0} l={3} pts={0} />
              </div>
            </div>
          </div>
        </div>

        <div className="fs-text-3 arena-footer-note">
          Hinweis: Diese Story ist bewusst ohne deine bestehenden UI-Komponenten gebaut, damit du das Look&Feel sofort siehst.
          Danach kannst du Card/Button/Table in echte Components ueberfuehren.
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof ArenaDashboardPreview> = {
  title: "Arena/Preview",
  component: ArenaDashboardPreview,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof ArenaDashboardPreview>;

export const Dashboard: Story = {
  render: () => <ArenaDashboardPreview />,
};
