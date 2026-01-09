import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X, Rocket, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskSetupProps {
  onCreateTask: (title: string, steps: string[], dueDate?: Date) => void;
}

const EXAMPLE_TASKS = [
  {
    title: 'Plan a meeting',
    steps: ['Set meeting topic', 'Choose date and time', 'Add attendees', 'Send invitations'],
  },
  {
    title: 'Write a blog post',
    steps: ['Choose topic', 'Create outline', 'Write first draft', 'Review and edit'],
  },
  {
    title: 'Book a flight',
    steps: ['Enter destination', 'Select dates', 'Choose flight', 'Confirm booking'],
  },
];

export function TaskSetup({ onCreateTask }: TaskSetupProps) {
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState<string[]>(['']);
  const [dueDate, setDueDate] = useState<Date | undefined>();

  const addStep = () => setSteps([...steps, '']);
  
  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, value: string) => {
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
  };

  const handleSubmit = () => {
    const validSteps = steps.filter(s => s.trim());
    if (title.trim() && validSteps.length > 0) {
      onCreateTask(title.trim(), validSteps, dueDate);
    }
  };

  const useExample = (example: typeof EXAMPLE_TASKS[0]) => {
    setTitle(example.title);
    setSteps(example.steps);
  };

  const isValid = title.trim() && steps.some(s => s.trim());

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Create a New Task
          </CardTitle>
          <CardDescription>
            Define your task and break it into steps. The agent will guide you through each step with constrained, actionable responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Task Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to accomplish?"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Due Date (Optional)</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Steps</label>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <span className="flex items-center justify-center h-9 w-9 rounded-md bg-muted text-muted-foreground text-sm shrink-0">
                    {index + 1}
                  </span>
                  <Input
                    value={step}
                    onChange={(e) => updateStep(index, e.target.value)}
                    placeholder={`Step ${index + 1} description`}
                  />
                  {steps.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addStep}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Step
            </Button>
          </div>

          <Button onClick={handleSubmit} disabled={!isValid} className="w-full">
            Start Task
          </Button>
        </CardContent>
      </Card>

      <div>
        <p className="text-sm text-muted-foreground mb-3">Or try an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_TASKS.map((example) => (
            <Button
              key={example.title}
              variant="outline"
              size="sm"
              onClick={() => useExample(example)}
            >
              {example.title}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
