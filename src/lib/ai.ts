import Cerebras from '@cerebras/cerebras_cloud_sdk'

let client: Cerebras | null = null

function getClient(): Cerebras {
  if (!client) {
    client = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY })
  }
  return client
}

export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const cerebras = getClient()
  const response = await cerebras.chat.completions.create({
    model: 'llama3.1-8b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: options?.maxTokens ?? 4096,
    temperature: options?.temperature ?? 0.7,
  })
  const choices = response.choices as Array<{ message?: { content?: string } }>
  return choices[0]?.message?.content || ''
}
