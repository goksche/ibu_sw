// Footer Component - GSmartSol Copyright
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="p-4 text-center text-sm text-muted-foreground border-t border-border bg-card mt-auto w-full">
      &copy; {currentYear}{' '}
      <span className="font-medium text-foreground">GSmartSol</span>
      {'. '}{t('footer.allRightsReserved')}
    </footer>
  );
}
