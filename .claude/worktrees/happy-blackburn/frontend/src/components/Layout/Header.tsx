// Header Component
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { SignOut } from 'phosphor-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function Header() {
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <header
      className={cn(
        'bg-background border-b-2 border-primary',
        'px-8 py-4 flex justify-between items-center',
        'sticky top-0 z-[1000]'
      )}
    >
      <Link
        to="/"
        className="flex items-center gap-4 no-underline text-foreground hover:text-foreground"
      >
        {/* Logo Placeholder */}
        <div
          className={cn(
            'w-12 h-12 bg-primary rounded border-2 border-primary',
            'flex items-center justify-center font-bold text-2xl',
            'text-primary-foreground'
          )}
        >
          IB
        </div>
        <div>
          <h1 className="m-0 text-2xl font-bold text-foreground tracking-wider font-sans">
            FinalStage.ch
          </h1>
          <p className="m-0 text-xs text-muted-foreground tracking-wider">
            Turnier-Verwaltung
          </p>
        </div>
      </Link>

      {isAuthenticated && (
        <Button
          variant="outline"
          onClick={handleLogout}
          className="flex items-center gap-2 hover:border-primary hover:text-primary transition-colors"
        >
          <SignOut size={20} />
          <span>Logout</span>
        </Button>
      )}
    </header>
  );
}
