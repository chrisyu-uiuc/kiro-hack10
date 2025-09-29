#!/usr/bin/env node

/**
 * Google Maps API Configuration Validator
 * 
 * This script validates that Google Maps API keys are properly configured
 * and have access to the required APIs.
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

console.log('🔍 Google Maps API Configuration Validator\n');

// Validation similar to node11.js pattern
if (GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_API_KEY' || GOOGLE_MAPS_API_KEY === 'your_google_maps_api_key_here') {
  console.error('❌ Please set your GOOGLE_MAPS_API_KEY in environment variables and re-run.');
  process.exit(1);
}

if (GOOGLE_PLACES_API_KEY === 'YOUR_GOOGLE_API_KEY' || GOOGLE_PLACES_API_KEY === 'your_google_places_api_key_here') {
  console.error('❌ Please set your GOOGLE_PLACES_API_KEY in environment variables and re-run.');
  process.exit(1);
}

/**
 * Test Google Places API
 */
async function testGooglePlacesAPI() {
  console.log('📍 Testing Google Places API...');
  
  if (!GOOGLE_PLACES_API_KEY) {
    console.log('❌ GOOGLE_PLACES_API_KEY not found in environment variables');
    return false;
  }
  
  try {
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Tokyo&inputtype=textquery&key=${GOOGLE_PLACES_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log('✅ Google Places API is working correctly');
      return true;
    } else {
      console.log(`❌ Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Google Places API network error: ${error.message}`);
    return false;
  }
}

/**
 * Test Google Geocoding API
 */
async function testGeocodingAPI() {
  console.log('🗺️ Testing Google Geocoding API...');
  
  const apiKey = GOOGLE_MAPS_API_KEY || GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.log('❌ No API key found for Geocoding API (GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY)');
    return false;
  }
  
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=Tokyo&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log('✅ Google Geocoding API is working correctly');
      return true;
    } else {
      console.log(`❌ Google Geocoding API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Google Geocoding API network error: ${error.message}`);
    return false;
  }
}

/**
 * Test Google Distance Matrix API
 */
async function testDistanceMatrixAPI() {
  console.log('📏 Testing Google Distance Matrix API...');
  
  const apiKey = GOOGLE_MAPS_API_KEY || GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.log('❌ No API key found for Distance Matrix API (GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY)');
    return false;
  }
  
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=Tokyo&destinations=Osaka&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log('✅ Google Distance Matrix API is working correctly');
      return true;
    } else {
      console.log(`❌ Google Distance Matrix API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Google Distance Matrix API network error: ${error.message}`);
    return false;
  }
}

/**
 * Test Google Routes API (optional but recommended)
 */
async function testRoutesAPI() {
  console.log('🛣️ Testing Google Routes API...');
  
  const apiKey = GOOGLE_MAPS_API_KEY || GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.log('❌ No API key found for Routes API (GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY)');
    return false;
  }
  
  try {
    const body = {
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
            latitude: 34.6937, 
            longitude: 135.5023 
          } 
        } 
      },
      travelMode: 'DRIVE'
    };

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
      },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        console.log('✅ Google Routes API is working correctly');
        return true;
      } else {
        console.log('⚠️ Google Routes API returned no routes (may not be enabled)');
        return false;
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Google Routes API error: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Google Routes API network error: ${error.message}`);
    return false;
  }
}

/**
 * Main validation function
 */
async function validateConfiguration() {
  console.log('Environment Variables:');
  console.log(`- GOOGLE_PLACES_API_KEY: ${GOOGLE_PLACES_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`- GOOGLE_MAPS_API_KEY: ${GOOGLE_MAPS_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log('');

  const results = [];
  
  // Test all APIs
  results.push(await testGooglePlacesAPI());
  results.push(await testGeocodingAPI());
  results.push(await testDistanceMatrixAPI());
  results.push(await testRoutesAPI());
  
  console.log('\n📊 Validation Summary:');
  const successCount = results.filter(Boolean).length;
  const totalCount = results.length;
  
  console.log(`✅ ${successCount}/${totalCount} APIs are working correctly`);
  
  if (successCount === totalCount) {
    console.log('🎉 All Google Maps APIs are properly configured!');
    console.log('Your application should work correctly with route optimization.');
  } else if (successCount >= 3) {
    console.log('⚠️ Most APIs are working. Route optimization will work with fallbacks.');
    console.log('Consider enabling the Routes API for better performance.');
  } else {
    console.log('❌ Multiple API issues detected. Please check your configuration.');
    console.log('Route optimization may not work properly.');
  }
  
  console.log('\n💡 Tips:');
  console.log('- Ensure billing is enabled on your Google Cloud project');
  console.log('- Check that all required APIs are enabled in Google Cloud Console');
  console.log('- Verify API key restrictions match your deployment environment');
  console.log('- Monitor your API usage to avoid quota limits');
  
  process.exit(successCount < 3 ? 1 : 0);
}

// Run validation
validateConfiguration().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});