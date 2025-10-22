"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function UserClient({ className }: { className?: string }) {
  const supabase = createClient();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
      const resolved =
        (meta["full_name"] as string | undefined) ??
        (meta["name"] as string | undefined) ??
        user?.email?.split("@")[0] ??
        null;
      setName(resolved);
    })();
    return () => { isMounted = false; };
  }, [supabase]);

  return <span className={className}>{name}</span>;
}

