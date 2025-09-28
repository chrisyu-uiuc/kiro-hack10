import { formatCityName, normalizeUserInput } from '../cityFormatter';

describe('cityFormatter', () => {
  describe('formatCityName', () => {
    it('should format single word cities', () => {
      expect(formatCityName('tokyo')).toBe('Tokyo');
      expect(formatCityName('TOKYO')).toBe('Tokyo');
      expect(formatCityName('Tokyo')).toBe('Tokyo');
    });

    it('should format multi-word cities', () => {
      expect(formatCityName('new york')).toBe('New York');
      expect(formatCityName('NEW YORK')).toBe('New York');
      expect(formatCityName('New York')).toBe('New York');
      expect(formatCityName('san francisco')).toBe('San Francisco');
      expect(formatCityName('los angeles')).toBe('Los Angeles');
    });

    it('should handle edge cases', () => {
      expect(formatCityName('')).toBe('');
      expect(formatCityName('   ')).toBe('');
      expect(formatCityName('a')).toBe('A');
    });
  });

  describe('normalizeUserInput', () => {
    it('should normalize user input', () => {
      expect(normalizeUserInput('  tokyo  ')).toBe('Tokyo');
      expect(normalizeUserInput('new   york')).toBe('New York');
      expect(normalizeUserInput('SAN    FRANCISCO   ')).toBe('San Francisco');
    });

    it('should handle empty input', () => {
      expect(normalizeUserInput('')).toBe('');
      expect(normalizeUserInput('   ')).toBe('');
    });
  });
});