const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { question, answer, domain } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `You are a strict but fair interview coach for ${domain || "tech"} roles. Evaluate the candidate's answer.` },
          { role: "user", content: `Question: ${question}\n\nCandidate Answer: ${answer || "(no answer)"}\n\nEvaluate.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "evaluate",
            parameters: {
              type: "object",
              properties: {
                correctness: { type: "number", description: "0-100" },
                clarity: { type: "number", description: "0-100" },
                confidence: { type: "number", description: "0-100" },
                missingConcepts: { type: "array", items: { type: "string" } },
                feedback: { type: "string" },
                improvedAnswer: { type: "string" },
              },
              required: ["correctness", "clarity", "confidence", "missingConcepts", "feedback", "improvedAnswer"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "evaluate" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: resp.status === 429 ? "Rate limited" : resp.status === 402 ? "Credits exhausted" : "AI error" }), { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
