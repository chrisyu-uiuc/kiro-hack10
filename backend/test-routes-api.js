#!/usr/bin/env node

/**
 * Test script for Google Routes API with improved transit support
 */

import { GoogleMapsService } from './dist/services/GoogleMapsService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testRoutesAPI() {
  console.log('🧪 Testing Google Routes API with improved transit support...\n');
  
  const googleMapsService = new GoogleMapsService();
  
  console.log('Testing complete route optimization with transit mode...\n');
  
  try {
    const spots = ['Osaka Castle', 'Dotonbori', 'Shitenno-ji Temple', 'Osaka Aquarium Kaiyukan'];
    
    console.log(`🗺️ Optimizing route for ${spots.length} spots with transit mode...`);
    const startTime = Date.now();
    
    const optimizedRoute = await googleMapsService.optimizeRoute(spots, 'transit');
    const duration = Date.now() - startTime;
    
    console.log(`✅ Route optimization completed in ${duration}ms`);
    console.log(`   Original order: ${spots.join(' → ')}`);
    console.log(`   Optimized order: ${optimizedRoute.orderedSpots.join(' → ')}`);
    console.log(`   Total travel time: ${Math.ceil(optimizedRoute.totalTravelTime / 60)} minutes`);
    console.log(`   Total distance: ${(optimizedRoute.totalDistance / 1000).toFixed(1)} km`);
    console.log(`   Route steps: ${optimizedRoute.routeSteps.length}`);
    
    console.log('\n📋 Route steps:');
    optimizedRoute.routeSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step.from} → ${step.to}`);
      console.log(`      Travel: ${step.travelTime.durationText} (${step.travelTime.distanceText})`);
    });
    
    console.log('\n🧪 Testing complete itinerary generation...');
    
    const itinerary = await googleMapsService.createOptimizedItinerary(
      spots, 
      'Osaka', 
      'transit', 
      '09:00'
    );
    
    console.log(`✅ Itinerary created: ${itinerary.title}`);
    console.log(`   Total duration: ${itinerary.totalDuration}`);
    console.log(`   Total travel time: ${itinerary.totalTravelTime}`);
    console.log(`   Schedule items: ${itinerary.schedule.length}`);
    
    console.log('\n📅 Schedule:');
    itinerary.schedule.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.time} - ${item.spot} (${item.duration})`);
      if (item.travelTime) {
        console.log(`      → Travel: ${item.travelTime} via ${item.transportation}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing route optimization:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  console.log('\n🏁 Test completed!');
}

testRoutesAPI().catch(console.error);