import { TaskAgent } from '@/components/agent/TaskAgent';

const Index = () => {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            UI-Constrained Task Agent
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A task-focused assistant with structured responses (max 120 chars), 
            predefined UI actions, progress tracking, and confidence indicators.
          </p>
        </header>
        <TaskAgent />
      </div>
    </div>
  );
};

export default Index;
