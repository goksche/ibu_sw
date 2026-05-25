import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatCircle, PaperPlaneRight } from 'phosphor-react';
import { Card, CardContent } from '../ui';
import CommentItem from './CommentItem';
import { commentService, CommentData, ReactionType } from '../../services/commentService';
import { useCommentWebSocket, WsEvent } from '../../hooks/useCommentWebSocket';

interface CommentSectionProps {
  tournamentId: number;
  context: string;
  className?: string;
}

export default function CommentSection({ tournamentId, context, className = '' }: CommentSectionProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const loadComments = useCallback(async () => {
    try {
      const res = await commentService.getComments(tournamentId, context);
      setComments(res.comments);
    } catch { /* ignore */ }
    setLoading(false);
  }, [tournamentId, context]);

  useEffect(() => {
    if (!collapsed) loadComments();
  }, [collapsed, loadComments]);

  const handleWsMessage = useCallback((ev: WsEvent) => {
    if (ev.event === 'new_comment') {
      const c = ev.data as CommentData;
      if (c.context === context) {
        setComments((prev) => {
          if (prev.find((p) => p.id === c.id)) return prev;
          return [...prev, c];
        });
        requestAnimationFrame(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
        });
      }
    } else if (ev.event === 'delete_comment') {
      const { id } = ev.data;
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_deleted: true, content: t('comments.deleted') } : c))
      );
    } else if (ev.event === 'new_reaction' || ev.event === 'remove_reaction') {
      const updated = ev.data.comment as CommentData;
      if (updated) {
        setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
    }
  }, [context]);

  useCommentWebSocket(collapsed ? null : tournamentId, handleWsMessage);

  const handleSend = async () => {
    const text = newText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await commentService.createComment(tournamentId, context, text);
      setNewText('');
    } catch { /* ignore */ }
    setSending(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await commentService.deleteComment(id);
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, is_deleted: true, content: t('comments.deleted') } : c)));
    } catch { /* ignore */ }
  };

  const handleToggleReaction = async (commentId: number, reaction: ReactionType) => {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;
    const hasReaction = comment.reactions.my_reactions?.includes(reaction);
    try {
      const updated = hasReaction
        ? await commentService.removeReaction(commentId, reaction)
        : await commentService.addReaction(commentId, reaction);
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
    } catch { /* ignore */ }
  };

  const activeCount = comments.filter((c) => !c.is_deleted).length;

  return (
    <div className={className}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer mb-2 p-0"
      >
        <ChatCircle size={18} />
        {activeCount > 0 ? t('comments.titleCount', { count: activeCount }) : t('comments.title')}
        <span className="text-xs">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <Card>
          <CardContent className="p-0">
            <div ref={listRef} className="max-h-80 overflow-y-auto divide-y divide-border">
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">{t('comments.loading')}</div>
              ) : comments.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {t('comments.empty')}
                </div>
              ) : (
                comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    onDelete={handleDelete}
                    onToggleReaction={handleToggleReaction}
                  />
                ))
              )}
            </div>
            <div className="border-t border-border p-3 flex gap-2">
              <input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={t('comments.placeholder')}
                maxLength={2000}
                className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleSend}
                disabled={!newText.trim() || sending}
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity border-none cursor-pointer flex items-center gap-1.5"
              >
                <PaperPlaneRight size={16} />
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
