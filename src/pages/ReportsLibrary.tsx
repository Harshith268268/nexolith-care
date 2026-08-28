import React, { useState } from 'react';
import { useFamily } from '../lib/FamilyContext';
import { Link } from 'react-router-dom';
import {
  Search,
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

  const filteredReports = reports.filter((report) => {
    const reportMemberId = String(report.memberId || (report as any).member_id);
    if (activeMember && reportMemberId !== String(activeMember.id)) return false;
    return report.title?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getIconForType = (type: string) => {
    const t = type ? type.toLowerCase() : "";
    if (t.includes('image')) {
      return <ImageIcon className="w-5 h-5 text-[#55BFC2]" />;
    } else if (t.includes('presc') || t.includes('archive')) {
      return <FileArchive className="w-5 h-5 text-[#55BFC2]" />;
    } else {
      return <FileText className="w-5 h-5 text-[#55BFC2]" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18313A]">Medical Reports</h1>
          <p className="text-[#64777C] text-xs sm:text-sm mt-0.5">Centralized archive of verified lab reports and clinical documentation.</p>
        </div>
        <Link
          to="/reports/upload"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-[#55BFC2] text-white rounded-xl font-bold text-xs hover:bg-[#3AAFA9] transition-colors shadow-2xs">
          <Plus className="w-4 h-4 mr-1.5" />
          Upload Report
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E3EEEE] shadow-2xs flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64777C]" />
          <input
            type="text"
            placeholder="Search medical records by title or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-2xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none transition-all placeholder-[#64777C]/60" />
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs overflow-hidden">
        {filteredReports.length > 0 ? (
          <div className="divide-y divide-[#E3EEEE]">
            {filteredReports.map((report) => {
              const reportMemberId = String(report.memberId || (report as any).member_id);
              const member = members.find((m) => String(m.id) === reportMemberId);
              return (
                <Link
                  key={report.id}
                  to={`/reports/${report.id}`}
                  className="flex flex-col sm:flex-row sm:items-center p-5 hover:bg-[#F5F8F8] transition-colors group">
                  
                  <div className="flex items-center flex-1 min-w-0 mb-3 sm:mb-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#DDF2F1] flex items-center justify-center shrink-0 mr-4">
                      {getIconForType(report.type)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#18313A] truncate group-hover:text-[#3AAFA9] transition-colors">
                        {report.title}
                      </h3>
                      <div className="flex items-center text-xs text-[#64777C] mt-0.5">
                        <span className="font-semibold text-[#18313A]">
                          {report.type}
                        </span>
                        <span className="mx-2">•</span>
                        <span>
                          {new Date(report.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end sm:space-x-6 w-full sm:w-auto pl-15 sm:pl-0">
                    {!activeMember && member && (
                      <div className="flex items-center space-x-2">
                        <Avatar
                          name={member.name}
                          src={member.profile_image || member.avatarUrl}
                          size="sm"
                        />
                        <span className="text-xs font-semibold text-[#18313A] hidden md:block">
                          {member.name}
                        </span>
                      </div>
                    )}
                    <AbnormalityBadge level={report.abnormality} />
                    <ChevronRight className="w-4 h-4 text-[#64777C] hidden sm:block group-hover:text-[#3AAFA9] transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-[#DDF2F1] text-[#3AAFA9] rounded-2xl flex items-center justify-center mb-3">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#18313A] mb-1">
              {searchQuery ? "No reports found" : "No medical reports yet"}
            </h3>
            <p className="text-xs text-[#64777C] max-w-sm">
              {searchQuery ?
                "No medical records matched your search term." :
                'Upload a medical report to start managing lab history.'}
            </p>
            {!searchQuery && (
              <Link
                to="/reports/upload"
                className="mt-5 inline-flex items-center px-4 py-2.5 bg-[#55BFC2] text-white rounded-xl text-xs font-bold hover:bg-[#3AAFA9] transition-colors shadow-2xs">
                Upload Report
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}