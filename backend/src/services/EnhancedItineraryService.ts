/**
 * Enhanced Itinerary Service
 * Combines Bedrock Agent recommendations with Google Maps optimization
 */

import { BedrockAgentService, Spot, Itinerary } from './BedrockAgentService.js';
import { GoogleMapsService, OptimizedItinerary, ScheduleItem, GoogleMapsApiError } from './GoogleMapsService.js';

export interface ItineraryOptions {
  travelMode?: 'walking' | 'driving' | 'transit';
  startTime?: string;
  visitDuration?: number; // minutes per spot
  includeBreaks?: boolean;
  multiDay?: boolean;
  hotelLocation?: string;
  dailyStartTime?: string;
  dailyEndTime?: string;
}

export interface EnhancedItineraryResult {
  success: boolean;
  itinerary?: OptimizedItinerary;
  error?: string;
  fallbackUsed?: boolean;
}

export class EnhancedItineraryService {
  private bedrockService: BedrockAgentService;
  private mapsService: GoogleMapsService;

  constructor() {
    this.bedrockService = new BedrockAgentService();
    this.mapsService = new GoogleMapsService();
  }

  /**
   * Generate an optimized itinerary using both Bedrock Agent and Google Maps
   */
  async generateOptimizedItinerary(
    sessionId: string,
    selectedSpots: Spot[],
    city: string,
    options: ItineraryOptions = {}
  ): Promise<OptimizedItinerary> {
    const {
      travelMode = 'walking',
      startTime = '09:00',
      visitDuration = 60,
      includeBreaks = true
    } = options;

    try {
      console.log(`🔄 Starting enhanced itinerary generation for ${selectedSpots.length} spots in ${city}`);
      
      // Performance optimization: Handle large spot counts differently
      if (selectedSpots.length > 10) {
        console.log(`⚡ Large itinerary detected (${selectedSpots.length} spots), using optimized processing`);
        return await this.generateLargeItinerary(sessionId, selectedSpots, city, options);
      }
      
      // Step 1: Get basic itinerary structure from Bedrock Agent (with timeout)
      console.log('📋 Step 1: Getting basic itinerary from Bedrock Agent...');
      const bedrockItinerary = await Promise.race([
        this.bedrockService.generateItinerary(selectedSpots, sessionId),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Bedrock Agent timeout')), 30000)
        )
      ]);
      console.log('✅ Step 1 completed: Bedrock Agent itinerary generated');
      
      // Step 2: Optimize route using Google Maps (extract spot names)
      console.log('🗺️ Step 2: Optimizing route with Google Maps...');
      const spotNames = selectedSpots.map(spot => spot.name);
      const optimizedItinerary = await Promise.race([
        this.mapsService.createOptimizedItinerary(spotNames, city, travelMode, startTime),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Google Maps optimization timeout')), 45000)
        )
      ]);
      console.log('✅ Step 2 completed: Google Maps optimization done');

      // Step 3: Enhance with Bedrock Agent insights and apply visit duration
      console.log('🔧 Step 3: Enhancing schedule with insights...');
      const enhancedSchedule = await this.enhanceScheduleWithInsights(
        optimizedItinerary,
        bedrockItinerary,
        includeBreaks,
        visitDuration
      );
      console.log('✅ Step 3 completed: Schedule enhanced with insights');

      const finalItinerary = {
        ...optimizedItinerary,
        schedule: enhancedSchedule,
        title: `Smart ${city} Itinerary - ${this.getTransportationText(travelMode)} route`
      };

