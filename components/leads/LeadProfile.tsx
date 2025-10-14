"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  featured?: boolean;
};

interface LeadProfileProps {
  leads: Lead[];
}

export default function LeadProfile({ leads }: LeadProfileProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= leads.length) setIndex(0);
  }, [leads, index]);

  const next = () => setIndex((i) => (i + 1) % leads.length);
  const prev = () => setIndex((i) => (i - 1 + leads.length) % leads.length);

  const hasLeads = leads && leads.length > 0;
  const lead = hasLeads ? leads[index] : null;

  return (
    <div className="bg-[var(--navy-2)] border border-[var(--hairline)] rounded-lg p-4 shadow-sm mb-6 transition-all duration-200">
      {/* Header with pagination */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-[var(--txt-1)]">
          {hasLeads ? `Lead ${index + 1} of ${leads.length}` : "Lead Profile"}
        </h2>

        {hasLeads && leads.length > 1 && (
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" onClick={prev}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={next}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {hasLeads ? (
        <div className="animate-fadeIn">
          <p className="text-xl font-medium text-[var(--txt-1)] mb-1">
            {lead?.first} {lead?.last}
          </p>
          <p className="text-[var(--txt-2)] mb-1">
            📧 <span className="select-all">{lead?.email}</span>
          </p>
          <p className="text-[var(--txt-2)]">
            📞 <span className="select-all">{lead?.phone}</span>
          </p>
        </div>
      ) : (
        <div className="animate-fadeIn text-[var(--txt-3)] italic text-center py-6">
          Select one or more leads to view details here.
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
