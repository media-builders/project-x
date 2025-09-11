// utils/fub.ts

export type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
};

type FUBEmail = { value: string; isPrimary?: number };
type FUBPhone = { value: string; isPrimary?: number };
type FUBPerson = {
  id: number;
  firstName?: string;
  lastName?: string;
  emails?: FUBEmail[];
  phones?: FUBPhone[];
};

export async function fetchFUBLeads(): Promise<Lead[]> {
  const token = process.env.FUB_TOKEN;
  if (!token) throw new Error("Missing FUB_TOKEN in env");

  // FUB requires Basic auth with base64("token:")
  const auth = Buffer.from(`${token}:`).toString("base64");

  const url =
    "https://api.followupboss.com/v1/people?sort=created&limit=10&offset=0&includeTrash=false&includeUnclaimed=false";

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Basic ${auth}`,
    },
    // never cache leads list while testing
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Follow Up Boss error ${res.status}`);
  }

  const data = await res.json();

  const people: FUBPerson[] = data?.people ?? [];
  return people.map((p) => {
    const email =
      p.emails?.find((e) => e.isPrimary === 1)?.value ??
      p.emails?.[0]?.value ??
      "";
    const phone =
      p.phones?.find((ph) => ph.isPrimary === 1)?.value ??
      p.phones?.[0]?.value ??
      "";
    return {
      id: String(p.id),
      first: (p.firstName ?? "").trim(),
      last: (p.lastName ?? "").trim(),
      email: email.trim(),
      phone: phone.trim(),
    };
  });
}
