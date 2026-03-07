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
            const { Message, Language } = req.body;

            if (!Message || !Message.trim()) {
                return res.status(400).json(ApiResponse.error('Message is required.'));
            }

            const language = Language?.trim() || 'Vietnamese';

            const prompt = `Respond in ${language}.\n${Message}`;

            const result = await aiService.ask(prompt);

            return res.status(200).json({ response: result });
        } catch (error) {
            console.error('AI chat error:', error);
            return res.status(500).json(ApiResponse.error(error.message));
        }
    });

    return router;
}
