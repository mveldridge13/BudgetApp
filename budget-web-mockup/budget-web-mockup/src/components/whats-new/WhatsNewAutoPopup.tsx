'use client';

import { useEffect, useState } from 'react';
import WhatsNewModal from './WhatsNewModal';
import {
  CURRENT_WHATS_NEW_VERSION,
  WHATS_NEW_STORAGE_KEY,
} from '@/config/whatsNew';

/**
 * Shows the What's New popup once per release. On mount it compares the current
 * release version against the one saved in localStorage; if they differ, it
 * opens the modal. Closing the modal marks the current version as seen, so it
 * won't reappear until the version is bumped again.
 *
 * Mounted in the dashboard layout so it triggers after login on any page.
 */
export default function WhatsNewAutoPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!CURRENT_WHATS_NEW_VERSION) return;
    try {
      const seen = localStorage.getItem(WHATS_NEW_STORAGE_KEY);
      if (seen !== CURRENT_WHATS_NEW_VERSION) {
        setOpen(true);
      }
    } catch {
      // localStorage unavailable (private mode etc.) — skip the popup silently.
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    try {
      localStorage.setItem(WHATS_NEW_STORAGE_KEY, CURRENT_WHATS_NEW_VERSION);
    } catch {
      // Ignore write failures; worst case the popup shows again next load.
    }
  };

  return <WhatsNewModal isOpen={open} onClose={handleClose} />;
}
