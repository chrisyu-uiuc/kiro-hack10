/**
 * Google Maps API Service
 * Handles geocoding, distance calculations, and route optimization
 * Following node11.js patterns for real travel time calculations
 */

import { googleMapsLogger } from '../utils/googleMapsLogger.js';
import { geocodingCache } from './GeocodingCache.js';
import { routeOptimizationMonitor } from './RouteOptimizationMonitor.js';

// Error Types
export class GoogleMapsApiError extends Error {
  public statusCode: number;
  public apiStatus: string;
  public quotaExceeded: boolean;
  public rateLimited: boolean;

  constructor(message: string, apiStatus: string, statusCode: number = 500) {
    super(message);
    this.name = 'GoogleMapsApiError';
    this.apiStatus = apiStatus;
    this.statusCode = statusCode;
    this.quotaExceeded = ['OVER_DAILY_LIMIT', 'OVER_QUERY_LIMIT'].includes(apiStatus);
    this.rateLimited = apiStatus === 'OVER_QUERY_LIMIT';
    
    Error.captureStackTrace(this, GoogleMapsApiError);
  }
}

// API Response Types
interface GeocodingResponse {
  status: string;
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }>;
}

interface RoutesResponse {
  routes?: Array<{
    duration?: string;
    distanceMeters?: number;
    legs?: Array<{
      duration?: string;
      distanceMeters?: number;
    }>;
  }>;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TravelTime {
  duration: number; // seconds
  distance: number; // meters
  durationText: string; // "15 mins"
  distanceText: string; // "1.2 km"
}

export interface RouteStep {
  from: string;
  to: string;
  travelTime: TravelTime;
  mode: 'walking' | 'driving' | 'transit';
  navigationUrl: string;
}

export interface OptimizedRoute {
  orderedSpots: string[];
  totalTravelTime: number;
  totalDistance: number;
  routeSteps: RouteStep[];
}

export interface ScheduleItem {
  time: string;
  spot: string;
  duration: string;
  arrivalTime: string;
  departureTime: string;
  transportation?: string;
  travelTime?: string;
  navigationUrl?: string;
  notes?: string;
}

export interface OptimizedItinerary {
  title: string;
  totalDuration: string;
  totalTravelTime: string;
  schedule: ScheduleItem[];
  route: OptimizedRoute;
}

export class GoogleMapsService {
  private readonly apiKey: string;
  private readonly geocodingUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  private readonly routesUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  private requestCount = 0;

  constructor(apiKey?: string) {
    // Use dedicated Google Maps API key, fallback to Google Places API key for backward compatibility
    this.apiKey = apiKey || process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || '';
    
    if (!this.apiKey) {
      this.logWarning('Google Maps API key not provided - service will use fallback behavior');
    } else if (this.apiKey === 'YOUR_GOOGLE_API_KEY' || this.apiKey === 'your_google_maps_api_key_here') {
      this.logWarning('Please set your GOOGLE_MAPS_API_KEY in environment variables and restart the server');
    } else {
      this.logInfo('Google Maps Service initialized with API key');
    }
  }

  /**
   * Enhanced logging methods
   */
  private logInfo(message: string, data?: any): void {
    console.log(`🗺️ [GoogleMaps] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  private logWarning(message: string, data?: any): void {
    console.warn(`⚠️ [GoogleMaps] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  private logError(message: string, error?: any, data?: any): void {
    console.error(`❌ [GoogleMaps] ${message}`);
    if (error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(data && { additionalData: data })
      });
    }
  }

  /**
   * Rate limiting and request tracking
   */
  private trackRequest(apiEndpoint: string, requestData: any): string {
    this.requestCount++;
    
    const requestId = googleMapsLogger.logRequest(apiEndpoint, 'GET', requestData);
    this.logInfo(`API request #${this.requestCount} (${requestId}) at ${new Date().toISOString()}`);
    
    return requestId;
  }

