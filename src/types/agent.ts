// Agent types for UI-constrained task assistant

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'needs_correction';

export type ActionType = 'confirm' | 'select' | 'input' | 'retry' | 'date' | 'datetime';

export interface AgentAction {
  id: string;
  type: ActionType;
  label: string;
  value?: string;
  options?: string[];
}

export interface AgentResponse {
  message: string; // Max 120 chars
  confidence: number; // 0-100
  actions: AgentAction[];
  taskProgress?: number; // 0-100
  requiresCorrection?: boolean;
  readyToAdvance?: boolean;
}

export interface TaskStep {
  id: string;
  description: string;
  status: TaskStatus;
  agentResponse?: AgentResponse;
  userInput?: string;
  correctionHistory?: string[];
}

export interface Task {
  id: string;
  title: string;
  steps: TaskStep[];
  currentStepIndex: number;
  createdAt: Date;
  dueDate?: Date;
  status: 'active' | 'completed' | 'paused';
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  response?: AgentResponse;
}
