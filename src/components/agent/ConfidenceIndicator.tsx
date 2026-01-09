import { cn } from '@/lib/utils';

interface ConfidenceIndicatorProps {
  confidence: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ConfidenceIndicator({ 
  confidence, 
  showLabel = true,
  size = 'md' 
}: ConfidenceIndicatorProps) {
  const getConfidenceLevel = () => {
    if (confidence >= 80) return { label: 'High', color: 'bg-green-500' };
    if (confidence >= 50) return { label: 'Medium', color: 'bg-yellow-500' };
    return { label: 'Low', color: 'bg-red-500' };
  };

  const { label, color } = getConfidenceLevel();

  const sizeClasses = {
    sm: 'h-1.5 w-16',
    md: 'h-2 w-24',
    lg: 'h-3 w-32',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn('rounded-full bg-muted overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full transition-all duration-300', color)}
          style={{ width: `${confidence}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn(
          'text-muted-foreground',
          size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
        )}>
          {confidence}% {label}
        </span>
      )}
    </div>
  );
}
