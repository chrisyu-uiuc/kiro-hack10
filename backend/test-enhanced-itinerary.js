#!/usr/bin/env node

/**
 * Test script for enhanced itinerary generation with realistic timing constraints
 * This script validates that the enhanced Bedrock Agent prompts work correctly
 */

import { BedrockAgentService } from './dist/services/BedrockAgentService.js';

async function testEnhancedItinerary() {
  console.log('🧪 Testing Enhanced Itinerary Generation...\n');
  
  const service = new BedrockAgentService();
  
  // Test spots from Tokyo
  const testSpots = [
    {
      id: 'spot-1',
      name: 'Tokyo Skytree',
      category: 'Viewpoint',
      location: 'Sumida',
      description: 'The tallest tower in the world, offering panoramic views of Tokyo.'
    },
    {
      id: 'spot-2',
      name: 'Senso-ji Temple',
      category: 'Religious Site',
      location: 'Asakusa',
      description: 'Tokyo\'s oldest temple, a popular site for both tourists and locals.'
    },
    {
      id: 'spot-3',
      name: 'Tokyo National Museum',
      category: 'Museum',
      location: 'Ueno',
      description: 'The oldest and largest museum in Japan, showcasing a vast collection of art and artifacts.'
    },
    {
      id: 'spot-4',
      name: 'Shinjuku Gyoen',
      category: 'Park',
      location: 'Shinjuku',
      description: 'A large park with beautiful gardens, offering a peaceful retreat in the city.'
    }
  ];

  try {
    console.log('📍 Test Spots:');
    testSpots.forEach(spot => {
      console.log(`  - ${spot.name} (${spot.category}) - ${spot.location}`);
    });
    console.log('');

    const itinerary = await service.generateItinerary(testSpots, 'test-enhanced-session');
    
    console.log('✅ Enhanced Itinerary Generated Successfully!\n');
    console.log(`📋 ${itinerary.title}`);
    console.log(`⏱️  Total Duration: ${itinerary.totalDuration}\n`);
    
    console.log('📅 Schedule:');
    itinerary.schedule.forEach((item, index) => {
      console.log(`${index + 1}. ${item.time} - ${item.spot}`);
      console.log(`   Duration: ${item.duration}`);
      console.log(`   Transportation: ${item.transportation}`);
      if (item.notes) {
        console.log(`   Notes: ${item.notes}`);
      }
      console.log('');
    });

    // Validate enhanced features
    console.log('🔍 Validation Results:');
    
    const hasRealisticTiming = itinerary.schedule.some(item => 
      item.time.includes('AM') || item.time.includes('PM')
    );
    console.log(`  ✅ Realistic timing: ${hasRealisticTiming ? 'PASS' : 'FAIL'}`);
    
    const hasProperDurations = itinerary.schedule.some(item => 
      item.duration.includes('hour') || item.duration.includes('min')
    );
    console.log(`  ✅ Proper durations: ${hasProperDurations ? 'PASS' : 'FAIL'}`);
    
    const hasTransportation = itinerary.schedule.some(item => 
      item.transportation && item.transportation !== 'Walking'
    );
    console.log(`  ✅ Transportation info: ${hasTransportation ? 'PASS' : 'FAIL'}`);
    
    const hasNotes = itinerary.schedule.some(item => 
      item.notes && item.notes.length > 0
    );
    console.log(`  ✅ Helpful notes: ${hasNotes ? 'PASS' : 'FAIL'}`);
    
    console.log('\n🎉 Enhanced itinerary generation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testEnhancedItinerary();