/**
 * Simple test script to verify EnhancedItineraryService integration
 */

import { EnhancedItineraryService } from './dist/services/EnhancedItineraryService.js';

async function testEnhancedItinerary() {
  console.log('🧪 Testing EnhancedItineraryService...');
  
  const service = new EnhancedItineraryService();
  
  // Test data
  const mockSpots = [
    {
      id: 'spot-1',
      name: 'Tokyo Tower',
      category: 'Viewpoint',
      location: 'Minato',
      description: 'Iconic tower with city views',
      duration: '1-2 hours'
    },
    {
      id: 'spot-2',
      name: 'Senso-ji Temple',
      category: 'Religious Site',
      location: 'Asakusa',
      description: 'Historic Buddhist temple',
      duration: '1 hour'
    },
    {
      id: 'spot-3',
      name: 'Shibuya Crossing',
      category: 'Attraction',
      location: 'Shibuya',
      description: 'Famous pedestrian crossing',
      duration: '30 minutes'
    }
  ];

  try {
    // Test 1: Validate options
    console.log('\n1️⃣ Testing option validation...');
    const validOptions = {
      travelMode: 'walking',
      startTime: '09:00',
      visitDuration: 60,
      includeBreaks: true
    };
    
    const validation = service.validateOptions(validOptions);
    console.log('✅ Valid options:', validation.valid);
    
    const invalidOptions = {
      startTime: '25:00',
      visitDuration: 5
    };
    
    const invalidValidation = service.validateOptions(invalidOptions);
    console.log('❌ Invalid options detected:', !invalidValidation.valid);
    console.log('   Errors:', invalidValidation.errors);

    // Test 2: Generate enhanced itinerary (will use fallback due to no real API keys)
    console.log('\n2️⃣ Testing itinerary generation...');
    const result = await service.generateEnhancedItinerary(
      'test-session-' + Date.now(),
      mockSpots,
      'Tokyo',
      {
        travelMode: 'walking',
        startTime: '09:00',
        visitDuration: 90,
        includeBreaks: true
      }
    );

    console.log('📊 Generation result:');
    console.log('   Success:', result.success);
    console.log('   Fallback used:', result.fallbackUsed);
    
    if (result.itinerary) {
      console.log('   Title:', result.itinerary.title);
      console.log('   Total duration:', result.itinerary.totalDuration);
      console.log('   Schedule items:', result.itinerary.schedule.length);
      console.log('   Route spots:', result.itinerary.route.orderedSpots.length);
      
      // Show first schedule item
      if (result.itinerary.schedule.length > 0) {
        const firstItem = result.itinerary.schedule[0];
        console.log('   First item:', {
          time: firstItem.time,
          spot: firstItem.spot,
          duration: firstItem.duration
        });
      }
    }

    if (result.error) {
      console.log('   Error:', result.error);
    }

    console.log('\n✅ EnhancedItineraryService test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testEnhancedItinerary();