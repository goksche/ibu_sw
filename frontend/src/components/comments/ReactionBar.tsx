import { useTranslation } from 'react-i18next';
import { ThumbsUp, Fire, Trophy, Smiley } from 'phosphor-react';
import { cn } from '@/lib/utils';
import type { ReactionSummary, ReactionType } from '../../services/commentService';

interface ReactionBarProps {
  reactions: ReactionSummary;
  onToggle: (reaction: ReactionType) => void;
}

export default function ReactionBar({ reactions, onToggle }: ReactionBarProps) {
  const { t } = useTranslation();

  const REACTIONS: { type: ReactionType; icon: React.ReactNode; label: string }[] = [
    { type: 'like', icon: <ThumbsUp size={14} />, label: t('comments.reactions.like') },
    { type: 'fire', icon: <Fire size={14} />, label: t('comments.reactions.fire') },
    { type: 'trophy', icon: <Trophy size={14} />, label: t('comments.reactions.trophy') },
    { type: 'laugh', icon: <Smiley size={14} />, label: t('comments.reactions.laugh') },
  ];
  return (
    <div className="flex items-center gap-1">
      {REACTIONS.map((r) => {
        const count = reactions[r.type] || 0;
        const active = reactions.my_reactions?.includes(r.type);
        return (
          <button
            key={r.type}
            onClick={() => onToggle(r.type)}
            title={r.label}
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border transition-colors bg-transparent cursor-pointer',
              active
                ? 'border-primary text-primary bg-primary/10'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            )}
          >
            {r.icon}
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
