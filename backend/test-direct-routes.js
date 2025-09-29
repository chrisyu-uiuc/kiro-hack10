#!/usr/bin/env node

/**
 * Direct test of Google Routes API v2 for transit mode
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDirectRoutesAPI() {
  console.log('🧪 Testing Google Routes API v2 directly...\n');

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.error('❌ No API key found');
    return;
  }

  // Test multiple routes and modes
  const testCases = [
    {
      name: 'Osaka Castle → Dotonbori (walking)',
      body: {
        origin: {
          location: {
            latLng: {
              latitude: 34.6872571,  // Osaka Castle
              longitude: 135.5258546
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: 34.6686471,  // Dotonbori
              longitude: 135.5030983
            }
          }
        },
        travelMode: 'WALK',
        computeAlternativeRoutes: false,
        languageCode: 'en-US',
        units: 'METRIC'
      }
    },
    {
      name: 'Osaka Castle → Dotonbori (transit)',
      body: {
        origin: {
          location: {
            latLng: {
              latitude: 34.6872571,  // Osaka Castle
              longitude: 135.5258546
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: 34.6686471,  // Dotonbori
              longitude: 135.5030983
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
      }
    },
    {
      name: 'Tokyo Station → Shibuya (transit)',
      body: {
        origin: {
          location: {
            latLng: {
              latitude: 35.6812362,  // Tokyo Station
              longitude: 139.7671248
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: 35.6580339,  // Shibuya
              longitude: 139.7016358
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
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🗺️ Testing: ${testCase.name}`);
    console.log('📋 Request body:', JSON.stringify(testCase.body, null, 2));

    try {
      const startTime = Date.now();

      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': '*'
        },
        body: JSON.stringify(testCase.body)
      });

      const responseTime = Date.now() - startTime;
      console.log(`📡 Response status: ${response.status} (${responseTime}ms)`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:');
        console.error(errorText);
        continue;
      }

      const data = await response.json();
      console.log('✅ Success! API Response:');
      console.log(JSON.stringify(data, null, 2));

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        console.log('📊 Route Analysis:');
        console.log(`   Duration: ${route.duration || 'N/A'}`);
        console.log(`   Distance: ${route.distanceMeters || 'N/A'} meters`);
        console.log(`   Legs: ${route.legs?.length || 0}`);

        if (route.legs) {
          route.legs.forEach((leg, index) => {
            console.log(`   Leg ${index + 1}: ${leg.duration || 'N/A'} (${leg.distanceMeters || 'N/A'}m)`);
          });
        }
      } else {
        console.log('⚠️ No routes returned');
      }

    } catch (error) {
      console.error('❌ Network Error:', error.message);
    }
  }




  console.log('\n🏁 Direct test completed!');
}

testDirectRoutesAPI().catch(console.error);