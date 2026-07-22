import { Router } from 'express';
import { ApiResponse } from '../dtos/index.js';

/**
 * AI Controller - Tương đương AiController.cs
 * Routes: /api/ai
 */
export function createAiRouter(aiService) {
    const router = Router();

    // ========== POST /api/ai/chat ==========
    router.post('/chat', async (req, res) => {
        try {
            // Accept the current chat-box payload (`messages`, `language`) and
            // the legacy single-message payload for backwards compatibility.
            const { messages, language, Message, Language } = req.body;
            const history = Array.isArray(messages) ? messages : [];
            const lastMessage = history
                .slice()
                .reverse()
                .find((item) => item && item.sender?.toUpperCase() !== 'BOT' && item.sender?.toUpperCase() !== 'STAFF')
                ?.message || Message;

            if (!lastMessage || !String(lastMessage).trim()) {
                return res.status(400).json(ApiResponse.error('Message is required.'));
            }

            const responseLanguage = (language || Language || 'Vietnamese').trim();
            const promptMessages = history.length
                ? history.map((item) => ({
                    role: item.sender?.toUpperCase() === 'BOT' || item.sender?.toUpperCase() === 'STAFF' ? 'assistant' : 'user',
                    content: item.message,
                }))
                : [{ role: 'user', content: String(lastMessage) }];

            promptMessages.unshift({
                role: 'system',
                content: `Respond in ${responseLanguage}.`,
            });

            const result = await aiService.ask(promptMessages);

            return res.status(200).json({ response: result });
        } catch (error) {
            console.error('AI chat error:', error);
            return res.status(500).json(ApiResponse.error(error.message));
        }
    });

    return router;
}
