/**
 * Strip HTML tags and decode HTML entities from text
 * Used across news cards and dashboards for sanitizing content
 */
export const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  
  // First decode named HTML entities
  let decoded = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Decode numeric HTML entities (e.g., &#8216; &#8217; &#8220; &#8221;)
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  
  // Decode hex HTML entities (e.g., &#x2018;)
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // Then remove HTML tags (including the now-decoded ones)
  decoded = decoded.replace(/<[^>]*>/g, '');
  
  // Remove any remaining URL fragments that might be left
  decoded = decoded.replace(/https?:\/\/[^\s]*/g, '');
  
  return decoded.trim();
};
