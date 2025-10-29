"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useUserInfo } from "@/context/UserInfoContext";

export default function UserClient({ className }: { className?: string }) {
  const supabase = createClient();
  const { name: initialName, email } = useUserInfo();
  const [name, setName] = useState<string | null>(initialName);

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
        email ??
        null;
      if (!resolved) return;
      setName(resolved);
    })();
    return () => { isMounted = false; };
  }, [supabase, email]);

  return <span className={className}>{name}</span>;
}
