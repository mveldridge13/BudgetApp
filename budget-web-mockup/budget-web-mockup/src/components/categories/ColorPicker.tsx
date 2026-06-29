'use client';

import { IoCheckmark } from 'react-icons/io5';

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

// Predefined color palette matching mobile app
const COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Sage green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Light blue
  '#F8B500', // Orange
  '#6B7280', // Gray
];

export default function ColorPicker({ selectedColor, onColorSelect }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-3">
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onColorSelect(color)}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            transition-all duration-200
            ${selectedColor === color
              ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110'
              : 'hover:scale-105'
            }
          `}
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        >
          {selectedColor === color && (
            <IoCheckmark
              size={20}
              color={isLightColor(color) ? '#374151' : '#FFFFFF'}
            />
          )}
        </button>
      ))}
    </div>
  );
}

// Helper to determine if a color is light (for contrast)
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
