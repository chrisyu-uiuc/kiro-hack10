import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

export interface Spot {
    id: string;
    name: string;
    category: string;
    location: string;
    description: string;
    duration: string;
}

export interface Itinerary {
    title: string;
    totalDuration: string;
    schedule: ScheduleItem[];
}

export interface ScheduleItem {
    time: string;
    spot: string;
    duration: string;
    transportation: string;
    notes: string;
}

export class BedrockAgentService {
    private client: BedrockAgentRuntimeClient;
    private agentId: string;
    private agentAliasId: string;

    constructor() {
        this.client = new BedrockAgentRuntimeClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });

        this.agentId = process.env.BEDROCK_AGENT_ID || 'BTATPBP5VG';
        this.agentAliasId = process.env.BEDROCK_AGENT_ALIAS_ID || 'JFTVDFJYFF';
    }

    /**
     * Invoke the Bedrock Agent with a prompt and session management
     */
    async invokeAgent(prompt: string, sessionId: string): Promise<string> {
        try {
            console.log('🔧 Bedrock Agent Config:', {
                agentId: this.agentId,
                agentAliasId: this.agentAliasId,
                region: process.env.AWS_REGION,
                hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
                hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
            });

            const command = new InvokeAgentCommand({
                agentId: this.agentId,
                agentAliasId: this.agentAliasId,
                sessionId,
                inputText: prompt,
            });

            console.log('📤 Sending command to Bedrock Agent...');
            const response = await this.client.send(command);
            console.log('📥 Received response from Bedrock Agent');

            if (!response.completion) {
                throw new Error('No completion received from Bedrock Agent');
            }

            // Process the streaming response
            let fullResponse = '';
            for await (const chunk of response.completion) {
                if (chunk.chunk?.bytes) {
                    const text = new TextDecoder().decode(chunk.chunk.bytes);
                    fullResponse += text;
                }
            }

            console.log('✅ Full response processed, length:', fullResponse.length);
            return fullResponse.trim();
        } catch (error) {
            console.error('❌ Error invoking Bedrock Agent:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                name: error instanceof Error ? error.name : 'Unknown',
                stack: error instanceof Error ? error.stack : undefined
            });
            throw new Error(`Failed to invoke Bedrock Agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Verify if a city exists using the Bedrock Agent
     */
    async verifyCityExists(city: string): Promise<boolean> {
        try {
            const prompt = `Can you help me plan a trip to ${city}? If ${city} is a real place that tourists can visit, just say "YES I can help with ${city}". If ${city} is not a real place or city, say "NO, ${city} is not a valid destination".`;
            const sessionId = `city-verification-${Date.now()}`;

            const response = await this.invokeAgent(prompt, sessionId);

            // Log the actual response for debugging
            console.log(`🔍 Bedrock Agent response for "${city}":`, JSON.stringify(response));

            // Parse the response to determine if city is valid
            const normalizedResponse = response.toUpperCase().trim();

            // Check if agent says it cannot verify cities
            if (normalizedResponse.includes('CANNOT') && normalizedResponse.includes('VERIFY')) {
                console.log(`⚠️ Bedrock Agent cannot verify cities, using fallback validation for: ${city}`);
                return this.fallbackCityValidation(city);
            }

            // Check for positive indicators
            const positiveIndicators = ['YES', 'VALID', 'EXISTS', 'REAL', 'TRUE'];
            const negativeIndicators = ['NO', 'INVALID', 'NOT', 'FALSE', 'FAKE'];

            const hasPositive = positiveIndicators.some(indicator => normalizedResponse.includes(indicator));
            const hasNegative = negativeIndicators.some(indicator => normalizedResponse.includes(indicator));

            // If we have positive indicators and no negative ones, accept it
            const isValid = hasPositive && !hasNegative;

            console.log(`🔍 Normalized response: "${normalizedResponse}"`);
            console.log(`🔍 Has positive: ${hasPositive}, Has negative: ${hasNegative}, Valid: ${isValid}`);
            return isValid;
        } catch (error) {
            console.error('Error verifying city with Bedrock Agent:', error);

            // Fallback: Use basic validation when Bedrock Agent is unavailable
            console.log(`⚠️ Bedrock Agent unavailable, using fallback validation for: ${city}`);
            return this.fallbackCityValidation(city);
        }
    }

    /**
     * Fallback city validation when Bedrock Agent is unavailable
     */
    private fallbackCityValidation(city: string): boolean {
        const trimmedCity = city.toLowerCase().trim();

        // Reject obviously invalid inputs
        if (trimmedCity.length < 2) return false;
        if (trimmedCity.length > 50) return false;
        if (!/^[a-zA-Z\s\-'.,]+$/.test(trimmedCity)) return false;

        // Reject common non-city words
        const invalidWords = ['test', 'hello', 'world', 'city', 'town', 'place', 'location', 'asdf', 'qwerty'];
        if (invalidWords.includes(trimmedCity)) return false;

        // Accept anything else that looks like a reasonable city name
        // This is permissive by design - better to accept a questionable city than reject a valid one
        console.log(`✅ Fallback validation accepting: ${city}`);
        return true;
    }

    /**
     * Generate spots for a given city using the Bedrock Agent
     */
    async generateSpots(city: string, sessionId: string): Promise<Spot[]> {
        try {
            const prompt = `You must respond with ONLY a valid JSON array. Generate exactly 10 tourist spots for ${city}. 

IMPORTANT: Your response must be ONLY valid JSON in this exact format:
[
  {
    "id": "spot-1",
    "name": "Spot Name",
    "category": "Museum",
    "location": "District Name",
    "description": "Brief description (max 100 characters)",
    "duration": "2-3 hours"
  }
]

DURATION GUIDELINES:
- Museums/Galleries: "2-3 hours"
- Parks/Gardens: "1-2 hours" 
- Restaurants/Cafes: "1 hour"
- Markets: "1-2 hours"
- Viewpoints: "30-45 minutes"
- Religious Sites: "45 minutes - 1 hour"
- Shopping Areas: "2-3 hours"
- Entertainment Venues: "2-4 hours"
- Historical Sites: "1-2 hours"

Do not include any text before or after the JSON. Keep descriptions short. Categories should be: Museum, Park, Restaurant, Historical Site, Shopping, Entertainment, Religious Site, Market, Viewpoint, or Beach.`;

            const response = await this.invokeAgent(prompt, sessionId);

            console.log('🔍 Raw Bedrock Agent Response:', response);

            // Check if the response indicates an error or inability to help
            if (response.toLowerCase().includes('sorry') || response.toLowerCase().includes('cannot') || response.toLowerCase().includes('unable')) {
                console.error('❌ Bedrock Agent returned an error response:', response);
                // Return fallback data for demo purposes
                return this.getFallbackSpots(city);
            }

            // Parse the JSON response
            try {
                // Extract JSON from the response if it's wrapped in text
                let jsonMatch = response.match(/\[[\s\S]*\]/);
                let jsonString = jsonMatch ? jsonMatch[0] : response;

                console.log('🔍 Extracted JSON string length:', jsonString.length);

                // Handle truncated JSON by trying to fix it
                if (!jsonString.endsWith(']')) {
                    console.log('⚠️ JSON appears truncated, attempting to fix...');

                    // Find the last complete object
                    const lastCompleteObject = jsonString.lastIndexOf('},');
                    if (lastCompleteObject > 0) {
                        jsonString = jsonString.substring(0, lastCompleteObject + 1) + '\n]';
                        console.log('🔧 Fixed truncated JSON, new length:', jsonString.length);
                    }
                }

                const spots = JSON.parse(jsonString);

                // Validate and ensure each spot has required fields
                return spots.map((spot: any, index: number) => ({
                    id: spot.id || `spot-${index + 1}`,
                    name: spot.name || 'Unknown Spot',
                    category: spot.category || 'Attraction',
                    location: spot.location || 'City Center',
                    description: spot.description || 'No description available',
                    duration: spot.duration || this.getDefaultDuration(spot.category || 'Attraction'),
                }));
            } catch (parseError) {
                console.error('Error parsing spots JSON:', parseError);
                console.log('🔍 Attempting to use fallback spots for:', city);
                return this.getFallbackSpots(city);
            }
        } catch (error) {
            console.error('Error generating spots:', error);
            console.log('🔍 Using fallback spots due to error for:', city);
            return this.getFallbackSpots(city);
        }
    }

    /**
     * Get default duration based on category
     */
    private getDefaultDuration(category: string): string {
        const categoryLower = category.toLowerCase();
        
        if (categoryLower.includes('museum') || categoryLower.includes('gallery')) return '2-3 hours';
        if (categoryLower.includes('park') || categoryLower.includes('garden')) return '1-2 hours';
        if (categoryLower.includes('restaurant') || categoryLower.includes('cafe')) return '1 hour';
        if (categoryLower.includes('market')) return '1-2 hours';
        if (categoryLower.includes('viewpoint')) return '30-45 minutes';
        if (categoryLower.includes('religious') || categoryLower.includes('temple') || categoryLower.includes('church')) return '45 minutes - 1 hour';
        if (categoryLower.includes('shopping')) return '2-3 hours';
        if (categoryLower.includes('entertainment')) return '2-4 hours';
        if (categoryLower.includes('historical')) return '1-2 hours';
        
        return '1-2 hours'; // Default duration
    }

    /**
     * Generate additional spots for a city, avoiding duplicates from existing spots
     */
    async generateMoreSpots(city: string, sessionId: string, existingSpotNames: string[]): Promise<Spot[]> {
        try {
            const excludeText = existingSpotNames.length > 0
                ? `\n\nIMPORTANT: Do NOT include these spots that have already been suggested: ${existingSpotNames.join(', ')}`
                : '';

            const prompt = `You must respond with ONLY a valid JSON array containing EXACTLY 10 NEW tourist spots for ${city} that are completely different from any previously suggested spots.${excludeText}

CRITICAL REQUIREMENTS:
- Generate EXACTLY 10 spots (no more, no less, no duplicated)
- Each spot must be genuinely different from existing ones
- Focus on diverse categories if possible: hidden gems, local favorites, food districts, cultural centers, artisan workshops, scenic walks, unique experiences
- Avoid generic or obvious tourist attractions if they might duplicate existing suggestions

IMPORTANT: Your response must be ONLY valid JSON in this exact format:
[
  {
    "id": "spot-1",
    "name": "Spot Name",
    "category": "Museum",
    "location": "District Name",
    "description": "Brief description (max 100 characters)",
    "duration": "2-3 hours"
  }
]

DURATION GUIDELINES:
- Museums/Galleries: "2-3 hours"
- Parks/Gardens: "1-2 hours" 
- Restaurants/Cafes: "1 hour"
- Markets: "1-2 hours"
- Viewpoints: "30-45 minutes"
- Religious Sites: "45 minutes - 1 hour"
- Shopping Areas: "2-3 hours"
- Entertainment Venues: "2-4 hours"
- Historical Sites: "1-2 hours"
- Local Experiences: "1-3 hours"

Do not include any text before or after the JSON. Keep descriptions short. Categories should be: Museum, Park, Restaurant, Historical Site, Shopping, Entertainment, Religious Site, Market, Viewpoint, Beach, Cafe, Gallery, or Local Experience.`;

            const response = await this.invokeAgent(prompt, sessionId);

            console.log('🔍 Raw Bedrock Agent More Spots Response:', response);

            // Check if the response indicates an error or inability to help
            if (response.toLowerCase().includes('sorry') || response.toLowerCase().includes('cannot') || response.toLowerCase().includes('unable')) {
                console.error('❌ Bedrock Agent returned an error response for more spots:', response);
                return this.getFallbackMoreSpots(city, existingSpotNames);
            }

            // Parse the JSON response
            try {
                // Extract JSON from the response if it's wrapped in text
                let jsonMatch = response.match(/\[[\s\S]*\]/);
                let jsonString = jsonMatch ? jsonMatch[0] : response;

                console.log('🔍 Extracted More Spots JSON string length:', jsonString.length);

                // Handle truncated JSON by trying to fix it
                if (!jsonString.endsWith(']')) {
                    console.log('⚠️ More spots JSON appears truncated, attempting to fix...');

                    // Find the last complete object
                    const lastCompleteObject = jsonString.lastIndexOf('},');
                    if (lastCompleteObject > 0) {
                        jsonString = jsonString.substring(0, lastCompleteObject + 1) + '\n]';
                        console.log('🔧 Fixed truncated more spots JSON, new length:', jsonString.length);
                    }
                }

                const spots = JSON.parse(jsonString);

                console.log(`🔍 Parsed ${spots.length} spots from LLM response`);

                // Validate and ensure each spot has required fields, and generate unique IDs
                const timestamp = Date.now();
                const validatedSpots = spots.map((spot: any, index: number) => ({
                    id: `more-${timestamp}-${index + 1}`, // Always generate unique IDs for more spots
                    name: spot.name || 'Unknown Spot',
                    category: spot.category || 'Attraction',
                    location: spot.location || 'City Center',
                    description: spot.description || 'No description available',
                    duration: spot.duration || this.getDefaultDuration(spot.category || 'Attraction'),
                }));

                // If we got fewer than 8 spots, supplement with fallback spots
                if (validatedSpots.length < 8) {
                    console.log(`⚠️ Only got ${validatedSpots.length} spots from LLM, supplementing with fallback spots`);
                    const fallbackSpots = this.getFallbackMoreSpots(city, existingSpotNames);
                    const neededSpots = Math.min(10 - validatedSpots.length, fallbackSpots.length);
                    return [...validatedSpots, ...fallbackSpots.slice(0, neededSpots)];
                }

                return validatedSpots;
            } catch (parseError) {
                console.error('Error parsing more spots JSON:', parseError);
                console.log('🔍 Attempting to use fallback more spots for:', city);
                return this.getFallbackMoreSpots(city, existingSpotNames);
            }
        } catch (error) {
            console.error('Error generating more spots:', error);
            console.log('🔍 Using fallback more spots due to error for:', city);
            return this.getFallbackMoreSpots(city, existingSpotNames);
        }
    }

    /**
     * Provide fallback additional spots when Bedrock Agent fails
     */
    private getFallbackMoreSpots(city: string, existingSpotNames: string[]): Spot[] {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);

        // Create multiple sets of fallback spots to ensure variety
        const fallbackSets = [
            // Set 1: Cultural & Arts
            [
                { name: `Local Artisan Quarter`, category: 'Local Experience', location: 'Craft District', description: `Traditional craftspeople and workshops in ${city}'s artisan neighborhood.` },
                { name: `Underground Art Scene`, category: 'Gallery', location: 'Alternative District', description: `Discover ${city}'s vibrant underground art galleries and creative spaces.` },
                { name: `Heritage Walking Trail`, category: 'Historical Site', location: 'Old Quarter', description: `Self-guided trail through ${city}'s most historic neighborhoods and landmarks.` },
            ],
            // Set 2: Food & Markets
            [
                { name: `Dawn Food Market`, category: 'Market', location: 'Market District', description: `Early morning market where locals shop for fresh produce and street food.` },
                { name: `Rooftop Dining District`, category: 'Restaurant', location: 'Skyline Area', description: `Collection of rooftop restaurants offering ${city} cuisine with panoramic views.` },
                { name: `Spice Merchant Alley`, category: 'Shopping', location: 'Spice Quarter', description: `Historic alley filled with traditional spice merchants and exotic ingredients.` },
            ],
            // Set 3: Nature & Views
            [
                { name: `Secret Garden Sanctuary`, category: 'Park', location: 'Hidden Valley', description: `Peaceful garden sanctuary known only to locals, perfect for quiet reflection.` },
                { name: `Sunrise Viewpoint Trail`, category: 'Viewpoint', location: 'Eastern Hills', description: `Popular local hiking trail leading to the best sunrise views over ${city}.` },
                { name: `Waterfront Promenade`, category: 'Park', location: 'Harbor District', description: `Scenic waterfront walk with local vendors and street performers.` },
            ],
            // Set 4: Local Experiences
            [
                { name: `Traditional Tea House District`, category: 'Cafe', location: 'Tea Quarter', description: `Authentic tea houses where locals gather for traditional ceremonies and conversation.` },
                { name: `Vintage Bookstore Lane`, category: 'Shopping', location: 'Literary District', description: `Charming lane lined with independent bookstores and literary cafes.` },
                { name: `Local Music Venue Circuit`, category: 'Entertainment', location: 'Music District', description: `Small venues where ${city}'s local musicians perform traditional and modern music.` },
            ],
            // Set 5: Unique Spots
            [
                { name: `Floating Market Experience`, category: 'Market', location: 'Canal District', description: `Traditional floating market accessible by small boats, selling local goods.` },
                { name: `Meditation Garden Retreat`, category: 'Religious Site', location: 'Peaceful Valley', description: `Tranquil meditation gardens used by local spiritual communities.` },
                { name: `Craftsman Workshop Tours`, category: 'Local Experience', location: 'Workshop District', description: `Visit working craftsmen creating traditional ${city} handicrafts and art.` },
            ]
        ];

        // Select spots from different sets to ensure variety
        const selectedSpots: any[] = [];
        let setIndex = random % fallbackSets.length;

        for (let i = 0; i < 10 && selectedSpots.length < 10; i++) {
            const currentSet = fallbackSets[setIndex % fallbackSets.length];
            const spotIndex = Math.floor(i / fallbackSets.length) % currentSet.length;

            if (currentSet[spotIndex]) {
                selectedSpots.push({
                    id: `fallback-${timestamp}-${i + 1}`,
                    ...currentSet[spotIndex],
                    duration: this.getDefaultDuration(currentSet[spotIndex].category)
                });
            }

            setIndex++;
        }

        // Filter out any that might match existing spots (more lenient filtering)
        const filteredSpots = selectedSpots.filter(spot => {
            const spotName = spot.name.toLowerCase();
            return !existingSpotNames.some(existing => {
                // Only filter if there's a very close match (exact or very similar)
                return existing === spotName ||
                    (existing.length > 5 && spotName.includes(existing)) ||
                    (spotName.length > 5 && existing.includes(spotName));
            });
        });

        console.log(`🔍 Generated ${selectedSpots.length} fallback spots, filtered to ${filteredSpots.length} unique spots`);

        return filteredSpots;
    }

    /**
     * Provide fallback spots when Bedrock Agent fails
     */
    private getFallbackSpots(city: string): Spot[] {
        return [
            {
                id: 'spot-1',
                name: `${city} Central Park`,
                category: 'Park',
                location: 'City Center',
                description: `A beautiful central park in the heart of ${city}, perfect for relaxation and outdoor activities.`,
                duration: '1-2 hours'
            },
            {
                id: 'spot-2',
                name: `${city} Museum of History`,
                category: 'Museum',
                location: 'Cultural District',
                description: `Learn about the rich history and culture of ${city} through fascinating exhibits and artifacts.`,
                duration: '2-3 hours'
            },
            {
                id: 'spot-3',
                name: `${city} Old Town`,
                category: 'Historical Site',
                location: 'Historic Quarter',
                description: `Explore the charming old town area with traditional architecture and local shops.`,
                duration: '1-2 hours'
            },
            {
                id: 'spot-4',
                name: `${city} Market Square`,
                category: 'Market',
                location: 'Downtown',
                description: `A vibrant market square where you can find local crafts, food, and souvenirs.`,
                duration: '1-2 hours'
            },
            {
                id: 'spot-5',
                name: `${city} Observation Deck`,
                category: 'Viewpoint',
                location: 'City Heights',
                description: `Get panoramic views of ${city} from this popular observation deck.`,
                duration: '30-45 minutes'
            }
        ];
    }

    /**
     * Generate an itinerary from selected spots using the Bedrock Agent
     */
    async generateItinerary(selectedSpots: Spot[], sessionId: string): Promise<Itinerary> {
        try {
            const spotsText = selectedSpots.map(spot =>
                `${spot.name} (${spot.category}) - ${spot.description}`
            ).join('\n');

            const prompt = `You must respond with ONLY a valid JSON object. Create a realistic travel itinerary for these spots with proper timing constraints:
      
      ${spotsText}
      
TIMING REQUIREMENTS:
- Plan for a full day starting at 9:00 AM
- Include realistic visit durations based on attraction type (museums: 2-3 hours, parks: 1-2 hours, restaurants: 1 hour, viewpoints: 30-45 minutes)
- Add 15-30 minutes travel time between locations depending on distance
- Group nearby attractions together to minimize travel time
- Include a lunch break (1 hour) around 12:00-1:00 PM
- End the day by 6:00 PM
- Consider typical opening hours (most attractions open 9-10 AM, close 5-6 PM)

IMPORTANT: Your response must be ONLY valid JSON in this exact format:
{
  "title": "Your Travel Itinerary Title",
  "totalDuration": "9 hours (9:00 AM - 6:00 PM)",
  "schedule": [
    {
      "time": "9:00 AM - 10:30 AM",
      "spot": "Spot Name",
      "duration": "1.5 hours",
      "transportation": "15 min walk from previous location",
      "notes": "Best visited in the morning. Arrive early to avoid crowds."
    }
  ]
}

Do not include any text before or after the JSON.`;

            let response: string;

            try {
                // Try the enhanced prompt first
                response = await this.invokeAgent(prompt, sessionId);
                console.log('🔍 Raw Bedrock Agent Itinerary Response (Enhanced):', response);
            } catch (enhancedError) {
                console.warn('⚠️ Enhanced prompt failed, falling back to basic prompt:', enhancedError);

                // Fallback to simpler prompt if enhanced one fails
                const basicPrompt = `You must respond with ONLY a valid JSON object. Create a travel itinerary for these spots:
      
      ${spotsText}
      
IMPORTANT: Your response must be ONLY valid JSON in this exact format:
{
  "title": "Your Travel Itinerary Title",
  "totalDuration": "X hours",
  "schedule": [
    {
      "time": "9:00 AM - 10:30 AM",
      "spot": "Spot Name",
      "duration": "1.5 hours",
      "transportation": "Walking",
      "notes": "Helpful tip"
    }
  ]
}

Do not include any text before or after the JSON.`;

                try {
                    response = await this.invokeAgent(basicPrompt, sessionId);
                    console.log('🔍 Raw Bedrock Agent Itinerary Response (Basic):', response);
                } catch (basicError) {
                    console.error('❌ Both enhanced and basic prompts failed:', basicError);
                    return this.getFallbackItinerary(selectedSpots);
                }
            }

            // Check if the response indicates an error or inability to help
            if (response.toLowerCase().includes('sorry') || response.toLowerCase().includes('cannot') || response.toLowerCase().includes('unable')) {
                console.error('❌ Bedrock Agent returned an error response for itinerary:', response);
                return this.getFallbackItinerary(selectedSpots);
            }

            // Parse the JSON response
            try {
                // Extract JSON from the response if it's wrapped in text
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                const jsonString = jsonMatch ? jsonMatch[0] : response;

                console.log('🔍 Extracted Itinerary JSON string:', jsonString);

                const itinerary = JSON.parse(jsonString);

                // Validate and ensure itinerary has required structure
                return {
                    title: itinerary.title || 'Your Travel Itinerary',
                    totalDuration: itinerary.totalDuration || '1 day',
                    schedule: (itinerary.schedule || []).map((item: any) => ({
                        time: item.time || '9:00 AM',
                        spot: item.spot || 'Unknown Location',
                        duration: item.duration || '1 hour',
                        transportation: item.transportation || 'Walking',
                        notes: item.notes || '',
                    })),
                };
            } catch (parseError) {
                console.error('Error parsing itinerary JSON:', parseError);
                console.log('🔍 Using fallback itinerary due to parse error');
                return this.getFallbackItinerary(selectedSpots);
            }
        } catch (error) {
            console.error('Error generating itinerary:', error);
            console.log('🔍 Using fallback itinerary due to error');
            return this.getFallbackItinerary(selectedSpots);
        }
    }

    /**
     * Provide fallback itinerary when Bedrock Agent fails
     */
    private getFallbackItinerary(selectedSpots: Spot[]): Itinerary {
        const schedule = selectedSpots.map((spot, index) => {
            // More realistic timing with proper durations based on category
            let duration = '1.5 hours';
            let startTime = 9 + (index * 2);

            // Adjust duration based on spot category
            if (spot.category === 'Museum') duration = '2-3 hours';
            else if (spot.category === 'Park') duration = '1-2 hours';
            else if (spot.category === 'Restaurant') duration = '1 hour';
            else if (spot.category === 'Viewpoint') duration = '45 minutes';

            // Add lunch break after 2-3 spots
            if (index === 2) {
                startTime = 12; // Lunch time
                duration = '1 hour';
            } else if (index > 2) {
                startTime = 13 + ((index - 3) * 2); // Resume after lunch
            }

            const endTime = startTime + (duration.includes('2-3') ? 2.5 : duration.includes('1-2') ? 1.5 : 1);
            const timeString = `${startTime}:00 ${startTime < 12 ? 'AM' : 'PM'} - ${Math.floor(endTime)}:${endTime % 1 === 0.5 ? '30' : '00'} ${endTime < 12 ? 'AM' : 'PM'}`;

            return {
                time: timeString,
                spot: spot.name,
                duration,
                transportation: index === 0 ? 'Start here' : '15-20 min walk/transit',
                notes: `Visit ${spot.name} - ${spot.description.substring(0, 80)}${spot.description.length > 80 ? '...' : ''}`
            };
        });

        return {
            title: 'Your Custom Travel Itinerary',
            totalDuration: '9 hours (9:00 AM - 6:00 PM)',
            schedule
        };
    }
}