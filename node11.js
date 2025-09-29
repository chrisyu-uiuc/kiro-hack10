// index.js
// Node 18+ is recommended. If using an older version, ensure node-fetch is installed.
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

// --- IMPORTANT: Set your Google API Key here ---
const API_KEY = process.env.GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_API_KEY_HERE";

if (!API_KEY || API_KEY === "YOUR_GOOGLE_API_KEY") {
    console.error("Please set your GOOGLE_API_KEY in the script and re-run.");
    process.exit(1);
}

// ---- Config: Edit your travel plan here ----

// The starting and ending point for each day.
const HOTEL_LOCATION = "Times Square, New York";

// List of spots to visit with estimated visiting time in minutes.
const spots = [
    // --- Museums & Culture ---
    { name: "The Metropolitan Museum of Art, New York", durationMin: 60 }, // World-class art museum
    { name: "Central Park, New York", durationMin: 60 }, // Iconic urban park
    { name: "Times Square, New York", durationMin: 60 }, // Vibrant entertainment district
    { name: "Statue of Liberty, New York", durationMin: 60 }, // Iconic landmark
];

// Daily schedule parameters
const START_TIME_OF_DAY = 9; // 9 AM
const END_TIME_OF_DAY = 22; // 10 PM

// Lunch configuration
const LUNCH_DURATION_MIN = 60;
const LUNCH_WINDOW_START = 12; // 12 PM
const LUNCH_WINDOW_END = 14;   // 2 PM

// API call politeness settings
const POLITE_DELAY_MS = 100;

// ---------------------------------------------

// Simple in-memory cache for API results to avoid redundant calls
const apiCache = new Map();

