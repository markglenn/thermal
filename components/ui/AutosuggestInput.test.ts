import { describe, it, expect } from 'vitest';

// Test the filtering logic used by AutosuggestInput
// (extracted here since we don't have @testing-library for component rendering)

function filterSuggestions(suggestions: string[], value: string): string[] {
  if (!value) return suggestions;
  return suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value
  );
}

describe('AutosuggestInput filtering', () => {
  const suggestions = ['orderId', 'orderDate', 'customerName', 'sku', 'quantity'];

  it('returns all suggestions when value is empty', () => {
    expect(filterSuggestions(suggestions, '')).toEqual(suggestions);
  });

  it('filters by case-insensitive substring', () => {
    expect(filterSuggestions(suggestions, 'order')).toEqual(['orderId', 'orderDate']);
  });

  it('filters case-insensitively', () => {
    expect(filterSuggestions(suggestions, 'ORDER')).toEqual(['orderId', 'orderDate']);
  });

  it('excludes exact match', () => {
    expect(filterSuggestions(suggestions, 'sku')).toEqual([]);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterSuggestions(suggestions, 'xyz')).toEqual([]);
  });

  it('matches mid-string', () => {
    expect(filterSuggestions(suggestions, 'Name')).toEqual(['customerName']);
  });

  it('handles empty suggestions array', () => {
    expect(filterSuggestions([], 'order')).toEqual([]);
  });
});
