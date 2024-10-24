import { AIProvider } from './ai-providers.ts';

export class OpenAIProvider implements AIProvider {
  async analyzeImage(image: string): Promise<any> {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract and analyze the product ingredients from this photo to determine whether or not the product is vegan. Ignore anything in the photo that does not appear to be ingredients. Return a plain JSON object with the following fields: isVegan, ingredients, reason. Do not format the JSON as a code block.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image.split(',')[1]}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error", response.statusText);
      const errorBody = await response.text();
      console.error("Error body:", errorBody);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    return await response.json();
  }
}
