import apiClient from './apiClient';

export interface GiftBoxReviewItem {
  ReviewId: string;
  UserName: string;
  Rating: number;
  Content: string;
  CreatedAt: string;
}

export interface GiftBoxReviewsResponse {
  GiftBoxId: string;
  AverageRating: number;
  TotalReviews: number;
  Reviews: GiftBoxReviewItem[];
}

export interface CreateReviewPayload {
  OrderId: string;
  GiftBoxId: string;
  Rating: number;
  Content: string;
}

export interface UserReview {
  ReviewId: string;
  GiftBoxId: string;
  GiftBoxName: string;
  Rating: number;
  Content: string;
  Status: string;
  CreatedAt: string;
}

export const reviewService = {
  getGiftBoxReviews: async (giftBoxId: string): Promise<GiftBoxReviewsResponse> => {
    const res = await apiClient.get<GiftBoxReviewsResponse>(
      `/reviews/giftbox/${giftBoxId}`,
    );
    return res.data;
  },

  createReview: async (payload: CreateReviewPayload) => {
    const res = await apiClient.post('/reviews', payload);
    return res.data;
  },

  getUserReviews: async (): Promise<UserReview[]> => {
    const res = await apiClient.get<UserReview[]>('/user/reviews');
    return res.data;
  },
};
