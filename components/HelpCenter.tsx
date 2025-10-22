'use client';

import { useEffect, useMemo, useState } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, LifeBuoy, Mail, Search, Workflow, UserCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type QuickLink = {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  topic: string;
};

type QuickLinkPreview = {
  headline: string;
  summary: string;
  updatedAt: string;
  href?: string;
};

const quickLinks: QuickLink[] = [
  {
    title: 'Product Guide',
    description: 'Deep dives on every feature plus release notes.',
    href: '#',
    cta: 'Browse Documentation',
    icon: BookOpen,
    topic: 'product-guide',
  },
  {
    title: 'Automation Recipes',
    description: 'Ready-made workflow templates to launch faster.',
    href: '#',
    cta: 'View Playbooks',
    icon: Workflow,
    topic: 'automation-recipes',
  },
  {
    title: 'Live Webinars',
    description: 'Join weekly sessions with product specialists.',
    href: '#',
    cta: 'Reserve Your Seat',
    icon: UserCheck,
    topic: 'live-webinars',
  },
];

const mockKnowledgeBase: Record<string, QuickLinkPreview> = {
  'product-guide': {
    headline: "What's new in BrokerNest 3.2",
    summary: 'Explore the revamped lead intake flow, refreshed dashboards, and deeper CRM sync options released this week.',
    updatedAt: '2025-10-01T15:30:00.000Z',
    href: '#',
  },
  'automation-recipes': {
    headline: '5 automation templates top teams rely on',
    summary: 'Kick off a power dial session, auto-route VIP buyers, and nurture cold leads with these ready-made workflows.',
    updatedAt: '2025-10-08T09:00:00.000Z',
    href: '#',
  },
  'live-webinars': {
    headline: 'Office hours: scaling outreach with AI dialing',
    summary: 'Join our product specialists on Thursdays to learn how the latest dialer updates boost connect rates by 23%.',
    updatedAt: '2025-10-15T18:00:00.000Z',
    href: '#',
  },
};

async function fetchKnowledgePreview(topic: string): Promise<QuickLinkPreview | null> {
  // Placeholder for a real knowledge-base call; swap in fetch('/api/knowledge-base?...') when ready.
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockKnowledgeBase[topic] ?? null;
}

