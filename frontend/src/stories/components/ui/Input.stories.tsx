import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '@/components/ui';

const meta: Meta<typeof Input> = {
  title: 'Components/UI/Input',
  component: Input,
  args: {
    label: 'E-Mail',
    placeholder: 'name@beispiel.ch',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    error: 'Bitte gib eine gültige E-Mail ein.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'readonly@finalstage.ch',
  },
};
