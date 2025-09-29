// Test the frontend with NYC data to see current behavior
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function testNYCItinerary() {
    console.log("🗽 Testing Frontend NYC Itinerary Generation\n");
    
    try {
        // Step 1: Verify city
        console.log("1️⃣ Verifying New York City...");
        const cityResponse = await fetch('http://localhost:3001/api/verify-city', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city: "New York" })
        });
        
        if (!cityResponse.ok) {
            throw new Error(`City verification failed: ${cityResponse.status}`);
        }
        
        const cityResult = await cityResponse.json();
        console.log("✅ City verified:", cityResult.success);
        
        // Step 2: Generate spots
        console.log("\n2️⃣ Generating spots for New York...");
        const spotsResponse = await fetch('http://localhost:3001/api/generate-spots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                city: "New York",
                sessionId: "test-nyc-" + Date.now()
            })
        });
        
        if (!spotsResponse.ok) {
            throw new Error(`Spots generation failed: ${spotsResponse.status}`);
        }
        
        const spotsResult = await spotsResponse.json();
        console.log("✅ Generated", spotsResult.spots?.length || 0, "spots");
        
        // Step 3: Store selections (simulate user selecting our test spots)
        const sessionId = spotsResult.sessionId;
        const selectedSpots = [
            { id: "1", name: "Times Square", category: "Entertainment" },
            { id: "2", name: "Central Park", category: "Parks" },
            { id: "3", name: "Metropolitan Museum of Art", category: "Museums" },
            { id: "4", name: "Statue of Liberty", category: "Landmarks" }
        ];
        
        console.log("\n3️⃣ Storing spot selections...");
        const selectionsResponse = await fetch('http://localhost:3001/api/store-selections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sessionId,
                selectedSpots,
                city: "New York"
            })
        });
        
        if (!selectionsResponse.ok) {
            throw new Error(`Selections storage failed: ${selectionsResponse.status}`);
        }
        
        console.log("✅ Selections stored");
        
        // Step 4: Generate optimized itinerary
        console.log("\n4️⃣ Generating optimized itinerary...");
        const itineraryResponse = await fetch('http://localhost:3001/api/itinerary/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                selectedSpots: selectedSpots.map(spot => ({
                    ...spot,
                    duration: "60"
                })),
                city: "New York",
                travelMode: "transit",
                startTime: "09:00",
                visitDuration: 60,
                includeBreaks: true,
                multiDay: false
            })
        });
        
        if (!itineraryResponse.ok) {
            const errorText = await itineraryResponse.text();
            throw new Error(`Itinerary generation failed: ${itineraryResponse.status} - ${errorText}`);
        }
        
        const itineraryResult = await itineraryResponse.json();
        console.log("✅ Itinerary generated successfully!");
        
        // Analyze the results
        if (itineraryResult.success && itineraryResult.data?.itinerary) {
            const itinerary = itineraryResult.data.itinerary;
            console.log("\n📋 Itinerary Analysis:");
            console.log("   Title:", itinerary.title);
            console.log("   Total Duration:", itinerary.totalDuration);
            console.log("   Schedule Items:", itinerary.schedule?.length || 0);
            
            if (itinerary.schedule) {
                console.log("\n🕐 Schedule Details:");
                itinerary.schedule.forEach((item, index) => {
                    console.log(`   ${index + 1}. ${item.spot}`);
                    if (item.arrivalTime) console.log(`      📍 Arrive: ${item.arrivalTime}`);
                    if (item.departureTime) console.log(`      🚀 Depart: ${item.departureTime}`);
                    if (item.travelTime) console.log(`      🚶 Travel: ${item.travelTime}`);
                });
            }
            
            // Check if driving fallback was used
            if (itineraryResult.data.fallbackUsed) {
                console.log("\n🚗 Driving fallback was used (expected for transit in some regions)");
            }
        }
        
        console.log("\n🎯 Test completed successfully!");
        console.log("   Frontend should now show improved travel times");
        console.log("   Visit: http://localhost:3000/itinerary");
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

testNYCItinerary();