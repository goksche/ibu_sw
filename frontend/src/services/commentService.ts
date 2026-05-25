import api from './api';

export interface ReactionSummary {
  like: number;
  fire: number;
  trophy: number;
  laugh: number;
  my_reactions: string[];
}

export interface CommentData {
  id: number;
  tournament_id: number;
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  context: string;
  content: string;
  reactions: ReactionSummary;
  created_at: string;
  is_deleted: boolean;
}

export interface CommentListResponse {
  comments: CommentData[];
  total: number;
}

export type ReactionType = 'like' | 'fire' | 'trophy' | 'laugh';

export const commentService = {
  async getComments(tournamentId: number, context?: string): Promise<CommentListResponse> {
    const params: Record<string, string> = {};
    if (context) params.context = context;
    const { data } = await api.get(`/tournaments/${tournamentId}/comments`, { params });
    return data;
  },

  async createComment(tournamentId: number, context: string, content: string): Promise<CommentData> {
    const { data } = await api.post(`/tournaments/${tournamentId}/comments`, { context, content });
    return data;
  },

  async deleteComment(commentId: number): Promise<void> {
    await api.delete(`/comments/${commentId}`);
  },

  async addReaction(commentId: number, reaction: ReactionType): Promise<CommentData> {
    const { data } = await api.post(`/comments/${commentId}/reactions`, { reaction });
    return data;
  },

  async removeReaction(commentId: number, reaction: ReactionType): Promise<CommentData> {
    const { data } = await api.delete(`/comments/${commentId}/reactions/${reaction}`);
    return data;
  },
};
