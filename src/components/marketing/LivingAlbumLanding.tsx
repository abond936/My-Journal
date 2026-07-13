'use client';

/**
 * THE LIVING ALBUM — My Stories public landing page.
 * Warm ivory paper, espresso ink, burnt terracotta accent.
 */
import './living-album.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Check, ExternalLink } from 'lucide-react';
import { useReveal } from '@/lib/hooks/useReveal';

const IMG = {
  logo: '/images/uploads/Title-light.png',
  phoneStoryFeed: '/images/my-stories/landing-4/phone-story-feed.png',
  scattered:
    'https://images.unsplash.com/photo-1611532736597-dea2dccb660b?auto=format&fit=crop&w=1000&q=80',
};

const NAV_LINKS = [
  { href: '#about', label: 'About' },
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How It Works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

const signInButtonClass =
  'rounded-full bg-terracotta text-primary-foreground font-semibold transition-all duration-150 hover:bg-terracotta-deep active:scale-[0.97]';

function SectionIntro({
  kicker,
  title,
  titleEmphasis,
  children,
  className = '',
}: {
  kicker: string;
  title: string;
  titleEmphasis?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-2xl ${className}`.trim()}>
      <p className="kicker reveal mb-5">{kicker}</p>
      <h2 className="reveal reveal-d1 font-[Fraunces] font-semibold text-espresso text-4xl md:text-5xl leading-[1.08] tracking-tight">
        {title}
        {titleEmphasis ? (
          <>
            {' '}
            <em className="font-[Newsreader] italic font-medium text-terracotta hand-underline">
              {titleEmphasis}
            </em>
          </>
        ) : null}
      </h2>
      {children ? (
        <div className="reveal reveal-d2 mt-6 text-lg leading-relaxed text-muted-foreground">{children}</div>
      ) : null}
    </div>
  );
}

function PhoneStoryFeedMock({ className = '' }: { className?: string }) {
  return (
    <figure className={`reveal mx-auto w-full max-w-sm ${className}`.trim()}>
      <img
        src={IMG.phoneStoryFeed}
        alt="My Stories app showing a Wood's Lake story on a phone"
        className="block w-full h-auto drop-shadow-2xl"
      />
    </figure>
  );
}

function StoryCardTextMock() {
  return (
    <div className="reveal reveal-d1 mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-[oklch(0.22_0.02_50)] shadow-[0_16px_48px_-12px_oklch(0.28_0.03_50_/_0.45)]">
      <div className="aspect-[4/3] w-full overflow-hidden bg-[oklch(0.35_0.02_50)]">
        <img
          src={IMG.phoneStoryFeed}
          alt=""
          aria-hidden
          className="h-full w-full object-cover object-[center_18%] scale-[1.35]"
        />
      </div>
      <div className="px-5 py-5 text-left">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[oklch(0.38_0.02_50)] px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[oklch(0.92_0.01_85)]">
            Story
          </span>
          <span className="rounded-full bg-[oklch(0.58_0.14_45)] px-2.5 py-0.5 text-[0.65rem] font-semibold text-[oklch(0.98_0.008_85)]">
            Family
          </span>
        </div>
        <h4 className="mt-4 font-[Fraunces] text-2xl font-semibold text-[oklch(0.97_0.008_85)]">
          Wood&apos;s Lake
        </h4>
        <p className="mt-3 font-[Newsreader] text-base leading-relaxed text-[oklch(0.88_0.012_85)]">
          Occasionally we would go swimming at Wood&apos;s Lake — a short drive from our house.
        </p>
      </div>
    </div>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[oklch(0.965_0.012_85_/_0.88)] backdrop-blur-md shadow-[0_1px_0_oklch(0.87_0.02_75)]'
          : 'bg-transparent'
      }`}
    >
      <div className="container flex items-center justify-between gap-4 py-4">
        <a href="#top" className="flex shrink-0 items-center gap-2.5">
          <img src={IMG.logo} alt="My Stories mark" width={144} height={36} className="brandMark" />
        </a>
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-6 px-2 text-sm font-medium text-muted-foreground lg:flex lg:gap-8">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-terracotta transition-colors">
              {link.label}
            </a>
          ))}
        </nav>
        <Link href="/login" className={`${signInButtonClass} shrink-0 text-sm px-5 py-2.5`}>
          Sign in
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
      <div
        aria-hidden
        className="absolute -top-40 -right-40 h-[34rem] w-[34rem] rounded-full opacity-50 blur-3xl"
        style={{
          background: 'radial-gradient(closest-side, oklch(0.85 0.08 60 / 0.55), transparent)',
        }}
      />
      <div className="container relative grid items-center gap-16 lg:grid-cols-[55fr_45fr]">
        <div className="max-w-xl">
          <p className="kicker reveal mb-5">The Living Album</p>
          <h1 className="reveal reveal-d1 font-[Fraunces] font-semibold text-espresso text-4xl md:text-5xl leading-[1.1] tracking-tight">
            Combine your photos and stories to create a powerful{' '}
            <em className="font-[Newsreader] italic font-medium text-terracotta hand-underline">
              sharing experience.
            </em>
          </h1>
          <p className="reveal reveal-d2 mt-7 text-lg md:text-xl leading-relaxed text-muted-foreground">
            My Stories helps one author organize media, build story-rich cards and collections, and
            deliver a private mobile reading experience for family and friends.
          </p>
          <div className="reveal reveal-d3 mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className={`group inline-flex items-center gap-2 ${signInButtonClass} px-7 py-3.5`}
            >
              Sign in
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#about"
              className="inline-flex items-center gap-2 text-sm font-semibold text-espresso/80 hover:text-terracotta transition-colors"
            >
              Learn more
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>
        </div>
        <PhoneStoryFeedMock className="reveal reveal-d1 lg:justify-self-end" />
      </div>
    </section>
  );
}

