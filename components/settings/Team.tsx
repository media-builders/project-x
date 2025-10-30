"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type User = {
  id: string;
  name: string;
  email: string;
  plan?: string | null;
};

type RelationshipInvitePayload = {
  id: string;
  master_user_id: string;
  invited_user_id: string | null;
  invited_email: string;
  status: string;
};

export default function Team() {
  const supabase = createClientComponentClient();
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);

  // Shared realtime channel (must match UserRelationships)
  const channel = supabase.channel("team-sync", { config: { broadcast: { self: true } } });

  // ---------------------------------------------
  // Fetch team data
  // ---------------------------------------------
  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user-relationships?mode=team");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load team members");
      setTeamMembers(data.team || []);
      setError("");
    } catch (err) {
      console.error("Error fetching team:", err);
      setError("Network or server error");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------
  // Load current user first
  // ---------------------------------------------
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (session?.user?.id && session?.user?.email) {
          setCurrentUser({ id: session.user.id, email: session.user.email });
        } else setError("User not logged in");
      } catch (err) {
        console.error("Failed to load session:", err);
        setError("Could not load user session");
      }
    };
    loadUser();
  }, []);

  // ---------------------------------------------
  // Local event listener for instant refresh
  // ---------------------------------------------
  useEffect(() => {
    const refreshTeam = () => {
      console.log("⚡ Local team-refresh event triggered");
      fetchTeam();
    };
    window.addEventListener("team-refresh", refreshTeam);
    return () => window.removeEventListener("team-refresh", refreshTeam);
  }, []);

  // ---------------------------------------------
  // Subscribe to realtime updates (Supabase)
  // ---------------------------------------------
  useEffect(() => {
    if (!currentUser?.id || !currentUser?.email) return;

    fetchTeam(); // initial load

    const subscription = channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_relationship_invites",
        },
        (payload) => {
          const newRow = payload.new as RelationshipInvitePayload | null;
          const oldRow = payload.old as RelationshipInvitePayload | null;
          const eventType = payload.eventType;

          const involvesUser =
            newRow?.invited_email === currentUser.email ||
            oldRow?.invited_email === currentUser.email ||
            newRow?.master_user_id === currentUser.id ||
            oldRow?.master_user_id === currentUser.id;

          if (!involvesUser) return;

          console.log("🔄 Team relationship changed, refreshing...");
          fetchTeam();
        }
      )
      .on("broadcast", { event: "team_refresh" }, (payload) => {
        console.log("📡 Team broadcast received:", payload);
        fetchTeam();
      })
      .subscribe((status) => {
        console.log("🟢 Team channel status:", status);
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentUser?.id, currentUser?.email]);

  // ---------------------------------------------
  // Render UI
  // ---------------------------------------------
  if (loading)
    return <div className="text-gray-400 text-sm mt-4">Loading team...</div>;

  if (error)
    return <div className="text-red-400 text-sm mt-4">❌ {error}</div>;

  return (
    <div className="mt-6 text-white">
      <div className="border-b border-gray-700 pb-2 mb-4">
        <h3 className="text-lg font-semibold">Team</h3>
        <p className="text-sm text-gray-400">
          Connected team members based on accepted relationships.
        </p>
      </div>

      {teamMembers.length === 0 ? (
        <p className="text-gray-500 text-sm">No team members found.</p>
      ) : (
        <ul className="space-y-2">
          {teamMembers.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between bg-gray-800 rounded-md px-4 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-white">
                  {member.name || member.email}
                </p>
                <p className="text-gray-400 text-xs">{member.email}</p>
                {member.plan && (
                  <p className="text-gray-500 text-xs mt-0.5">
                    Plan: {member.plan}
                  </p>
                )}
              </div>
              <span className="text-xs text-green-400">✓ Connected</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