  /**
   * Handle API response and check for errors
   */
  private async handleApiResponse(
    response: Response, 
    apiName: string, 
    requestData?: any, 
    requestId?: string,
    startTime?: number
  ): Promise<any> {
    const responseTime = startTime ? Date.now() - startTime : 0;
    this.logInfo(`${apiName} API response status: ${response.status} (${responseTime}ms)`);
    
    if (!response.ok) {
      const errorText = await response.text();
      const error = {
        status: response.status,
        statusText: response.statusText,
        responseBody: errorText,
        requestData
      };
      
      this.logError(`${apiName} API HTTP error`, null, error);
      
      // Log to Google Maps logger
      if (requestId) {
        googleMapsLogger.logResponse(requestId, 'HTTP_ERROR', responseTime, error);
      }
      
      throw new GoogleMapsApiError(
        `${apiName} API HTTP error: ${response.status} ${response.statusText}`,
        'HTTP_ERROR',
        response.status
      );
    }

    const data = await response.json() as any;
    
    // Log response status
    if (data.status) {
      this.logInfo(`${apiName} API status: ${data.status}`);
    }

    // Check for API-specific errors first
    if (data.status && data.status !== 'OK') {
      const errorDetails = {
        status: data.status,
        errorMessage: data.error_message,
        requestData
      };
      
      this.logError(`${apiName} API error`, null, errorDetails);

      // Handle specific error types
      switch (data.status) {
        case 'OVER_DAILY_LIMIT':
          throw new GoogleMapsApiError(
            `${apiName} API daily quota exceeded. Please check your billing account.`,
            data.status,
            429
          );
        case 'OVER_QUERY_LIMIT':
          throw new GoogleMapsApiError(
            `${apiName} API rate limit exceeded. Please retry after a short delay.`,
            data.status,
            429
          );
        case 'REQUEST_DENIED':
          throw new GoogleMapsApiError(
            `${apiName} API request denied. Please check your API key and permissions.`,
            data.status,
            403
          );
        case 'INVALID_REQUEST':
          throw new GoogleMapsApiError(
            `${apiName} API invalid request: ${data.error_message || 'Invalid parameters'}`,
            data.status,
            400
          );
        case 'UNKNOWN_ERROR':
          throw new GoogleMapsApiError(
            `${apiName} API unknown error. Please retry later.`,
            data.status,
            500
          );
        default:
          throw new GoogleMapsApiError(
            `${apiName} API error: ${data.status} - ${data.error_message || 'Unknown error'}`,
            data.status,
            500
          );
      }
    }

    // Log successful response to Google Maps logger
    if (requestId) {
      googleMapsLogger.logResponse(requestId, data.status || 'OK', responseTime);
    }

    return data;
  }

  /**
   * Geocode a location to get coordinates (following node11.js pattern)
   */
  async geocodeLocation(address: string): Promise<Coordinates | null> {
    const requestData = { address };
    this.logInfo('Starting geocoding request', requestData);

    if (!this.apiKey) {
      this.logWarning('No API key available, returning mock coordinates');
      // Return mock coordinates for testing (spread across a realistic city area)
      // Using Tokyo as base with ~10km spread (roughly 0.1 degree = ~11km)
      const mockCoords = { 
        lat: 35.6762 + (Math.random() - 0.5) * 0.08, // ±4.4km spread
        lng: 139.6503 + (Math.random() - 0.5) * 0.08 // ±4.4km spread
      };
      this.logInfo('Generated mock coordinates', mockCoords);
      return mockCoords;
    }

    try {
      const url = new URL(this.geocodingUrl);
      url.searchParams.append('address', address);
      url.searchParams.append('key', this.apiKey);

      const requestId = this.trackRequest('Geocoding API', requestData);
      const startTime = Date.now();

      this.logInfo('Making geocoding API request', { url: url.toString().replace(this.apiKey, '[API_KEY]') });

      const response = await fetch(url.toString());
      const data = await this.handleApiResponse(response, 'Geocoding', requestData, requestId, startTime) as GeocodingResponse;

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const coordinates = { lat: location.lat, lng: location.lng };
        this.logInfo('Geocoding successful', { address, coordinates });
        return coordinates;
      }

      this.logWarning('No geocoding results found', { address, resultsCount: data.results?.length || 0 });
      return null;

    } catch (error) {
      if (error instanceof GoogleMapsApiError) {
        this.logError('Geocoding API error', error, requestData);
        throw error;
      }
      
      this.logError('Unexpected geocoding error', error, requestData);
      throw new GoogleMapsApiError(
        `Geocoding failed for address: ${address}`,
        'NETWORK_ERROR',
        500
      );
    }
  }

