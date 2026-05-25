import { useTranslation } from 'react-i18next';
import { Trash, UserCircle } from 'phosphor-react';
import { useAuth } from '../../contexts/AuthContext';
import ReactionBar from './ReactionBar';
import type { CommentData, ReactionType } from '../../services/commentService';
import type { TFunction } from 'i18next';

interface CommentItemProps {
  comment: CommentData;
  onDelete: (id: number) => void;
  onToggleReaction: (commentId: number, reaction: ReactionType) => void;
}

function timeAgo(dateStr: string, t: TFunction): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('comments.time.justNow');
  if (mins < 60) return t('comments.time.minutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('comments.time.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('comments.time.daysAgo', { count: days });
}

export default function CommentItem({ comment, onDelete, onToggleReaction }: CommentItemProps) {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const canDelete = user?.id === comment.user_id || isAdmin;
  const displayName = comment.display_name || comment.username;

  if (comment.is_deleted) {
    return (
      <div className="py-3 px-4 text-sm text-muted-foreground italic">
        {t('comments.deleted')}
      </div>
    );
  }

  return (
    <div className="group py-3 px-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        {comment.avatar_url ? (
          <img
            src={comment.avatar_url}
            alt=""
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <UserCircle size={20} className="text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-foreground">{displayName}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at, t)}</span>
            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive bg-transparent border-none cursor-pointer p-0.5"
                title={t('comments.deleteTitle')}
              >
                <Trash size={14} />
              </button>
            )}
          </div>
          <p className="text-sm text-foreground mb-1.5 whitespace-pre-wrap break-words">{comment.content}</p>
          <ReactionBar
            reactions={comment.reactions}
            onToggle={(reaction) => onToggleReaction(comment.id, reaction)}
          />
        </div>
      </div>
    </div>
  );
}
