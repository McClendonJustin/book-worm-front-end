// Filter options for Home. Values are sent to the google-books Edge Function,
// which maps them to a Google Books subject. `value: ''` is "All" (technology).
export const GENRES = [
  { value: '', label: 'All' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'technology', label: 'Technology' },
  { value: 'horror', label: 'Horror' },
  { value: 'scifi', label: 'Sci-Fi' },
  { value: 'fiction', label: 'Fiction' },
  { value: 'nonfiction', label: 'Non-Fiction' },
]