  /**
   * Calculate travel time using Routes API (following node11.js pattern)
   */
  private async calculateRouteTime(
    origin: string,
    destination: string,
    mode: 'walking' | 'driving' | 'transit' = 'walking',
    departureTime?: Date
  ): Promise<TravelTime> {
    const requestData = { origin, destination, mode, departureTime: departureTime?.toISOString() };
    this.logInfo('Starting Routes API calculation', requestData);

    if (!this.apiKey) {
      this.logWarning('No API key available, returning realistic mock travel time');
      return this.calculateFallbackTravelTime(origin, destination, mode);
    }

    try {
      // First geocode the locations (following node11.js pattern)
      this.logInfo('Geocoding locations for Routes API');
      const originCoords = await this.geocodeLocation(origin);
      const destCoords = await this.geocodeLocation(destination);

      if (!originCoords || !destCoords) {
        throw new GoogleMapsApiError(
          'Failed to geocode locations for Routes API',
          'GEOCODING_FAILED',
          400
        );
      }

      // Convert mode to Routes API format
      let travelMode = 'WALK';
      switch (mode) {
        case 'walking': travelMode = 'WALK'; break;
        case 'driving': travelMode = 'DRIVE'; break;
        case 'transit': travelMode = 'TRANSIT'; break;
      }

      const body: any = {
        origin: { 
          location: { 
            latLng: { 
              latitude: originCoords.lat, 
              longitude: originCoords.lng 
            } 
          } 
        },
        destination: { 
          location: { 
            latLng: { 
              latitude: destCoords.lat, 
              longitude: destCoords.lng 
            } 
          } 
        },
        travelMode,
        computeAlternativeRoutes: false,
        languageCode: 'en-US',
        units: 'METRIC'
      };

      // Add mode-specific preferences
      if (mode === 'transit') {
        // Use provided departure time or current time + 5 minutes
        const transitDepartureTime = departureTime || new Date(Date.now() + 5 * 60 * 1000);
        body.departureTime = transitDepartureTime.toISOString();
        
        // Add transit preferences for better results
        body.transitPreferences = {
          allowedTravelModes: ['BUS', 'SUBWAY', 'TRAIN', 'RAIL'],
          routingPreference: 'LESS_WALKING'
        };
      } else if (mode === 'driving') {
        // Only set routing preference for driving mode
        body.routingPreference = 'TRAFFIC_AWARE';
      }
      // Walking and bicycle modes don't support routing preferences

      const requestId = this.trackRequest('Routes API', requestData);
      const startTime = Date.now();

      this.logInfo('Making Routes API request', { 
        origin: originCoords, 
        destination: destCoords,
        travelMode,
        departureTime: departureTime?.toISOString()
      });

      const response = await fetch(this.routesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.duration,routes.legs.distanceMeters'
        },
        body: JSON.stringify(body)
      });

      const data = await this.handleApiResponse(response, 'Routes', requestData, requestId, startTime) as RoutesResponse;

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Parse duration from Routes API v2 response format
        let durationSec = 0;
        let distanceMeters = 0;
        
        if (route.duration) {
          // Duration comes as "123s" format
          durationSec = parseInt(route.duration.replace('s', ''));
        } else if (route.legs && route.legs.length > 0) {
          // Sum up leg durations if route duration not available
          durationSec = route.legs.reduce((sum: number, leg: any) => {
            const legDuration = parseInt(leg.duration?.replace('s', '') || '0');
            return sum + legDuration;
          }, 0);
        }
        
        if (route.distanceMeters) {
          distanceMeters = route.distanceMeters;
        } else if (route.legs && route.legs.length > 0) {
          // Sum up leg distances if route distance not available
          distanceMeters = route.legs.reduce((sum: number, leg: any) => {
            return sum + (leg.distanceMeters || 0);
          }, 0);
        }

        const travelTime = {
          duration: durationSec,
          distance: distanceMeters,
          durationText: this.formatDuration(Math.ceil(durationSec / 60)),
          distanceText: distanceMeters > 1000 
            ? `${(distanceMeters / 1000).toFixed(1)} km`
            : `${distanceMeters} m`
        };

