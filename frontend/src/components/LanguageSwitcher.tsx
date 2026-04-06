import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

function FlagDE() {
  return (
    <svg viewBox="0 0 5 3" className="w-6 h-4 rounded-sm shadow-sm">
      <rect width="5" height="1" y="0" fill="#000" />
      <rect width="5" height="1" y="1" fill="#D00" />
      <rect width="5" height="1" y="2" fill="#FFCE00" />
    </svg>
  );
}

function FlagGB() {
  return (
    <svg viewBox="0 0 60 30" className="w-6 h-4 rounded-sm shadow-sm">
      <clipPath id="gb"><path d="M0 0v30h60V0z"/></clipPath>
      <g clipPath="url(#gb)">
        <path d="M0 0v30h60V0z" fill="#012169"/>
        <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
        <path d="M0 0l60 30m0-30L0 30" clipPath="url(#gb)" stroke="#C8102E" strokeWidth="4"/>
        <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
        <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
      </g>
    </svg>
  );
}

function FlagTR() {
  return (
    <svg viewBox="0 0 30 20" className="w-6 h-4 rounded-sm shadow-sm">
      <rect width="30" height="20" fill="#E30A17"/>
      <circle cx="11" cy="10" r="6" fill="#fff"/>
      <circle cx="12.5" cy="10" r="4.8" fill="#E30A17"/>
      <polygon points="16,10 13.1,11.2 14.3,8.2 14.3,11.8 13.1,8.8" fill="#fff"/>
    </svg>
  );
}

function FlagIT() {
  return (
    <svg viewBox="0 0 3 2" className="w-6 h-4 rounded-sm shadow-sm">
      <rect width="1" height="2" x="0" fill="#009246"/>
      <rect width="1" height="2" x="1" fill="#fff"/>
      <rect width="1" height="2" x="2" fill="#CE2B37"/>
    </svg>
  );
}

function FlagFR() {
  return (
    <svg viewBox="0 0 3 2" className="w-6 h-4 rounded-sm shadow-sm">
      <rect width="1" height="2" x="0" fill="#002395"/>
      <rect width="1" height="2" x="1" fill="#fff"/>
      <rect width="1" height="2" x="2" fill="#ED2939"/>
    </svg>
  );
}

const LANGUAGES = [
  { code: 'de', Flag: FlagDE },
  { code: 'en', Flag: FlagGB },
  { code: 'tr', Flag: FlagTR },
  { code: 'it', Flag: FlagIT },
  { code: 'fr', Flag: FlagFR },
];

interface LanguageSwitcherProps {
  collapsed?: boolean;
}

export default function LanguageSwitcher({ collapsed = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const current = i18n.language?.substring(0, 2) || 'de';

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    document.documentElement.lang = code;
  };

  return (
    <div className={cn(
      'relative z-[1300] pointer-events-auto flex items-center',
      collapsed ? 'flex-col gap-1 py-1' : 'gap-1.5 px-3 py-1.5'
    )}>
      {LANGUAGES.map((lang) => (
        <button
          type="button"
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          title={lang.code.toUpperCase()}
          className={cn(
            'p-1 rounded border-none cursor-pointer transition-all flex items-center justify-center bg-transparent',
            current === lang.code
              ? 'ring-2 ring-primary scale-110 opacity-100'
              : 'opacity-50 hover:opacity-100 hover:bg-sidebar-hover'
          )}
        >
          <lang.Flag />
        </button>
      ))}
    </div>
  );
}
