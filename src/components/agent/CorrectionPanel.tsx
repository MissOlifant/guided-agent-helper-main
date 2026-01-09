import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskStep } from '@/types/agent';

interface CorrectionPanelProps {
  step: TaskStep;
  stepIndex: number;
  onCorrect: (stepIndex: number, correction: string) => void;
  onResume: () => void;
}

export function CorrectionPanel({ step, stepIndex, onCorrect, onResume, isUserInitiated = false }: CorrectionPanelProps & { isUserInitiated?: boolean }) {
  const [correction, setCorrection] = useState('');

  const handleSubmit = () => {
    if (correction.trim()) {
      onCorrect(stepIndex, correction.trim());
      setCorrection('');
      onResume();
    }
  };

  return (
    <Card className={cn(isUserInitiated ? "border-primary" : "border-destructive")}>
      <CardHeader className="pb-3">
        <CardTitle className={cn("text-base flex items-center gap-2", isUserInitiated ? "text-primary" : "text-destructive")}>
          <AlertCircle className="h-4 w-4" />
          {isUserInitiated ? "Refine Step" : "Correction Needed"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isUserInitiated
            ? <span>Updating details for: <strong>{step.description}</strong></span>
            : <span>The agent needs clarification for: <strong>{step.description}</strong></span>
          }
        </p>

        {step.correctionHistory && step.correctionHistory.length > 0 && (
          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs font-medium flex items-center gap-1 mb-2">
              <History className="h-3 w-3" />
              Previous corrections
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {step.correctionHistory.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </div>
        )}

        <Textarea
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          placeholder={isUserInitiated ? "What would you like to change or add?" : "Provide more details or correct the previous input..."}
          rows={3}
        />

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={!correction.trim()}>
            {isUserInitiated ? "Update Step" : "Submit Correction"}
          </Button>
          <Button variant="outline" onClick={onResume}>
            {isUserInitiated ? "Cancel" : "Continue Anyway"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
