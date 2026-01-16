/**
 * Strip HTML tags and decode HTML entities from text
 * Used across news cards and dashboards for sanitizing content
 */
export const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  
  // First decode HTML entities
  let decoded = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Then remove HTML tags (including the now-decoded ones)
  decoded = decoded.replace(/<[^>]*>/g, '');
  
  // Remove any remaining URL fragments that might be left
  decoded = decoded.replace(/https?:\/\/[^\s]*/g, '');
  
  return decoded.trim();
};
