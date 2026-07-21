'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Send, MessageCircle } from 'lucide-react'

interface Comment {
  id: string
  body: string
  author_user_id: string
  created_at: string | null
  profiles?: { full_name: string } | null
}

interface CommentSectionProps {
  demandId: string
  userId: string
  initialComments: Comment[]
}

export function CommentSection({ demandId, userId, initialComments }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return

    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('comments')
      .insert({
        demand_id: demandId,
        author_user_id: userId,
        body: newComment.trim(),
        internal_only: false,
      })
      .select('*, profiles(full_name)')
      .single()

    if (!error && data) {
      setComments(prev => [...prev, data])
      setNewComment('')
    }
    setLoading(false)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U'
  }

  return (
    <Card className="border-0" style={{ backgroundColor: '#112240' }}>
      <CardHeader>
        <CardTitle className="text-white text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4" style={{ color: '#d4af37' }} />
          Comentários
          {comments.length > 0 && (
            <span className="text-xs text-gray-500 font-normal">({comments.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Nenhum comentário ainda.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs" style={{ backgroundColor: '#d4af3720', color: '#d4af37' }}>
                    {getInitials(comment.profiles?.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-medium">
                      {comment.author_user_id === userId ? 'Você' : (comment.profiles?.full_name || 'Usuário')}
                    </span>
                    <span className="text-gray-600 text-xs">{formatDate(comment.created_at)}</span>
                  </div>
                  <div className="rounded-lg px-3 py-2 text-sm text-gray-300 leading-relaxed" style={{ backgroundColor: '#0a192f' }}>
                    {comment.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New comment form */}
        <form onSubmit={handleSubmit} className="flex gap-3 pt-2 border-t border-white/5">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="text-xs" style={{ backgroundColor: '#d4af3720', color: '#d4af37' }}>
              Eu
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Adicionar um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 min-h-[80px] resize-none"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={loading || !newComment.trim()}
                className="gold-btn font-medium gap-2"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Comentar
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
