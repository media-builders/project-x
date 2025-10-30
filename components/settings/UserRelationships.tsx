"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";

type Invite = {
  id: string;
  masterUserId: string;
  inviteeEmail: string;
  invitedEmail: string;
  status: string;
  inviteToken: string;
};

type Props = {
  currentUserId?: string;
  currentUserEmail?: string;
};

export default function UserRelationships({
  currentUserId = "",
  currentUserEmail = "",
}: Props) {
  const [email, setEmail] = useState("");
  const [sentInvites, setSentInvites] = useState<Invite[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // =========================================================
  // Shared realtime channel (reused by all actions)
  // =========================================================
  const channel = supabase.channel("team-sync", {
    config: { broadcast: { self: true } },
  });

  // =========================================================
  // Fetch invites from API
  // =========================================================
  const fetchInvites = async () => {
    if (!currentUserId || !currentUserEmail) return;

    try {
      const res = await fetch("/api/user-relationships");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch invites");

      setSentInvites(
        (data.sentInvites || []).filter(
          (i: Invite) =>
            i.status !== "accepted" && i.masterUserId === currentUserId
        )
      );

      setReceivedInvites(
        (data.receivedInvites || []).filter(
          (i: Invite) =>
            i.status !== "accepted" && i.invitedEmail === currentUserEmail
        )
      );
    } catch (err) {
      console.error("❌ FetchInvites error:", err);
      setErrorMsg("Failed to load invites.");
    }
  };

  useEffect(() => {
    fetchInvites();
  }, [currentUserId, currentUserEmail]);

  // =========================================================
  // Send invite
  // =========================================================
  const handleSendInvite = async () => {
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    if (email.trim().toLowerCase() === currentUserEmail.toLowerCase()) {
      setErrorMsg("⚠️ You cannot invite your own email address.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/user-relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitedEmail: email,
          permissions: {},
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setSuccessMsg("✅ Invite sent successfully.");
        setEmail("");
        fetchInvites();

        // Notify other tabs / components
        await channel.send({
          type: "broadcast",
          event: "team_refresh",
          payload: { action: "sent", email },
        });
      } else {
        setErrorMsg(`❌ ${result.error || "Failed to send invite."}`);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("❌ Network or server error.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // Accept invite (instant + broadcast sync)
  // =========================================================
  const handleAcceptInvite = async (inviteId: string) => {
    try {
      const res = await fetch("/api/user-relationships", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg("✅ Invite accepted!");
        fetchInvites();

        // 🚀 Trigger instant local refresh for Team component
        window.dispatchEvent(new CustomEvent("team-refresh"));

        // 🌍 Notify other clients
        await channel.send({
          type: "broadcast",
          event: "team_refresh",
          payload: { inviteId, status: "accepted" },
        });
      } else {
        setErrorMsg(`❌ ${data.error || "Failed to accept invite."}`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ Network or server error.");
    }
  };

  // =========================================================
  // Delete invite (instant + broadcast sync)
  // =========================================================
  const handleDeleteInvite = async (inviteId: string) => {
    try {
      const res = await fetch("/api/user-relationships", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg("🗑️ Invite deleted successfully.");
        fetchInvites();

        // 🚀 Trigger instant local refresh
        window.dispatchEvent(new CustomEvent("team-refresh"));

        // 🌍 Notify other clients
        await channel.send({
          type: "broadcast",
          event: "team_refresh",
          payload: { inviteId, deleted: true },
        });
      } else {
        setErrorMsg(`❌ ${data.error || "Failed to delete invite."}`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ Network or server error.");
    }
  };

  // =========================================================
  // Supabase Realtime Subscriptions
  // =========================================================
  useEffect(() => {
    if (!currentUserEmail) return;

    const subscription = channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_relationship_invites",
        },
        (payload) => {
          const newRow = payload.new as Invite | null;
          const oldRow = payload.old as Invite | null;

          const involvesUser =
            newRow?.invitedEmail === currentUserEmail ||
            oldRow?.invitedEmail === currentUserEmail ||
            newRow?.inviteeEmail === currentUserEmail ||
            oldRow?.inviteeEmail === currentUserEmail;

          if (!involvesUser) return;

          console.log("🔁 Realtime update detected, refreshing invites...");
          fetchInvites();
        }
      )
      .on("broadcast", { event: "team_refresh" }, (payload) => {
        console.log("📡 Broadcast received:", payload);
        fetchInvites();
      })
      .subscribe((status) => {
        console.log("🟢 UserRelationships channel status:", status);
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentUserEmail]);

  // =========================================================
  // JSX
  // =========================================================
  return (
    <div className="mt-4 text-white">
      <div className="border-b border-gray-700 pb-2 mb-4">
        <h3 className="text-lg font-semibold">User Relationship Invites</h3>
        <p className="text-sm text-gray-400">
          Send, accept, or remove collaboration invites.
        </p>
      </div>

      {/* Invite Form */}
      <div className="mb-6">
        <label className="block text-sm mb-1">Invite existing user by email:</label>
        <div className="flex gap-2">
          <input
            type="email"
            className="flex-1 px-3 py-2 rounded-md bg-gray-800 border border-gray-600 text-sm placeholder-gray-400"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              loading || !email
                ? "bg-blue-700/40 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            onClick={handleSendInvite}
            disabled={loading || !email}
          >
            {loading ? "Sending..." : "Send Invite"}
          </button>
        </div>

        {successMsg && (
          <p className="text-sm mt-2 text-green-400">{successMsg}</p>
        )}
        {errorMsg && <p className="text-sm mt-2 text-red-400">{errorMsg}</p>}
      </div>

      {/* Sent Invites */}
      <div className="mb-6">
        <h4 className="font-semibold text-md mb-2">Sent Invites</h4>
        <ul className="text-sm space-y-2">
          {sentInvites.length === 0 && (
            <li className="text-gray-500">No invites sent.</li>
          )}
          {sentInvites.map((inv) => (
            <li
              key={inv.id}
              className="flex justify-between items-center text-gray-300"
            >
              <span>
                {inv.invitedEmail} —{" "}
                <span
                  className={
                    inv.status === "accepted"
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                >
                  {inv.status}
                </span>
              </span>
              {inv.status !== "accepted" && (
                <button
                  onClick={() => handleDeleteInvite(inv.id)}
                  className="ml-3 px-3 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                >
                  Cancel
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Received Invites */}
      <div>
        <h4 className="font-semibold text-md mb-2">Received Invites</h4>
        <ul className="text-sm space-y-2">
          {receivedInvites.length === 0 && (
            <li className="text-gray-500">No invites received.</li>
          )}
          {receivedInvites.map((inv) => (
            <li
              key={inv.id}
              className="flex justify-between items-center text-gray-300"
            >
              <span>From: {inv.inviteeEmail}</span>
              {inv.status === "pending" ? (
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                    onClick={() => handleAcceptInvite(inv.id)}
                  >
                    Accept
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                    onClick={() => handleDeleteInvite(inv.id)}
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <span className="text-green-400 text-xs ml-2">Accepted</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
