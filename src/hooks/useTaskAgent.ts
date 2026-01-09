import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Task, AgentResponse, Message } from '@/types/agent';

export function useTaskAgent() {
  const [task, setTask] = useState<Task | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestTime = useRef<number>(0);
  const retryCount = useRef<number>(0);

  const createTask = useCallback((title: string, steps: string[], dueDate?: Date) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      steps: steps.map((desc, index) => ({
        id: `step-${index}`,
        description: desc,
        status: index === 0 ? 'in_progress' : 'pending',
      })),
      currentStepIndex: 0,
      createdAt: new Date(),
      dueDate,
      status: 'active',
    };
    setTask(newTask);
    setMessages([]);
    retryCount.current = 0;
    return newTask;
  }, []);

  const sendMessage = useCallback(async (content: string, actionType?: string) => {
    if (!task) return;

    // Rate limiting: ensure minimum 2 seconds between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    if (timeSinceLastRequest < 2000) {
      await new Promise(resolve => setTimeout(resolve, 2000 - timeSinceLastRequest));
    }
    lastRequestTime.current = Date.now();

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const currentStep = task.steps[task.currentStepIndex];
      const { data, error: fnError } = await supabase.functions.invoke('task-agent', {
        body: {
          taskTitle: task.title,
          currentStep: currentStep.description,
          stepIndex: task.currentStepIndex,
          totalSteps: task.steps.length,
          allSteps: task.steps.map(s => s.description),
          userMessage: content,
          actionType,
          previousMessages: messages.slice(-4).map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (fnError) {
        // Handle rate limit specifically
        if (fnError.message?.includes('429') || fnError.message?.includes('rate limit')) {
          retryCount.current += 1;
          const waitTime = Math.min(5000 * retryCount.current, 30000);
          setError(`Rate limited. Please wait ${Math.ceil(waitTime / 1000)} seconds...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          throw new Error('Rate limit exceeded. Please try again in a moment.');
        }
        throw new Error(fnError.message);
      }

      // Reset retry count on success
      retryCount.current = 0;

      let response = data as AgentResponse;

      // Client-side fix: Double-check if the response message is actually a JSON string
      // This happens if the edge function fallback was triggered with raw JSON
      if (typeof response.message === 'string' && response.message.trim().startsWith('{')) {
        try {
          // Attempt to parse the message as JSON
          const parsedMessage = JSON.parse(response.message);
          // If successful and it looks like an AgentResponse, use it
          if (parsedMessage.message && Array.isArray(parsedMessage.actions)) {
            response = parsedMessage;
          }
        } catch (e) {
          // Ignore parse errors, just use the string as is
          console.warn('Failed to parse potential JSON in message:', e);
        }
      }

      // Handle error responses from edge function
      if ('error' in data && data.error) {
        if (data.error.includes('Rate limit')) {
          setError('Rate limit reached. Please wait a moment before trying again.');
          setIsLoading(false);
          return;
        }
      }

      const agentMessage: Message = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: response.message,
        timestamp: new Date(),
        response,
      };
      setMessages(prev => [...prev, agentMessage]);

      // Update task step based on response
      setTask(prev => {
        if (!prev) return prev;
        const updatedSteps = [...prev.steps];
        const currentIdx = prev.currentStepIndex;

        const isStepComplete = actionType === 'confirm' && response.taskProgress === 100;

        updatedSteps[currentIdx] = {
          ...updatedSteps[currentIdx],
          agentResponse: response,
          status: response.requiresCorrection
            ? 'needs_correction'
            : isStepComplete
              ? 'completed'
              : 'in_progress',
        };

        // Only move to next step when step is explicitly confirmed (taskProgress = 100)
        let newIndex = currentIdx;
        if (isStepComplete && currentIdx < prev.steps.length - 1) {
          newIndex = currentIdx + 1;
          updatedSteps[newIndex].status = 'in_progress';
        }

        const isTaskComplete = currentIdx === prev.steps.length - 1 && isStepComplete;

        return {
          ...prev,
          steps: updatedSteps,
          currentStepIndex: newIndex,
          status: isTaskComplete ? 'completed' : 'active',
        };
      });

      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get response';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [task, messages]);

  const correctStep = useCallback((stepIndex: number, correction: string) => {
    setTask(prev => {
      if (!prev) return prev;
      const updatedSteps = [...prev.steps];
      const step = updatedSteps[stepIndex];

      updatedSteps[stepIndex] = {
        ...step,
        status: 'in_progress',
        correctionHistory: [...(step.correctionHistory || []), correction],
      };

      return {
        ...prev,
        steps: updatedSteps,
        currentStepIndex: stepIndex,
      };
    });
  }, []);

  const handleAction = useCallback(async (actionId: string, value?: string) => {
    const lastAgentMessage = messages.filter(m => m.role === 'agent').pop();
    const action = lastAgentMessage?.response?.actions.find(a => a.id === actionId);

    if (action) {
      await sendMessage(value || action.label, action.type);
    }
  }, [messages, sendMessage]);

  const resetTask = useCallback(() => {
    setTask(null);
    setMessages([]);
    setError(null);
    retryCount.current = 0;
  }, []);

  return {
    task,
    messages,
    isLoading,
    error,
    createTask,
    sendMessage,
    correctStep,
    handleAction,
    resetTask,
  };
}
