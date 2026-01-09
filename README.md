# Guided Agent Helper

## Project Info

This project is a UI-constrained task assistant agent that guides users through complex workflows using a structured, step-by-step approach.

## Getting Started

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd guided-agent-helper

# Step 3: Install the necessary dependencies
npm install

# Step 4: Start the development server
npm run dev
```

## Technologies Used

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Design Decisions & Architecture

### UI vs Agent vs Memory State Model
- **UI (React/Shadcn)**: Handles the presentation layer, rendering the state provided by the agent. It enforces constraints (e.g., date pickers, specific buttons) to guide user input.
- **Agent (Edge Function)**: The "brain" of the operation. It receives the current context (task, steps, user input) and decides the next state (confidence, next step, required actions). It does *not* directly mutate the DOM but returns a structured JSON response.
- **Memory (Supabase/React State)**: The state is maintained centrally. The agent is stateless between requests, relying on the client to pass the full context (history, current step) with each request. This ensures robustness and allows for optimistic UI updates.

### Failure Scenarios & Recovery
**Scenario: API Rate Limiting (429) or Network Failure**
- **System Behavior**: If the Edge Function returns a 429 or fails to respond, the UI catches this error.
- **Recovery**: The system implements a "Retry" mechanism (ActionType: `retry`). Instead of crashing or showing a blank screen, the user is presented with a friendly error message and a manual "Retry" button. In some cases, we handle exponential backoff to automatically retry, ensuring the system recovers gracefully without user intervention.

### Why Constrained UI? (vs. Plain Text Chat)
If this were implemented as a standard plain-text chat (like ChatGPT):
- **Ambiguity**: Users might provide incomplete dates (e.g., "next Friday") which guarantees hallucinations or requires back-and-forth clarification.
- **Unstructured Data**: Collecting specific fields (like Departure and Return dates) would require complex regex parsing on the backend, which is error-prone.
- **Action Paralysis**: Users might not know *what* to type next. The constrained buttons (Confirm, Select) remove this friction.
- **State Drift**: It would be harder to track "Lesson Complete" vs "In Progress" purely from text history. The explicit `taskProgress` and `actionType` in our JSON protocol ensure the system strictly follows the business logic.
