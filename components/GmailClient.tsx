"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/client";
import { X, RefreshCw, Search, Star, Send, Trash2, Archive } from "lucide-react";

// Hydration-safe dynamic import
const GmailClient = dynamic(() => Promise.resolve(GmailInnerComponent), { ssr: false });

export default GmailClient;

// ------------------------------------------------------------
// Inner Gmail component (actual logic)
// ------------------------------------------------------------
function GmailInnerComponent() {
  const supabase = createClient();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [newMail, setNewMail] = useState({ to: "", subject: "", body: "" });

  const fetchController = useRef<AbortController | null>(null);

  // ------------------------------------------------------------
  //  Get OAuth token from Supabase session
  // ------------------------------------------------------------
  useEffect(() => {
    const getSessionToken = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.provider_token;
      if (token) setAccessToken(token);
    };
    getSessionToken();
  }, [supabase]);

  // ------------------------------------------------------------
  //  Fetch Gmail messages
  // ------------------------------------------------------------
  const fetchEmails = useCallback(
    async (q?: string, pageToken?: string) => {
      if (!accessToken) return;
      setLoading(true);

      fetchController.current?.abort();
      const controller = new AbortController();
      fetchController.current = controller;

      try {
        const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
        url.searchParams.set("maxResults", "20");
        if (q) url.searchParams.set("q", q);
        if (pageToken) url.searchParams.set("pageToken", pageToken);

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        const messages = await Promise.all(
          (data.messages || []).map(async (msg: any) => {
            const detail = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            ).then((r) => r.json());

            const headers = detail.payload.headers;
            const subject = headers.find((h: any) => h.name === "Subject")?.value || "(No Subject)";
            const from = headers.find((h: any) => h.name === "From")?.value || "";
            const date = headers.find((h: any) => h.name === "Date")?.value || "";
            const snippet = detail.snippet;
            const isUnread = detail.labelIds?.includes("UNREAD");

            return {
              id: msg.id,
              subject,
              from,
              date,
              snippet,
              isUnread,
              detail,
            };
          })
        );

        setEmails(messages);
        setNextPageToken(data.nextPageToken || null);
      } catch (err: any) {
        console.error("Gmail fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (accessToken) fetchEmails();
  }, [accessToken, fetchEmails]);

  // ------------------------------------------------------------
  //  Mark as read/unread
  // ------------------------------------------------------------
  const toggleRead = async (id: string, unread: boolean) => {
    if (!accessToken) return;
    await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        removeLabelIds: unread ? [] : ["UNREAD"],
        addLabelIds: unread ? ["UNREAD"] : [],
      }),
    });
    fetchEmails(query);
  };

  // ------------------------------------------------------------
  //  Delete message
  // ------------------------------------------------------------
  const deleteMessage = async (id: string) => {
    if (!accessToken) return;
    await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/trash`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    fetchEmails(query);
  };

  // ------------------------------------------------------------
  //  Send new email
  // ------------------------------------------------------------
  const sendEmail = async () => {
    if (!accessToken) return;

    const emailBody = [
      `To: ${newMail.to}`,
      `Subject: ${newMail.subject}`,
      "",
      `${newMail.body}`,
    ].join("\n");

    const encoded = btoa(emailBody).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encoded }),
    });

    setComposeOpen(false);
    setNewMail({ to: "", subject: "", body: "" });
    fetchEmails();
  };

  // ------------------------------------------------------------
  //  Fetch message body (HTML)
  // ------------------------------------------------------------
  const getMessageBody = (message: any) => {
    const parts = message.payload?.parts || [];
    const bodyPart =
      parts.find((p: any) => p.mimeType === "text/html") ||
      parts.find((p: any) => p.mimeType === "text/plain");

    if (!bodyPart) return "(No body)";
    const data = bodyPart.body?.data;
    if (!data) return "(Empty message)";
    const decoded = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
    return decoded;
  };

  // ------------------------------------------------------------
  //  Render
  // ------------------------------------------------------------
  if (!accessToken) {
    return <p className="text-gray-400">Authenticating with Gmail...</p>;
  }

  return (
    <div className="gmail-container text-gray-200">
      <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
        <h2 className="text-xl font-semibold">Gmail Inbox</h2>
        <div className="flex gap-2">
          <button
            onClick={() => fetchEmails(query)}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-md flex items-center gap-2"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={() => setComposeOpen(true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-2"
          >
            <Send size={16} /> Compose
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Search size={16} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchEmails(query)}
          placeholder="Search mail..."
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <p className="text-gray-400">Loading emails...</p>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {emails.map((email) => (
            <div
              key={email.id}
              onClick={() => setSelectedEmail(email)}
              className={`cursor-pointer border border-gray-800 rounded-lg p-3 transition hover:bg-gray-800 ${
                email.isUnread ? "bg-gray-900" : "bg-gray-850"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-white">{email.subject}</span>
                <span className="text-xs text-gray-400">{email.date}</span>
              </div>
              <p className="text-sm text-gray-400 truncate">{email.snippet}</p>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{email.from}</span>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); toggleRead(email.id, email.isUnread); }}>
                    {email.isUnread ? "Mark Read" : "Mark Unread"}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteMessage(email.id); }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {nextPageToken && (
        <button
          onClick={() => fetchEmails(query, nextPageToken)}
          className="mt-3 text-blue-400 hover:underline"
        >
          Load more
        </button>
      )}

      {/* Email detail view */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-gray-900 rounded-xl p-6 max-w-3xl w-full text-gray-200 relative overflow-y-auto max-h-[85vh]">
            <button
              onClick={() => setSelectedEmail(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-semibold mb-2">{selectedEmail.subject}</h2>
            <p className="text-sm text-gray-400 mb-4">{selectedEmail.from}</p>
            <div
              className="prose prose-invert text-sm"
              dangerouslySetInnerHTML={{ __html: getMessageBody(selectedEmail.detail) }}
            />
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 p-6 rounded-xl w-full max-w-lg text-gray-200 relative">
            <button
              onClick={() => setComposeOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold mb-4">Compose Email</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="To"
                value={newMail.to}
                onChange={(e) => setNewMail({ ...newMail, to: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Subject"
                value={newMail.subject}
                onChange={(e) => setNewMail({ ...newMail, subject: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Message..."
                value={newMail.body}
                onChange={(e) => setNewMail({ ...newMail, body: e.target.value })}
                rows={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
              />
              <button
                onClick={sendEmail}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
