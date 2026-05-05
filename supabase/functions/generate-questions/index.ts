const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { domain, resumeText, jobDescription, count = 6 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const system = `You are an expert technical interviewer. Generate concise, high-quality interview questions tailored to the candidate's domain, resume, and job description. Mix conceptual, practical, and behavioral questions. Return only via the tool call.`;

    const user = `Domain: ${domain || "General"}\n\nResume (extracted text):\n${resumeText || "Not provided"}\n\nJob Description:\n${jobDescription || "Not provided"}\n\nGenerate ${count} interview questions.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        tools: [{
          type: "function",
          function: {
            name: "return_questions",
            description: "Return interview questions and resume insights",
            parameters: {
              type: "object",
              properties: {
                questions: { type: "array", items: { type: "string" } },
                skills: { type: "array", items: { type: "string" } },
                technologies: { type: "array", items: { type: "string" } },
                projects: { type: "array", items: { type: "string" } },
                requiredSkills: { type: "array", items: { type: "string" } },
                responsibilities: { type: "array", items: { type: "string" } },
              },
              required: ["questions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_questions" } },
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
