// Test driving routes as fallback for Osaka
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_API_KEY_HERE";

async function testRoute(origin, destination, mode) {
    console.log(`\n${mode === 'DRIVE' ? '🚗' : '🚶'} Testing ${mode}: ${origin} → ${destination}`);
    
    const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
    const body = {
        origin: { address: origin },
        destination: { address: destination },
        travelMode: mode,
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const durationMin = Math.round(parseInt(route.duration.replace('s', '')) / 60);
            const distanceKm = (route.distanceMeters / 1000).toFixed(1);
            console.log(`✅ SUCCESS: ${durationMin} min, ${distanceKm} km`);
            return { success: true, duration: durationMin, distance: distanceKm };
        } else {
            console.log(`❌ FAILED: No routes`);
            return { success: false };
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        return { success: false };
    }
}

(async function main() {
    console.log("🗾 Testing Driving vs Walking Fallback for Osaka\n");
    
    const osakaRoutes = [
        ["Osaka Station", "Osaka Castle"],
        ["Dotonbori", "Universal Studios Japan"],
        ["Namba Station", "Osaka Aquarium"],
        ["Tennoji Station", "Sumiyoshi Taisha"],
    ];
    
    for (const [origin, destination] of osakaRoutes) {
        const walking = await testRoute(origin, destination, "WALK");
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const driving = await testRoute(origin, destination, "DRIVE");
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (walking.success && driving.success) {
            const walkMin = walking.duration;
            const driveMin = driving.duration;
            const timeSaved = walkMin - driveMin;
            const efficiency = ((timeSaved / walkMin) * 100).toFixed(0);
            
            console.log(`📊 Comparison: Driving saves ${timeSaved} min (${efficiency}% faster)`);
        }
        
        console.log("─".repeat(50));
    }
    
    console.log("\n🎯 Recommendation: Use driving as fallback for better user experience");
})();