import React from 'react';
import { BoxIcon } from 'lucide-react';
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: BoxIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorClass?: string;
}
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorClass = 'text-[#3AAFA9] bg-[#DDF2F1]'
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E3EEEE] shadow-2xs hover:shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[#64777C] mb-1.5 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-[#18313A]">{value}</h3>

          {(subtitle || trend) &&
          <div className="mt-2.5 flex items-center text-xs">
              {trend &&
            <span
              className={`font-semibold mr-2 ${trend.isPositive ? 'text-[#48A383]' : 'text-[#C25252]'}`}>
                  {trend.isPositive ? '↑' : '↓'} {trend.value}
                </span>
            }
              {subtitle && <span className="text-[#64777C]">{subtitle}</span>}
            </div>
          }
        </div>
        <div className={`p-3 rounded-2xl ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>);
}