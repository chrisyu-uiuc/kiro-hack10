import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PhotoGallery from '../PhotoGallery';
import { PlacePhoto } from '@/types';

// Mock intersection observer
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

describe('PhotoGallery Mobile Functionality', () => {
    const mockPhotos: PlacePhoto[] = [
        {
            photoReference: 'photo1',
            height: 400,
            width: 600,
            htmlAttributions: ['Attribution 1']
        },
        {
            photoReference: 'photo2',
            height: 400,
            width: 600,
            htmlAttributions: ['Attribution 2']
        },
        {
            photoReference: 'photo3',
            height: 400,
            width: 600,
            htmlAttributions: ['Attribution 3']
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock mobile viewport
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 375, // iPhone width
        });

        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 667, // iPhone height
        });

        // Mock device pixel ratio
        Object.defineProperty(window, 'devicePixelRatio', {
            writable: true,
            configurable: true,
            value: 2,
        });
    });

    describe('Mobile Image Optimization', () => {
        it('should optimize image sizes for mobile devices', async () => {
            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                const mainImage = screen.getByAltText(/Test Gallery - Photo 1 of 3/);
                expect(mainImage).toBeInTheDocument();

                // Check that image src includes optimized width for mobile
                const src = mainImage.getAttribute('src');
                expect(src).toContain('maxwidth=750'); // 375 * 2 (device pixel ratio)
            });
        });

        it('should use different image sizes for thumbnails', async () => {
            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                const thumbnails = screen.getAllByAltText(/Thumbnail \d+/);
                expect(thumbnails).toHaveLength(3);

                thumbnails.forEach(thumbnail => {
                    const src = thumbnail.getAttribute('src');
                    expect(src).toContain('maxwidth=150');
                });
            });
        });

        it('should handle device pixel ratio correctly', async () => {
            // Test with different device pixel ratios
            Object.defineProperty(window, 'devicePixelRatio', { value: 3 });

            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                const mainImage = screen.getByAltText(/Test Gallery - Photo 1 of 3/);
                const src = mainImage.getAttribute('src');
                expect(src).toContain('maxwidth=1125'); // 375 * 3
            });
        });
    });

    describe('Touch Navigation', () => {
        it('should handle swipe left to go to next photo', async () => {
            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                const gallery = screen.getByRole('region', { name: 'Photo gallery' });

                // Simulate swipe left (next photo)
                fireEvent.touchStart(gallery, {
                    touches: [{ clientX: 200, clientY: 200 }]
                });

                fireEvent.touchMove(gallery, {
                    touches: [{ clientX: 100, clientY: 200 }] // 100px left
                });

                fireEvent.touchEnd(gallery);

                // Should show second photo
                expect(screen.getByText('2 / 3')).toBeInTheDocument();
            });
        });

        it('should handle swipe right to go to previous photo', async () => {
            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                const gallery = screen.getByRole('region', { name: 'Photo gallery' });

                // First go to second photo
                const nextButton = screen.getByLabelText('Next photo');
                fireEvent.click(nextButton);

                expect(screen.getByText('2 / 3')).toBeInTheDocument();

                // Then swipe right (previous photo)
                fireEvent.touchStart(gallery, {
                    touches: [{ clientX: 100, clientY: 200 }]
                });

                fireEvent.touchMove(gallery, {
                    touches: [{ clientX: 200, clientY: 200 }] // 100px right
                });

                fireEvent.touchEnd(gallery);

                // Should show first photo again
                expect(screen.getByText('1 / 3')).toBeInTheDocument();
            });
        });

        it('should ignore small swipe gestures', async () => {
            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                const gallery = screen.getByRole('region', { name: 'Photo gallery' });

                // Simulate small swipe (below threshold)
                fireEvent.touchStart(gallery, {
                    touches: [{ clientX: 200, clientY: 200 }]
                });

                fireEvent.touchMove(gallery, {
                    touches: [{ clientX: 180, clientY: 200 }] // 20px left (below 50px threshold)
                });

                fireEvent.touchEnd(gallery);

                // Should still show first photo
                expect(screen.getByText('1 / 3')).toBeInTheDocument();
            });
        });

        it('should handle touch events without interfering with scrolling', async () => {
            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                const gallery = screen.getByRole('region', { name: 'Photo gallery' });

                // Simulate vertical scroll gesture (should not change photos)
                fireEvent.touchStart(gallery, {
                    touches: [{ clientX: 200, clientY: 100 }]
                });

                fireEvent.touchMove(gallery, {
                    touches: [{ clientX: 200, clientY: 200 }] // 100px down
                });

                fireEvent.touchEnd(gallery);

                // Should still show first photo
                expect(screen.getByText('1 / 3')).toBeInTheDocument();
            });
        });
    });

    describe('Lazy Loading', () => {
        it('should implement intersection observer for lazy loading', () => {
            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            // Verify intersection observer was created
            expect(mockIntersectionObserver).toHaveBeenCalledWith(
                expect.any(Function),
                expect.objectContaining({
                    rootMargin: '50px',
                    threshold: 0.1
                })
            );
        });

        it('should load images when they become visible', async () => {
            const mockObserver = {
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
            };

            mockIntersectionObserver.mockReturnValue(mockObserver);

            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                // Should observe image elements
                expect(mockObserver.observe).toHaveBeenCalled();
            });
        });

        it('should preload first few images immediately', async () => {
            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                // First image should be loaded immediately
                const mainImage = screen.getByAltText(/Test Gallery - Photo 1 of 3/);
                expect(mainImage.getAttribute('src')).toBeTruthy();

                // First few thumbnails should also be loaded
                const thumbnails = screen.getAllByAltText(/Thumbnail \d+/);
                thumbnails.slice(0, 3).forEach(thumbnail => {
                    expect(thumbnail.getAttribute('src')).toBeTruthy();
                });
            });
        });

        it('should handle intersection observer entries correctly', async () => {
            let intersectionCallback: (entries: any[]) => void;

            const mockObserver = {
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
            };

            mockIntersectionObserver.mockImplementation((callback) => {
                intersectionCallback = callback;
                return mockObserver;
            });

            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                // Simulate intersection observer callback
                const mockEntry = {
                    isIntersecting: true,
                    target: {
                        getAttribute: vi.fn().mockReturnValue('1')
                    }
                };

                act(() => {
                    intersectionCallback([mockEntry]);
                });

                // Should handle the intersection correctly
                expect(mockEntry.target.getAttribute).toHaveBeenCalledWith('data-index');
            });
        });
    });

    describe('Performance Optimizations', () => {
        it('should handle rapid touch events efficiently', async () => {
            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                const gallery = screen.getByRole('region', { name: 'Photo gallery' });

                // Simulate rapid touch events
                for (let i = 0; i < 20; i++) {
                    fireEvent.touchStart(gallery, {
                        touches: [{ clientX: 200 + i, clientY: 200 }]
                    });

                    fireEvent.touchMove(gallery, {
                        touches: [{ clientX: 100 + i, clientY: 200 }]
                    });

                    fireEvent.touchEnd(gallery);
                }

                // Should handle events without crashing
                expect(gallery).toBeInTheDocument();
            });
        });

        it('should clean up event listeners on unmount', () => {
            const mockObserver = {
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
            };

            mockIntersectionObserver.mockReturnValue(mockObserver);

            const { unmount } = render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            unmount();

            // Should disconnect observer on unmount
            expect(mockObserver.disconnect).toHaveBeenCalled();
        });

        it('should handle empty photos array gracefully', () => {
            render(<PhotoGallery photos={[]} altText="Test Gallery" />);

            expect(screen.getByText('No photos available')).toBeInTheDocument();
        });

        it('should reset state when photos change', async () => {
            const { rerender } = render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                // Navigate to second photo
                const nextButton = screen.getByLabelText('Next photo');
                fireEvent.click(nextButton);
                expect(screen.getByText('2 / 3')).toBeInTheDocument();
            });

            // Change photos
            const newPhotos = [mockPhotos[0]]; // Only one photo
            rerender(<PhotoGallery photos={newPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                // Should reset to first photo and not show counter for single photo
                expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
            });
        });
    });

    describe('Responsive Behavior', () => {
        it('should adapt to different screen sizes', async () => {
            // Test tablet size
            Object.defineProperty(window, 'innerWidth', { value: 768 });

            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            await waitFor(() => {
                const mainImage = screen.getByAltText(/Test Gallery - Photo 1 of 3/);
                const src = mainImage.getAttribute('src');
                // Should use larger image size for tablet
                expect(src).toContain('maxwidth=800'); // Default maxWidth for non-mobile
            });
        });

        it('should handle orientation changes', async () => {
            render(<PhotoGallery photos={mockPhotos} altText="Test Gallery" />);

            // Simulate orientation change
            act(() => {
                Object.defineProperty(window, 'innerWidth', { value: 667 });
                Object.defineProperty(window, 'innerHeight', { value: 375 });
                fireEvent(window, new Event('orientationchange'));
            });

            await waitFor(() => {
                const gallery = screen.getByRole('region', { name: 'Photo gallery' });
                expect(gallery).toBeInTheDocument();
            });
        });
    });
});