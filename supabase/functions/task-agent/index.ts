import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AgentAction {
  id: string;
  type: "confirm" | "select" | "input" | "retry" | "date" | "datetime";
  label: string;
  value?: string;
  options?: string[];
}

interface AgentResponse {
  message: string;
  confidence: number;
  actions: AgentAction[];
  taskProgress?: number;
  requiresCorrection?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskTitle, currentStep, stepIndex, totalSteps, userMessage, actionType, previousMessages, allSteps } = await req.json();

    console.log(`Processing task: ${taskTitle}, step ${stepIndex + 1}/${totalSteps}`);
    console.log(`User message: ${userMessage}`);
    console.log(`All steps: ${JSON.stringify(allSteps)}`);

    // Deterministic step completion: when the user confirms, mark the step complete.
    // The UI will then auto-start the next step.
    if (actionType === "confirm") {
      const confirmedResponse = {
        message: stepIndex + 1 >= totalSteps
          ? "Confirmed. Finishing task..."
          : "Confirmed. Moving to next step...",
        confidence: 95,
        taskProgress: 100,
        requiresCorrection: false,
        actions: [],
      };

      return new Response(JSON.stringify(confirmedResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build step list for context
    const stepsContext = allSteps?.length
      ? `\n\nALL TASK STEPS:\n${allSteps.map((s: string, i: number) => `${i + 1}. ${s}${i === stepIndex ? ' (CURRENT)' : ''}`).join('\n')}`
      : '';

    // Build next steps preview
    const nextStepsPreview = allSteps?.slice(stepIndex + 1, stepIndex + 3).map((s: string, i: number) =>
      `${stepIndex + 2 + i}. ${s}`
    ).join(', ') || '';

    const systemPrompt = `You are a UI-constrained task assistant. Follow these STRICT rules:

1. MAX 120 characters per message. Be extremely concise.
2. Output ONLY valid JSON - no other text.
3. NEVER auto-advance steps. User MUST confirm before moving to next step.

TASK: "${taskTitle}"
CURRENT STEP ${stepIndex + 1}/${totalSteps}: "${currentStep}"
${nextStepsPreview ? `NEXT STEPS: ${nextStepsPreview}` : 'This is the FINAL step'}
USER ACTION: ${actionType || "starting"}${stepsContext}

WORKFLOW FOR EACH STEP:
1. Ask for ALL required information for the step. If multiple items are needed (e.g. start AND end date), ask for them or wait until user provides BOTH.
2. DO NOT show "Confirm" action if only partial info is provided.
3. ONLY when user provides ALL info → Show confirmation: "Confirm [summary] and proceed?" with "Confirm & Continue" button.
4. IMPORTANT: For "Select dates", you MUST get both departure and return dates before showing ANY confirm button.
5. PRICES: Always use South African Rands (ZAR/R) for all prices. Do not use USD.

JSON FORMAT:
{
  "message": "Concise response (max 120 chars)",
  "confidence": 85,
  "taskProgress": 50,
  "requiresCorrection": false,
  "readyToAdvance": false,
  "actions": [{"id": "action1", "type": "confirm", "label": "Confirm & Continue"}]
}

ACTION TYPES: confirm, select (with options array), input, date, datetime, retry

PROGRESS VALUES:
- 0-30: Initial prompt for step, showing input actions
- 31-89: User provided some info, but step is NOT complete. Ask for missing info.
- 90-99: ALL info collected. Show summary and "Confirm & Continue" button.
- 100: ONLY when actionType="confirm" - user confirmed, ready for next step

CRITICAL:
1. actionType="confirm" means user clicked confirm → Set taskProgress=100 and readyToAdvance=true
2. Without confirmation, keep taskProgress < 90
3. Always show what info is needed for the current step
4. When showing confirmation, summarize what was entered`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(previousMessages || []),
      { role: "user", content: userMessage },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    console.log("Raw AI response:", content);

    // Parse the JSON response from AI
    let agentResponse: AgentResponse;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // Fallback: try to find the first { and last }
        const firstOpen = content.indexOf('{');
        const lastClose = content.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
          jsonStr = content.substring(firstOpen, lastClose + 1);
        }
      }

      agentResponse = JSON.parse(jsonStr.trim());

      // Enforce 120 char limit
      if (agentResponse.message.length > 120) {
        agentResponse.message = agentResponse.message.substring(0, 117) + "...";
      }

      // Ensure actions have unique IDs
      agentResponse.actions = (agentResponse.actions || []).map((action, i) => ({
        ...action,
        id: action.id || `action-${i}`,
      }));

    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback response
      agentResponse = {
        message: content?.substring(0, 117) + "..." || "I'm here to help. What would you like to do?",
        confidence: 50,
        taskProgress: stepIndex === 0 ? 25 : Math.min(90, ((stepIndex + 1) / totalSteps) * 100),
        requiresCorrection: false,
        actions: [
          { id: "continue", type: "confirm", label: "Continue" },
          { id: "clarify", type: "input", label: "Provide more details" },
        ],
      };
    }

    return new Response(JSON.stringify(agentResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in task-agent:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Sorry, something went wrong. Please try again.",
        confidence: 0,
        taskProgress: 0,
        actions: [{ id: "retry", type: "retry", label: "Retry" }],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
