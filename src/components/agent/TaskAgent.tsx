import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskProgress } from './TaskProgress';
import { AgentMessage } from './AgentMessage';
import { CorrectionPanel } from './CorrectionPanel';
import { useTaskAgent } from '@/hooks/useTaskAgent';
import { TaskSetup } from './TaskSetup';
import { Loader2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export function TaskAgent() {
  const {
    task,
    messages,
    isLoading,
    error,
    createTask,
    sendMessage,
    correctStep,
    handleAction,
    resetTask,
  } = useTaskAgent();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [correctingStepIndex, setCorrectingStepIndex] = useState<number | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, correctingStepIndex]);

  // Auto-start first step when task is created
  useEffect(() => {
    if (task && messages.length === 0) {
      sendMessage(`Starting task: ${task.title}. First step: ${task.steps[0].description}`);
    }
  }, [task?.id]);

  // Auto-start next step after user confirms completion of the previous step
  useEffect(() => {
    if (!task || isLoading || task.status === 'completed') return;

    // Don't auto-advance if we are in correction mode
    if (correctingStepIndex !== null) return;

    const current = task.steps[task.currentStepIndex];
    if (!current || current.agentResponse) return;

    const last = messages[messages.length - 1];
    if (!last || last.role !== 'agent') return;
    if (last.response?.taskProgress !== 100) return;

    sendMessage(`Next step: ${current.description}`, 'starting');
  }, [task?.id, task?.currentStepIndex, isLoading, messages, sendMessage, correctingStepIndex]);
  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  if (!task) {
    return <TaskSetup onCreateTask={createTask} />;
  }

  const currentStep = task.steps[task.currentStepIndex];
  const needsCorrection = currentStep?.status === 'needs_correction';
  const isCompleted = task.status === 'completed';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <Button variant="ghost" size="sm" onClick={resetTask}>
              <RotateCcw className="h-4 w-4 mr-1" />
              New Task
            </Button>
          </div>
          <TaskProgress
            steps={task.steps}
            currentStepIndex={task.currentStepIndex}
            onStepClick={(index) => {
              // Only allow correcting past or current steps, not future ones
              if (task.steps[index].status !== 'pending') {
                setCorrectingStepIndex(index);
              }
            }}
          />
        </CardHeader>
      </Card>

      {isCompleted && (
        <Card className="border-success bg-secondary">
          <CardContent className="py-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-success font-medium">
              Task completed successfully!
            </p>
          </CardContent>
        </Card>
      )}

      {/* User Initiated Correction */}
      {correctingStepIndex !== null && (
        <CorrectionPanel
          step={task.steps[correctingStepIndex]}
          stepIndex={correctingStepIndex}
          isUserInitiated={true}
          onCorrect={(idx, text) => {
            correctStep(idx, text);
            sendMessage(`User correction for step ${idx + 1}: ${text}`, 'correction');
            setCorrectingStepIndex(null);
          }}
          onResume={() => setCorrectingStepIndex(null)}
        />
      )}

      {/* Agent Initiated Correction */}
      {needsCorrection && correctingStepIndex === null && (
        <CorrectionPanel
          step={currentStep}
          stepIndex={task.currentStepIndex}
          onCorrect={correctStep}
          onResume={() => sendMessage('Continue with current input')}
        />
      )}

      <Card>
        <CardContent className="p-4">
          <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
            {messages.map((message, index) => (
              <AgentMessage
                key={message.id}
                message={message}
                onAction={handleAction}
                isLatest={index === messages.length - 1}
                isLoading={isLoading}
              />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Agent is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <p className="text-sm text-destructive mb-3">{error}</p>
          )}

          {!isCompleted && (
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your response..."
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={isLoading || !inputValue.trim()}>
                Send
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
