/**
 * Google Places API Service
 * Handles integration with Google Places API for fetching detailed spot information
 */

export interface PlacePhoto {
  photoReference: string;
  width: number;
  height: number;
  htmlAttributions: string[];
}

export interface PlaceReview {
  authorName: string;
  authorUrl?: string;
  language: string;
  profilePhotoUrl?: string;
  rating: number;
  relativeTimeDescription: string;
  text: string;
  time: number;
}

export interface OpeningHours {
  openNow: boolean;
  periods: OpeningPeriod[];
  weekdayText: string[];
}

export interface OpeningPeriod {
  close?: TimeOfDay;
  open: TimeOfDay;
}

export interface TimeOfDay {
  day: number; // 0-6 (Sunday-Saturday)
  time: string; // HHMM format
}

export interface GooglePlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  rating: number;
  userRatingsTotal: number;
  photos: PlacePhoto[];
  reviews: PlaceReview[];
  openingHours?: OpeningHours;
  websiteUri?: string;
  googleMapsUri: string;
  description?: string;
}

export interface PlacesApiError extends Error {
  status?: string;
  code?: number;
}

export class GooglePlacesService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private readonly findPlaceUrl = `${this.baseUrl}/findplacefromtext/json`;
  private readonly placeDetailsUrl = `${this.baseUrl}/details/json`;
  private readonly photoUrl = `${this.baseUrl}/photo`;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_PLACES_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('Google Places API key is required. Set GOOGLE_PLACES_API_KEY environment variable.');
    }
  }

  /**
   * Find a place by name and optional location
   * @param name - The name of the place to search for
   * @param location - Optional location context (e.g., "New York, NY")
   * @returns Place ID if found, null otherwise
   */
  async findPlaceByName(name: string, location?: string): Promise<string | null> {
    try {
      const query = location ? `${name} ${location}` : name;
      const url = new URL(this.findPlaceUrl);
      
      url.searchParams.append('input', query);
      url.searchParams.append('inputtype', 'textquery');
      url.searchParams.append('fields', 'place_id,name');
      url.searchParams.append('key', this.apiKey);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw this.createApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.candidates && data.candidates.length > 0) {
        return data.candidates[0].place_id;
      }

      if (data.status === 'ZERO_RESULTS') {
        return null;
      }

      throw this.createApiError(`Places API error: ${data.status}`, data.status);
    } catch (error) {
      if (error instanceof Error && error.name === 'PlacesApiError') {
        throw error;
      }
      throw this.createApiError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get comprehensive place details by place ID
   * @param placeId - The Google Places place ID
   * @returns Detailed place information
   */
  async getPlaceDetails(placeId: string): Promise<GooglePlaceDetails> {
    try {
      const url = new URL(this.placeDetailsUrl);
      
      const fields = [
        'place_id',
        'name',
        'formatted_address',
        'rating',
        'user_ratings_total',
        'photos',
        'reviews',
        'opening_hours',
        'website',
        'url',
        'editorial_summary'
      ].join(',');

      url.searchParams.append('place_id', placeId);
      url.searchParams.append('fields', fields);
      url.searchParams.append('key', this.apiKey);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw this.createApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        return this.transformPlaceDetails(data.result);
      }

      if (data.status === 'NOT_FOUND') {
        throw this.createApiError('Place not found', 'NOT_FOUND');
      }

      if (data.status === 'OVER_QUERY_LIMIT') {
        throw this.createApiError('API quota exceeded. Please try again later.', 'OVER_QUERY_LIMIT');
      }

      throw this.createApiError(`Places API error: ${data.status}`, data.status);
    } catch (error) {
      if (error instanceof Error && error.name === 'PlacesApiError') {
        throw error;
      }
      throw this.createApiError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get photo URL for a place photo reference
   * @param photoReference - The photo reference from place details
   * @param maxWidth - Maximum width of the photo (default: 400)
   * @returns Photo URL
   */
  getPlacePhotoUrl(photoReference: string, maxWidth: number = 400): string {
    const url = new URL(this.photoUrl);
    url.searchParams.append('photoreference', photoReference);
    url.searchParams.append('maxwidth', maxWidth.toString());
    url.searchParams.append('key', this.apiKey);
    return url.toString();
  }

  /**
   * Transform Google Places API response to our interface
   */
  private transformPlaceDetails(result: any): GooglePlaceDetails {
    const photos: PlacePhoto[] = (result.photos || []).map((photo: any) => ({
      photoReference: photo.photo_reference,
      width: photo.width,
      height: photo.height,
      htmlAttributions: photo.html_attributions || []
    }));

    const reviews: PlaceReview[] = (result.reviews || []).map((review: any) => ({
      authorName: review.author_name,
      authorUrl: review.author_url,
      language: review.language,
      profilePhotoUrl: review.profile_photo_url,
      rating: review.rating,
      relativeTimeDescription: review.relative_time_description,
      text: review.text,
      time: review.time
    }));

    let openingHours: OpeningHours | undefined;
    if (result.opening_hours) {
      openingHours = {
        openNow: result.opening_hours.open_now || false,
        periods: (result.opening_hours.periods || []).map((period: any) => ({
          close: period.close ? {
            day: period.close.day,
            time: period.close.time
          } : undefined,
          open: {
            day: period.open.day,
            time: period.open.time
          }
        })),
        weekdayText: result.opening_hours.weekday_text || []
      };
    }

    return {
      placeId: result.place_id,
      name: result.name,
      formattedAddress: result.formatted_address || '',
      rating: result.rating || 0,
      userRatingsTotal: result.user_ratings_total || 0,
      photos,
      reviews,
      openingHours,
      websiteUri: result.website,
      googleMapsUri: result.url || `https://maps.google.com/?place_id=${result.place_id}`,
      description: result.editorial_summary?.overview
    };
  }

  /**
   * Create a standardized API error
   */
  private createApiError(message: string, status?: string | number): PlacesApiError {
    const error = new Error(message) as PlacesApiError;
    error.name = 'PlacesApiError';
    error.status = typeof status === 'string' ? status : undefined;
    error.code = typeof status === 'number' ? status : undefined;
    return error;
  }
}