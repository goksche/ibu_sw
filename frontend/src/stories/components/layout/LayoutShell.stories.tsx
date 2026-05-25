import type { Meta, StoryObj } from '@storybook/react-vite';
import Layout from '@/components/Layout/Layout';

function LayoutShellPreview() {
  return (
    <Layout>
      <div className="rounded border border-border bg-card p-6">
        <h3 className="m-0">Layout Vorschau</h3>
        <p className="text-muted-foreground mt-2 mb-0">
          Diese Story validiert Router/Auth-Provider und die Sidebar/Topbar-Struktur.
        </p>
      </div>
    </Layout>
  );
}

const meta: Meta<typeof LayoutShellPreview> = {
  title: 'Components/Layout/LayoutShell',
  component: LayoutShellPreview,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
