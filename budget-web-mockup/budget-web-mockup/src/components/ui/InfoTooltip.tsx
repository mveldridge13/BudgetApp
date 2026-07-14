'use client';

import {Info} from 'lucide-react';

interface InfoTooltipProps {
  text: string;
}

export default function InfoTooltip({text}: InfoTooltipProps) {
  return (
    <span className="relative inline-flex group ml-1 align-middle">
      <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56
          rounded-lg border border-gray-200 bg-white p-2.5 text-xs leading-snug text-gray-600
          shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible
          transition-opacity z-20">
        {text}
      </span>
    </span>
  );
}