      console.log('🎉 Enhanced itinerary generation completed successfully');
      return finalItinerary;

    } catch (error) {
      console.error('❌ Enhanced itinerary generation failed:', error);
      
      // Enhanced error logging for Google Maps API errors
      if (error instanceof GoogleMapsApiError) {
        console.error('Google Maps API Error Details:', {
          apiStatus: error.apiStatus,
          statusCode: error.statusCode,
          quotaExceeded: error.quotaExceeded,
          rateLimited: error.rateLimited,
          message: error.message
        });
        
        // Log specific guidance for quota/rate limit issues
        if (error.quotaExceeded) {
          console.error('🚨 Google Maps API quota exceeded. Check billing account and usage limits.');
        }
        if (error.rateLimited) {
          console.error('🚨 Google Maps API rate limited. Consider implementing request throttling.');
        }
      } else {
        console.error('Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
      
      // Fallback to basic Bedrock Agent itinerary
      console.log('🔄 Falling back to basic itinerary generation');
      return await this.generateFallbackItinerary(selectedSpots, sessionId, city, travelMode);
    }
  }

  /**
   * Generate optimized itinerary for large spot counts (10+ spots)
   * Uses chunking and parallel processing to avoid timeouts
   */
  private async generateLargeItinerary(
    sessionId: string,
    selectedSpots: Spot[],
    city: string,
    options: ItineraryOptions
  ): Promise<OptimizedItinerary> {
    const { travelMode = 'walking', startTime = '09:00', visitDuration = 60, includeBreaks = true } = options;
    
    console.log(`🚀 Processing large itinerary with ${selectedSpots.length} spots`);
    
    try {
      // Step 1: Get basic structure from Bedrock (with reduced timeout)
      console.log('📋 Getting basic structure from Bedrock Agent...');
      let bedrockItinerary;
      try {
        bedrockItinerary = await Promise.race([
          this.bedrockService.generateItinerary(selectedSpots.slice(0, 8), sessionId), // Limit to first 8 spots
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Bedrock timeout')), 20000)
          )
        ]);
      } catch (error) {
        console.log('⚠️ Bedrock Agent timeout, proceeding with Google Maps only');
        bedrockItinerary = null;
      }
      
      // Step 2: Use fast Google Maps optimization
      console.log('🗺️ Using fast route optimization for large spot count...');
      const spotNames = selectedSpots.map(spot => spot.name);
      const optimizedItinerary = await this.mapsService.createOptimizedItinerary(
        spotNames,
        city,
        travelMode,
        startTime
      );
      
      // Step 3: Enhanced schedule with chunked processing
      console.log('🔧 Creating enhanced schedule with chunked processing...');
      const enhancedSchedule = await this.createLargeSchedule(
        optimizedItinerary,
        bedrockItinerary,
        selectedSpots,
        includeBreaks,
        visitDuration
      );
      
      const finalItinerary = {
        ...optimizedItinerary,
        schedule: enhancedSchedule,
        title: `Smart ${city} Itinerary - ${this.getTransportationText(travelMode)} route (${selectedSpots.length} stops)`
      };

      console.log('🎉 Large itinerary generation completed successfully');
      return finalItinerary;
      
    } catch (error) {
      console.error('❌ Large itinerary generation failed:', error);
      
      // Fallback to simple sequential itinerary
      console.log('🔄 Using fallback sequential itinerary');
      return await this.generateSequentialFallback(selectedSpots, city, travelMode, startTime, visitDuration);
    }
  }

  /**
   * Create schedule for large itineraries with chunked processing
   */
  private async createLargeSchedule(
    optimizedItinerary: OptimizedItinerary,
    _bedrockItinerary: Itinerary | null,
    selectedSpots: Spot[],
    includeBreaks: boolean,
    visitDuration: number
  ): Promise<ScheduleItem[]> {
    const schedule = [...optimizedItinerary.schedule];
    
    // Apply custom visit duration
    for (const item of schedule) {
      if (item.spot && !item.spot.includes('Lunch') && !item.spot.includes('Break')) {
        item.duration = `${visitDuration} mins`;
        
        // Update timing if we have arrival/departure times
        if (item.arrivalTime && item.departureTime) {
          const arrivalMinutes = this.parseTime(item.arrivalTime);
          const newDepartureMinutes = arrivalMinutes + visitDuration;
          item.departureTime = this.formatTime(newDepartureMinutes);
        }
      }
    }
    
    // Add lunch break for large itineraries (around midday)
    if (includeBreaks && selectedSpots.length > 6) {
      const midPoint = Math.floor(schedule.length / 2);
      const lunchBreak: ScheduleItem = {
        time: '12:00',
        spot: '🍽️ Lunch Break',
        duration: '60 mins',
        arrivalTime: '12:00',
        departureTime: '13:00',
        notes: 'Recommended lunch break - find a nearby restaurant'
      };
      
      schedule.splice(midPoint, 0, lunchBreak);
    }
    
    return schedule;
  }

  /**
   * Generate simple sequential fallback itinerary
   */
  private async generateSequentialFallback(
    selectedSpots: Spot[],
    city: string,
    travelMode: string,
    startTime: string,
    visitDuration: number
  ): Promise<OptimizedItinerary> {
    console.log('🔄 Creating sequential fallback itinerary');
    
    const schedule: ScheduleItem[] = [];
    let currentTime = this.parseTime(startTime);
    
    for (let i = 0; i < selectedSpots.length; i++) {
      const spot = selectedSpots[i];
      const arrivalTime = this.formatTime(currentTime);
      const departureTime = this.formatTime(currentTime + visitDuration);
      
      schedule.push({
        time: arrivalTime,
        spot: spot.name,
        duration: `${visitDuration} mins`,
        arrivalTime,
        departureTime,
        transportation: this.getTransportationText(travelMode as any),
        travelTime: i < selectedSpots.length - 1 ? '15m' : undefined,
        notes: spot.description || `Visit ${spot.name}`
      });
      
      currentTime += visitDuration + 15; // 15 min travel time estimate
    }
    
    const totalDuration = Math.ceil((currentTime - this.parseTime(startTime)) / 60);
    
    return {
      title: `${city} Sequential Itinerary - ${selectedSpots.length} stops`,
      totalDuration: this.formatDuration(totalDuration),
      totalTravelTime: this.formatDuration((selectedSpots.length - 1) * 15),
      schedule,
      route: {
        orderedSpots: selectedSpots.map(s => s.name),
        totalTravelTime: (selectedSpots.length - 1) * 15 * 60,
        totalDistance: (selectedSpots.length - 1) * 1000,
        routeSteps: []
      }
    };
  }

  /**
   * Enhance Google Maps schedule with Bedrock Agent insights
   */
  private async enhanceScheduleWithInsights(
    optimizedItinerary: OptimizedItinerary,
    bedrockItinerary: Itinerary,
    includeBreaks: boolean,
    visitDuration: number
  ): Promise<ScheduleItem[]> {
    try {
      console.log('🔧 Enhancing schedule with Bedrock Agent insights...');
      
      // Validate inputs
      if (!optimizedItinerary || !optimizedItinerary.schedule) {
        throw new Error('Invalid optimized itinerary provided');
      }
      
      if (!bedrockItinerary || !bedrockItinerary.schedule) {
        console.warn('⚠️ No Bedrock itinerary provided, using Google Maps schedule only');
        return optimizedItinerary.schedule;
      }

      const enhancedSchedule = [...optimizedItinerary.schedule];

      // Apply custom visit duration to each spot
      for (let i = 0; i < enhancedSchedule.length; i++) {
        const item = enhancedSchedule[i];
        if (item && !item.spot.includes('Break')) {
          item.duration = `${visitDuration} mins`;
          if (item.arrivalTime) {
            item.departureTime = this.calculateDepartureTime(item.arrivalTime, item.duration);
          }
        }
      }

      // Add meal breaks if requested
      if (includeBreaks) {
        this.addMealBreaks(enhancedSchedule);
      }

      // Enhance with Bedrock Agent notes and recommendations
      for (let i = 0; i < enhancedSchedule.length; i++) {
        const scheduleItem = enhancedSchedule[i];
        
        // Skip meal breaks and invalid items
        if (!scheduleItem || scheduleItem.spot.includes('Break')) {
          continue;
        }
        
        try {
          // Find corresponding Bedrock recommendation
          const bedrockItem = bedrockItinerary.schedule.find(item => 
            item && item.spot && scheduleItem.spot &&
            (item.spot.toLowerCase().includes(scheduleItem.spot.toLowerCase()) ||
             scheduleItem.spot.toLowerCase().includes(item.spot.toLowerCase()))
          );

          if (bedrockItem && bedrockItem.notes) {
            // Combine Google Maps navigation with Bedrock insights
            const existingNotes = scheduleItem.notes || '';
            const bedrockNotes = bedrockItem.notes;
            
            scheduleItem.notes = existingNotes 
              ? `${existingNotes} | 💡 ${bedrockNotes}`
              : `💡 ${bedrockNotes}`;
          }
        } catch (itemError) {
          console.warn(`⚠️ Error enhancing schedule item ${i}:`, itemError);
          // Continue with other items
        }
      }

      console.log('✅ Schedule enhancement completed');
      return enhancedSchedule;
      
    } catch (error) {
      console.error('❌ Error enhancing schedule with insights:', error);
      // Return the original schedule if enhancement fails
      return optimizedItinerary.schedule || [];
    }
  }

  /**
   * Add meal breaks to the schedule
   */
  private addMealBreaks(schedule: ScheduleItem[]): void {
    const lunchTime = 12 * 60; // 12:00 PM in minutes
    const dinnerTime = 18 * 60; // 6:00 PM in minutes

    // Work backwards to avoid index shifting issues
    for (let i = schedule.length - 1; i >= 0; i--) {
      const currentTime = this.parseTime(schedule[i].arrivalTime);
      
      // Add dinner break (check this first since we're going backwards)
      if (currentTime >= dinnerTime && !this.hasRecentMealBreak(schedule, i, 'dinner')) {
        const dinnerBreak: ScheduleItem = {
          time: '18:00',
          spot: '🍽️ Dinner Break',
          duration: '90 mins',
          arrivalTime: '18:00',
          departureTime: '19:30',
          notes: 'Recommended dinner break - explore local cuisine'
        };
        schedule.splice(i + 1, 0, dinnerBreak);
      }
      
      // Add lunch break
      if (currentTime >= lunchTime && currentTime < dinnerTime && !this.hasRecentMealBreak(schedule, i, 'lunch')) {
        const lunchBreak: ScheduleItem = {
          time: '12:00',
          spot: '🍽️ Lunch Break',
          duration: '60 mins',
          arrivalTime: '12:00',
          departureTime: '13:00',
          notes: 'Recommended lunch break - find a nearby restaurant'
        };
        schedule.splice(i + 1, 0, lunchBreak);
      }
    }
  }

  /**
   * Check if there's a recent meal break
   */
  private hasRecentMealBreak(schedule: ScheduleItem[], currentIndex: number, mealType: 'lunch' | 'dinner'): boolean {
    const mealKeyword = mealType === 'lunch' ? 'Lunch' : 'Dinner';
    
    // Check previous and next few items
    for (let i = Math.max(0, currentIndex - 2); i <= Math.min(schedule.length - 1, currentIndex + 2); i++) {
      if (schedule[i] && schedule[i].spot.includes(mealKeyword)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate departure time from arrival time and duration
   */
  private calculateDepartureTime(arrivalTime: string, duration: string): string {
    const arrivalMinutes = this.parseTime(arrivalTime);
    const durationMinutes = this.parseDuration(duration);
    const departureMinutes = arrivalMinutes + durationMinutes;
    
    return this.formatTime(departureMinutes);
  }

  /**
   * Parse time string to minutes
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Parse duration string to minutes
   */
  private parseDuration(durationStr: string): number {
    const match = durationStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 60;
  }

  /**
   * Format minutes to time string
   */
  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Generate fallback itinerary when Google Maps optimization fails
   */
  private async generateFallbackItinerary(
    selectedSpots: Spot[],
    sessionId: string,
    city: string,
    travelMode: 'walking' | 'driving' | 'transit'
  ): Promise<OptimizedItinerary> {
    try {
      console.log('🔄 Attempting fallback with Bedrock Agent only...');
      
      // Ensure we have valid parameters for Bedrock Agent
      if (!selectedSpots || selectedSpots.length === 0) {
        throw new Error('No spots provided for fallback itinerary');
      }
      
      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('Invalid session ID for fallback itinerary');
      }

      const fallbackItinerary = await this.bedrockService.generateItinerary(selectedSpots, sessionId);
      console.log('✅ Fallback: Bedrock Agent itinerary generated successfully');
      
      const result = {
        title: `${city} Itinerary - ${this.getTransportationText(travelMode)} (Basic)`,
        totalDuration: fallbackItinerary.totalDuration,
        totalTravelTime: 'Estimated',
        schedule: fallbackItinerary.schedule.map(item => ({
          time: item.time,
          spot: item.spot,
          duration: item.duration,
          arrivalTime: item.time,
          departureTime: this.calculateDepartureTime(item.time, item.duration),
          transportation: item.transportation,
          notes: item.notes
        })),
        route: {
          orderedSpots: selectedSpots.map(spot => spot.name),
          totalTravelTime: 0,
          totalDistance: 0,
          routeSteps: []
        }
      };

      console.log('✅ Fallback itinerary created successfully');
      return result;
      
    } catch (fallbackError) {
      console.error('❌ Fallback itinerary generation also failed:', fallbackError);
      console.error('Fallback error details:', {
        name: fallbackError instanceof Error ? fallbackError.name : 'Unknown',
        message: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
        stack: fallbackError instanceof Error ? fallbackError.stack : undefined
      });
      
      // Last resort: create a basic schedule
      console.log('🔄 Using last resort: creating basic itinerary...');
      return this.createBasicItinerary(selectedSpots, city, travelMode);
    }
  }

  /**
   * Create a basic itinerary as last resort
   */
  private createBasicItinerary(
    selectedSpots: Spot[],
    city: string,
    travelMode: 'walking' | 'driving' | 'transit'
  ): OptimizedItinerary {
    const schedule: ScheduleItem[] = [];
    let currentTime = 9 * 60; // 9:00 AM in minutes
    const visitDuration = 90; // 90 minutes per spot
    const travelTime = 30; // 30 minutes between spots

    selectedSpots.forEach((spot, index) => {
      const arrivalTime = this.formatTime(currentTime);
      const departureTime = this.formatTime(currentTime + visitDuration);

      schedule.push({
        time: arrivalTime,
        spot: spot.name,
        duration: `${visitDuration} mins`,
        arrivalTime,
        departureTime,
        transportation: index > 0 ? this.getTransportationText(travelMode) : undefined,
        travelTime: index > 0 ? `${travelTime} mins` : undefined,
        notes: spot.description
      });

      currentTime += visitDuration + travelTime;
    });

    return {
      title: `${city} Basic Itinerary`,
      totalDuration: `${Math.ceil(currentTime / 60)} hours`,
      totalTravelTime: `${Math.ceil((selectedSpots.length - 1) * travelTime / 60)} hours`,
      schedule,
      route: {
        orderedSpots: selectedSpots.map(spot => spot.name),
        totalTravelTime: (selectedSpots.length - 1) * travelTime * 60, // in seconds
        totalDistance: 0,
        routeSteps: []
      }
    };
  }

  /**
   * Generate optimized itinerary with detailed result information
   */
  async generateEnhancedItinerary(
    sessionId: string,
    selectedSpots: Spot[],
    city: string,
    options: ItineraryOptions = {}
  ): Promise<EnhancedItineraryResult> {
    try {
      console.log(`🚀 Starting enhanced itinerary generation for session: ${sessionId}`);
      
      // Validate inputs before proceeding
      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('Invalid session ID provided');
      }
      
      if (!selectedSpots || !Array.isArray(selectedSpots) || selectedSpots.length === 0) {
        throw new Error('No valid spots provided for itinerary generation');
      }
      
      if (!city || typeof city !== 'string') {
        throw new Error('Invalid city provided');
      }

      // Validate each spot has required properties
      for (const spot of selectedSpots) {
        if (!spot.id || !spot.name) {
          throw new Error(`Invalid spot data: missing id or name for spot ${JSON.stringify(spot)}`);
        }
      }

      const itinerary = await this.generateOptimizedItinerary(sessionId, selectedSpots, city, options);
      
      const result = {
        success: true,
        itinerary,
        fallbackUsed: itinerary.title.includes('Basic')
      };

      console.log(`✅ Enhanced itinerary generation completed successfully. Fallback used: ${result.fallbackUsed}`);
      return result;
      
    } catch (error) {
      console.error('❌ Enhanced itinerary generation completely failed:', error);
      
      let errorMessage = 'Unknown error occurred during itinerary generation';
      
      // Enhanced error handling for Google Maps API errors
      if (error instanceof GoogleMapsApiError) {
        console.error('Google Maps API Error Details:', {
          apiStatus: error.apiStatus,
          statusCode: error.statusCode,
          quotaExceeded: error.quotaExceeded,
          rateLimited: error.rateLimited,
          message: error.message
        });
        
        errorMessage = error.message;
        
        // Provide user-friendly error messages
        if (error.quotaExceeded) {
          errorMessage = 'Google Maps service is temporarily unavailable due to quota limits. Please try again later.';
        } else if (error.rateLimited) {
          errorMessage = 'Google Maps service is busy. Please wait a moment and try again.';
        }
      } else {
        console.error('Complete failure error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          sessionId,
          spotsCount: selectedSpots?.length || 0,
          city
        });
        
        if (error instanceof Error) {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        fallbackUsed: true
      };
    }
  }

  /**
   * Validate itinerary options
   */
  validateOptions(options: ItineraryOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.startTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(options.startTime)) {
      errors.push('Invalid start time format. Use HH:MM format.');
    }

    if (options.visitDuration && (options.visitDuration < 15 || options.visitDuration > 480)) {
      errors.push('Visit duration must be between 15 minutes and 8 hours.');
    }

    if (options.travelMode && !['walking', 'driving', 'transit'].includes(options.travelMode)) {
      errors.push('Travel mode must be walking, driving, or transit.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get transportation text for display
   */
  private getTransportationText(mode: 'walking' | 'driving' | 'transit'): string {
    switch (mode) {
      case 'walking': return 'Walking';
      case 'driving': return 'Driving';
      case 'transit': return 'Public Transit';
      default: return 'Travel';
    }
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }


}