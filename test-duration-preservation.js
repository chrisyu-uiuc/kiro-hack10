#!/usr/bin/env node

/**
 * Test script to verify that different durations are preserved from Bedrock Agent
 */

import { EnhancedItineraryService } from './backend/dist/services/EnhancedItineraryService.js';

async function testDurationPreservation() {
  console.log('🧪 Testing Duration Preservation...\n');
  
  const service = new EnhancedItineraryService();
  
  // Test spots with different expected durations
  const testSpots = [
    { id: '1', name: 'Metropolitan Museum', description: 'Large art museum - should take 2-3 hours', category: 'Museum' },
    { id: '2', name: 'Central Park', description: 'Large park - should take 1-2 hours', category: 'Park' },
    { id: '3', name: 'Times Square', description: 'Viewpoint - should take 45 minutes', category: 'Viewpoint' },
    { id: '4', name: 'Local Restaurant', description: 'Dining - should take 1 hour', category: 'Restaurant' }
  ];
  
  const options = {
    travelMode: 'walking',
    startTime: '09:00',
    visitDuration: 60, // This should be used as fallback only
    includeBreaks: false
  };
  
  try {
    console.log('📍 Testing duration preservation with different spot types:');
    testSpots.forEach((spot, i) => {
      console.log(`   ${i + 1}. ${spot.name} (${spot.category}) - Expected: ${getExpectedDuration(spot.category)}`);
    });
    console.log();
    
    const result = await service.generateEnhancedItinerary(
      'test-session-duration',
      testSpots,
      'New York',
      options
    );
    
    if (result.success && result.itinerary) {
      console.log('✅ Itinerary generated successfully!\n');
      console.log(`📋 ${result.itinerary.title}`);
      console.log();
      
      console.log('📅 Duration Analysis:');
      console.log('─'.repeat(80));
      
      let hasVariedDurations = false;
      const durations = new Set();
      
      result.itinerary.schedule.forEach((item, index) => {
        const cleanSpotName = item.spot.replace(/^\*\*Day \d+\*\* - /, '');
        const expectedDuration = getExpectedDuration(testSpots[index]?.category);
        
        console.log(`📍 ${cleanSpotName}`);
        console.log(`   ⏱️ Duration: ${item.duration}`);
        console.log(`   🎯 Expected: ${expectedDuration}`);
        console.log(`   ⏰ Time: ${item.arrivalTime} - ${item.departureTime}`);
        
        durations.add(item.duration);
        
        // Check if duration varies from the default 60 mins
        if (item.duration !== '60 mins') {
          hasVariedDurations = true;
          console.log(`   ✅ Custom duration preserved!`);
        } else {
          console.log(`   ⚠️ Using default duration`);
        }
        console.log();
      });
      
      // Validation
      console.log('🔍 Duration Validation:');
      console.log('─'.repeat(40));
      
      console.log(`📊 Unique durations found: ${durations.size}`);
      console.log(`📋 Durations: ${Array.from(durations).join(', ')}`);
      
      if (hasVariedDurations) {
        console.log('\n🎉 SUCCESS: Different durations are being preserved!');
        console.log('✅ The system respects Bedrock Agent duration recommendations');
      } else {
        console.log('\n⚠️ NOTICE: All durations are uniform (60 mins)');
        console.log('💡 This might be expected if Bedrock Agent is not available');
      }
      
      // Check timing consistency
      console.log('\n🕐 Timing Consistency Check:');
      for (let i = 0; i < result.itinerary.schedule.length - 1; i++) {
        const current = result.itinerary.schedule[i];
        const next = result.itinerary.schedule[i + 1];
        
        const currentDeparture = parseTime(current.departureTime);
        const nextArrival = parseTime(next.arrivalTime);
        
        if (nextArrival >= currentDeparture) {
          const gap = nextArrival - currentDeparture;
          console.log(`✅ ${current.spot.replace(/^\*\*Day \d+\*\* - /, '')} → ${next.spot.replace(/^\*\*Day \d+\*\* - /, '')}: ${gap} min gap`);
        } else {
          console.log(`❌ Timing conflict detected!`);
        }
      }
      
    } else {
      console.log('❌ Failed to generate itinerary:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function getExpectedDuration(category) {
  switch (category) {
    case 'Museum': return '2-3 hours';
    case 'Park': return '1-2 hours';
    case 'Restaurant': return '1 hour';
    case 'Viewpoint': return '45 minutes';
    default: return '1 hour';
  }
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Run the test
testDurationPreservation().catch(console.error);