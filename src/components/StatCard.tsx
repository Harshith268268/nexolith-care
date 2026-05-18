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
  colorClass = 'text-primary-600 bg-primary-50'
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>

          {(subtitle || trend) &&
          <div className="mt-2 flex items-center text-sm">
              {trend &&
            <span
              className={`font-medium mr-2 ${trend.isPositive ? 'text-success-600' : 'text-critical-600'}`}>
              
                  {trend.isPositive ? '↑' : '↓'} {trend.value}
                </span>
            }
              {subtitle && <span className="text-slate-500">{subtitle}</span>}
            </div>
          }
        </div>
        <div className={`p-3 rounded-xl ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>);

}