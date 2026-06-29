'use client';

import { CategoryIcon } from '@/components/ui';

interface IconPickerProps {
  selectedIcon: string;
  onIconSelect: (icon: string) => void;
  color: string;
}

// Available icons - subset of most useful category icons
const CATEGORY_ICONS = [
  // Shopping & Food
  'cart-outline',
  'basket-outline',
  'bag-outline',
  'restaurant-outline',
  'cafe-outline',
  'pizza-outline',
  'wine-outline',
  'ice-cream-outline',

  // Transport
  'car-outline',
  'car-sport-outline',
  'bus-outline',
  'train-outline',
  'bicycle-outline',
  'airplane-outline',

  // Home & Living
  'home-outline',
  'build-outline',
  'construct-outline',
  'hammer-outline',
  'key-outline',
  'water-outline',
  'flash-outline',
  'wifi-outline',

  // Health & Wellness
  'fitness-outline',
  'medkit-outline',
  'heart-outline',
  'leaf-outline',

  // Entertainment
  'film-outline',
  'game-controller-outline',
  'musical-notes-outline',
  'ticket-outline',
  'tennisball-outline',

  // Work & Education
  'briefcase-outline',
  'school-outline',
  'book-outline',
  'laptop-outline',
  'document-text-outline',
  'newspaper-outline',

  // Personal
  'shirt-outline',
  'glasses-outline',
  'gift-outline',
  'paw-outline',
  'rose-outline',
  'sparkles-outline',
  'umbrella-outline',

  // Finance & Misc
  'wallet-outline',
  'card-outline',
  'cash-outline',
  'calculator-outline',
  'receipt-outline',
  'phone-portrait-outline',
  'call-outline',
  'location-outline',
  'person-outline',
  'shield-outline',
  'time-outline',
  'trending-up-outline',
  'albums-outline',
];

export default function IconPicker({ selectedIcon, onIconSelect, color }: IconPickerProps) {
  return (
    <div className="max-h-48 overflow-y-auto">
      <div className="grid grid-cols-6 gap-2">
        {CATEGORY_ICONS.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onIconSelect(icon)}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              transition-all duration-200
              ${selectedIcon === icon
                ? 'ring-2 ring-indigo-500 bg-indigo-50'
                : 'bg-gray-100 hover:bg-gray-200'
              }
            `}
            aria-label={`Select icon ${icon}`}
          >
            <CategoryIcon
              iconName={icon}
              size={20}
              color={selectedIcon === icon ? color : '#6B7280'}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// Export the icons list for external use if needed
export { CATEGORY_ICONS };
