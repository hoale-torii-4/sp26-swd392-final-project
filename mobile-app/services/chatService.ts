import apiClient from './apiClient';

export interface ChatResponse {
    response: string;
}

export const chatService = {
    sendMessage: async (message: string, language: string = 'Vi'): Promise<ChatResponse> => {
        const res = await apiClient.post<ChatResponse>('/Ai/chat', {
            message,
            language,
        });
        return res.data;
    },
};
