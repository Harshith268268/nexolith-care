import React from 'react';
import { AbnormalityLevel } from '../lib/mockData';
interface AbnormalityBadgeProps {
  level: AbnormalityLevel;
  className?: string;
}
export function AbnormalityBadge({
  level,
  className = ''
}: AbnormalityBadgeProps) {
  const styles = {
    Normal: 'bg-[#EBF8F4] text-[#48A383] border-[#D6F2E9]',
    Borderline: 'bg-[#FDF8ED] text-[#D4A050] border-[#FBF0D8]',
    Critical: 'bg-[#FDF2F2] text-[#C25252] border-[#FCE4E4]'
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[level || 'Normal']} ${className}`}>
      {level || 'Normal'}
    </span>);
}