'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon, PhoneCall } from 'lucide-react';

type Lead = {
  id: string;
  first?: string | null;
  last?: string | null;
  phone?: string | null;
  email?: string | null;
};

const FETCH_LIMIT = 50;

export default function LeadsShortcutWindow() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLeads() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch('/api/leads/db', { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Failed to load leads (${res.status})`);
        }

        const data = await res.json();
        const people: Lead[] = Array.isArray(data?.people) ? data.people : [];
        setLeads(people.slice(0, FETCH_LIMIT));
        if (people.length > 0) {
          setSelectedLeadId(people[0]?.id ?? null);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load leads.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadLeads();

    return () => controller.abort();
  }, []);

  const filteredLeads = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return leads;
    }

    return leads.filter((lead) => {
      const first = lead.first?.toLowerCase() ?? '';
      const last = lead.last?.toLowerCase() ?? '';
      const phone = lead.phone?.toLowerCase() ?? '';
      const email = lead.email?.toLowerCase() ?? '';
      return (
        first.includes(normalized) ||
        last.includes(normalized) ||
        phone.includes(normalized) ||
        email.includes(normalized)
      );
    });
  }, [leads, query]);

  useEffect(() => {
    if (!selectedLeadId) {
      return;
    }

    if (!filteredLeads.some((lead) => lead.id === selectedLeadId)) {
      const nextLead = filteredLeads[0];
      setSelectedLeadId(nextLead?.id ?? null);
    }
  }, [filteredLeads, selectedLeadId]);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId),
    [leads, selectedLeadId]
  );

  useEffect(() => {
    if (!selectedLeadId) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      if (target.closest('.leads-shortcut__item')) {
        return;
      }

      if (target.closest('.leads-shortcut__call-button')) {
        return;
      }

      setSelectedLeadId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [selectedLeadId]);

  const handleCall = async () => {
    if (!selectedLead) {
      alert('Select a lead before calling.');
      return;
    }

    if (!selectedLead.phone) {
      alert('Selected lead has no phone number.');
      return;
    }

    try {
      setIsCalling(true);
      const payload = {
        leads: [
          {
            id: selectedLead.id,
            first: selectedLead.first,
            last: selectedLead.last,
            phone: selectedLead.phone,
            email: selectedLead.email,
          },
        ],
      };

      const res = await fetch('/api/outbound-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const message = errData?.error ? String(errData.error) : `Call failed (${res.status})`;
        alert(message);
        return;
      }

      const callInfo = await res.json().catch(() => null);
      if (callInfo) {
        alert(
          `${callInfo.agent_number ?? 'Agent'} - Calling Lead\n` +
          `${callInfo.lead_name ?? `${selectedLead.first ?? ''} ${selectedLead.last ?? ''}`}\n` +
          `${callInfo.lead_email ?? ''}\n` +
          `${callInfo.lead_number ?? selectedLead.phone}`
        );
      }
    } catch (err) {
      console.error(err);
      alert('Failed to initiate call.');
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="leads-shortcut">
      <div className="leads-shortcut__header">
        <div className="leads-shortcut__search">
          <SearchIcon className="leads-shortcut__search-icon" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search leads..."
            className="leads-shortcut__search-input"
            aria-label="Search leads"
          />
        </div>
        <button
          type="button"
          className="leads-shortcut__call-button"
          onClick={handleCall}
          disabled={!selectedLead || isCalling}
        >
          <PhoneCall aria-hidden="true" className="leads-shortcut__call-icon" />
          <span>{isCalling ? 'Calling…' : 'Call'}</span>
        </button>
      </div>

      <div className="leads-shortcut__body no-scroll-bar">
        {isLoading && <p className="leads-shortcut__status">Loading leads…</p>}
        {error && !isLoading && <p className="leads-shortcut__status leads-shortcut__status--error">{error}</p>}

        {!isLoading && !error && (
          <ul className="leads-shortcut__list no-scroll-bar">
            {filteredLeads.length === 0 ? (
              <li className="leads-shortcut__empty">No leads found.</li>
            ) : (
              filteredLeads.map((lead) => {
                const fullName = `${lead.first ?? ''} ${lead.last ?? ''}`.trim() || 'Unnamed lead';
                const phoneLabel = lead.phone?.trim() || 'Phone unavailable';
                const isActive = lead.id === selectedLeadId;

                return (
                  <li key={lead.id}>
                    <button
                      type="button"
                      className={`leads-shortcut__item${isActive ? ' is-active' : ''}`}
                      onClick={() =>
                        setSelectedLeadId((prev) => (prev === lead.id ? null : lead.id))
                      }
                    >
                      <span className="leads-shortcut__item-name">{fullName}</span>
                      <span className="leads-shortcut__item-phone">{phoneLabel}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
