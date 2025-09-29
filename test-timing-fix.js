#!/usr/bin/env node

/**
 * Test script to verify the timing fix for itinerary scheduling
 */

import { EnhancedItineraryService } from './backend/dist/services/EnhancedItineraryService.js';

async function testTimingFix() {
  console.log('🧪 Testing Itinerary Timing Fix...\n');
  
  const service = new EnhancedItineraryService();
  
  // Test spots (similar to your Hong Kong example)
  const testSpots = [
    { id: '1', name: 'Victoria Peak', description: 'Panoramic views of Hong Kong\'s skyline' },
    { id: '2', name: 'Lan Kwai Fong', description: 'Popular nightlife area with bars and restaurants' },
    { id: '3', name: 'Cheung Chau Island', description: 'Traditional fishing village with a rich history' },
    { id: '4', name: 'Tai O Fishing Village', description: 'Experience traditional stilt houses and fishing village' }
  ];
  
  const options = {
    travelMode: 'walking',
    startTime: '09:00',
    visitDuration: 60, // 1 hour per spot
    includeBreaks: true
  };
  
  try {
    console.log('📍 Test spots:');
    testSpots.forEach((spot, i) => {
      console.log(`   ${i + 1}. ${spot.name} - ${spot.description}`);
    });
    console.log();
    
    console.log('⚙️ Options:', options);
    console.log();
    
    const result = await service.generateEnhancedItinerary(
      'test-session-timing',
      testSpots,
      'Hong Kong',
      options
    );
    
    if (result.success && result.itinerary) {
      console.log('✅ Itinerary generated successfully!\n');
      console.log(`📋 ${result.itinerary.title}`);
      console.log(`⏱️ Total Duration: ${result.itinerary.totalDuration}`);
      console.log(`🚶 Total Travel Time: ${result.itinerary.totalTravelTime}`);
      console.log();
      
      console.log('📅 Schedule (Fixed Timing):');
      console.log('─'.repeat(80));
      
      result.itinerary.schedule.forEach((item, index) => {
        const dayLabel = `Day ${Math.floor(index / 4) + 1}`;
        const arriveIcon = '📍 Arrive:';
        const departIcon = '🚀 Depart:';
        const durationIcon = '⏱️';
        const locationIcon = '🗺️';
        
        console.log(`${dayLabel} - ${arriveIcon} ${item.arrivalTime} ${departIcon} ${item.departureTime} ${durationIcon} ${item.duration}`);
        console.log(`${item.spot}`);
        console.log(`${locationIcon}${item.notes || 'Visit this location'}`);
        
        if (item.travelTime && index < result.itinerary.schedule.length - 1) {
          console.log(`   🚶 Travel time to next location: ${item.travelTime}`);
        }
        console.log();
      });
      
      // Verify timing consistency
      console.log('🔍 Timing Validation:');
      console.log('─'.repeat(40));
      
      let hasTimingIssues = false;
      
      for (let i = 0; i < result.itinerary.schedule.length - 1; i++) {
        const current = result.itinerary.schedule[i];
        const next = result.itinerary.schedule[i + 1];
        
        const currentDeparture = parseTime(current.departureTime);
        const nextArrival = parseTime(next.arrivalTime);
        
        if (nextArrival < currentDeparture) {
          console.log(`❌ Timing conflict: ${current.spot} departs at ${current.departureTime} but ${next.spot} arrives at ${next.arrivalTime}`);
          hasTimingIssues = true;
        } else {
          const gap = nextArrival - currentDeparture;
          console.log(`✅ ${current.spot} → ${next.spot}: ${gap} minutes gap (${current.departureTime} → ${next.arrivalTime})`);
        }
      }
      
      if (!hasTimingIssues) {
        console.log('\n🎉 All timing is consistent! No overlapping schedules.');
      } else {
        console.log('\n❌ Timing issues detected.');
      }
      
    } else {
      console.log('❌ Failed to generate itinerary:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Run the test
testTimingFix().catch(console.error);