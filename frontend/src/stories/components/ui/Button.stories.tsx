import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui';

const meta: Meta<typeof Button> = {
  title: 'Components/UI/Button',
  component: Button,
  args: {
    children: 'Speichern',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'outline', 'ghost', 'link', 'success', 'warning', 'info', 'danger', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Success: Story = {
  args: { variant: 'success', children: 'Aktion ok' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Löschen' },
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Nicht verfügbar' },
};
