import { useState } from 'react';
import { cn } from '@/lib/utils';

interface InsurerLogoProps {
  name: string;
  shortName?: string;
  logoUrl?: string | null;
  website?: string;
  brandColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Generate a consistent color from a string
const generateColorFromString = (str: string): string => {
  const colors = [
    '#1976D2', '#388E3C', '#D32F2F', '#7B1FA2', '#F57C00',
    '#0288D1', '#689F38', '#E64A19', '#512DA8', '#FBC02D',
    '#00796B', '#C2185B', '#303F9F', '#455A64', '#5D4037',
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Get initials from a name
const getInitials = (name: string, shortName?: string): string => {
  const sourceStr = shortName || name;
  return sourceStr
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-16 h-16 text-base',
};

export function InsurerLogo({ 
  name, 
  shortName, 
  logoUrl, 
  website, 
  brandColor, 
  size = 'md',
  className 
}: InsurerLogoProps) {
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const initials = getInitials(name, shortName);
  const color = brandColor || generateColorFromString(name);
  
  // Try multiple logo sources
  const domain = website?.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  const clearbitUrl = domain ? `https://logo.clearbit.com/${domain}` : null;
  
  // Determine which image source to use
  const imageUrl = logoUrl || clearbitUrl;
  
  // If no image URL or error, show initials
  if (!imageUrl || imgError) {
    return (
      <div 
        className={cn(
          'rounded-lg flex items-center justify-center font-bold text-white shadow-md flex-shrink-0 transition-all duration-200 hover:scale-105',
          sizeClasses[size],
          className
        )}
        style={{ 
          backgroundColor: color,
          boxShadow: `0 4px 14px ${color}40`
        }}
        title={name}
      >
        {initials}
      </div>
    );
  }
  
  return (
    <div 
      className={cn(
        'rounded-lg flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden relative transition-all duration-200 hover:scale-105',
        sizeClasses[size],
        className
      )}
      style={{ 
        backgroundColor: isLoading ? color : `${color}10`,
        borderColor: `${color}30`
      }}
      title={name}
    >
      {/* Show initials while loading */}
      {isLoading && (
        <span className="font-bold text-white absolute">{initials}</span>
      )}
      <img
        src={imageUrl}
        alt={name}
        className={cn(
          'w-full h-full object-contain p-1 transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImgError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
}

export default InsurerLogo;
