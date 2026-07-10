'use client';

/**
 * THE LIVING ALBUM — My Stories landing page.
 * Warm ivory paper, espresso ink, burnt terracotta accent.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { useReveal } from '@/lib/hooks/useReveal';

const IMG = {
  logo: '/images/uploads/Title-light.png',
  family:
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80',
  beach:
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
  grandma:
    'https://images.unsplash.com/photo-1519689373023-dd07c7873170?auto=format&fit=crop&w=900&q=80',
  scattered:
    'https://images.unsplash.com/photo-1611532736597-dea2dccb660b?auto=format&fit=crop&w=1000&q=80',
  phone:
    'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80',
};

function useComingSoon() {
  const { showToast } = useAppFeedback();
  return useCallback(() => {
    showToast({
      title: 'My Stories is almost ready',
      message: 'The app is in its final chapter of development. Check back soon.',
      tone: 'info',
    });
  }, [showToast]);
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const comingSoon = useComingSoon();

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
      <div className="container flex items-center justify-between py-4">
        <a href="#top" className="flex items-center gap-2.5">
          <img src={IMG.logo} alt="My Stories mark" className="h-9 w-auto max-w-[9rem]" />
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
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
        <button
          type="button"
          onClick={comingSoon}
          className="rounded-full bg-terracotta text-primary-foreground text-sm font-semibold px-5 py-2.5 transition-all duration-150 hover:bg-terracotta-deep active:scale-[0.97]"
        >
          Start your first story
        </button>
      </div>
    </header>
  );
}

function Hero() {
  const comingSoon = useComingSoon();

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
          <p className="kicker reveal mb-3">Landing Page 4 · The Living Album</p>
          <p className="kicker reveal mb-5">The Photos Pile Up. The Stories Get Lost.</p>
          <h1 className="reveal reveal-d1 font-[Fraunces] font-semibold text-espresso text-4xl md:text-5xl leading-[1.1] tracking-tight">
            Combine your stories and memories to create the simple, powerful sharing experience{' '}
            <em className="font-[Newsreader] italic font-medium text-terracotta hand-underline">
              you&apos;ve always wanted.
            </em>
          </h1>
          <p className="reveal reveal-d2 mt-7 text-lg md:text-xl leading-relaxed text-muted-foreground">
            You have hundreds, if not thousands, of images in boxes, albums, digital folders, or an
            infinite mobile catalog. You want to enjoy and share them, but you&apos;ve never had a tool to
            organize them nor include what actually makes a photo meaningful—the story around it. My Stories
            is a powerful platform that unifies your media and narrative into a beautiful, easy-to-consume
            social-media-like feed.
          </p>
          <div className="reveal reveal-d3 mt-9 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={comingSoon}
              className="group inline-flex items-center gap-2 rounded-full bg-terracotta text-primary-foreground font-semibold px-7 py-3.5 transition-all duration-150 hover:bg-terracotta-deep active:scale-[0.97]"
            >
              Start your first story
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <a
              href="#problem"
              className="inline-flex items-center gap-2 text-sm font-semibold text-espresso/80 hover:text-terracotta transition-colors"
            >
              Why it matters
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="relative mx-auto h-[26rem] w-full max-w-md sm:h-[30rem] lg:h-[34rem]">
          <figure className="photo-print reveal absolute left-0 top-6 w-[68%] rotate-[-5deg]">
            <img
              src={IMG.family}
              alt="A family laughing around a kitchen table"
              className="block w-full"
            />
            <figcaption className="mt-2 text-center font-[Newsreader] italic text-sm text-espresso/70">
              Sunday dinner, 2019
            </figcaption>
            <span className="tape -top-3 left-1/2 -translate-x-1/2 rotate-[-4deg]" />
          </figure>
          <figure className="photo-print reveal reveal-d1 absolute right-0 top-0 w-[46%] rotate-[6deg]">
            <img
              src={IMG.beach}
              alt="Children running on a beach at sunset"
              className="block w-full"
            />
            <figcaption className="mt-2 text-center font-[Newsreader] italic text-sm text-espresso/70">
              Low tide, July
            </figcaption>
          </figure>
          <figure className="photo-print reveal reveal-d2 absolute bottom-0 right-[8%] w-[60%] rotate-[-2deg]">
            <img
              src={IMG.grandma}
              alt="A grandmother sharing a photo album with her granddaughter"
              className="block w-full"
            />
            <figcaption className="mt-2 text-center font-[Newsreader] italic text-sm text-espresso/70">
              Nana&apos;s stories
            </figcaption>
            <span className="tape -top-3 right-6 rotate-[8deg]" />
          </figure>
        </div>
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
            Photos pile up. The stories get{' '}
            <em className="font-[Newsreader] italic font-medium text-terracotta">buried.</em>
          </h2>
          <p className="reveal reveal-d2 mt-6 text-lg leading-relaxed text-muted-foreground">
            You have hundreds, if not thousands, of pictures on your phone, hard drives, physical
            albums, and shoeboxes — but limited ways to re-experience them. The image is saved, but its
            story stays trapped inside.
          </p>
          <p className="reveal reveal-d3 mt-5 font-[Newsreader] italic text-lg text-espresso/80">
            You want more than a pile of pictures — you want the stories and the feelings that go with
            them.
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
              Gather the photos
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Bring your photos together and organize them with powerful, flexible tools — all in one
              place, ready to become stories.
            </p>
            <p className="mt-4 font-[Newsreader] italic text-espresso/75">
              Every story starts with gathering the pictures.
            </p>
          </div>
          <div className="reveal reveal-d1 relative mx-auto w-full max-w-md">
            <figure className="photo-print rotate-[-3deg]">
              <img src={IMG.family} alt="Gathered family photo" className="block w-full" />
              <figcaption className="mt-2 text-center font-[Newsreader] italic text-sm text-espresso/70">
                Out of the drawer, into the story
              </figcaption>
            </figure>
            <span className="tape -top-3 left-10 rotate-[-6deg]" />
          </div>
        </div>

        <div className="mt-24 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="reveal reveal-d1 relative order-2 mx-auto w-full max-w-md lg:order-1">
            <div className="photo-print rotate-[2.5deg] !pb-4">
              <img src={IMG.beach} alt="Beach photo being given a story" className="block w-full" />
              <div className="px-2 pt-3 pb-1 text-left">
                <p className="font-[Fraunces] font-semibold text-espresso">Low tide, July</p>
                <p className="mt-1 font-[Newsreader] italic text-sm leading-relaxed text-espresso/75">
                  &ldquo;They raced the waves until the sun gave up before they did. We stayed until the
                  stars came out.&rdquo;
                </p>
              </div>
            </div>
            <span className="tape -top-3 right-8 rotate-[5deg]" />
          </div>
          <div className="reveal order-1 lg:order-2">
            <span className="font-[Fraunces] text-6xl font-medium text-terracotta/30">02</span>
            <h3 className="mt-3 font-[Fraunces] font-semibold text-3xl text-espresso">Tell the stories</h3>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Add titles, cover images, narrative, and captions that elicit the feeling of the moment.
            </p>
            <p className="mt-4 font-[Newsreader] italic text-espresso/75">
              The picture holds the moment. Your words bring it to life.
            </p>
          </div>
        </div>

        <div className="mt-24 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="reveal">
            <span className="font-[Fraunces] text-6xl font-medium text-terracotta/30">03</span>
            <h3 className="mt-3 font-[Fraunces] font-semibold text-3xl text-espresso">
              Enjoy at your fingertips
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Keep and share your stories, available anytime on your phone — easy to return to, and easy
              to share with family and friends.
            </p>
            <p className="mt-4 font-[Newsreader] italic text-espresso/75">
              Not on a shelf. Not in a drawer. With you.
            </p>
          </div>
          <div className="reveal reveal-d1 mx-auto w-full max-w-xs">
            <figure className="photo-print rotate-[-2deg]">
              <img
                src={IMG.phone}
                alt="A phone showing a story in the My Stories app"
                className="block w-full"
              />
              <figcaption className="mt-2 text-center font-[Newsreader] italic text-sm text-espresso/70">
                Every story, one pocket away
              </figcaption>
            </figure>
          </div>
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
  const comingSoon = useComingSoon();

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
          <button
            type="button"
            onClick={comingSoon}
            className="group inline-flex items-center gap-2 rounded-full bg-terracotta text-primary-foreground font-semibold px-8 py-4 text-lg transition-all duration-150 hover:bg-terracotta-deep active:scale-[0.97]"
          >
            Tell your stories
            <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
          <Link
            href="/my-stories/3"
            className="inline-flex items-center gap-2 text-sm font-semibold text-espresso/80 hover:text-terracotta transition-colors"
          >
            View landing page 3
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
          <img src={IMG.logo} alt="My Stories mark" className="h-7 w-auto max-w-[7rem]" />
        </div>
        <p className="text-sm text-muted-foreground">
          Gather the photos. Tell the stories. Enjoy at your fingertips.
        </p>
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
