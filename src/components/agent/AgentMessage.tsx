import { Card, CardContent } from '@/components/ui/card';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { ActionButtons } from './ActionButtons';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/agent';
import { Bot, User } from 'lucide-react';

interface AgentMessageProps {
  message: Message;
  onAction?: (actionId: string, value?: string) => void;
  isLatest?: boolean;
  isLoading?: boolean;
}

export function AgentMessage({ message, onAction, isLatest, isLoading }: AgentMessageProps) {
  const isAgent = message.role === 'agent';

  return (
    <div className={cn('flex gap-3', !isAgent && 'flex-row-reverse')}>
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
          isAgent ? 'bg-primary' : 'bg-secondary'
        )}
      >
        {isAgent ? (
          <Bot className="h-4 w-4 text-primary-foreground" />
        ) : (
          <User className="h-4 w-4 text-secondary-foreground" />
        )}
      </div>

      <Card className={cn('max-w-[80%]', !isAgent && 'bg-secondary')}>
        <CardContent className="p-3">
          <p className={cn('text-sm', !isAgent && 'text-secondary-foreground')}>
            {message.content}
          </p>

          {isAgent && message.response && (
            <div className="mt-3 pt-3 border-t border-border">
              <ConfidenceIndicator 
                confidence={message.response.confidence} 
                size="sm"
              />
              
              {message.response.taskProgress !== undefined && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Step progress</span>
                    <span>{message.response.taskProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${message.response.taskProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {isLatest && onAction && (
                <ActionButtons
                  actions={message.response.actions}
                  onAction={onAction}
                  disabled={isLoading}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
