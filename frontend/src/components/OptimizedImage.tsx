import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SessionCache } from '../utils/cache.js';
import { ImagePerformanceTracker } from '../utils/performance.js';

interface OptimizedImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    style?: React.CSSProperties;
    placeholder?: string;
    onLoad?: () => void;
    onError?: () => void;
    lazy?: boolean;
    quality?: 'low' | 'medium' | 'high';
}

interface ImageState {
    isLoading: boolean;
    isLoaded: boolean;
    hasError: boolean;
    currentSrc: string | null;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    alt,
    width,
    height,
    className = '',
    style = {},
    placeholder,
    onLoad,
    onError,
    lazy = true,
    quality = 'medium'
}) => {
    const [imageState, setImageState] = useState<ImageState>({
        isLoading: true,
        isLoaded: false,
        hasError: false,
        currentSrc: null
    });

    const imgRef = useRef<HTMLImageElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [isInView, setIsInView] = useState(!lazy);

    // Generate optimized image URL based on quality and dimensions
    const getOptimizedSrc = useCallback((originalSrc: string): string => {
        // For Google Places photos, add size parameters
        if (originalSrc.includes('googleusercontent.com') || originalSrc.includes('maps.googleapis.com')) {
            const url = new URL(originalSrc);

            // Set size based on quality and provided dimensions
            let maxWidth = width || 400;
            if (quality === 'low') maxWidth = Math.min(maxWidth, 200);
            else if (quality === 'high') maxWidth = Math.min(maxWidth, 800);

            url.searchParams.set('w', maxWidth.toString());
            if (height) {
                url.searchParams.set('h', height.toString());
            }

            return url.toString();
        }

        return originalSrc;
    }, [src, width, height, quality]);

    // Load image with caching
    const loadImage = useCallback(async (imageSrc: string) => {
        // Check cache first
        const cachedUrl = SessionCache.getImageCache(imageSrc);
        if (cachedUrl) {
            setImageState(prev => ({
                ...prev,
                isLoading: false,
                isLoaded: true,
                hasError: false,
                currentSrc: cachedUrl
            }));
            onLoad?.();
            return;
        }

        setImageState(prev => ({ ...prev, isLoading: true, hasError: false }));
        ImagePerformanceTracker.startImageLoad(imageSrc);

        try {
            // Create a new image element to preload
            const img = new Image();

            const loadPromise = new Promise<void>((resolve, reject) => {
                img.onload = () => {
                    ImagePerformanceTracker.endImageLoad(imageSrc, true);

                    // Create blob URL for caching
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    if (ctx) {
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        ctx.drawImage(img, 0, 0);

                        canvas.toBlob((blob) => {
                            if (blob) {
                                const blobUrl = URL.createObjectURL(blob);
                                SessionCache.setImageCache(imageSrc, blobUrl, 30 * 60 * 1000); // 30 minutes

                                setImageState(prev => ({
                                    ...prev,
                                    isLoading: false,
                                    isLoaded: true,
                                    hasError: false,
                                    currentSrc: blobUrl
                                }));

                                onLoad?.();
                                resolve();
                            } else {
                                // Fallback to original URL if blob creation fails
                                setImageState(prev => ({
                                    ...prev,
                                    isLoading: false,
                                    isLoaded: true,
                                    hasError: false,
                                    currentSrc: imageSrc
                                }));
                                onLoad?.();
                                resolve();
                            }
                        }, 'image/jpeg', 0.8);
                    } else {
                        // Fallback if canvas is not supported
                        setImageState(prev => ({
                            ...prev,
                            isLoading: false,
                            isLoaded: true,
                            hasError: false,
                            currentSrc: imageSrc
                        }));
                        onLoad?.();
                        resolve();
                    }
                };

                img.onerror = () => {
                    ImagePerformanceTracker.endImageLoad(imageSrc, false);
                    reject(new Error('Image failed to load'));
                };
            });

            img.src = imageSrc;
            await loadPromise;

        } catch (error) {
            console.warn('Failed to load image:', imageSrc, error);
            setImageState(prev => ({
                ...prev,
                isLoading: false,
                isLoaded: false,
                hasError: true,
                currentSrc: null
            }));
            onError?.();
        }
    }, [onLoad, onError]);

    // Set up intersection observer for lazy loading
    useEffect(() => {
        if (!lazy || !imgRef.current) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observerRef.current?.disconnect();
                }
            },
            {
                rootMargin: '50px' // Start loading 50px before the image comes into view
            }
        );

        observerRef.current.observe(imgRef.current);

        return () => {
            observerRef.current?.disconnect();
        };
    }, [lazy]);

    // Load image when in view
    useEffect(() => {
        if (isInView && src) {
            const optimizedSrc = getOptimizedSrc(src);
            loadImage(optimizedSrc);
        }
    }, [isInView, src, getOptimizedSrc, loadImage]);

    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            if (imageState.currentSrc && imageState.currentSrc.startsWith('blob:')) {
                URL.revokeObjectURL(imageState.currentSrc);
            }
        };
    }, [imageState.currentSrc]);

    const containerStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-block',
        width: width || 'auto',
        height: height || 'auto',
        backgroundColor: '#f0f0f0',
        ...style
    };

    const imageStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transition: 'opacity 0.3s ease-in-out',
        opacity: imageState.isLoaded ? 1 : 0
    };

    const placeholderStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
        color: '#666',
        fontSize: '14px',
        opacity: imageState.isLoaded ? 0 : 1,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: 'none'
    };

    return (
        <div className={className} style={containerStyle}>
            {/* Placeholder */}
            <div style={placeholderStyle}>
                {imageState.isLoading && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '20px',
                            height: '20px',
                            border: '2px solid #ddd',
                            borderTop: '2px solid #007bff',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginBottom: '8px'
                        }} />
                        Loading...
                    </div>
                )}
                {imageState.hasError && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                        {placeholder || 'Image unavailable'}
                    </div>
                )}
                {!imageState.isLoading && !imageState.hasError && !imageState.isLoaded && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                        {placeholder || 'Loading...'}
                    </div>
                )}
            </div>

            {/* Actual image */}
            {imageState.currentSrc && (
                <img
                    ref={imgRef}
                    src={imageState.currentSrc}
                    alt={alt}
                    style={imageStyle}
                    loading={lazy ? 'lazy' : 'eager'}
                />
            )}

            {/* CSS for loading spinner animation */}
            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};