// Feedback Widget - Embeddable in apps
import { useState } from 'react';
import { platformService } from '../services/platformService';
import { Button, Input, Card } from './ui';

interface FeedbackWidgetProps {
  appId: number;
}

export default function FeedbackWidget({ appId }: FeedbackWidgetProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature_request' | 'improvement' | 'other'>('bug');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await platformService.createFeedback({
        app_id: appId,
        feedback_type: feedbackType,
        title,
        description,
        priority: 'medium'
      });
      setShowForm(false);
      setTitle('');
      setDescription('');
      alert('Feedback wurde erfolgreich übermittelt!');
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      alert('Fehler beim Übermitteln des Feedbacks.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)}>
        Feedback geben
      </Button>
    );
  }

  return (
    <Card style={{ padding: '1rem', maxWidth: '400px' }}>
      <h3>Feedback geben</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Typ</label>
          <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value as any)}>
            <option value="bug">Bug</option>
            <option value="feature_request">Feature-Anfrage</option>
            <option value="improvement">Verbesserung</option>
            <option value="other">Sonstiges</option>
          </select>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Titel</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Beschreibung</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button type="submit" disabled={submitting}>
            Absenden
          </Button>
          <Button type="button" onClick={() => setShowForm(false)}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Card>
  );
}

