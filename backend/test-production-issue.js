#!/usr/bin/env node

/**
 * Test to reproduce the production issue with travel times
 */

import { EnhancedItineraryService } from './dist/services/EnhancedItineraryService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testProductionIssue() {
  console.log('🧪 Testing production travel time issue...\n');
  
  const enhancedService = new EnhancedItineraryService();
  
  // Simulate the spots from your production example
  const testSpots = [
    { id: '1', name: 'Osaka Castle', category: 'Historical', location: 'Osaka', description: 'Historic castle' },
    { id: '2', name: 'Dotonbori', category: 'Entertainment', location: 'Osaka', description: 'Famous district' },
    { id: '3', name: 'Kuromon Ichiba Market', category: 'Market', location: 'Osaka', description: 'Traditional market' },
    { id: '4', name: 'Universal Studios Japan', category: 'Entertainment', location: 'Osaka', description: 'Theme park' }
  ];
  
  const options = {
    travelMode: 'transit',
    startTime: '09:00',
    visitDuration: 60,
    includeBreaks: false
  };
  
  console.log('🚀 Testing enhanced itinerary generation...');
  console.log(`📋 Spots: ${testSpots.map(s => s.name).join(', ')}`);
  console.log(`📋 Options:`, options);
  
  try {
    const result = await enhancedService.generateEnhancedItinerary(
      'test-session-production',
      testSpots,
      'Osaka',
      options
    );
    
    if (result.success && result.itinerary) {
      console.log('\n✅ Itinerary generated successfully!');
      console.log(`📊 Title: ${result.itinerary.title}`);
      console.log(`📊 Total Duration: ${result.itinerary.totalDuration}`);
      console.log(`📊 Total Travel Time: ${result.itinerary.totalTravelTime}`);
      console.log(`📊 Fallback Used: ${result.fallbackUsed}`);
      
      console.log('\n📅 Schedule:');
      result.itinerary.schedule.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.time} - ${item.spot} (${item.duration})`);
        if (item.travelTime) {
          console.log(`      → Travel: ${item.travelTime} via ${item.transportation}`);
        }
      });
      
      // Check if travel times look realistic
      const travelTimes = result.itinerary.schedule
        .filter(item => item.travelTime)
        .map(item => item.travelTime);
      
      console.log('\n🔍 Travel Time Analysis:');
      console.log(`   Travel times found: ${travelTimes.join(', ')}`);
      
      const hasShortTimes = travelTimes.some(time => {
        const minutes = parseInt(time.match(/\d+/)?.[0] || '0');
        return minutes < 20; // Less than 20 minutes is suspicious for transit
      });
      
      if (hasShortTimes) {
        console.log('   ⚠️ WARNING: Some travel times seem too short for public transit!');
        console.log('   🔍 This suggests the system is using Bedrock Agent fallback instead of Google Maps');
      } else {
        console.log('   ✅ Travel times look realistic for public transit');
      }
      
    } else {
      console.log('\n❌ Itinerary generation failed');
      console.log(`Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  console.log('\n🏁 Production test completed!');
}

testProductionIssue().catch(console.error);