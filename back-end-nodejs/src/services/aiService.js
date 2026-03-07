/**
 * AI Service - Tương đương AiService.cs
 * Sử dụng OpenRouter API
 */
export class AiService {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }

    /**
     * Gửi message đến AI và nhận response
     * @param {string} message
     * @returns {Promise<string>}
     */
    async ask(message) {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured');
        }

        const requestBody = {
            model: 'qwen/qwen3-vl-235b-a22b-thinking',
            messages: [{ role: 'user', content: message }],
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