function formatUpdatedAt(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function useQuickLinkPreviews(links: QuickLink[]) {
  const [previews, setPreviews] = useState<Record<string, QuickLinkPreview>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        const entries = await Promise.all(
          links.map(async (link) => {
            const preview = await fetchKnowledgePreview(link.topic);
            return [link.topic, preview] as const;
          })
        );

        if (!cancelled) {
          const next: Record<string, QuickLinkPreview> = {};
          entries.forEach(([topic, preview]) => {
            if (preview) {
              next[topic] = preview;
            }
          });
          setPreviews(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load previews.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [links]);

  return { previews, error, isLoading };
}

const onboardingSteps = [
  {
    title: 'Connect Your CRM',
    body: 'In Settings > Integrations, choose your CRM provider and follow the authentication prompts to sync contacts and deal stages.',
  },
  {
    title: 'Import Leads',
    body: 'Upload CSV files or enable automatic ingestion so new prospects land in BrokerNest with the right ownership and tags.',
  },
  {
    title: 'Build Workflows',
    body: 'Under Calls > Workflows, pick a trigger such as "new qualified lead" and stack actions like smart routing, task creation, and SMS follow-up.',
  },
  {
    title: 'Launch Call Scripts',
    body: 'Create guided scripts within Calls > Scripts so agents always have the right talking points, objections, and next steps.',
  },
  {
    title: 'Enable Notifications',
    body: 'Visit Settings > Alerts to configure email, SMS, or Slack updates for missed calls, SLA breaches, or new meetings booked.',
  },
];

const supportHighlights = [
  {
    label: 'Email',
    value: 'support@brokernest.ai',
    href: 'mailto:support@brokernest.ai',
  },
  {
    label: 'Live Chat',
    value: 'Mon-Fri, 9am-6pm PT',
  },
  {
    label: 'Help Desk SLA',
    value: 'Under 4 business hours for priority issues',
  },
];

const faqs = [
  {
    category: 'Getting Started',
    question: 'How do I connect my CRM?',
    answer:
      'Go to Settings > Integrations, select your CRM provider, and follow the on-screen authentication prompts to connect BrokerNest.',
  },
  {
    category: 'Automations',
    question: 'How do I create a workflow?',
    answer:
      'Under the Calls tab, click "Create Workflow," choose a trigger (like new lead), and define automated actions like assigning an agent or sending a text message.',
  },
  {
    category: 'Billing',
    question: 'Where can I manage my subscription?',
    answer:
      'Visit Settings > Billing to update payment details, change plans, or view invoices.',
  },
  {
    category: 'Support',
    question: 'How do I contact BrokerNest support?',
    answer:
      'Email us at support@brokernest.ai or visit our live chat during office hours (Mon-Fri, 9am-6pm PT).',
  },
];

export default function HelpCenter() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const {
    previews: quickLinkPreviews,
    error: quickLinkPreviewError,
    isLoading: previewsLoading,
  } = useQuickLinkPreviews(quickLinks);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(faqs.map((faq) => faq.category)))],
    []
  );

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
      if (!matchesCategory) {
        return false;
      }

      if (normalizedQuery.length === 0) {
        return true;
      }

      return (
        faq.question.toLowerCase().includes(normalizedQuery) ||
        faq.answer.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [activeCategory, query]);

  const resultsCount = filteredFaqs.length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <header className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Help & Support Center</h2>
          <p className="text-sm text-muted-foreground">
            Search the knowledge base, follow the launch checklist, or connect with the team whenever you need a hand.
          </p>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search help articles or FAQs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </header>

      {/* Quick Links */}
      <section className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          const preview = quickLinkPreviews[link.topic];
          const lastUpdatedLabel = preview?.updatedAt ? formatUpdatedAt(preview.updatedAt) : null;

          return (
            <Card key={link.title} className="hover:shadow-md transition">
              <CardHeader className="flex flex-row items-center space-x-3">
                <Icon className="h-5 w-5 text-accent" />
                <h3 className="font-medium text-base">{link.title}</h3>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{link.description}</p>
                <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Latest highlight
                  </p>
                  {preview ? (
                    <div className="mt-2 space-y-1 text-foreground">
                      <p className="text-sm font-medium">{preview.headline}</p>
                      <p className="text-xs text-muted-foreground">{preview.summary}</p>
                      {lastUpdatedLabel ? (
                        <p className="text-[11px] text-muted-foreground/80">
                          Updated {lastUpdatedLabel}
                        </p>
                      ) : null}
                    </div>
                  ) : previewsLoading ? (
                    <p className="mt-2 text-xs text-muted-foreground">Fetching the latest article...</p>
                  ) : quickLinkPreviewError ? (
                    <p className="mt-2 text-xs text-destructive">Unable to load preview right now.</p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No recent articles yet. Check back soon.</p>
                  )}
                </div>
                <a
                  href={preview?.href ?? link.href}
                  className="flex items-center gap-1 text-accent font-medium hover:underline"
                >
                  <span>{link.cta}</span>
                  <span aria-hidden="true">-&gt;</span>
                </a>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Launch Checklist */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Launch Checklist</h3>
          <p className="text-sm text-muted-foreground">
            Work through these five steps to activate your team and start closing more deals.
          </p>
        </div>
        <ol className="space-y-3">
          {onboardingSteps.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-3 rounded-lg border border-border bg-muted/40 p-4"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                {index + 1}
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ Section */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Frequently Asked Questions</h3>
          <p className="text-sm text-muted-foreground">
            Browse popular topics or refine your search above to jump directly to an answer.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                type="button"
                size="sm"
                variant={activeCategory === category ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {resultsCount} {resultsCount === 1 ? 'answer' : 'answers'}
          </p>
        </div>
        {filteredFaqs.length === 0 ? (
          <div className="space-y-3 rounded-md border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            <p>No results found. Try another keyword or reset your filters.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setActiveCategory('All');
                  setQuery('');
                }}
              >
                Reset filters
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href="mailto:support@brokernest.ai">Email support</a>
              </Button>
            </div>
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {filteredFaqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </section>

      {/* Contact */}
      <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-6">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">Need a human?</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Our support specialists are available to troubleshoot issues, review automations, and recommend best practices tailored to your brokerage.
        </p>
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          {supportHighlights.map((item) => (
            <li key={item.label} className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground/70">{item.label}</p>
              {item.href ? (
                <a href={item.href} className="font-medium text-foreground hover:underline">
                  {item.value}
                </a>
              ) : (
                <p className="font-medium text-foreground">{item.value}</p>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Prefer email updates?</span>
          <a href="mailto:support@brokernest.ai" className="flex items-center gap-1 text-accent hover:underline">
            <Mail className="h-4 w-4" />
            <span>Open a support ticket -&gt;</span>
          </a>
        </div>
      </section>
    </div>
  );
}
