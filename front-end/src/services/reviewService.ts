import apiClient from "./apiClient";

// ── Types matching backend DTOs ──

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
    /**
     * GET /api/reviews/giftbox/{giftBoxId}
     * Public — returns approved reviews for a gift box
     */
    getGiftBoxReviews: async (giftBoxId: string): Promise<GiftBoxReviewsResponse> => {
        const res = await apiClient.get<GiftBoxReviewsResponse>(
            `/reviews/giftbox/${giftBoxId}`,
        );
        return res.data;
    },

    /**
     * POST /api/reviews
     * Authenticated — create a review for a purchased gift box
     */
    createReview: async (payload: CreateReviewPayload) => {
        const res = await apiClient.post("/reviews", payload);
        return res.data;
    },

    /**
     * GET /api/user/reviews
     * Authenticated — get all reviews by the current user
     */
    getUserReviews: async (): Promise<UserReview[]> => {
        const res = await apiClient.get<UserReview[]>("/user/reviews");
        return res.data;
    },
};
