// Test the updated API with driving fallback
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function testItineraryGeneration() {
    console.log("🧪 Testing Enhanced Itinerary API with Driving Fallback\n");
    
    const testData = {
        sessionId: "test-session-" + Date.now(),
        city: "Osaka",
        selectedSpots: [
            { id: "1", name: "Osaka Castle", duration: "120" },
            { id: "2", name: "Dotonbori", duration: "90" },
            { id: "3", name: "Universal Studios Japan", duration: "300" }
        ],
        travelMode: "transit",
        startTime: "09:00",
        visitDuration: 60,
        includeBreaks: true,
        multiDay: false
    };
    
    try {
        console.log("📤 Sending request to enhanced itinerary API...");
        const response = await fetch('http://localhost:3001/api/itinerary/optimize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        console.log("✅ API Response received successfully!\n");
        
        // Check if we have itinerary data
        if (result.itinerary && result.itinerary.length > 0) {
            console.log("📋 Itinerary Generated:");
            result.itinerary.forEach((day, index) => {
                console.log(`\n  Day ${index + 1}:`);
                day.activities.forEach(activity => {
                    if (activity.transportation) {
                        const transport = activity.transportation;
                        console.log(`    🚗 ${activity.spot} - Travel: ${transport.duration} (${transport.mode})`);
                    } else {
                        console.log(`    📍 ${activity.spot} - Visit: ${activity.duration} min`);
                    }
                });
            });
        }
        
        // Check optimization metrics
        if (result.optimization) {
            console.log(`\n📊 Optimization Metrics:`);
            console.log(`    Total Travel Time: ${result.optimization.totalTravelTime}`);
            console.log(`    Total Distance: ${result.optimization.totalDistance}`);
            console.log(`    Route Efficiency: ${result.optimization.efficiency}%`);
        }
        
        console.log("\n🎯 Test completed successfully!");
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

testItineraryGeneration();