        this.logInfo('Routes API calculation successful', { 
          mode, 
          ...travelTime,
          rawResponse: { 
            routeDuration: route.duration, 
            routeDistance: route.distanceMeters,
            legsCount: route.legs?.length || 0
          }
        });
        return travelTime;
      }

      // If Routes API fails for transit, try driving mode as fallback
      this.logInfo('Checking fallback options', { mode, isTransit: mode === 'transit' });
      if (mode === 'transit') {
        this.logWarning('Routes API returned no routes for transit, trying driving mode as fallback');
        try {
          const drivingTime = await this.calculateRouteTime(origin, destination, 'driving', departureTime);
          // Apply transit multiplier: transit is typically 1.2-1.8x driving time + waiting/walking time
          const transitMultiplier = 1.5; // Transit is slower than driving due to stops and transfers
          const waitingTime = 600 + Math.random() * 600; // 10-20 minutes for waiting and walking to/from stations
          const adjustedDuration = Math.round(drivingTime.duration * transitMultiplier + waitingTime);
          
          const transitTime = {
            duration: adjustedDuration,
            distance: drivingTime.distance,
            durationText: this.formatDuration(Math.ceil(adjustedDuration / 60)),
            distanceText: drivingTime.distanceText
          };
          
          this.logInfo('Transit time estimated from driving data', {
            drivingTime: drivingTime.durationText,
            transitTime: transitTime.durationText,
            waitingTime: Math.round(waitingTime / 60) + 'm'
          });
          
          return transitTime;
        } catch (drivingError) {
          this.logWarning('Driving fallback also failed, using distance-based calculation');
        }
      }
      
      // Final fallback: distance-based calculation
      this.logWarning('Routes API returned no routes, using distance-based fallback calculation');
      return this.calculateFallbackTravelTime(origin, destination, mode);

    } catch (error) {
      if (error instanceof GoogleMapsApiError) {
        this.logError('Routes API error', error, requestData);
      } else {
        this.logError('Unexpected Routes API error', error, requestData);
      }
      
      // Return fallback calculation
      this.logInfo('Using fallback travel time calculation');
      return this.calculateFallbackTravelTime(origin, destination, mode);
    }
  }

  /**
   * Calculate fallback travel time when APIs fail
   */
  private calculateFallbackTravelTime(
    origin: string, 
    destination: string, 
    mode: 'walking' | 'driving' | 'transit'
  ): TravelTime {
    // Generate realistic fallback based on typical city distances
    const baseDistance = 800 + Math.random() * 1200; // 0.8-2.0km (more realistic city distances)
    let speed = 4.5; // km/h walking speed
    let waitingTime = 0; // additional waiting time in seconds
    
    switch (mode) {
      case 'driving': 
        speed = 20; // slower city driving speed with traffic
        break;
      case 'transit': 
        speed = 12; // slower average transit speed
        waitingTime = 300 + Math.random() * 600; // 5-15 minutes waiting time for transit
        break;
      case 'walking': 
        speed = 4.5; 
        break;
    }
    
    const travelDuration = Math.round((baseDistance / 1000) * (3600 / speed)); // seconds
    const totalDuration = travelDuration + waitingTime;
    
    this.logInfo('Using fallback travel time calculation', {
      origin,
      destination,
      mode,
      baseDistance: Math.round(baseDistance),
      speed,
      waitingTime,
      travelDuration,
      totalDuration
    });
    
    return {
      duration: totalDuration,
      distance: Math.round(baseDistance),
      durationText: this.formatDuration(Math.ceil(totalDuration / 60)),
      distanceText: baseDistance > 1000 
        ? `${(baseDistance / 1000).toFixed(1)} km`
        : `${Math.round(baseDistance)} m`
    };
  }

  /**
   * Calculate travel times between multiple locations using Routes API
   */
  async calculateDistanceMatrix(
    origins: string[],
    destinations: string[],
    mode: 'walking' | 'driving' | 'transit' = 'walking',
    departureTime?: Date
  ): Promise<TravelTime[][]> {
    const requestData = { 
      originsCount: origins.length, 
      destinationsCount: destinations.length, 
      mode, 
      departureTime: departureTime?.toISOString() 
    };
    this.logInfo('Starting distance matrix calculation', requestData);

    // Use Routes API for all calculations (following node11.js pattern)
    const matrix: TravelTime[][] = [];
    
    for (let i = 0; i < origins.length; i++) {
      const row: TravelTime[] = [];
      for (let j = 0; j < destinations.length; j++) {
        if (origins[i] === destinations[j]) {
          // Same location
          row.push({
            duration: 0,
            distance: 0,
            durationText: '0 mins',
            distanceText: '0 m'
          });
        } else {
          const travelTime = await this.calculateRouteTime(origins[i], destinations[j], mode, departureTime);
          row.push(travelTime);
        }
      }
      matrix.push(row);
    }
    
    this.logInfo('Distance matrix calculation completed', {
      matrixSize: `${matrix.length}x${matrix[0]?.length || 0}`
    });
    return matrix;
  }

  /**
   * Optimize route using nearest neighbor algorithm (simple TSP solution)
   */
  async optimizeRoute(spots: string[], mode: 'walking' | 'driving' | 'transit' = 'walking'): Promise<OptimizedRoute> {
    const requestData = { spotsCount: spots.length, mode };
    this.logInfo('Starting route optimization', requestData);

    // Start monitoring
    const optimizationId = routeOptimizationMonitor.startOptimization(spots.length, mode);
    const totalStartTime = Date.now();

    try {
      if (spots.length <= 2) {
        this.logInfo('No optimization needed for 2 or fewer spots');
        // No optimization needed for 2 or fewer spots
        const routeSteps = spots.length === 2 ? 
          [await this.createRouteStep(spots[0], spots[1], mode)] : [];
        
        const result = {
          orderedSpots: spots,
          totalTravelTime: routeSteps.reduce((sum, step) => sum + step.travelTime.duration, 0),
          totalDistance: routeSteps.reduce((sum, step) => sum + step.travelTime.distance, 0),
          routeSteps
        };

        // End monitoring
        routeOptimizationMonitor.completeOptimization(
          optimizationId,
          spots.length,
          mode,
          Date.now() - totalStartTime,
          { total: { duration: Date.now() - totalStartTime } },
          { totalCalls: 0, geocodingCalls: 0, distanceMatrixCalls: 0 },
          { geocodingHitRate: 100, totalCacheHits: 0 },
          true
        );

        this.logInfo('Simple route created', { 
          spotsCount: result.orderedSpots.length,
          totalTravelTime: result.totalTravelTime,
          totalDistance: result.totalDistance
        });

        return result;
      }

      // Performance optimization: Use different strategies based on spot count
      if (spots.length > 8) {
        this.logInfo('Using fast heuristic optimization for large spot count', { spotsCount: spots.length });
        return await this.optimizeRouteFast(spots, mode, optimizationId, totalStartTime);
      }

      // Calculate distance matrix for all spots (only for smaller groups)
      this.logInfo('Calculating distance matrix for route optimization');
      const distanceMatrix = await this.calculateDistanceMatrix(spots, spots, mode);
      
      // Simple nearest neighbor algorithm
      this.logInfo('Running nearest neighbor TSP algorithm');
      const visited = new Set<number>();
      const route: number[] = [0]; // Start with first spot
      visited.add(0);
      
      let currentSpot = 0;
      let totalTime = 0;
      let totalDistance = 0;

      while (visited.size < spots.length) {
        let nearestSpot = -1;
        let shortestTime = Infinity;

        // Find nearest unvisited spot
        for (let i = 0; i < spots.length; i++) {
          if (!visited.has(i) && distanceMatrix[currentSpot][i].duration < shortestTime) {
            shortestTime = distanceMatrix[currentSpot][i].duration;
            nearestSpot = i;
          }
        }

        if (nearestSpot !== -1) {
          route.push(nearestSpot);
          visited.add(nearestSpot);
          totalTime += distanceMatrix[currentSpot][nearestSpot].duration;
          totalDistance += distanceMatrix[currentSpot][nearestSpot].distance;
          currentSpot = nearestSpot;
          
          this.logInfo(`Added spot ${nearestSpot} to route`, {
            from: spots[currentSpot],
            to: spots[nearestSpot],
            travelTime: shortestTime,
            routeProgress: `${visited.size}/${spots.length}`
          });
        } else {
          this.logWarning('No nearest spot found in optimization algorithm');
          break;
        }
      }

      // Create ordered spots and route steps
      const orderedSpots = route.map(index => spots[index]);
      this.logInfo('Creating route steps for optimized route');
      
      const routeSteps: RouteStep[] = [];
      for (let i = 0; i < orderedSpots.length - 1; i++) {
        const step = await this.createRouteStep(orderedSpots[i], orderedSpots[i + 1], mode);
        routeSteps.push(step);
      }

      const result = {
        orderedSpots,
        totalTravelTime: totalTime,
        totalDistance,
        routeSteps
      };

      // End monitoring
      routeOptimizationMonitor.completeOptimization(
        optimizationId,
        spots.length,
        mode,
        Date.now() - totalStartTime,
        { total: { duration: Date.now() - totalStartTime } },
        { totalCalls: 0, geocodingCalls: 0, distanceMatrixCalls: 0 },
        { geocodingHitRate: 100, totalCacheHits: 0 },
        true
      );

      this.logInfo('Route optimization completed successfully', {
        originalOrder: spots,
        optimizedOrder: orderedSpots,
        totalTravelTime: totalTime,
        totalDistance,
        stepsCount: routeSteps.length
      });

      return result;

    } catch (error) {
      // End monitoring with error
      routeOptimizationMonitor.completeOptimization(
        optimizationId,
        spots.length,
        mode,
        Date.now() - totalStartTime,
        { total: { duration: Date.now() - totalStartTime } },
        { totalCalls: 0, geocodingCalls: 0, distanceMatrixCalls: 0 },
        { geocodingHitRate: 100, totalCacheHits: 0 },
        false,
        error instanceof Error ? error.message : String(error)
      );

      if (error instanceof GoogleMapsApiError) {
        this.logError('Route optimization failed due to API error', error, requestData);
        throw error;
      }
      
      this.logError('Unexpected route optimization error', error, requestData);
      throw new GoogleMapsApiError(
        'Route optimization failed',
        'OPTIMIZATION_ERROR',
        500
      );
    }
  }

  /**
   * Create a route step with navigation URL
   */
  private async createRouteStep(from: string, to: string, mode: 'walking' | 'driving' | 'transit'): Promise<RouteStep> {
    this.logInfo('Creating route step', { from, to, mode });

    try {
      const travelTime = await this.calculateRouteTime(from, to, mode);

      // Create Google Maps navigation URL
      const navigationUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=${mode}`;

      const routeStep = {
        from,
        to,
        travelTime,
        mode,
        navigationUrl
      };

      this.logInfo('Route step created successfully', {
        from,
        to,
        duration: travelTime.durationText,
        distance: travelTime.distanceText
      });

      return routeStep;

    } catch (error) {
      this.logError('Failed to create route step', error, { from, to, mode });
      
      // Return a fallback route step with estimated values
      const fallbackTravelTime = this.calculateFallbackTravelTime(from, to, mode);
      const navigationUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=${mode}`;

      this.logWarning('Using fallback route step', { from, to, fallbackTravelTime });

      return {
        from,
        to,
        travelTime: fallbackTravelTime,
        mode,
        navigationUrl
      };
    }
  }

  /**
   * Generate realistic schedule with proper timing
   */
  generateSchedule(
    route: OptimizedRoute,
    startTime: string = '09:00',
    visitDuration: number = 60 // minutes per spot
  ): ScheduleItem[] {
    const schedule: ScheduleItem[] = [];
    let currentTime = this.parseTime(startTime);

    for (let i = 0; i < route.orderedSpots.length; i++) {
      const spot = route.orderedSpots[i];
      const arrivalTime = this.formatTime(currentTime);
      const departureTime = this.formatTime(currentTime + visitDuration);

      const scheduleItem: ScheduleItem = {
        time: arrivalTime,
        spot,
        duration: `${visitDuration} mins`,
        arrivalTime,
        departureTime
      };

      // Add travel information for next leg
      if (i < route.routeSteps.length) {
        const step = route.routeSteps[i];
        scheduleItem.transportation = this.getTransportationText(step.mode);
        scheduleItem.travelTime = step.travelTime.durationText;
        scheduleItem.navigationUrl = step.navigationUrl;
        scheduleItem.notes = `Travel to next location: ${step.travelTime.durationText}`;
      }

      schedule.push(scheduleItem);

      // Move to next time slot (visit duration + travel time)
      currentTime += visitDuration;
      if (i < route.routeSteps.length) {
        currentTime += Math.ceil(route.routeSteps[i].travelTime.duration / 60); // Convert seconds to minutes
      }
    }

    return schedule;
  }

  /**
   * Create complete optimized itinerary
   */
  async createOptimizedItinerary(
    spots: string[],
    city: string,
    mode: 'walking' | 'driving' | 'transit' = 'walking',
    startTime: string = '09:00'
  ): Promise<OptimizedItinerary> {
    const requestData = { spotsCount: spots.length, city, mode, startTime };
    this.logInfo('Creating complete optimized itinerary', requestData);

    try {
      const route = await this.optimizeRoute(spots, mode);
      const schedule = this.generateSchedule(route, startTime);

      const totalTravelTimeMinutes = Math.ceil(route.totalTravelTime / 60);
      const totalVisitTime = spots.length * 60; // 60 minutes per spot
      const totalTimeMinutes = totalTravelTimeMinutes + totalVisitTime;

      const itinerary = {
        title: `Optimized ${city} Itinerary`,
        totalDuration: this.formatDuration(totalTimeMinutes),
        totalTravelTime: this.formatDuration(totalTravelTimeMinutes),
        schedule,
        route
      };

      this.logInfo('Optimized itinerary created successfully', {
        city,
        spotsCount: spots.length,
        totalDuration: itinerary.totalDuration,
        totalTravelTime: itinerary.totalTravelTime,
        scheduleItemsCount: schedule.length
      });

      return itinerary;

    } catch (error) {
      if (error instanceof GoogleMapsApiError) {
        this.logError('Failed to create optimized itinerary due to API error', error, requestData);
        throw error;
      }
      
      this.logError('Unexpected error creating optimized itinerary', error, requestData);
      throw new GoogleMapsApiError(
        `Failed to create optimized itinerary for ${city}`,
        'ITINERARY_CREATION_ERROR',
        500
      );
    }
  }

  /**
   * Fast route optimization for large spot counts (8+ spots)
   * Uses geographic clustering and nearest neighbor to minimize API calls
   */
  private async optimizeRouteFast(
    spots: string[], 
    mode: 'walking' | 'driving' | 'transit',
    optimizationId: string,
    totalStartTime: number
  ): Promise<OptimizedRoute> {
    this.logInfo('Starting fast route optimization', { spotsCount: spots.length });

    try {
      // Step 1: Geocode all spots to get coordinates
      this.logInfo('Geocoding all spots for geographic optimization');
      const geocodedSpots = await Promise.all(
        spots.map(async (spot, index) => {
          try {
            const coords = await this.geocodeLocation(spot);
            if (coords) {
              return { index, name: spot, lat: coords.lat, lng: coords.lng };
            } else {
              this.logWarning(`Failed to geocode ${spot}, using default coordinates`);
              return { index, name: spot, lat: 0, lng: 0 };
            }
          } catch (error) {
            this.logWarning(`Failed to geocode ${spot}, using default coordinates`);
            return { index, name: spot, lat: 0, lng: 0 };
          }
        })
      );

      // Step 2: Use geographic nearest neighbor (no API calls needed)
      this.logInfo('Running geographic nearest neighbor algorithm');
      const visited = new Set<number>();
      const route: number[] = [0]; // Start with first spot
      visited.add(0);
      
      let currentSpot = 0;

      while (visited.size < spots.length) {
        let nearestSpot = -1;
        let shortestDistance = Infinity;

        // Find nearest unvisited spot using geographic distance
        for (let i = 0; i < spots.length; i++) {
          if (!visited.has(i)) {
            const distance = this.calculateGeographicDistance(
              geocodedSpots[currentSpot],
              geocodedSpots[i]
            );
            if (distance < shortestDistance) {
              shortestDistance = distance;
              nearestSpot = i;
            }
          }
        }

        if (nearestSpot !== -1) {
          route.push(nearestSpot);
          visited.add(nearestSpot);
          currentSpot = nearestSpot;
        } else {
          break;
        }
      }

      // Step 3: Calculate actual travel times only for the optimized route (N calls instead of N²)
      this.logInfo('Calculating travel times for optimized route');
      const routeSteps: RouteStep[] = [];
      let totalTime = 0;
      let totalDistance = 0;

      for (let i = 0; i < route.length - 1; i++) {
        const fromSpot = spots[route[i]];
        const toSpot = spots[route[i + 1]];
        
        try {
          const step = await this.createRouteStep(fromSpot, toSpot, mode);
          routeSteps.push(step);
          totalTime += step.travelTime.duration;
          totalDistance += step.travelTime.distance;
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          this.logWarning(`Failed to calculate route step ${fromSpot} → ${toSpot}`, error);
          // Use geographic estimate as fallback
          const estimatedTime = this.estimateTravelTimeFromDistance(
            this.calculateGeographicDistance(geocodedSpots[route[i]], geocodedSpots[route[i + 1]]),
            mode
          );
          const estimatedDistance = this.calculateGeographicDistance(geocodedSpots[route[i]], geocodedSpots[route[i + 1]]) * 1000;
          
          routeSteps.push({
            from: fromSpot,
            to: toSpot,
            travelTime: {
              duration: estimatedTime,
              distance: estimatedDistance,
              durationText: this.formatDuration(Math.ceil(estimatedTime / 60)),
              distanceText: estimatedDistance > 1000 ? 
                `${(estimatedDistance / 1000).toFixed(1)} km` : 
                `${Math.round(estimatedDistance)} m`
            },
            mode,
            navigationUrl: this.buildNavigationUrl(fromSpot, toSpot, mode)
          });
          
          totalTime += estimatedTime;
          totalDistance += estimatedDistance;
        }
      }

      const orderedSpots = route.map(index => spots[index]);
      
      const result = {
        orderedSpots,
        totalTravelTime: totalTime,
        totalDistance,
        routeSteps
      };

      // End monitoring
      routeOptimizationMonitor.completeOptimization(
        optimizationId,
        spots.length,
        mode,
        Date.now() - totalStartTime,
        { total: { duration: Date.now() - totalStartTime } },
        { totalCalls: routeSteps.length, geocodingCalls: spots.length, distanceMatrixCalls: 0 },
        { geocodingHitRate: 90, totalCacheHits: 0 },
        true
      );

      this.logInfo('Fast route optimization completed', {
        spotsCount: result.orderedSpots.length,
        totalTravelTime: result.totalTravelTime,
        totalDistance: result.totalDistance,
        apiCallsUsed: routeSteps.length + spots.length // geocoding + route steps
      });

      return result;

    } catch (error) {
      this.logError('Fast route optimization failed', error);
      
      // Fallback to simple sequential route
      const orderedSpots = [...spots];
      const routeSteps: RouteStep[] = [];
      
      // Create minimal route steps with estimates
      for (let i = 0; i < spots.length - 1; i++) {
        const estimatedTime = 900; // 15 minutes default
        const estimatedDistance = 1000; // 1km default
        
        routeSteps.push({
          from: spots[i],
          to: spots[i + 1],
          travelTime: {
            duration: estimatedTime,
            distance: estimatedDistance,
            durationText: '15m',
            distanceText: '1.0 km'
          },
          mode,
          navigationUrl: this.buildNavigationUrl(spots[i], spots[i + 1], mode)
        });
      }

      return {
        orderedSpots,
        totalTravelTime: routeSteps.length * 900,
        totalDistance: routeSteps.length * 1000,
        routeSteps
      };
    }
  }

  /**
   * Calculate geographic distance between two points (Haversine formula)
   */
  private calculateGeographicDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Build Google Maps navigation URL
   */
  private buildNavigationUrl(origin: string, destination: string, mode: 'walking' | 'driving' | 'transit'): string {
    const travelMode = mode === 'transit' ? 'transit' : mode === 'driving' ? 'driving' : 'walking';
    const params = new URLSearchParams({
      api: '1',
      origin: origin,
      destination: destination,
      travelmode: travelMode
    });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  /**
   * Estimate travel time from geographic distance
   */
  private estimateTravelTimeFromDistance(distanceKm: number, mode: 'walking' | 'driving' | 'transit'): number {
    const speeds = {
      walking: 5,    // 5 km/h
      driving: 30,   // 30 km/h in city
      transit: 20    // 20 km/h average with stops
    };
    
    const speedKmh = speeds[mode];
    const timeHours = distanceKm / speedKmh;
    return Math.round(timeHours * 3600); // Convert to seconds
  }

  // Helper methods
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  private getTransportationText(mode: 'walking' | 'driving' | 'transit'): string {
    switch (mode) {
      case 'walking': return 'Walking';
      case 'driving': return 'Driving';
      case 'transit': return 'Public Transit';
      default: return 'Travel';
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    geocodingCache: any;
    routeOptimization: any;
    recommendations: string[];
  } {
    const geocodingStats = geocodingCache.getStats();
    const optimizationStats = routeOptimizationMonitor.getStats();
    
    const recommendations: string[] = [];
    
    if (geocodingStats.hitRate < 0.5) {
      recommendations.push('Consider preloading common locations to improve geocoding cache performance');
    }
    
    if (optimizationStats.averageOptimizationTime > 5000) {
      recommendations.push('Route optimization is slow - consider reducing the number of spots or using caching');
    }
    
    return {
      geocodingCache: geocodingStats,
      routeOptimization: optimizationStats,
      recommendations
    };
  }

  /**
   * Preload common locations for better cache performance
   */
  async preloadCommonLocations(locations: string[]): Promise<void> {
    this.logInfo('Preloading common locations', { count: locations.length });
    
    await geocodingCache.preload(locations, async (address) => {
      return await this.geocodeLocation(address);
    });
    
    this.logInfo('Preloading completed');
  }

  /**
   * Clear performance data and cache (useful for testing)
   */
  clearPerformanceData(): void {
    geocodingCache.clear();
    routeOptimizationMonitor.clearMetrics();
    this.logInfo('Performance data and cache cleared');
  }
}