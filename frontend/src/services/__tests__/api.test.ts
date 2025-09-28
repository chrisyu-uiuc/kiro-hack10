import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GooglePlaceDetails } from '../../types';

// Mock axios before importing ApiService
const mockAxiosInstance = {
    post: vi.fn(),
    interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
    }
};

const mockedAxios = {
    create: vi.fn(() => mockAxiosInstance),
    isAxiosError: vi.fn()
};

vi.mock('axios', () => ({
    default: mockedAxios,
    ...mockedAxios
}));

// Import ApiService after mocking axios
const { ApiService } = await import('../api');

describe('ApiService - Spot Details Integration', () => {
    const mockSpotDetails: GooglePlaceDetails = {
        placeId: 'ChIJ123',
        name: 'Test Museum',
        formattedAddress: '123 Test St, Test City',
        rating: 4.5,
        userRatingsTotal: 1250,
        photos: [
            {
                photoReference: 'photo123',
                width: 400,
                height: 300,
                htmlAttributions: ['Test Attribution']
            }
        ],
        reviews: [
            {
                authorName: 'John Doe',
                language: 'en',
                rating: 5,
                relativeTimeDescription: '2 weeks ago',
                text: 'Great museum!',
                time: 1640995200
            }
        ],
        openingHours: {
            openNow: true,
            periods: [],
            weekdayText: ['Monday: 9:00 AM – 5:00 PM']
        },
        websiteUri: 'https://testmuseum.com',
        googleMapsUri: 'https://maps.google.com/?cid=123'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockAxiosInstance.post.mockReset();
        ApiService.clearSpotDetailsCache();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('fetchSpotDetails', () => {
        it('should successfully fetch spot details', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: mockSpotDetails
                }
            });

            const result = await ApiService.fetchSpotDetails('spot1', 'Test Museum', 'Test City');

            expect(result).toEqual(mockSpotDetails);
            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                '/spots/spot1/details',
                {
                    spotName: 'Test Museum',
                    spotLocation: 'Test City'
                }
            );
        });

        it('should handle API errors properly', async () => {
            const errorResponse = {
                response: {
                    status: 404,
                    data: { error: 'Spot not found' }
                }
            };

            mockAxiosInstance.post.mockRejectedValueOnce(errorResponse);
            mockedAxios.isAxiosError.mockReturnValueOnce(true);

            await expect(
                ApiService.fetchSpotDetails('spot1', 'Nonexistent Place')
            ).rejects.toThrow('Spot information not found');
        });

        it('should handle rate limiting errors', async () => {
            const errorResponse = {
                response: {
                    status: 429,
                    data: { error: 'Rate limit exceeded' }
                }
            };

            mockAxiosInstance.post.mockRejectedValueOnce(errorResponse);
            mockedAxios.isAxiosError.mockReturnValueOnce(true);

            await expect(
                ApiService.fetchSpotDetails('spot1', 'Test Museum')
            ).rejects.toThrow('Too many requests');
        });

        it('should handle server errors', async () => {
            const errorResponse = {
                response: {
                    status: 500,
                    data: { error: 'Internal server error' }
                }
            };

            mockAxiosInstance.post.mockRejectedValueOnce(errorResponse);
            mockedAxios.isAxiosError.mockReturnValueOnce(true);

            await expect(
                ApiService.fetchSpotDetails('spot1', 'Test Museum')
            ).rejects.toThrow('Server error');
        });

        it('should handle network errors', async () => {
            const networkError = new Error('Network Error');
            (networkError as any).code = 'ECONNABORTED';

            mockAxiosInstance.post.mockRejectedValueOnce(networkError);
            mockedAxios.isAxiosError.mockReturnValueOnce(true);

            await expect(
                ApiService.fetchSpotDetails('spot1', 'Test Museum')
            ).rejects.toThrow('Request timeout');
        });
    });

    describe('Request Deduplication', () => {
        it('should deduplicate simultaneous requests for the same spot', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: mockSpotDetails
                }
            });

            // Make multiple simultaneous requests for the same spot
            const promises = [
                ApiService.fetchSpotDetails('spot1', 'Test Museum'),
                ApiService.fetchSpotDetails('spot1', 'Test Museum'),
                ApiService.fetchSpotDetails('spot1', 'Test Museum')
            ];

            const results = await Promise.all(promises);

            // Should only make one API call
            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);

            // All results should be the same
            results.forEach(result => {
                expect(result).toEqual(mockSpotDetails);
            });
        });

        it('should not deduplicate requests for different spots', async () => {
            mockAxiosInstance.post
                .mockResolvedValueOnce({
                    data: { success: true, data: { ...mockSpotDetails, name: 'Museum 1' } }
                })
                .mockResolvedValueOnce({
                    data: { success: true, data: { ...mockSpotDetails, name: 'Museum 2' } }
                });

            const promises = [
                ApiService.fetchSpotDetails('spot1', 'Museum 1'),
                ApiService.fetchSpotDetails('spot2', 'Museum 2')
            ];

            await Promise.all(promises);

            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
        });
    });

    describe('Caching', () => {
        it('should cache successful responses', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: mockSpotDetails
                }
            });

            // First request
            const result1 = await ApiService.fetchSpotDetails('spot1', 'Test Museum');

            // Second request (should use cache)
            const result2 = await ApiService.fetchSpotDetails('spot1', 'Test Museum');

            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(mockSpotDetails);
            expect(result2).toEqual(mockSpotDetails);
        });

        it('should expire cache after timeout', async () => {
            mockAxiosInstance.post
                .mockResolvedValueOnce({
                    data: { success: true, data: mockSpotDetails }
                })
                .mockResolvedValueOnce({
                    data: { success: true, data: { ...mockSpotDetails, rating: 4.8 } }
                });

            // First request
            await ApiService.fetchSpotDetails('spot1', 'Test Museum');

            // Advance time beyond cache duration (5 minutes)
            vi.advanceTimersByTime(6 * 60 * 1000);

            // Second request (should make new API call)
            const result2 = await ApiService.fetchSpotDetails('spot1', 'Test Museum');

            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
            expect(result2.rating).toBe(4.8);
        });

        it('should clear cache when requested', async () => {
            mockAxiosInstance.post
                .mockResolvedValueOnce({
                    data: { success: true, data: mockSpotDetails }
                })
                .mockResolvedValueOnce({
                    data: { success: true, data: { ...mockSpotDetails, rating: 4.8 } }
                });

            // First request
            await ApiService.fetchSpotDetails('spot1', 'Test Museum');

            // Clear cache
            ApiService.clearSpotDetailsCache();

            // Second request (should make new API call)
            const result2 = await ApiService.fetchSpotDetails('spot1', 'Test Museum');

            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
            expect(result2.rating).toBe(4.8);
        });
    });

    describe('Retry Logic', () => {
        it('should retry on server errors', async () => {
            const serverError = {
                response: { status: 500 }
            };

            mockAxiosInstance.post
                .mockRejectedValueOnce(serverError)
                .mockRejectedValueOnce(serverError)
                .mockResolvedValueOnce({
                    data: { success: true, data: mockSpotDetails }
                });

            mockedAxios.isAxiosError.mockReturnValue(true);

            // Use a unique spot ID to avoid cache interference
            const result = await ApiService.fetchSpotDetails('retry-spot-1', 'Retry Test Museum');

            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
            expect(result).toEqual(mockSpotDetails);
        });

        it('should retry on timeout errors', async () => {
            const timeoutError = new Error('Timeout');
            (timeoutError as any).code = 'ECONNABORTED';

            mockAxiosInstance.post
                .mockRejectedValueOnce(timeoutError)
                .mockResolvedValueOnce({
                    data: { success: true, data: mockSpotDetails }
                });

            mockedAxios.isAxiosError.mockReturnValue(true);

            const result = await ApiService.fetchSpotDetails('retry-spot-2', 'Retry Test Museum 2');

            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
            expect(result).toEqual(mockSpotDetails);
        });

        it('should not retry on client errors', async () => {
            const clientError = {
                response: { status: 404 }
            };

            mockAxiosInstance.post.mockRejectedValueOnce(clientError);
            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(
                ApiService.fetchSpotDetails('retry-spot-3', 'Retry Test Museum 3')
            ).rejects.toThrow();

            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
        });

        it('should stop retrying after maximum attempts', async () => {
            const serverError = {
                response: { status: 500 }
            };

            mockAxiosInstance.post
                .mockRejectedValueOnce(serverError)
                .mockRejectedValueOnce(serverError)
                .mockRejectedValueOnce(serverError);

            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(
                ApiService.fetchSpotDetails('retry-spot-4', 'Retry Test Museum 4')
            ).rejects.toThrow();

            // Should try 3 times total (initial + 2 retries)
            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
        });
    });

    describe('Loading and Error States', () => {
        it('should handle unsuccessful API responses', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({
                data: {
                    success: false,
                    error: 'Place not found in Google Places'
                }
            });

            await expect(
                ApiService.fetchSpotDetails('error-spot-1', 'Error Test Museum 1')
            ).rejects.toThrow('Place not found in Google Places');
        });

        it('should handle missing data in successful responses', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: null
                }
            });

            await expect(
                ApiService.fetchSpotDetails('error-spot-2', 'Error Test Museum 2')
            ).rejects.toThrow('Failed to fetch spot details');
        });
    });

    describe('Cache Statistics', () => {
        it('should provide accurate cache statistics', async () => {
            mockAxiosInstance.post.mockResolvedValue({
                data: { success: true, data: mockSpotDetails }
            });

            // Initially empty
            let stats = ApiService.getCacheStats();
            expect(stats.cacheSize).toBe(0);
            expect(stats.pendingRequests).toBe(0);

            // After successful request
            await ApiService.fetchSpotDetails('spot7', 'Test Museum 7');

            stats = ApiService.getCacheStats();
            expect(stats.cacheSize).toBe(1);
            expect(stats.pendingRequests).toBe(0);
        });
    });

    describe('URL Encoding', () => {
        it('should properly encode spot IDs in URLs', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({
                data: { success: true, data: mockSpotDetails }
            });

            await ApiService.fetchSpotDetails('spot with spaces', 'Test Museum 8');

            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                '/spots/spot%20with%20spaces/details',
                expect.any(Object)
            );
        });
    });
});