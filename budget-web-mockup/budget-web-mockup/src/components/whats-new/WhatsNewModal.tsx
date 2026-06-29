'use client';

import { Sparkles, Check, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { WHATS_NEW_ENTRIES } from '@/config/whatsNew';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="What's New" size="lg">
      <div className="p-6 space-y-6">
        {WHATS_NEW_ENTRIES.map((entry) => (
          <div key={entry.version}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" style={{ color: '#6366f1' }} />
              <h3 className="text-base font-semibold text-gray-900">{entry.title}</h3>
              <span className="ml-auto text-xs font-medium text-gray-400">{entry.date}</span>
            </div>
            <ul className="space-y-2.5">
              {entry.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                    <Check className="h-3 w-3" style={{ color: '#6366f1' }} />
                  </span>
                  <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>

            {entry.knownIssues && entry.knownIssues.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Known issues
                  </h4>
                </div>
                <ul className="space-y-1.5">
                  {entry.knownIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800 leading-relaxed">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
        <button
          onClick={onClose}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: '#6366f1' }}
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}
