'use client';

/**
 * THE LIVING ALBUM — My Stories public landing page.
 * Warm ivory paper, espresso ink, burnt terracotta accent.
 */
import './living-album.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useReveal } from '@/lib/hooks/useReveal';

const IMG = {
  logo: '/images/uploads/Title-light.png',
  phoneStoryFeed: '/images/my-stories/landing-4/phone-story-feed.png',
  scattered:
    'https://images.unsplash.com/photo-1611532736597-dea2dccb660b?auto=format&fit=crop&w=1000&q=80',
};

const signInButtonClass =
  'rounded-full bg-terracotta text-primary-foreground font-semibold transition-all duration-150 hover:bg-terracotta-deep active:scale-[0.97]';

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
          <span className="rounded-full bg-[oklch(0.52_0.08_145)] px-2.5 py-0.5 text-[0.65rem] font-semibold text-[oklch(0.98_0.008_85)]">
            Summer
          </span>
          <span className="rounded-full bg-[oklch(0.48_0.1_310)] px-2.5 py-0.5 text-[0.65rem] font-semibold text-[oklch(0.98_0.008_85)]">
            Michigan
          </span>
        </div>
        <h4 className="mt-4 font-[Fraunces] text-2xl font-semibold text-[oklch(0.97_0.008_85)]">
          Wood&apos;s Lake
        </h4>
        <p className="mt-3 font-[Newsreader] text-base leading-relaxed text-[oklch(0.88_0.012_85)]">
          Occasionally we would go swimming at Wood&apos;s Lake — a short drive from our house. I was
          probably half a palisade swimming rat. The woods were not clearing, and the sandy pods are
          lovely. It is a beautiful summer haunt. It had a large slide in the middle.
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
          <img
            src={IMG.logo}
            alt="My Stories mark"
            width={144}
            height={36}
            className="brandMark"
          />
        </a>
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-8 px-4 text-sm font-medium text-muted-foreground md:flex">
          <a href="#problem" className="hover:text-terracotta transition-colors">
            The Problem
          </a>
          <a href="#how" className="hover:text-terracotta transition-colors">
            How It Works
          </a>
          <a href="#promise" className="hover:text-terracotta transition-colors">
            The Promise
          </a>
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
            My Stories combines your media and stories into a beautiful, shareable, private,
            social-media-like feed.
          </p>
          <div className="reveal reveal-d3 mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className={`group inline-flex items-center gap-2 ${signInButtonClass} px-7 py-3.5`}
            >
              Start your first story
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#problem"
              className="inline-flex items-center gap-2 text-sm font-semibold text-espresso/80 hover:text-terracotta transition-colors"
            >
              Why it matters
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>
        </div>

        <PhoneStoryFeedMock className="reveal reveal-d1 lg:justify-self-end" />
      </div>
    </section>
  );
}

