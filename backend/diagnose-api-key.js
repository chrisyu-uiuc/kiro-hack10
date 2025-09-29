#!/usr/bin/env node

/**
 * Diagnostic script to test Google Maps API key configuration
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function diagnoseApiKey() {
  console.log('🔍 Diagnosing Google Maps API Key Configuration...\n');
  
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No API key found in environment variables');
    console.log('   Please set GOOGLE_MAPS_API_KEY in your .env file');
    return;
  }
  
  console.log('✅ API key found in environment');
  console.log(`   Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  
  // Test 1: Geocoding API (should work)
  console.log('\n🧪 Test 1: Geocoding API');
  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Tokyo&key=${apiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();
    
    if (geocodeData.status === 'OK') {
      console.log('✅ Geocoding API: Working');
    } else {
      console.log(`❌ Geocoding API: ${geocodeData.status}`);
      if (geocodeData.error_message) {
        console.log(`   Error: ${geocodeData.error_message}`);
      }
    }
  } catch (error) {
    console.log(`❌ Geocoding API: Network error - ${error.message}`);
  }
  
  // Test 2: Routes API (this is what's failing)
  console.log('\n🧪 Test 2: Routes API v2');
  try {
    const routesUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const routesBody = {
      origin: { 
        location: { 
          latLng: { 
            latitude: 35.6762, 
            longitude: 139.6503 
          } 
        } 
      },
      destination: { 
        location: { 
          latLng: { 
            latitude: 35.6580, 
            longitude: 139.7016 
          } 
        } 
      },
      travelMode: 'TRANSIT',
      computeAlternativeRoutes: false,
      languageCode: 'en-US',
      units: 'METRIC',
      departureTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      transitPreferences: {
        allowedTravelModes: ['BUS', 'SUBWAY', 'TRAIN', 'RAIL'],
        routingPreference: 'LESS_WALKING'
      }
    };
    
    const routesResponse = await fetch(routesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': '*'
      },
      body: JSON.stringify(routesBody)
    });
    
    const routesData = await routesResponse.json();
    
    if (routesResponse.ok) {
      if (routesData.routes && routesData.routes.length > 0) {
        console.log('✅ Routes API: Working with transit data');
        console.log(`   Found ${routesData.routes.length} route(s)`);
      } else {
        console.log('⚠️ Routes API: Working but no transit routes found');
        console.log('   This is normal for areas without transit data');
      }
    } else {
      console.log(`❌ Routes API: HTTP ${routesResponse.status}`);
      console.log(`   Response: ${JSON.stringify(routesData, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Routes API: Network error - ${error.message}`);
  }
  
  // Test 3: Walking Routes API (our fallback)
  console.log('\n🧪 Test 3: Routes API v2 (Walking Mode)');
  try {
    const routesUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const routesBody = {
      origin: { 
        location: { 
          latLng: { 
            latitude: 35.6762, 
            longitude: 139.6503 
          } 
        } 
      },
      destination: { 
        location: { 
          latLng: { 
            latitude: 35.6580, 
            longitude: 139.7016 
          } 
        } 
      },
      travelMode: 'WALK',
      computeAlternativeRoutes: false,
      languageCode: 'en-US',
      units: 'METRIC'
    };
    
    const routesResponse = await fetch(routesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': '*'
      },
      body: JSON.stringify(routesBody)
    });
    
    const routesData = await routesResponse.json();
    
    if (routesResponse.ok && routesData.routes && routesData.routes.length > 0) {
      console.log('✅ Routes API (Walking): Working');
      const route = routesData.routes[0];
      console.log(`   Duration: ${route.duration || 'N/A'}`);
      console.log(`   Distance: ${route.distanceMeters || 'N/A'} meters`);
    } else {
      console.log(`❌ Routes API (Walking): Failed`);
      console.log(`   Response: ${JSON.stringify(routesData, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Routes API (Walking): Network error - ${error.message}`);
  }
  
  console.log('\n📋 Diagnosis Summary:');
  console.log('1. If Geocoding works but Routes API fails → Enable Routes API in Google Cloud Console');
  console.log('2. If both fail → Check API key restrictions and billing');
  console.log('3. If Routes API works but no transit data → This is normal, fallback system will work');
  console.log('4. If Walking Routes API works → System should provide realistic travel times');
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Go to Google Cloud Console → APIs & Services → Library');
  console.log('2. Search for "Routes API" and enable it');
  console.log('3. Check API key restrictions under Credentials');
  console.log('4. Verify billing is enabled for your project');
}

diagnoseApiKey().catch(console.error);