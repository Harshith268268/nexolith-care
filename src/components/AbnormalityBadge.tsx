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
    Normal: 'bg-success-50 text-success-600 border-success-100',
    Borderline: 'bg-warning-50 text-warning-600 border-warning-100',
    Critical: 'bg-critical-50 text-critical-600 border-critical-100'
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[level]} ${className}`}>
      
      {level}
    </span>);

}