function Problem() {
  const failures = [
    { title: 'Printed albums', text: 'They sit on a shelf.' },
    { title: 'Digital folders', text: 'Just electronic scrapbooks.' },
    { title: 'Frames & screensavers', text: 'They show images, but not the story.' },
    { title: 'Phone & photo apps', text: 'Built for capture and storage, not stories.' },
  ];

  return (
    <section id="problem" className="relative bg-paper-deep py-24 md:py-32">
      <div className="container grid gap-14 lg:grid-cols-[42fr_58fr] lg:gap-20 items-start">
        <div className="lg:sticky lg:top-28">
          <p className="kicker reveal mb-5">The problem</p>
          <h2 className="reveal reveal-d1 font-[Fraunces] font-semibold text-espresso text-4xl md:text-5xl leading-[1.08] tracking-tight">
            Photos pile up. Stories get{' '}
            <em className="font-[Newsreader] italic font-medium text-terracotta hand-underline">
              trapped.
            </em>
          </h2>
          <p className="reveal reveal-d2 mt-6 text-lg leading-relaxed text-muted-foreground">
            You have hundreds to thousands of pictures in your phone, folders or boxes with the stories
            trapped inside.
          </p>
          <p className="reveal reveal-d3 mt-5 font-[Newsreader] italic text-lg text-espresso/80">
            You want more than a pile of pictures — you want to experience and share the stories that go
            with them.
          </p>
        </div>

        <div>
          <figure className="photo-print reveal mx-auto w-full max-w-lg rotate-[1.5deg]">
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
                <h3 className="font-[Fraunces] font-semibold text-lg text-espresso">{failure.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{failure.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Solution() {
  return (
    <section id="how" className="py-24 md:py-32">
      <div className="container">
        <div className="max-w-2xl">
          <p className="kicker reveal mb-5">How My Stories works</p>
          <h2 className="reveal reveal-d1 font-[Fraunces] font-semibold text-espresso text-4xl md:text-5xl leading-[1.08] tracking-tight">
            Three steps to{' '}
            <em className="font-[Newsreader] italic font-medium text-terracotta hand-underline">
              living stories.
            </em>
          </h2>
        </div>

        <div className="mt-20 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="reveal">
            <span className="font-[Fraunces] text-6xl font-medium text-terracotta/30">01</span>
            <h3 className="mt-3 font-[Fraunces] font-semibold text-3xl text-espresso">
              Organize the photos
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Bring order to your unruly media with powerful, AI-assisted tools.
            </p>
          </div>
          <PhoneStoryFeedMock className="reveal reveal-d1" />
        </div>

        <div className="mt-24 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <StoryCardTextMock />
          <div className="reveal order-1 lg:order-2">
            <span className="font-[Fraunces] text-6xl font-medium text-terracotta/30">02</span>
            <h3 className="mt-3 font-[Fraunces] font-semibold text-3xl text-espresso">Tell the stories</h3>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Add titles, covers, narrative and captions.
            </p>
          </div>
        </div>

        <div className="mt-24 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="reveal">
            <span className="font-[Fraunces] text-6xl font-medium text-terracotta/30">03</span>
            <h3 className="mt-3 font-[Fraunces] font-semibold text-3xl text-espresso">
              Enjoy and share
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Publish to your private, always-available feed and share with family and friends.
            </p>
          </div>
          <PhoneStoryFeedMock className="reveal reveal-d1" />
        </div>
      </div>
    </section>
  );
}

function Promise() {
  return (
    <section id="promise" className="bg-paper-deep py-24 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="kicker reveal mb-6">The promise</p>
          <blockquote className="reveal reveal-d1 font-[Newsreader] italic text-3xl md:text-4xl leading-snug text-espresso">
            &ldquo;Your images captured the moments.{' '}
            <span className="text-terracotta">My Stories</span> brings them to life.&rdquo;
          </blockquote>
          <div className="reveal reveal-d2 mx-auto mt-8 h-px w-24 bg-terracotta/40" />
          <p className="reveal reveal-d2 mt-8 text-lg leading-relaxed text-muted-foreground">
            Finally, a way to turn what you&apos;ve captured into a living, story-rich experience.
          </p>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div
        aria-hidden
        className="absolute -bottom-48 left-1/2 h-[30rem] w-[44rem] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(closest-side, oklch(0.8 0.1 55 / 0.6), transparent)',
        }}
      />
      <div className="container relative text-center">
        <h2 className="reveal font-[Fraunces] font-semibold text-espresso text-4xl md:text-5xl leading-[1.08] tracking-tight">
          Start bringing your photos{' '}
          <em className="font-[Newsreader] italic font-medium text-terracotta hand-underline">
            to life.
          </em>
        </h2>
        <p className="reveal reveal-d1 mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          <span className="block">Gather the photos. Tell the stories. Enjoy at your fingertips.</span>
          <span className="block">Your first story takes just minutes.</span>
        </p>
        <div className="reveal reveal-d2 mt-9 flex flex-wrap items-center justify-center gap-4">
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
          <img
            src={IMG.logo}
            alt="My Stories mark"
            width={112}
            height={28}
            className="brandMarkFooter"
          />
        </div>
        <p className="text-sm text-muted-foreground">
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
        <Problem />
        <Solution />
        <Promise />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
