interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses = {
  default: 'bg-gray-500 text-white',
  success: 'text-white',
  warning: 'text-white',
  error: 'text-white',
  info: 'bg-blue-500 text-white',
};

const variantStyles = {
  default: {},
  success: { backgroundColor: '#10B981' }, // Mobile app success color
  warning: { backgroundColor: '#F59E0B' }, // Mobile app warning color
  error: { backgroundColor: '#F87171' }, // Lighter red for modern look
  info: {},
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
        shadow-sm
      `}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  );
}
