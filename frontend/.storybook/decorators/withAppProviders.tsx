import type { Decorator } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/contexts/AuthContext';

type Globals = {
  locale?: string;
};

export const withAppProviders: Decorator = (Story, context) => {
  const globals = context.globals as Globals;
  const locale = globals.locale ?? 'de';

  document.documentElement.lang = locale;
  localStorage.setItem('i18nextLng', locale);

  return (
    <MemoryRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <div className="bg-background text-foreground min-h-screen p-4">
          <Story />
        </div>
      </AuthProvider>
    </MemoryRouter>
  );
};
