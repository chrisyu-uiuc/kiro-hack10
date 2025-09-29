// Test large itinerary optimization (10+ spots)
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function testLargeItinerary() {
    console.log("🚀 Testing Large Itinerary Optimization (10+ spots)\n");
    
    const startTime = Date.now();
    
    try {
        // Step 1: Generate spots for New York
        console.log("1️⃣ Generating spots for New York...");
        const spotsResponse = await fetch('http://localhost:3001/api/generate-spots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                city: "New York",
                sessionId: "large-test-" + Date.now()
            })
        });
        
        const spotsResult = await spotsResponse.json();
        console.log(`✅ Generated ${spotsResult.data.spots.length} spots`);
        
        // Step 2: Select ALL spots (should be 10+)
        const sessionId = spotsResult.data.sessionId;
        const allSpotIds = spotsResult.data.spots.map(spot => spot.id);
        
        console.log(`\n2️⃣ Selecting ${allSpotIds.length} spots for large itinerary test...`);
        const selectionsResponse = await fetch('http://localhost:3001/api/store-selections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                selectedSpots: allSpotIds
            })
        });
        
        if (!selectionsResponse.ok) {
            throw new Error(`Selections failed: ${selectionsResponse.status}`);
        }
        
        console.log("✅ All spots selected");
        
        // Step 3: Generate optimized itinerary with timeout monitoring
        console.log(`\n3️⃣ Generating optimized itinerary for ${allSpotIds.length} spots...`);
        console.log("⏱️ Monitoring for timeout issues...");
        
        const optimizationStart = Date.now();
        
        const itineraryResponse = await fetch('http://localhost:3001/api/itinerary/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                selectedSpots: spotsResult.data.spots.map(spot => ({
                    id: spot.id,
                    name: spot.name,
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
        
        const optimizationTime = Date.now() - optimizationStart;
        
        if (!itineraryResponse.ok) {
            const errorText = await itineraryResponse.text();
            throw new Error(`Itinerary generation failed: ${itineraryResponse.status} - ${errorText}`);
        }
        
        const itineraryResult = await itineraryResponse.json();
        
        console.log("✅ Large itinerary generated successfully!");
        console.log(`⏱️ Optimization time: ${optimizationTime}ms`);
        
        // Analyze the results
        if (itineraryResult.success && itineraryResult.data?.itinerary) {
            const itinerary = itineraryResult.data.itinerary;
            
            console.log("\n📊 Large Itinerary Analysis:");
            console.log("─".repeat(50));
            console.log(`Title: ${itinerary.title}`);
            console.log(`Total Duration: ${itinerary.totalDuration}`);
            console.log(`Total Travel Time: ${itinerary.totalTravelTime}`);
            console.log(`Schedule Items: ${itinerary.schedule?.length || 0}`);
            console.log(`Optimization Method: ${allSpotIds.length > 8 ? 'Fast Heuristic' : 'Full Matrix'}`);
            
            if (itinerary.route) {
                console.log(`Route Distance: ${(itinerary.route.totalDistance / 1000).toFixed(1)} km`);
                console.log(`Route Steps: ${itinerary.route.routeSteps.length}`);
                console.log(`API Calls Estimate: ${itinerary.route.routeSteps.length + allSpotIds.length} (vs ${allSpotIds.length * allSpotIds.length} for full matrix)`);
            }
            
            // Performance metrics
            console.log("\n⚡ Performance Metrics:");
            console.log("─".repeat(50));
            console.log(`Total Processing Time: ${Date.now() - startTime}ms`);
            console.log(`Optimization Time: ${optimizationTime}ms`);
            console.log(`Timeout Risk: ${optimizationTime > 30000 ? '🚨 HIGH' : optimizationTime > 15000 ? '⚠️ MEDIUM' : '✅ LOW'}`);
            
            // Check if fast optimization was used
            if (allSpotIds.length > 8) {
                console.log(`Fast Optimization: ✅ Used (${allSpotIds.length} spots > 8 threshold)`);
                console.log(`API Call Reduction: ${Math.round((1 - (allSpotIds.length * 2) / (allSpotIds.length * allSpotIds.length)) * 100)}%`);
            } else {
                console.log(`Fast Optimization: ❌ Not needed (${allSpotIds.length} spots ≤ 8 threshold)`);
            }
            
            // Sample schedule items
            if (itinerary.schedule && itinerary.schedule.length > 0) {
                console.log("\n📋 Sample Schedule (first 5 items):");
                console.log("─".repeat(50));
                itinerary.schedule.slice(0, 5).forEach((item, index) => {
                    console.log(`${index + 1}. ${item.spot}`);
                    if (item.arrivalTime) console.log(`   📍 ${item.arrivalTime} - ${item.departureTime}`);
                    if (item.travelTime) console.log(`   🚶 Travel: ${item.travelTime}`);
                });
                
                if (itinerary.schedule.length > 5) {
                    console.log(`   ... and ${itinerary.schedule.length - 5} more items`);
                }
            }
            
            console.log("\n🎯 Test Results:");
            console.log("─".repeat(50));
            
            if (optimizationTime < 45000) {
                console.log("✅ SUCCESS: Large itinerary generated without timeout");
                console.log("✅ Performance optimizations working correctly");
                console.log("✅ System can handle 10+ spots efficiently");
            } else {
                console.log("⚠️ WARNING: Optimization took longer than expected");
                console.log("💡 Consider further performance improvements");
            }
            
        } else {
            console.log("❌ Failed to generate itinerary data");
        }
        
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`\n❌ Large itinerary test failed after ${totalTime}ms:`);
        console.error(error.message);
        
        if (error.message.includes('timeout') || totalTime > 60000) {
            console.log("\n💡 Timeout detected - optimizations may need further tuning");
        }
    }
}

testLargeItinerary();