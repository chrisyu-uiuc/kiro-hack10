/**
 * Formats city names to proper title case
 * Examples:
 * - "tokyo" -> "Tokyo"
 * - "new york" -> "New York"
 * - "SAN FRANCISCO" -> "San Francisco"
 * - "los angeles" -> "Los Angeles"
 */
export function formatCityName(cityName: string): string {
  if (!cityName) return '';
  
  return cityName
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Handle special cases for common city name patterns
      if (word.length === 0) return word;
      
      // Capitalize first letter of each word
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .trim();
}

/**
 * Normalizes user input for city names
 * - Trims whitespace
 * - Removes extra spaces
 * - Formats to title case
 */
export function normalizeUserInput(input: string): string {
  if (!input) return '';
  
  // Remove extra whitespace and normalize spacing
  const cleaned = input.trim().replace(/\s+/g, ' ');
  
  return formatCityName(cleaned);
}