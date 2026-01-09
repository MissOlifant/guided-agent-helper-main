import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentAction } from '@/types/agent';

interface ActionButtonsProps {
  actions: AgentAction[];
  onAction: (actionId: string, value?: string) => void;
  disabled?: boolean;
}

export function ActionButtons({ actions, onAction, disabled }: ActionButtonsProps) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [dateValues, setDateValues] = useState<Record<string, Date | undefined>>({});
  const [timeValues, setTimeValues] = useState<Record<string, string>>({});

  const handleInputAction = (action: AgentAction) => {
    const value = inputValues[action.id];
    if (value?.trim()) {
      onAction(action.id, value);
      setInputValues(prev => ({ ...prev, [action.id]: '' }));
    }
  };

  const handleDateAction = (action: AgentAction) => {
    const date = dateValues[action.id];
    if (date) {
      if (action.type === 'datetime') {
        const time = timeValues[action.id] || '09:00';
        const [hours, minutes] = time.split(':').map(Number);
        const dateTime = new Date(date);
        dateTime.setHours(hours, minutes);
        onAction(action.id, format(dateTime, "PPP 'at' p"));
      } else {
        onAction(action.id, format(date, 'PPP'));
      }
      setDateValues(prev => ({ ...prev, [action.id]: undefined }));
      setTimeValues(prev => ({ ...prev, [action.id]: '' }));
    }
  };

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {actions.map((action) => {
        if (action.type === 'input') {
          return (
            <div key={action.id} className="flex gap-2 w-full">
              <Input
                placeholder={action.label}
                value={inputValues[action.id] || ''}
                onChange={(e) =>
                  setInputValues(prev => ({ ...prev, [action.id]: e.target.value }))
                }
                onKeyDown={(e) => e.key === 'Enter' && handleInputAction(action)}
                disabled={disabled}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => handleInputAction(action)}
                disabled={disabled || !inputValues[action.id]?.trim()}
              >
                Submit
              </Button>
            </div>
          );
        }

        if (action.type === 'date' || action.type === 'datetime') {
          // Group all date/datetime actions together
          const dateActions = actions.filter(
            (a) => a.type === 'date' || a.type === 'datetime'
          );

          // Only render the group once, for the first action in the group
          if (action.id !== dateActions[0].id) return null;

          const allDatesSelected = dateActions.every((a) => dateValues[a.id]);

          const handleConfirmDates = () => {
            dateActions.forEach((a) => {
              const date = dateValues[a.id];
              if (date) {
                if (a.type === 'datetime') {
                  const time = timeValues[a.id] || '09:00';
                  const [hours, minutes] = time.split(':').map(Number);
                  const dateTime = new Date(date);
                  dateTime.setHours(hours, minutes);
                  onAction(a.id, format(dateTime, "PPP 'at' p"));
                } else {
                  onAction(a.id, format(date, 'PPP'));
                }
              }
            });
            // Clear values after submission
            const newDateValues = { ...dateValues };
            const newTimeValues = { ...timeValues };
            dateActions.forEach(a => {
              delete newDateValues[a.id];
              delete newTimeValues[a.id];
            });
            setDateValues(newDateValues);
            setTimeValues(newTimeValues);
          };

          return (
            <div key="date-group" className="flex flex-col gap-4 w-full">
              {dateActions.map((dateAction) => {
                const selectedDate = dateValues[dateAction.id];
                return (
                  <div key={dateAction.id} className="flex flex-col gap-2 w-full">
                    <span className="text-sm text-muted-foreground">
                      {dateAction.label}
                    </span>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "flex-1 justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                            disabled={disabled}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate
                              ? format(selectedDate, "PPP")
                              : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) =>
                              setDateValues((prev) => ({
                                ...prev,
                                [dateAction.id]: date,
                              }))
                            }
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>

                      {dateAction.type === "datetime" && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="time"
                            value={timeValues[dateAction.id] || "09:00"}
                            onChange={(e) =>
                              setTimeValues((prev) => ({
                                ...prev,
                                [dateAction.id]: e.target.value,
                              }))
                            }
                            disabled={disabled}
                            className="w-28"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <Button
                size="sm"
                onClick={handleConfirmDates}
                disabled={disabled || !allDatesSelected}
                className="w-full sm:w-auto self-start"
              >
                Confirm Dates
              </Button>
            </div>
          );
        }

        if (action.type === 'select' && action.options) {
          return (
            <div key={action.id} className="flex flex-wrap gap-2 w-full">
              <span className="text-sm text-muted-foreground w-full">{action.label}</span>
              {action.options.map((option) => (
                <Button
                  key={option}
                  variant="outline"
                  size="sm"
                  onClick={() => onAction(action.id, option)}
                  disabled={disabled}
                >
                  {option}
                </Button>
              ))}
            </div>
          );
        }

        return (
          <Button
            key={action.id}
            variant={action.type === 'confirm' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => onAction(action.id)}
            disabled={disabled}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
