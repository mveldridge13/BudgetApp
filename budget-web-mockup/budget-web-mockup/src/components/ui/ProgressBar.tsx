interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export default function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color,
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  // Determine color based on percentage if not provided
  const getDefaultColor = () => {
    if (percentage > 80) return '#EF4444'; // Red
    if (percentage > 60) return '#F59E0B'; // Orange
    return '#10B981'; // Green
  };

  const barColor = color || getDefaultColor();

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}
