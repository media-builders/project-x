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

export async function fetchFUBLeads(token: string): Promise<Lead[]> {
  //const token = process.env.FUB_TOKEN;
  if (!token) throw new Error("No API Key found!");
  const auth = Buffer.from(`${token}:`).toString("base64");
  const baseUrl = "https://api.followupboss.com/v1/people?sort=created&includeTrash=false&includeUnclaimed=false";
  
  //"https://api.followupboss.com/v1/people?sort=created&limit=10&offset=0&includeTrash=false&includeUnclaimed=false";

  //allows pagination
  const limit = 50;
  let offset = 0;
  let allPeople: FUBPerson[] = [];

  //fetching until no results are available
  while (true) {
    const url = `${baseUrl}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${auth}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Follow Up Boss error ${res.status}`);
    }

    const data = await res.json();
    const people: FUBPerson[] = data?.people ?? [];
    allPeople = allPeople.concat(people);
    
    if (people.length < limit) break;
    offset += limit;
  }

  return allPeople.map((p) => {
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
