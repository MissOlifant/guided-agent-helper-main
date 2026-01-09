import { cn } from '@/lib/utils';
import { Check, Circle, AlertCircle, Loader2 } from 'lucide-react';
import type { TaskStep } from '@/types/agent';

interface TaskProgressProps {
  steps: TaskStep[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
}

export function TaskProgress({ steps, currentStepIndex, onStepClick }: TaskProgressProps) {
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPercentage = Math.round((completedCount / steps.length) * 100);

  const getStepIcon = (step: TaskStep, index: number) => {
    const isActive = index === currentStepIndex;
    
    switch (step.status) {
      case 'completed':
        return <Check className="h-4 w-4 text-primary-foreground" />;
      case 'needs_correction':
        return <AlertCircle className="h-4 w-4 text-destructive-foreground" />;
      case 'in_progress':
        return isActive ? (
          <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        );
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStepClass = (step: TaskStep, index: number) => {
    const isActive = index === currentStepIndex;
    
    switch (step.status) {
      case 'completed':
        return 'bg-primary';
      case 'needs_correction':
        return 'bg-destructive';
      case 'in_progress':
        return isActive ? 'bg-primary' : 'bg-muted';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="space-y-3">
      {/* Overall Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium text-primary">{progressPercentage}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {completedCount}/{steps.length}
        </span>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => onStepClick?.(index)}
              disabled={step.status === 'pending'}
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center transition-colors',
                getStepClass(step, index),
                step.status !== 'pending' && 'cursor-pointer hover:opacity-80'
              )}
              title={step.description}
            >
              {getStepIcon(step, index)}
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-8',
                  step.status === 'completed' ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current step description */}
      <div className="space-y-1">
        <p className="text-sm font-medium">
          Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex]?.description}
        </p>
        
        {/* Upcoming steps preview */}
        {currentStepIndex < steps.length - 1 && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Coming up: </span>
            {steps.slice(currentStepIndex + 1, currentStepIndex + 3).map((s, i) => (
              <span key={s.id}>
                {i > 0 && ' → '}
                {s.description}
              </span>
            ))}
            {steps.length - currentStepIndex > 3 && <span> ...</span>}
          </div>
        )}
      </div>
    </div>
  );
}
