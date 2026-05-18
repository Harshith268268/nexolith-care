import React from 'react';
interface AvatarProps {
  src?: string;
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
  const initials = name.
  split(' ').
  map((n) => n[0]).
  join('').
  substring(0, 2).
  toUpperCase();
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold overflow-hidden shrink-0 ${sizeClasses[size]} ${className}`}>
      
      {src ?
      <img src={src} alt={name} className="w-full h-full object-cover" /> :

      <span>{initials}</span>
      }
    </div>);

}