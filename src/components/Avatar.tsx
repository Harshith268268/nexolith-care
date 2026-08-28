import React from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({
  src,
  name,
  size = 'md',
  className = ''
}: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-10 h-10'
  };

  const isValidSrc = Boolean(src && typeof src === 'string' && src.trim() && src.toLowerCase() !== 'null' && src.toLowerCase() !== 'none');
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '';

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-[#DDF2F1] text-[#2A8F93] font-bold overflow-hidden shrink-0 border border-[#B8DEDE] ${sizeClasses[size]} ${className}`}
      title={isValidSrc ? `${name} profile photo` : `${name} profile photo`}
    >
      {isValidSrc ? (
        <img 
          src={src!} 
          alt={`${name} profile photo`} 
          className="w-full h-full object-cover" 
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <User className={`${iconSizes[size]} text-[#3AAFA9]`} />
      )}
    </div>
  );
}