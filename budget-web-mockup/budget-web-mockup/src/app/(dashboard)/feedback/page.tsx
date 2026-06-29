'use client';

import { useState } from 'react';
import { MessageSquare, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import WhatsNewModal from '@/components/whats-new/WhatsNewModal';

type FeedbackType = 'bug' | 'feature' | 'general';

const TYPE_OPTIONS: { value: FeedbackType; label: string; hint: string }[] = [
  { value: 'bug', label: 'Bug', hint: 'Something is broken or not working as expected' },
  { value: 'feature', label: 'Feature request', hint: 'An idea or something you wish the app did' },
  { value: 'general', label: 'General feedback', hint: 'Anything else you want to share' },
];

const SUBJECT_MAX = 150;
const MESSAGE_MAX = 5000;

export default function FeedbackPage() {
  const { user } = useAuth();

  const [type, setType] = useState<FeedbackType>('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim() || !message.trim()) {
      setError('Please add a subject and a message.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subject: subject.trim(),
          message: message.trim(),
          company, // honeypot
          email: user?.email ?? '',
          name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
          pageUrl: typeof window !== 'undefined' ? window.location.origin : '',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Something went wrong. Please try again.');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setType('bug');
    setSubject('');
    setMessage('');
    setSubmitted(false);
    setError(null);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Thanks for the feedback!</h1>
          <p className="text-gray-500 mt-2">
            We&apos;ve logged it and the team will take a look. We appreciate you helping make Trend better.
          </p>
          <button
            onClick={resetForm}
            className="mt-6 inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#6366f1' }}
          >
            Send more feedback
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-7 h-7" style={{ color: '#6366f1' }} />
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Feedback</h1>
        </div>
        <p className="text-gray-500 mt-2">
          Found a bug or have an idea? Let us know — every bit helps while we&apos;re testing.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-100 p-6 space-y-5"
        style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}
      >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">What kind of feedback is this?</label>
          <div className="grid sm:grid-cols-3 gap-3">
            {TYPE_OPTIONS.map((opt) => {
              const active = type === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  title={opt.hint}
                  className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                    active
                      ? 'border-transparent text-white'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                  style={active ? { backgroundColor: '#6366f1' } : {}}
                >
                  <span className="block text-sm font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={SUBJECT_MAX}
            placeholder="A short summary"
            className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Details
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MESSAGE_MAX}
            rows={6}
            placeholder="Tell us what happened, what you expected, or what you'd like to see."
            className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {message.length}/{MESSAGE_MAX}
          </p>
        </div>

        {/* Honeypot — hidden from real users */}
        <input
          type="text"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-400">
            {user?.email ? `Submitting as ${user.email}` : 'Submitting anonymously'}
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#6366f1' }}
          >
            {submitting ? 'Sending…' : 'Send feedback'}
          </button>
        </div>
      </form>

      {/* Re-open the latest release notes any time */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => setWhatsNewOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" style={{ color: '#6366f1' }} />
          What&apos;s New
        </button>
      </div>

      <WhatsNewModal isOpen={whatsNewOpen} onClose={() => setWhatsNewOpen(false)} />
    </div>
  );
}