async function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function geocodePlace(name) {
    const cacheKey = `geo:${name}`;
    if (apiCache.has(cacheKey)) return apiCache.get(cacheKey);

    const q = encodeURIComponent(name);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${q}&key=${API_KEY}`;
    const res = await fetch(url);
    const j = await res.json();
    if (!j.results || j.results.length === 0) throw new Error("Geocode failed for: " + name);
    const { lat, lng } = j.results[0].geometry.location;
    const result = { name, lat, lng };
    apiCache.set(cacheKey, result);
    return result;
}

async function transitTimeBetween(a, b, departureUnixTs) {
    if (a.name === b.name) return { durationSec: 0 };
    
    const cacheKey = `transit:${a.name}-${b.name}-${departureUnixTs}`;
    if (apiCache.has(cacheKey)) return apiCache.get(cacheKey);
    
    await sleep(POLITE_DELAY_MS); // polite delay before each API call

    const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
    const body = {
        origin: { location: { latLng: { latitude: a.lat, longitude: a.lng } } },
        destination: { location: { latLng: { latitude: b.lat, longitude: b.lng } } },
        travelMode: "TRANSIT",
        departureTime: new Date(departureUnixTs * 1000).toISOString(),
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': 'routes.duration'
        },
        body: JSON.stringify(body)
    });

    const j = await res.json();

    if (!j.routes || j.routes.length === 0 || !j.routes[0].duration) {
        console.warn(`Warning: Could not find a transit route from ${a.name} to ${b.name}.`);
        return { durationSec: Infinity };
    }

    const durationStr = j.routes[0].duration;
    const durationSec = parseInt(durationStr.replace('s', ''), 10);
    const result = { durationSec };
    apiCache.set(cacheKey, result);
    return result;
}

function buildGoogleMapsLink(a, b, departureUnix) {
  const params = new URLSearchParams({
    api: '1',
    origin: `${a.lat},${a.lng}`,
    destination: `${b.lat},${b.lng}`,
    travelmode: 'transit',
    departure_time: String(departureUnix)
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

(async function main() {
    try {
        console.log("Geocoding all locations...");
        const allLocationNames = [HOTEL_LOCATION, ...spots.map(s => s.name)];
        const locationData = new Map();
        for (const name of allLocationNames) {
            const loc = await geocodePlace(name);
            const spotInfo = spots.find(s => s.name === name);
            locationData.set(name, {
                ...loc,
                durationSec: (spotInfo?.durationMin || 0) * 60
            });
            console.log(` - Geocoded ${name}`);
        }

        const hotel = locationData.get(HOTEL_LOCATION);
        let unvisitedSpots = new Set(spots.map(s => s.name));
        const itinerary = [];
        let dayNumber = 1;
        
        let today = new Date();
        today.setHours(START_TIME_OF_DAY, 0, 0, 0);
        let currentTime = today.getTime(); // in milliseconds

        while (unvisitedSpots.size > 0) {
            console.log(`\nPlanning Day ${dayNumber}...`);
            const dayPlan = { day: dayNumber, route: [] };
            let currentLocationName;
            let hadLunchToday = false;
            
            const endOfDayLimit = new Date(currentTime);
            endOfDayLimit.setHours(END_TIME_OF_DAY, 0, 0, 0);

            // MODIFICATION START: Special handling for Day 1 start
            if (dayNumber === 1) {
                console.log(" - Finding the best starting spot for Day 1...");
                let bestStartingSpot = null;
                let minTravelTimeToStart = Infinity;

                // Find the closest spot to the hotel to begin the entire tour
                for (const spotName of unvisitedSpots) {
                    const { durationSec: travelSec } = await transitTimeBetween(hotel, locationData.get(spotName), currentTime / 1000);
                    if (travelSec < minTravelTimeToStart) {
                        minTravelTimeToStart = travelSec;
                        bestStartingSpot = spotName;
                    }
                }
                
                if (bestStartingSpot) {
                    const spotLoc = locationData.get(bestStartingSpot);
                    const arrivalTs = currentTime + minTravelTimeToStart * 1000;
                    const departureTs = arrivalTs + spotLoc.durationSec * 1000;
                    const { durationSec: travelToHotelSec } = await transitTimeBetween(spotLoc, hotel, departureTs / 1000);
                    const finalArrivalAtHotelTs = departureTs + travelToHotelSec * 1000;

                    // Ensure the very first spot of the trip fits within a day's schedule
                    if (finalArrivalAtHotelTs <= endOfDayLimit.getTime()) {
                        console.log(` - Starting Day 1 by traveling to: ${bestStartingSpot}`);
                        dayPlan.route.push({
                            name: bestStartingSpot,
                            arrivalTs: arrivalTs,
                            departureTs: departureTs
                        });
                        unvisitedSpots.delete(bestStartingSpot);
                        currentLocationName = bestStartingSpot;
                        currentTime = departureTs;
                    } else {
                        console.log(" - No spot could be visited on Day 1. Ending plan.");
                        unvisitedSpots.clear(); // End the main loop
                        continue;
                    }
                } else {
                    console.log(" - No spots to visit. Ending plan.");
                    break;
                }
            } else {
                // For Day 2+, start the day at the hotel as usual
                currentLocationName = HOTEL_LOCATION;
                dayPlan.route.push({
                    name: HOTEL_LOCATION,
                    arrivalTs: currentTime,
                    departureTs: currentTime
                });
            }
            // MODIFICATION END

            while (true) {
                // --- LUNCH CHECK ---
                const currentHour = new Date(currentTime).getHours();
                if (!hadLunchToday && currentHour >= LUNCH_WINDOW_START && currentHour < LUNCH_WINDOW_END) {
                    const lunchDepartureTs = currentTime + LUNCH_DURATION_MIN * 60 * 1000;
                    dayPlan.route.push({
                        name: "Lunch Break",
                        arrivalTs: currentTime,
                        departureTs: lunchDepartureTs,
                        isLunch: true
                    });
                    currentTime = lunchDepartureTs;
                    hadLunchToday = true;
                    console.log(" - Scheduling lunch break.");
                }

                // --- FIND NEXT BEST SPOT ---
                let bestNextSpot = null;
                let minTravelTime = Infinity;

                for (const spotName of unvisitedSpots) {
                    const fromLoc = locationData.get(currentLocationName);
                    const toLoc = locationData.get(spotName);

                    const { durationSec: travelToSpotSec } = await transitTimeBetween(fromLoc, toLoc, currentTime / 1000);
                    if (travelToSpotSec === Infinity) continue;

                    const arrivalAtSpotTs = currentTime + travelToSpotSec * 1000;
                    const departureFromSpotTs = arrivalAtSpotTs + toLoc.durationSec * 1000;

                    const { durationSec: travelToHotelSec } = await transitTimeBetween(toLoc, hotel, departureFromSpotTs / 1000);
                    if (travelToHotelSec === Infinity) continue;

                    const finalArrivalAtHotelTs = departureFromSpotTs + travelToHotelSec * 1000;

                    if (finalArrivalAtHotelTs <= endOfDayLimit.getTime()) {
                        if (travelToSpotSec < minTravelTime) {
                            minTravelTime = travelToSpotSec;
                            bestNextSpot = {
                                name: spotName,
                                travelSec: travelToSpotSec,
                                arrivalTs: arrivalAtSpotTs,
                                departureTs: departureFromSpotTs
                            };
                        }
                    }
                }

                if (bestNextSpot) {
                    // Commit to visiting this spot
                    dayPlan.route.push(bestNextSpot);
                    unvisitedSpots.delete(bestNextSpot.name);
                    currentLocationName = bestNextSpot.name;
                    currentTime = bestNextSpot.departureTs;
                    console.log(` - Adding to itinerary: ${bestNextSpot.name}`);
                } else {
                    // No more spots can be visited today, end the day
                    break;
                }
            }
            
            // Add final leg back to the hotel
            const lastSpotName = dayPlan.route.length > 0 ? dayPlan.route[dayPlan.route.length - 1].name : HOTEL_LOCATION;
            const lastSpot = locationData.get(lastSpotName);
            const { durationSec: travelToHotelSec } = await transitTimeBetween(lastSpot, hotel, currentTime / 1000);
            const finalArrivalTs = currentTime + travelToHotelSec * 1000;

            dayPlan.route.push({
                name: HOTEL_LOCATION,
                arrivalTs: finalArrivalTs,
                departureTs: finalArrivalTs
            });

            itinerary.push(dayPlan);

            // Prepare for the next day
            dayNumber++;
            today.setDate(today.getDate() + 1);
            today.setHours(START_TIME_OF_DAY, 0, 0, 0);
            currentTime = today.getTime();
        }

        printItinerary(itinerary, locationData);

    } catch (err) {
        console.error("\n--- An error occurred ---");
        console.error("Error:", err.message || err);
        console.error("\nPlease check your API key, enabled APIs, and spot names.");
    }
})();

function printItinerary(itinerary, locationData) {
    console.log("\n\n===================================");
    console.log("      Your Travel Itinerary");
    console.log("===================================");

    for (const day of itinerary) {
        console.log(`\n----------- DAY ${day.day} -----------`);

        // On Day 1, add a note about starting from the hotel
        if (day.day === 1 && day.route.length > 0) {
            const firstLeg = day.route[0];
            const travelToFirstSpotMin = (firstLeg.arrivalTs - (new Date(firstLeg.arrivalTs).setHours(START_TIME_OF_DAY, 0, 0, 0))) / (1000 * 60);
            const startTime = new Date(new Date(firstLeg.arrivalTs).setHours(START_TIME_OF_DAY, 0, 0, 0)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            console.log(`[${startTime}] -- Start from ${HOTEL_LOCATION} and travel to ${firstLeg.name} (${travelToFirstSpotMin.toFixed(0)} mins)`);
            const fromLoc = locationData.get(HOTEL_LOCATION);
            const toLoc = locationData.get(firstLeg.name);
            if(fromLoc && toLoc) {
                const link = buildGoogleMapsLink(fromLoc, toLoc, (firstLeg.arrivalTs - travelToFirstSpotMin * 60 * 1000) / 1000);
                console.log(`    - Directions: ${link}`);
            }
        }

        for (let i = 0; i < day.route.length - 1; i++) {
            const currentLeg = day.route[i];
            const nextLeg = day.route[i+1];
            
            const arrivalTime = new Date(currentLeg.arrivalTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            if (currentLeg.isLunch) {
                console.log(`\n[${arrivalTime}] >> Lunch Break (${LUNCH_DURATION_MIN} minutes)`);
            } else {
                 // For Day 1, the first arrival is already covered by the special message above.
                if (day.day === 1 && i === 0) {
                    console.log(`\n[${arrivalTime}] >> Arrive at: ${currentLeg.name}`);
                } else if (day.day > 1 && i === 0) {
                     // For other days, the first log is arriving at the hotel to start, which we can skip.
                } else {
                    console.log(`\n[${arrivalTime}] >> Arrive at: ${currentLeg.name}`);
                }

                // MODIFICATION: Show visit duration for any location that is not the hotel.
                if (currentLeg.name !== HOTEL_LOCATION) {
                    const visitDuration = (currentLeg.departureTs - currentLeg.arrivalTs) / (1000 * 60);
                    console.log(`    - Visit for ${visitDuration.toFixed(0)} minutes.`);
                }
            }

            const travelDurationMin = (nextLeg.arrivalTs - currentLeg.departureTs) / (1000 * 60);
            const departureTime = new Date(currentLeg.departureTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Don't show travel from a location if there's no time (e.g. hotel start)
            if (travelDurationMin > 0) {
                 console.log(`[${departureTime}] -- Travel to ${nextLeg.name} (${travelDurationMin.toFixed(0)} mins)`);
            
                const fromLoc = locationData.get(currentLeg.name);
                const toLoc = locationData.get(nextLeg.name);
                if(fromLoc && toLoc) {
                    const link = buildGoogleMapsLink(fromLoc, toLoc, currentLeg.departureTs / 1000);
                    console.log(`    - Directions: ${link}`);
                }
            }
        }
        const finalLeg = day.route[day.route.length - 1];
        const finalArrivalTime = new Date(finalLeg.arrivalTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        console.log(`\n[${finalArrivalTime}] >> Arrive at: ${finalLeg.name} (End of Day)`);
    }
    console.log("\n===================================");
    console.log("             End of Plan");
    console.log("===================================");
}
