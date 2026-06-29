'use client';

import * as IoIcons from 'react-icons/io5';
import { IconType } from 'react-icons';

interface CategoryIconProps {
  iconName: string;
  size?: number;
  color?: string;
  className?: string;
}

// Map common Ionicon names from mobile app to react-icons (Ionicons 5)
const iconMap: Record<string, IconType> = {
  // Common category icons
  'albums-outline': IoIcons.IoAlbumsOutline,
  'cart-outline': IoIcons.IoCartOutline,
  'restaurant-outline': IoIcons.IoRestaurantOutline,
  'car-outline': IoIcons.IoCarOutline,
  'home-outline': IoIcons.IoHomeOutline,
  'fitness-outline': IoIcons.IoFitnessOutline,
  'medkit-outline': IoIcons.IoMedkitOutline,
  'medical-outline': IoIcons.IoMedkitOutline,
  'health-outline': IoIcons.IoMedkitOutline,
  'healthcare-outline': IoIcons.IoMedkitOutline,
  'medkit': IoIcons.IoMedkitOutline,
  'medical': IoIcons.IoMedkitOutline,
  'gift-outline': IoIcons.IoGiftOutline,
  'shirt-outline': IoIcons.IoShirtOutline,
  'book-outline': IoIcons.IoBookOutline,
  'airplane-outline': IoIcons.IoAirplaneOutline,
  'phone-portrait-outline': IoIcons.IoPhonePortraitOutline,
  'film-outline': IoIcons.IoFilmOutline,
  'cafe-outline': IoIcons.IoCafeOutline,
  'bus-outline': IoIcons.IoBusOutline,
  'wine-outline': IoIcons.IoWineOutline,
  'briefcase-outline': IoIcons.IoBriefcaseOutline,
  'school-outline': IoIcons.IoSchoolOutline,
  'pizza-outline': IoIcons.IoPizzaOutline,
  'paw-outline': IoIcons.IoPawOutline,
  'heart-outline': IoIcons.IoHeartOutline,
  'water-outline': IoIcons.IoWaterOutline,
  'flash-outline': IoIcons.IoFlashOutline,
  'leaf-outline': IoIcons.IoLeafOutline,
  'build-outline': IoIcons.IoBuildOutline,
  'trash-outline': IoIcons.IoTrashOutline,
  'wallet-outline': IoIcons.IoWalletOutline,
  'card-outline': IoIcons.IoCardOutline,
  'cash-outline': IoIcons.IoCashOutline,
  'calculator-outline': IoIcons.IoCalculatorOutline,
  'game-controller-outline': IoIcons.IoGameControllerOutline,
  'musical-notes-outline': IoIcons.IoMusicalNotesOutline,
  'basket-outline': IoIcons.IoBasketOutline,
  'bicycle-outline': IoIcons.IoBicycleOutline,
  'glasses-outline': IoIcons.IoGlassesOutline,
  'hammer-outline': IoIcons.IoHammerOutline,
  'ice-cream-outline': IoIcons.IoIceCreamOutline,
  'key-outline': IoIcons.IoKeyOutline,
  'newspaper-outline': IoIcons.IoNewspaperOutline,
  'rose-outline': IoIcons.IoRoseOutline,
  'tennisball-outline': IoIcons.IoTennisballOutline,
  'umbrella-outline': IoIcons.IoUmbrellaOutline,
  'receipt-outline': IoIcons.IoReceiptOutline,
  'wifi-outline': IoIcons.IoWifiOutline,
  'call-outline': IoIcons.IoCallOutline,
  'bag-outline': IoIcons.IoBagOutline,
  'car-sport-outline': IoIcons.IoCarSportOutline,
  'construct-outline': IoIcons.IoConstructOutline,
  'document-text-outline': IoIcons.IoDocumentTextOutline,
  'laptop-outline': IoIcons.IoLaptopOutline,
  'location-outline': IoIcons.IoLocationOutline,
  'person-outline': IoIcons.IoPersonOutline,
  'restaurant': IoIcons.IoRestaurant,
  'shield-checkmark-outline': IoIcons.IoShieldCheckmarkOutline,
  'shield-outline': IoIcons.IoShieldOutline,
  'sparkles-outline': IoIcons.IoSparklesOutline,
  'ticket-outline': IoIcons.IoTicketOutline,
  'time-outline': IoIcons.IoTimeOutline,
  'train-outline': IoIcons.IoTrainOutline,
  'trending-up-outline': IoIcons.IoTrendingUpOutline,

  // Navigation and utility icons
  'help-circle-outline': IoIcons.IoHelpCircleOutline,
  'checkmark': IoIcons.IoCheckmark,
  'add': IoIcons.IoAdd,
  'chevron-back': IoIcons.IoChevronBack,
  'chevron-forward': IoIcons.IoChevronForward,
  'trending-down': IoIcons.IoTrendingDown,
  'trending-up': IoIcons.IoTrendingUp,
};

export default function CategoryIcon({ iconName, size = 20, color, className = '' }: CategoryIconProps) {
  // Get the icon component from the map
  const IconComponent = iconMap[iconName] || iconMap['help-circle-outline'];

  return (
    <IconComponent
      size={size}
      color={color}
      className={className}
    />
  );
}
