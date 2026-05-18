import React, { useState } from 'react';
import { useFamily } from '../lib/FamilyContext';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  FileText,
  Image as ImageIcon,
  FileArchive,
  ChevronRight
} from 'lucide-react';
import { AbnormalityBadge } from '../components/AbnormalityBadge';
import { Avatar } from '../components/Avatar';
export function ReportsLibrary() {
  const { activeMember, members, reports } = useFamily();
  const [searchQuery, setSearchQuery] = useState("");

  // Derived filtered reports using active family member and title search searchQuery
  const filteredReports = reports.filter((report) => {
    // 1. Respect currently active family member selection
    const reportMemberId = String(report.memberId || (report as any).member_id);
    if (activeMember && reportMemberId !== String(activeMember.id)) return false;

    // 2. Simple search match based on title includes query
    return report.title?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Explicit console auditing logs
  console.log("Reports:", reports);
  console.log("Filtered Reports:", filteredReports);

  const getIconForType = (type: string) => {
    const t = type ? type.toLowerCase() : "";
    if (t.includes('image')) {
      return <ImageIcon className="w-6 h-6 text-indigo-500" />;
    } else if (t.includes('presc') || t.includes('archive')) {
      return <FileArchive className="w-6 h-6 text-emerald-500" />;
    } else {
      return <FileText className="w-6 h-6 text-primary-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports Library</h1>
          <p className="text-slate-500">View and manage all medical records.</p>
        </div>
        <Link
          to="/reports/upload"
          className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm">
          
          <Plus className="w-5 h-5 mr-2" />
          Upload Report
        </Link>
      </div>

      {/* Filters (Search Bar only, expanded fully for responsive clean layout) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all" />
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredReports.length > 0 ?
        <div className="divide-y divide-slate-100">
            {filteredReports.map((report) => {
              const reportMemberId = String(report.memberId || (report as any).member_id);
              const member = members.find((m) => String(m.id) === reportMemberId);
              return (
              <Link
                key={report.id}
                to={`/reports/${report.id}`}
                className="flex flex-col sm:flex-row sm:items-center p-4 hover:bg-slate-50 transition-colors group">
                
                  <div className="flex items-center flex-1 min-w-0 mb-3 sm:mb-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mr-4 group-hover:scale-105 transition-transform">
                      {getIconForType(report.type)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-primary-600 transition-colors">
                        {report.title}
                      </h3>
                      <div className="flex items-center text-sm text-slate-500 mt-1">
                        <span className="font-medium text-slate-700">
                          {report.type}
                        </span>
                        <span className="mx-2">•</span>
                        <span>
                          {new Date(report.date).toLocaleDateString(undefined, {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end sm:space-x-6 w-full sm:w-auto pl-16 sm:pl-0">
                    {!activeMember && member &&
                  <div className="flex items-center">
                        <Avatar
                      name={member.name}
                      src={member.avatarUrl}
                      size="sm"
                      className="mr-2" />
                    
                        <span className="text-sm font-medium text-slate-700 hidden md:block">
                          {member.name}
                        </span>
                      </div>
                  }
                    <AbnormalityBadge level={report.abnormality} />
                    <ChevronRight className="w-5 h-5 text-slate-400 hidden sm:block group-hover:text-primary-500 transition-colors" />
                  </div>
                </Link>);

          })}
          </div> :

        <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              No reports found
            </h3>
            <p className="text-slate-500 max-w-sm">
              {searchQuery ?
            "No reports found for selected filter." :
            'Upload your first medical report to start tracking health data.'}
            </p>
            {!searchQuery && (
          <Link
            to="/reports/upload"
            className="mt-6 inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-xl font-medium hover:bg-primary-100 transition-colors">
            
                Upload Report
              </Link>
            )}
          </div>
        }
      </div>
    </div>);

}