/**
 * AI Service - Tương đương AiService.cs
 * Sử dụng OpenAI-compatible LLM API
 */
export class AiService {
    constructor(apiKey, baseUrl, model) {
        this.apiKey = apiKey || process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY || '';
        const configuredBaseUrl = baseUrl || process.env.LLM_BASE_URL || 'https://api.vilao.ai/v1';
        this.baseUrl = `${configuredBaseUrl.replace(/\/$/, '')}/chat/completions`;
        this.model = model || process.env.LLM_MODEL || 'ram/gemini-3.5-flash-low';
    }

    /**
     * Gửi message đến AI và nhận response
     * @param {string} message
     * @returns {Promise<string>}
     */
    async ask(message) {
        if (!this.apiKey) {
            throw new Error('LLM API key not configured. Set LLM_API_KEY.');
        }

        const requestBody = {
            model: this.model,
            messages: Array.isArray(message) ? message : [{ role: 'user', content: message }],
            max_tokens: 1000,
        };

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost',
                'X-Title': 'ShopHangTet',
            },
            body: JSON.stringify(requestBody),
        });

        const json = await response.json();

        if (!response.ok) {
            throw new Error(JSON.stringify(json));
        }

        return json?.choices?.[0]?.message?.content || '';
    }
}
