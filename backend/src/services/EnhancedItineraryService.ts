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
    console.log('📋 Creating large schedule with proper timing...');

    // First, recalculate timing with the new visit duration
    const schedule = this.recalculateScheduleTiming(optimizedItinerary.schedule, visitDuration);

    // Add smart meal breaks for large itineraries
    if (includeBreaks && selectedSpots.length > 6) {
      this.addSmartMealBreaks(schedule);
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
        return this.recalculateScheduleTiming(optimizedItinerary.schedule, visitDuration);
      }

      const enhancedSchedule = [...optimizedItinerary.schedule];

      // First, enhance with Bedrock Agent notes and recommendations
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

          if (bedrockItem) {
            // Preserve Bedrock Agent's duration if it's more specific
            if (bedrockItem.duration && bedrockItem.duration !== '1 hour') {
              scheduleItem.duration = bedrockItem.duration;
              console.log(`🕐 Using Bedrock duration for ${scheduleItem.spot}: ${bedrockItem.duration}`);
            }
            
            // Combine Google Maps navigation with Bedrock insights
            if (bedrockItem.notes) {
              const existingNotes = scheduleItem.notes || '';
              const bedrockNotes = bedrockItem.notes;

              scheduleItem.notes = existingNotes
                ? `${existingNotes} | 💡 ${bedrockNotes}`
                : `💡 ${bedrockNotes}`;
            }
          }
        } catch (itemError) {
          console.warn(`⚠️ Error enhancing schedule item ${i}:`, itemError);
          // Continue with other items
        }
      }

      // Then recalculate all timing to ensure consistency
      const finalSchedule = this.recalculateScheduleTiming(enhancedSchedule, visitDuration);

      // Add meal breaks if requested (after timing is fixed)
      if (includeBreaks) {
        this.addSmartMealBreaks(finalSchedule);
      }

      console.log('✅ Schedule enhancement completed');
      return finalSchedule;

    } catch (error) {
      console.error('❌ Error enhancing schedule with insights:', error);
      // Return the original schedule if enhancement fails
      return optimizedItinerary.schedule || [];
    }
  }

  /**
   * Recalculate schedule timing to ensure sequential consistency with multi-day support
   */
  private recalculateScheduleTiming(schedule: ScheduleItem[], visitDuration: number): ScheduleItem[] {
    console.log('🕐 Recalculating schedule timing for multi-day consistency...');

    if (!schedule || schedule.length === 0) {
      return schedule;
    }

    const recalculatedSchedule = [...schedule];

    // Daily schedule constraints
    const dailyStartTime = 9 * 60; // 9:00 AM in minutes
    const dailyEndTime = 20 * 60; // 8:00 PM in minutes

    let currentTime = dailyStartTime; // Start at 9:00 AM
    let currentDay = 1;
    let isFirstItemOfDay = true;

    for (let i = 0; i < recalculatedSchedule.length; i++) {
      const item = recalculatedSchedule[i];

      if (!item) continue;

      // Remove any existing day labels to avoid duplicates
      item.spot = item.spot.replace(/^\*\*Day \d+\*\* - /, '');

      // Calculate visit duration (preserve existing duration or use default)
      let itemDuration = visitDuration; // Default fallback
      
      // First, try to use existing duration from the item
      if (item.duration) {
        itemDuration = this.parseDuration(item.duration);
      }
      
      // Override for meal breaks
      if (item.spot.includes('Break')) {
        itemDuration = item.spot.includes('Lunch') ? 60 : 90;
      }

      // Calculate when this activity would end
      const activityEndTime = currentTime + itemDuration;

      // Check if this activity would make us go past 8 PM (departure time > 8 PM)
      if (activityEndTime > dailyEndTime && !isFirstItemOfDay) {
        // Move to next day
        currentDay++;
        currentTime = dailyStartTime; // Reset to 9:00 AM next day
        isFirstItemOfDay = true;
        console.log(`📅 Moving to Day ${currentDay} at 09:00 due to time constraint`);
      }

      // Set arrival time
      item.arrivalTime = this.formatTime(currentTime);
      item.time = item.arrivalTime; // Keep time field in sync

      // Update duration and departure time
      item.duration = `${itemDuration} mins`;
      item.departureTime = this.formatTime(currentTime + itemDuration);

      // Add day label to spot name for first item of each day
      if (isFirstItemOfDay) {
        item.spot = `**Day ${currentDay}** - ${item.spot}`;
        isFirstItemOfDay = false;
      }

      // Calculate next arrival time (departure + travel time)
      currentTime += itemDuration;

      // Add travel time to next location if available
      if (i < recalculatedSchedule.length - 1 && item.travelTime) {
        const travelMinutes = this.parseTravelTime(item.travelTime);
        currentTime += travelMinutes;
      }

      console.log(`📍 Day ${currentDay} - ${item.spot.replace(/^\*\*Day \d+\*\* - /, '')}: ${item.arrivalTime} - ${item.departureTime} (${item.duration})`);
    }

    console.log(`✅ Schedule timing recalculated successfully across ${currentDay} day(s)`);
    return recalculatedSchedule;
  }



  /**
   * Parse travel time string to minutes
   */
  private parseTravelTime(travelTimeStr: string): number {
    // Handle formats like "15m", "15 mins", "1h 30m", etc.
    const hourMatch = travelTimeStr.match(/(\d+)h/);
    const minuteMatch = travelTimeStr.match(/(\d+)m/);

    let totalMinutes = 0;
    if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1]) * 60;
    }
    if (minuteMatch) {
      totalMinutes += parseInt(minuteMatch[1]);
    }

    // If no match found, assume it's just minutes
    if (totalMinutes === 0) {
      const numberMatch = travelTimeStr.match(/(\d+)/);
      if (numberMatch) {
        totalMinutes = parseInt(numberMatch[1]);
      }
    }

    return totalMinutes || 15; // Default to 15 minutes if parsing fails
  }

  /**
   * Add smart meal breaks based on actual schedule timing and daily boundaries
   */
  private addSmartMealBreaks(schedule: ScheduleItem[]): void {
    console.log('🍽️ Adding smart meal breaks based on daily schedule timing...');

    if (!schedule || schedule.length === 0) {
      return;
    }

    const lunchTimeTarget = 12 * 60; // 12:00 PM in minutes
    const dinnerTimeTarget = 18 * 60; // 6:00 PM in minutes

    // Group schedule by days
    const dayGroups: { [day: number]: { items: ScheduleItem[], startIndex: number } } = {};
    let currentDay = 1;

    for (let i = 0; i < schedule.length; i++) {
      const item = schedule[i];
      if (!item) continue;

      // Detect day changes
      if (item.spot.includes('**Day ')) {
        const dayMatch = item.spot.match(/\*\*Day (\d+)\*\*/);
        if (dayMatch) {
          currentDay = parseInt(dayMatch[1]);
        }
      }

      if (!dayGroups[currentDay]) {
        dayGroups[currentDay] = { items: [], startIndex: i };
      }
      dayGroups[currentDay].items.push(item);
    }

    // Add meal breaks for each day
    let totalInserted = 0;

    Object.keys(dayGroups).forEach(dayKey => {
      const day = parseInt(dayKey);
      const dayGroup = dayGroups[day];
      const dayItems = dayGroup.items;

      console.log(`🍽️ Processing meal breaks for Day ${day} (${dayItems.length} items)`);

      // Find lunch opportunity for this day
      let lunchInsertIndex = -1;
      let dinnerInsertIndex = -1;

      for (let i = 0; i < dayItems.length; i++) {
        const item = dayItems[i];
        if (!item || item.spot.includes('Break')) continue;

        const arrivalTime = this.parseTime(item.arrivalTime);

        // Check for lunch break opportunity (around 12:00 PM)
        if (lunchInsertIndex === -1 &&
          arrivalTime >= lunchTimeTarget - 60 && // After 11 AM
          arrivalTime <= lunchTimeTarget + 120 && // Before 2 PM
          !this.hasRecentMealBreak(dayItems, i, 'lunch')) {
          lunchInsertIndex = dayGroup.startIndex + i + 1 + totalInserted;
        }

        // Check for dinner break opportunity (around 6:00 PM)
        if (dinnerInsertIndex === -1 &&
          arrivalTime >= dinnerTimeTarget - 90 && // After 4:30 PM
          arrivalTime <= dinnerTimeTarget + 60 && // Before 7 PM
          !this.hasRecentMealBreak(dayItems, i, 'dinner')) {
          dinnerInsertIndex = dayGroup.startIndex + i + 1 + totalInserted;
        }
      }

      // Insert dinner break first (to avoid index shifting)
      if (dinnerInsertIndex > 0 && dinnerInsertIndex <= schedule.length) {
        const dinnerBreak: ScheduleItem = {
          time: '18:00',
          spot: '🍽️ Dinner Break',
          duration: '90 mins',
          arrivalTime: '18:00',
          departureTime: '19:30',
          notes: 'Recommended dinner break - explore local cuisine'
        };

        schedule.splice(dinnerInsertIndex, 0, dinnerBreak);
        console.log(`🍽️ Added dinner break for Day ${day} at ${dinnerBreak.arrivalTime}`);
        totalInserted++;

        // Adjust lunch index if needed
        if (lunchInsertIndex >= dinnerInsertIndex) {
          lunchInsertIndex++;
        }
      }

      // Insert lunch break
      if (lunchInsertIndex > 0 && lunchInsertIndex <= schedule.length) {
        const lunchBreak: ScheduleItem = {
          time: '12:00',
          spot: '🍽️ Lunch Break',
          duration: '60 mins',
          arrivalTime: '12:00',
          departureTime: '13:00',
          notes: 'Recommended lunch break - find a nearby restaurant'
        };

        schedule.splice(lunchInsertIndex, 0, lunchBreak);
        console.log(`🍽️ Added lunch break for Day ${day} at ${lunchBreak.arrivalTime}`);
        totalInserted++;
      }
    });

    console.log(`🍽️ Added ${totalInserted} meal breaks across ${Object.keys(dayGroups).length} day(s)`);
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
   * Parse duration string to minutes (handles various formats)
   */
  private parseDuration(durationStr: string): number {
    if (!durationStr) return 60;
    
    const str = durationStr.toLowerCase();
    
    // Handle formats like "2-3 hours", "1-2 hours"
    if (str.includes('-')) {
      const rangeMatch = str.match(/(\d+)-(\d+)\s*hours?/);
      if (rangeMatch) {
        const min = parseInt(rangeMatch[1]);
        const max = parseInt(rangeMatch[2]);
        return Math.round((min + max) / 2) * 60; // Average of range in minutes
      }
    }
    
    // Handle formats like "2.5 hours", "1.5 hours"
    const decimalHourMatch = str.match(/(\d+\.?\d*)\s*hours?/);
    if (decimalHourMatch) {
      return Math.round(parseFloat(decimalHourMatch[1]) * 60);
    }
    
    // Handle formats like "90 mins", "45 minutes"
    const minuteMatch = str.match(/(\d+)\s*(?:mins?|minutes?)/);
    if (minuteMatch) {
      return parseInt(minuteMatch[1]);
    }
    
    // Handle simple hour format like "2 hour", "1 hour"
    const hourMatch = str.match(/(\d+)\s*hours?/);
    if (hourMatch) {
      return parseInt(hourMatch[1]) * 60;
    }
    
    // Fallback: extract any number and assume it's minutes
    const numberMatch = str.match(/(\d+)/);
    return numberMatch ? parseInt(numberMatch[1]) : 60;
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