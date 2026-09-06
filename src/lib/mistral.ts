interface MistralOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
}

export async function callMistral(
  systemPrompt: string,
  userMessage: string,
  options: MistralOptions = {}
): Promise<string> {
  const explicitKeys = [
    process.env.MISTRAL_API_KEY,
    process.env.MISTRAL_API_KEY_1,
    process.env.MISTRAL_API_KEY_2,
    process.env.MISTRAL_API_KEY_3,
    process.env.MISTRAL_API_KEY_4,
    process.env.MISTRAL_API_KEY_5,
    process.env.MISTRAL_API_KEY_6,
    process.env.MISTRAL_API_KEY_7,
    process.env.MISTRAL_API_KEY_8,
    process.env.MISTRAL_API_KEY_9,
    process.env.MISTRAL_API_KEY_10,
    process.env.MISTRAL_API_KEY_11,
    process.env.MISTRAL_API_KEY_12,
    process.env.MISTRAL_API_KEY_13,
    process.env.MISTRAL_API_KEY_14,
    process.env.MISTRAL_API_KEY_15,
    process.env.MISTRAL_API_KEY_16,
    process.env.MISTRAL_API_KEY_17,
    process.env.MISTRAL_API_KEY_18,
    process.env.MISTRAL_API_KEY_19,
    process.env.MISTRAL_API_KEY_20,
    process.env.MISTRAL_API_KEY_21,
    process.env.MISTRAL_API_KEY_22,
    process.env.MISTRAL_API_KEY_23,
    process.env.MISTRAL_API_KEY_24,
  ];

  const envKeys = Object.keys(process.env)
    .filter(k => k.startsWith("MISTRAL_API_KEY"))
    .map(k => process.env[k]);

  const rawKeys = [...explicitKeys, ...envKeys];
  const keys = Array.from(new Set(rawKeys.filter(k => k && k !== "your_mistral_api_key_here"))) as string[];

  if (keys.length === 0) {
    throw new Error("No MISTRAL_API_KEY found in environment variables.");
  }

  const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);
  let lastError: Error | null = null;
  const primaryModel = options.model || "codestral-latest";
  const candidateModels = [primaryModel, "open-mistral-nemo"];

  for (const apiKey of shuffledKeys) {
    for (const model of candidateModels) {
      try {
        const payload = {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: options.temperature ?? 0.65,
          max_tokens: options.max_tokens ?? 1000,
          ... (options.response_format ? { response_format: options.response_format } : {}),
        };

        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(`Mistral API error (${model}): ${response.status} ${response.statusText} ${errorData ? JSON.stringify(errorData) : ""}`);
        }

        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
          throw new Error("No choices returned from Mistral API.");
        }

        return data.choices[0].message.content;
      } catch (err: any) {
        lastError = err;
        console.error(`Key ending in ${apiKey.slice(-4)} (${model}) failed: ${err.message}`);
        // If primary model failed due to tier restriction or 404, inner loop continues to candidate fallback model
      }
    }
  }

  throw lastError || new Error("All Mistral keys failed.");
}