function About() {
  const failures = [
    { title: 'Printed albums', text: 'They sit on a shelf.' },
    { title: 'Digital folders', text: 'Just electronic scrapbooks.' },
    { title: 'Frames & screensavers', text: 'They show images, but not the story.' },
    { title: 'Phone & photo apps', text: 'Built for capture and storage, not stories.' },
  ];

  return (
    <section id="about" className="relative bg-paper-deep py-24 md:py-32">
      <div className="container grid gap-16 lg:grid-cols-[42fr_58fr] lg:gap-20 items-start">
        <div className="lg:sticky lg:top-28">
          <SectionIntro kicker="About" title="Built for one author," titleEmphasis="shared with family.">
            <p>
              My Stories is a private hosted app for a single storyteller — the person who owns the
              archive — and the family and friends they invite to read.
            </p>
            <p className="mt-4">
              It is not a public social network, a photo manager, or a professional DAM. The promise
              is simpler: <strong className="font-semibold text-espresso">organize → integrate stories → deliver</strong>{' '}
              so memories can be re-experienced on a phone.
            </p>
          </SectionIntro>
        </div>

        <div>
          <p className="reveal kicker mb-4">The problem</p>
          <h3 className="reveal reveal-d1 font-[Fraunces] text-2xl font-semibold text-espresso">
            Photos pile up. Stories get trapped.
          </h3>
          <figure className="photo-print reveal reveal-d2 mx-auto mt-8 w-full max-w-lg rotate-[1.5deg]">
            <img
              src={IMG.scattered}
              alt="A scattered pile of old printed photographs and a closed album"
              className="block w-full"
            />
            <figcaption className="mt-2 text-center font-[Newsreader] italic text-sm text-espresso/70">
              Saved, but not seen.
            </figcaption>
          </figure>

          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {failures.map((failure, index) => (
              <div
                key={failure.title}
                className={`reveal ${index % 2 === 1 ? 'reveal-d1' : ''} bg-card p-6`}
              >
                <h4 className="font-[Fraunces] font-semibold text-lg text-espresso">{failure.title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{failure.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      title: 'Organization assistance',
      text: 'AI-assisted tools help you sort and tag media — with you in control. Suggestions are reviewed; nothing is silently rewritten.',
    },
    {
      title: 'Story integration',
      text: 'Build cards and collections that combine photos, narrative, captions, and covers into one editorial unit.',
    },
    {
      title: 'Private mobile reading',
      text: 'Family readers browse a beautiful feed on their phones — in Guided collections or Freeform discovery.',
    },
    {
      title: 'Author-controlled publishing',
      text: 'You decide what is draft and what is published. Invited readers see only what you share.',
    },
  ];

  return (
    <section id="features" className="py-24 md:py-32">
      <div className="container">
        <SectionIntro
          kicker="Features"
          title="Everything you need to turn an archive into"
          titleEmphasis="living stories."
        >
          <p>Honest capabilities aligned with how My Stories actually works today and where it is headed.</p>
        </SectionIntro>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={`featureCard reveal ${index % 2 === 1 ? 'reveal-d1' : ''} p-6 md:p-7`}
            >
              <h3 className="font-[Fraunces] text-xl font-semibold text-espresso">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">{feature.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const pipeline = [
    { step: 'Digitize (optional)', detail: 'Scan or convert prints elsewhere — My Stories does not scan in-app.' },
    { step: 'Import', detail: 'Bring media into your private library through supported import paths.' },
    { step: 'Organize & tag', detail: 'Sort, tag, and curate with assistive tools you confirm.' },
    { step: 'Build stories', detail: 'Compose cards and collections with titles, narrative, and covers.' },
    { step: 'Publish', detail: 'Release finished work to your private reader feed when you are ready.' },
    { step: 'Family reads', detail: 'Invited readers explore on mobile — Guided paths or Freeform browsing.' },
  ];

  return (
    <section id="how" className="bg-paper-deep py-24 md:py-32">
      <div className="container">
        <SectionIntro kicker="How it works" title="Three steps in the app," titleEmphasis="one clear journey.">
          <p>The product workflow inside My Stories — plus where outside help fits.</p>
        </SectionIntro>

        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="reveal space-y-10">
            <div>
              <span className="font-[Fraunces] text-6xl font-medium text-terracotta/30">01</span>
              <h3 className="mt-3 font-[Fraunces] font-semibold text-3xl text-espresso">Organize the photos</h3>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Bring order to unruly media with powerful, AI-assisted tools — always under your control.
              </p>
            </div>
            <div>
              <span className="font-[Fraunces] text-6xl font-medium text-terracotta/30">02</span>
              <h3 className="mt-3 font-[Fraunces] font-semibold text-3xl text-espresso">Tell the stories</h3>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Add titles, covers, narrative, and captions that give your images context.
              </p>
            </div>
            <div>
              <span className="font-[Fraunces] text-6xl font-medium text-terracotta/30">03</span>
              <h3 className="mt-3 font-[Fraunces] font-semibold text-3xl text-espresso">Enjoy and share</h3>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Publish to a private, always-available feed for family and friends.
              </p>
            </div>
          </div>

          <div className="reveal reveal-d1">
            <StoryCardTextMock />
            <ol className="mt-10 space-y-5">
              {pipeline.map((item) => (
                <li key={item.step} className="pipelineStep pl-4">
                  <p className="font-semibold text-espresso">{item.step}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

const PRICING_TIERS = [
  {
    name: 'Personal',
    tagline: 'One author, a small private circle',
    features: [
      'Single author account',
      'Up to a handful of family readers',
      'Private hosted library',
      'Story cards and collections',
      'Mobile reader feed',
    ],
    featured: false,
  },
  {
    name: 'Family',
    tagline: 'The core My Stories experience',
    badge: 'Most families',
    features: [
      'Single author account',
      'More invited family readers',
      'Full organization and story tools',
      'Guided and Freeform reading',
      'Author-controlled publishing',
      'Hosted backup posture',
    ],
    featured: true,
  },
  {
    name: 'Legacy',
    tagline: 'Larger archives and gift projects',
    features: [
      'Single author account',
      'Expanded reader invitations',
      'Priority onboarding support',
      'Legacy or gift-project setup',
      'Everything in Family',
    ],
    featured: false,
  },
] as const;

function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="container">
        <SectionIntro
          kicker="Pricing"
          title="Private hosting for one author"
          titleEmphasis="and family readers."
          className="mx-auto max-w-3xl text-center"
        >
          <p>
            My Stories is a commercially shaped private app: one author account, invited family readers,
            and hosted infrastructure you do not have to run yourself.
          </p>
          <p className="mt-4">
            Three plan shapes below reflect how most families will use the product. Exact prices and trials
            are still being defined — we are not publishing numbers yet.
          </p>
        </SectionIntro>

        <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:gap-8 lg:items-stretch">
          {PRICING_TIERS.map((tier, index) => (
            <article
              key={tier.name}
              className={`pricingCard reveal flex flex-col p-6 md:p-8 ${
                tier.featured ? 'pricingCardFeatured reveal-d1' : index === 2 ? 'reveal-d2' : ''
              }`}
            >
              {'badge' in tier && tier.badge ? (
                <p className="pricingBadge mb-4 w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                  {tier.badge}
                </p>
              ) : (
                <div className="mb-4 h-[1.625rem]" aria-hidden="true" />
              )}
              <h3 className="font-[Fraunces] text-2xl font-semibold text-espresso">{tier.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tier.tagline}</p>
              <p className="pricingPrice mt-6 font-[Fraunces] text-3xl font-semibold text-espresso">
                Pricing TBD
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Per month · details coming soon</p>
              <ul className="pricingFeatures mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                className={`mt-8 block w-full px-6 py-3 text-center text-sm font-semibold transition-all duration-150 ${
                  tier.featured
                    ? signInButtonClass
                    : 'rounded-full border border-border bg-card text-espresso hover:border-terracotta/40 hover:bg-accent active:scale-[0.97]'
                }`}
              >
                Request access
              </a>
            </article>
          ))}
        </div>

        <p className="reveal reveal-d3 mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
          Have an invitation already?{' '}
          <Link href="/login" className="font-semibold text-terracotta hover:text-terracotta-deep">
            Sign in
          </Link>{' '}
          above. Questions about which plan fits? Use the contact section below when request access opens.
        </p>
      </div>
    </section>
  );
}

function Resources() {
  const resources = [
    {
      title: 'Library of Congress — Personal Archiving',
      href: 'https://www.loc.gov/programs/personal-archiving/',
      description: 'Guidance on preserving photos, audio, and video at home.',
    },
    {
      title: 'National Archives — Preserving Family Records',
      href: 'https://www.archives.gov/preservation/family-archives',
      description: 'Practical tips for storing and handling family documents and prints.',
    },
    {
      title: 'Association of Personal Photo Organizers',
      href: 'https://www.appo.org/',
      description: 'Professional organizers who help sort and digitize personal archives.',
    },
  ];

  return (
    <section id="resources" className="bg-paper-deep py-24 md:py-32">
      <div className="container">
        <SectionIntro kicker="Resources" title="Helpful pointers," titleEmphasis="not partnerships.">
          <p>
            Digitization and heavy organization often happen outside the app. These are editorial
            references only — not endorsements, integrations, or vendor relationships.
          </p>
        </SectionIntro>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {resources.map((resource, index) => (
            <a
              key={resource.href}
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`resourceLink reveal ${index === 1 ? 'reveal-d1' : ''} ${index === 2 ? 'reveal-d2' : ''}`}
            >
              <span className="resourceLinkTitle inline-flex items-center gap-1.5">
                {resource.title}
                <ExternalLink className="h-3.5 w-3.5 text-terracotta" aria-hidden />
              </span>
              <span className="resourceLinkDesc">{resource.description}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrivacyTrust() {
  const points = [
    {
      title: 'Family-private by design',
      text: 'Content is meant for invited readers, not the open web or a public social feed.',
    },
    {
      title: 'Authenticated access',
      text: 'Accounts are operator-granted in v1. Readers sign in to see published material.',
    },
    {
      title: 'Author-owned content',
      text: 'You control drafts, publishing, and who can read what you share.',
    },
    {
      title: 'Backup posture',
      text: 'Your archive is hosted with operational backup practices; this summary is not a legal policy.',
    },
  ];

  return (
    <section id="privacy" className="py-24 md:py-32">
      <div className="container">
        <SectionIntro kicker="Privacy & trust" title="Your stories stay" titleEmphasis="yours.">
          <p>Plain-language expectations before you sign in — not terms of service.</p>
        </SectionIntro>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {points.map((point, index) => (
            <article
              key={point.title}
              className={`trustCard reveal ${index % 2 === 1 ? 'reveal-d1' : ''} p-6`}
            >
              <h3 className="font-[Fraunces] text-lg font-semibold text-espresso">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{point.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: 'How do I get an account?',
      a: 'v1 access is invitation-based. An operator creates accounts for the author and invited family readers. Open self-signup is not available yet.',
    },
    {
      q: 'Who can see my stories?',
      a: 'Only signed-in users you have been granted access for. Draft work stays private to the author until published.',
    },
    {
      q: 'Is this Google Photos with stories?',
      a: 'No. My Stories is a private editorial storytelling app — not unlimited cloud sync, not a DAM, and not a public network.',
    },
    {
      q: 'What is the difference between mobile reading and Studio?',
      a: 'Readers use the mobile-friendly feed (Guided and Freeform). Authors use Studio in admin to organize, compose, and publish.',
    },
    {
      q: 'Where do I get help?',
      a: 'Invited users should contact their project operator. In-app Help is planned; for now, use Sign in once you have credentials.',
    },
  ];

  return (
    <section id="faq" className="bg-paper-deep py-24 md:py-32">
      <div className="container max-w-3xl">
        <SectionIntro kicker="FAQ" title="Common questions" className="mx-auto text-center">
          <p className="mx-auto">Short answers for prospective authors and family readers.</p>
        </SectionIntro>

        <dl className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <div key={faq.q} className={`faqItem reveal ${index % 2 === 1 ? 'reveal-d1' : ''} p-5 md:p-6`}>
              <dt className="font-[Fraunces] text-lg font-semibold text-espresso">{faq.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function ContactAccess() {
  return (
    <section id="contact" className="py-24 md:py-32">
      <div className="container grid gap-12 lg:grid-cols-2 lg:items-start">
        <SectionIntro kicker="Contact / access" title="Request access" titleEmphasis="(coming soon).">
          <p>
            If you do not yet have credentials, request-access and operator contact channels are still
            being set up. Use the placeholder form below to preview the flow — submissions are not active
            yet.
          </p>
          <p className="mt-4">
            Already invited?{' '}
            <Link href="/login" className="font-semibold text-terracotta hover:text-terracotta-deep">
              Sign in here
            </Link>
            .
          </p>
        </SectionIntro>

        <div className="reveal reveal-d1 rounded-xl border border-border bg-card p-6 md:p-8">
          <h3 className="font-[Fraunces] text-xl font-semibold text-espresso">Request access (placeholder)</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Disabled until the contact channel is configured. No data is sent.
          </p>
          <form className="landingForm mt-6" aria-label="Request access placeholder form">
            <label>
              Name
              <input type="text" name="contact-name" placeholder="Your name" disabled />
            </label>
            <label>
              Email
              <input type="email" name="contact-email" placeholder="you@example.com" disabled />
            </label>
            <label>
              Message
              <textarea
                name="contact-message"
                rows={4}
                placeholder="Tell us about your project (optional)"
                disabled
              />
            </label>
            <button
              type="button"
              disabled
              className={`${signInButtonClass} mt-2 w-full cursor-not-allowed px-6 py-3 text-sm opacity-60`}
            >
              Send request — coming soon
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="relative overflow-hidden border-t border-border py-20 md:py-24">
      <div className="container relative text-center">
        <blockquote className="reveal font-[Newsreader] italic text-2xl md:text-3xl leading-snug text-espresso">
          &ldquo;Your images captured the moments.{' '}
          <span className="text-terracotta">My Stories</span> brings them to life.&rdquo;
        </blockquote>
        <div className="reveal reveal-d1 mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className={`group inline-flex items-center gap-2 ${signInButtonClass} px-8 py-4 text-lg`}
          >
            Sign in
            <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <img src={IMG.logo} alt="My Stories mark" width={112} height={28} className="brandMarkFooter" />
        </div>
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          Gather the photos. Tell the stories. Enjoy at your fingertips.
        </p>
        <Link
          href="/login"
          className="text-sm font-semibold text-espresso/80 hover:text-terracotta transition-colors"
        >
          Sign in
        </Link>
        <p className="text-sm text-muted-foreground/70">© {new Date().getFullYear()} My Stories</p>
      </div>
    </footer>
  );
}

export default function LivingAlbumLanding() {
  useReveal('.livingAlbum .reveal');

  return (
    <div className="livingAlbum min-h-screen">
      <Header />
      <main>
        <Hero />
        <About />
        <Features />
        <HowItWorks />
        <Pricing />
        <Resources />
        <PrivacyTrust />
        <FAQ />
        <ContactAccess />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
