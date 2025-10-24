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
    <div className="help-center">
      {/* Header */}
      <header className="help-center__intro">
        <div className="help-center__intro-text">
          <h2 className="help-center__title">Help & Support Center</h2>
          <p className="help-center__description">
            Search the knowledge base, follow the launch checklist, or connect with the team whenever you need a hand.
          </p>
        </div>
        <div className="help-center__search">
          <Search className="help-center__search-icon" />
          <Input
            placeholder="Search help articles or FAQs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="help-center__search-input"
          />
        </div>
      </header>

      {/* Quick Links */}
      <section className="help-center__quick-links">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          const preview = quickLinkPreviews[link.topic];
          const lastUpdatedLabel = preview?.updatedAt ? formatUpdatedAt(preview.updatedAt) : null;

          return (
            <Card key={link.title} className="help-center__quick-card">
              <CardHeader className="help-center__quick-card-header">
                <Icon className="help-center__quick-card-icon" />
                <h3 className="help-center__quick-card-title">{link.title}</h3>
              </CardHeader>
              <CardContent className="help-center__quick-card-content">
                <p>{link.description}</p>
                <div className="help-center__quick-card-preview">
                  <p className="help-center__quick-card-meta">
                    Latest highlight
                  </p>
                  {preview ? (
                    <div className="help-center__quick-card-article">
                      <p className="help-center__quick-card-headline">{preview.headline}</p>
                      <p className="help-center__quick-card-summary">{preview.summary}</p>
                      {lastUpdatedLabel ? (
                        <p className="help-center__quick-card-updated">
                          Updated {lastUpdatedLabel}
                        </p>
                      ) : null}
                    </div>
                  ) : previewsLoading ? (
                    <p className="help-center__quick-card-status help-center__quick-card-status--muted">
                      Fetching the latest article...
                    </p>
                  ) : quickLinkPreviewError ? (
                    <p className="help-center__quick-card-status help-center__quick-card-status--error">
                      Unable to load preview right now.
                    </p>
                  ) : (
                    <p className="help-center__quick-card-status help-center__quick-card-status--muted">
                      No recent articles yet. Check back soon.
                    </p>
                  )}
                </div>
                <a
                  href={preview?.href ?? link.href}
                  className="help-center__quick-card-link"
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
      <section className="help-center__section">
        <div className="help-center__section-heading">
          <h3 className="help-center__section-title">Launch Checklist</h3>
          <p className="help-center__section-subtitle">
            Work through these five steps to activate your team and start closing more deals.
          </p>
        </div>
        <ol className="help-center__checklist-list">
          {onboardingSteps.map((step, index) => (
            <li
              key={step.title}
              className="help-center__checklist-step"
            >
              <span className="help-center__step-number">
                {index + 1}
              </span>
              <div className="help-center__step-body">
                <p className="help-center__step-title">{step.title}</p>
                <p className="help-center__step-description">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ Section */}
      <section className="help-center__section">
        <div className="help-center__section-heading">
          <h3 className="help-center__section-title">Frequently Asked Questions</h3>
          <p className="help-center__section-subtitle">
            Browse popular topics or refine your search above to jump directly to an answer.
          </p>
        </div>
        <div className="help-center__faq-toolbar">
          <div className="help-center__faq-filters">
            {categories.map((category) => (
              <Button
                key={category}
                type="button"
                size="sm"
                variant={activeCategory === category ? 'default' : 'outline'}
                className="help-center__category-button"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
          <p className="help-center__faq-count">
            Showing {resultsCount} {resultsCount === 1 ? 'answer' : 'answers'}
          </p>
        </div>
        {filteredFaqs.length === 0 ? (
          <div className="help-center__empty-state">
            <p>No results found. Try another keyword or reset your filters.</p>
            <div className="help-center__empty-actions">
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
          <Accordion type="single" collapsible className="help-center__faq-list">
            {filteredFaqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="help-center__faq-trigger">{faq.question}</AccordionTrigger>
                <AccordionContent className="help-center__faq-answer">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </section>

      {/* Contact */}
      <section className="help-center__section help-center__contact">
        <div className="help-center__contact-header">
          <LifeBuoy className="help-center__contact-icon" />
          <h3 className="help-center__contact-title">Need a human?</h3>
        </div>
        <p className="help-center__contact-description">
          Our support specialists are available to troubleshoot issues, review automations, and recommend best practices tailored to your brokerage.
        </p>
        <ul className="help-center__contact-list">
          {supportHighlights.map((item) => (
            <li key={item.label} className="help-center__contact-item">
              <p className="help-center__contact-label">{item.label}</p>
              {item.href ? (
                <a href={item.href} className="help-center__contact-link">
                  {item.value}
                </a>
              ) : (
                <p className="help-center__contact-value">{item.value}</p>
              )}
            </li>
          ))}
        </ul>
        <div className="help-center__contact-footer">
          <span className="help-center__contact-footer-title">Prefer email updates?</span>
          <a href="mailto:support@brokernest.ai" className="help-center__contact-footer-link">
            <Mail className="help-center__contact-mail-icon" />
            <span>Open a support ticket -&gt;</span>
          </a>
        </div>
      </section>
    </div>
  );
}
