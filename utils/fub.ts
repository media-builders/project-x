// utils/fub.ts

export type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  stage?: string | null;
};

type FUBEmail = { value: string; isPrimary?: number };
type FUBPhone = { value: string; isPrimary?: number };
type FUBPerson = {
  id: number;
  firstName?: string;
  lastName?: string;
  stage?: string | null;
  stageName?: string | null;
  emails?: FUBEmail[];
  phones?: FUBPhone[];
  tags?: Array<{ name?: string } | string>;
};

type FetchFUBLeadsOptions = {
  stage?: string;
};

const normalizeStage = (value?: string | null) =>
  value && typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;

function extractStage(person: FUBPerson): string | null {
  const directStage = normalizeStage(person.stage);
  if (directStage) return directStage;

  const namedStage = normalizeStage(person.stageName);
  if (namedStage) return namedStage;

  if (Array.isArray(person.tags)) {
    for (const tag of person.tags) {
      const tagName =
        typeof tag === "string"
          ? normalizeStage(tag)
          : normalizeStage(tag?.name ?? null);
      if (tagName) return tagName;
    }
  }

  return null;
}

export async function fetchFUBLeads(
  token: string,
  options: FetchFUBLeadsOptions = {}
): Promise<Lead[]> {
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

  const stageFilter = normalizeStage(options.stage)?.toLowerCase() ?? null;

  const leads = allPeople.map((p) => {
    const stage = extractStage(p);
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
      stage,
    };
  });

  if (!stageFilter) return leads;

  return leads.filter(
    (lead) => lead.stage?.toLowerCase() === stageFilter
  );
}
