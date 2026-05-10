import { Link, useNavigate } from 'react-router-dom';
import { useFadeInWhenVisible } from '../hooks/useFadeInWhenVisible.js';

const ASCII_MARK = `██████╗  █████╗ ███╗   ███╗███████╗████████╗██╗███╗   ███╗███████╗
██╔════╝ ██╔══██╗████╗ ████║██╔════╝╚══██╔══╝██║████╗ ████║██╔════╝
██║  ███╗███████║██╔████╔██║█████╗     ██║   ██║██╔████╔██║█████╗
██║   ██║██╔══██║██║╚██╔╝██║██╔══╝     ██║   ██║██║╚██╔╝██║██╔══╝
╚██████╔╝██║  ██║██║ ╚═╝ ██║███████╗   ██║   ██║██║ ╚═╝ ██║███████╗
 ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝╚═╝     ╚═╝╚══════╝`;

const HOW_IT_WORKS = [
  {
    number: '01',
    title: 'Set Quests',
    description:
      'Parents create tasks — chores, homework, reading — each worth Reward Points (RP) your family agrees on.',
  },
  {
    number: '02',
    title: 'Kids Submit Proof',
    description:
      'Children complete the quest and upload photo or short video evidence from the web or mobile app.',
  },
  {
    number: '03',
    title: 'AI Reviews, Parent Approves',
    description:
      'Vision AI summarizes evidence; you approve in one tap. Kids earn RP or Giftcard Points (GP) for real rewards.',
  },
];

const FEATURE_TAGS = ['Tasks → RP', 'RP → Gaming', 'GP → Gift Cards', 'Singapore · PDPA-aware'];

function FadeSection({ children, className = '', id }) {
  const [ref, visible] = useFadeInWhenVisible(0.08);
  return (
    <section
      id={id}
      ref={ref}
      className={`transition-all duration-[600ms] ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5'
      } ${className}`}
    >
      {children}
    </section>
  );
}

function LandingNav({ auth }) {
  return (
    <nav
      className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-black pb-4"
      aria-label="Site navigation"
    >
      <pre className="leading-none text-[0.45rem] sm:text-[0.55rem] md:text-[0.65rem] overflow-x-auto max-w-full">
        {ASCII_MARK}
      </pre>
      <div className="flex flex-wrap gap-6 text-sm font-bold uppercase tracking-widest">
        <a href="#about" className="hover:underline underline-offset-4">
          /about
        </a>
        <a href="#features" className="hover:underline underline-offset-4">
          /features
        </a>
        <Link to="/works" className="hover:underline underline-offset-4">
          /works
        </Link>
        <Link to="/blog" className="hover:underline underline-offset-4">
          /blog
        </Link>
        <a href="#contact" className="hover:underline underline-offset-4">
          /connect
        </a>
        {auth.token ? (
          <Link
            to={auth.role === 'parent' ? '/parent/ai' : '/child/dashboard'}
            className="hover:underline underline-offset-4"
          >
            /app
          </Link>
        ) : (
          <>
            <Link to="/login" className="hover:underline underline-offset-4">
              /login
            </Link>
            <Link to="/signup" className="hover:underline underline-offset-4">
              /signup
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default function HomePage({ auth }) {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-white text-black font-mono p-4 md:p-8">
      <div className="ascii-bg" aria-hidden />

      <main className="max-w-3xl mx-auto space-y-24 mb-32">
        <LandingNav auth={auth} />

        <section className="space-y-6 pt-8 md:pt-12">
          <div className="inline-block border-2 border-black p-2 text-xs font-bold uppercase bg-black text-white">
            Status: {auth.token ? 'Signed in' : 'Accepting new families'}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Turn screen time into{' '}
            <span className="inline-block overflow-hidden whitespace-nowrap border-r-4 border-black pr-2 animate-typewriter">
              earned time.
            </span>
          </h1>
          <p className="text-lg max-w-xl leading-relaxed">
            Gametime helps Singapore families tie gaming to chores and homework. Set quests, review evidence with AI,
            approve rewards — kids redeem RP and GP for real gift cards.
            <span className="cursor-blink" aria-hidden />
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {FEATURE_TAGS.map((t) => (
              <span key={t} className="border border-black px-3 py-1 text-xs font-bold uppercase">
                {t}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 pt-4">
            {auth.token ? (
              <button
                type="button"
                onClick={() => navigate(auth.role === 'parent' ? '/parent/ai' : '/child/dashboard')}
                className="border-2 border-black bg-black text-white px-6 py-3 text-sm font-bold uppercase hover:bg-white hover:text-black transition-colors"
              >
                Open dashboard
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="border-2 border-black bg-black text-white px-6 py-3 text-sm font-bold uppercase hover:bg-white hover:text-black transition-colors"
                >
                  Get started
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                  className="border-2 border-black px-6 py-3 text-sm font-bold uppercase hover:bg-black hover:text-white transition-colors"
                >
                  Read the manifesto
                </button>
              </>
            )}
          </div>
        </section>

        <FadeSection id="about" className="space-y-8 scroll-mt-24">
          <h2 className="text-2xl font-bold uppercase border-b-2 border-black pb-2 flex justify-between items-center gap-4">
            <span>01. Genesis</span>
            <span className="text-xs opacity-50 shrink-0">#family_os</span>
          </h2>
          <div className="space-y-4 text-justify text-sm md:text-base leading-relaxed">
            <p>
              Gametime is built for parents who want clarity, not another glowing dashboard. Tasks, evidence, approvals,
              and rewards live in one blunt, readable flow — tuned for busy households.
            </p>
            <p>
              Kids see exactly what earns their minutes and GP. Parents stay in control with PDPA-minded defaults,
              optional AI review, and caps that actually stick.
            </p>
          </div>
        </FadeSection>

        <FadeSection className="space-y-6">
          <h2 className="text-2xl font-bold uppercase border-b-2 border-black pb-2">02. Toolkit</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'Quests & RP',
              'Evidence upload',
              'AI summaries',
              'Parent approve',
              'Gaming sessions',
              'GP vault',
              'Gift cards',
              'Notifications',
            ].map((label) => (
              <div
                key={label}
                className="border border-black p-4 text-center text-sm font-bold hover:bg-black hover:text-white transition-colors"
              >
                {label}
              </div>
            ))}
          </div>
        </FadeSection>

        <FadeSection id="features" className="space-y-12 scroll-mt-24">
          <h2 className="text-2xl font-bold uppercase border-b-2 border-black pb-2">03. Product surface</h2>
          {[
            {
              title: 'QUEST_LEDGER',
              year: 'Live',
              body: 'Create recurring chores, homework blocks, and one-off missions. Deadlines, categories, and proof rules are explicit — no ambiguity.',
            },
            {
              title: 'PROOF_PIPELINE',
              year: 'Live',
              body: 'Photo and video evidence lands in a single review queue. AI drafts a concise check; you stamp approve or reject.',
            },
            {
              title: 'REWARD_GRAPH',
              year: 'Live',
              body: 'RP converts to supervised gaming minutes; GP stacks for Roblox, Steam, Razer Gold, and more — mock Athena until keys are enabled.',
            },
          ].map((item) => (
            <article
              key={item.title}
              className="group border-2 border-black p-6 space-y-4 hover:bg-black hover:text-white transition-all duration-300"
            >
              <div className="flex justify-between items-start gap-4">
                <h3 className="text-xl font-bold underline">{item.title}</h3>
                <span className="text-xs shrink-0">[{item.year}]</span>
              </div>
              <p className="text-sm leading-relaxed">{item.body}</p>
              <div className="flex gap-4 text-xs font-bold">
                <Link to="/signup" className="hover:underline">
                  SIGN_UP -&gt;
                </Link>
                <Link to="/login" className="hover:underline">
                  PARENT_LOGIN -&gt;
                </Link>
              </div>
            </article>
          ))}
        </FadeSection>

        <FadeSection className="space-y-6">
          <h2 className="text-2xl font-bold uppercase border-b-2 border-black pb-2">04. Activity</h2>
          <div className="border border-black p-4 overflow-x-auto no-scrollbar">
            <div className="text-[8px] font-mono leading-[8px] whitespace-pre text-black">
              <span className="text-black">██</span> <span className="opacity-10">██</span>{' '}
              <span className="opacity-10">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="opacity-10">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="opacity-10">██</span> <span className="text-black">██</span>{' '}
              <span className="opacity-10">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span>
              {'\n'}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="opacity-10">██</span>{' '}
              <span className="text-black">██</span> <span className="opacity-10">██</span>{' '}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="opacity-10">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span>
              {'\n'}
              <span className="opacity-10">██</span> <span className="text-black">██</span>{' '}
              <span className="opacity-10">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="opacity-10">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="opacity-10">██</span>
              {'\n'}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="opacity-10">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="opacity-10">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="text-black">██</span>{' '}
              <span className="text-black">██</span> <span className="opacity-10">██</span>{' '}
              <span className="text-black">██</span>
            </div>
            <div className="mt-4 flex justify-between text-[10px] uppercase font-bold gap-4">
              <span>Tasks completed · families onboarded · rewards redeemed</span>
              <span className="shrink-0">Signal only — not live GitHub data</span>
            </div>
          </div>
        </FadeSection>

        <FadeSection className="space-y-6">
          <h2 className="text-2xl font-bold uppercase border-b-2 border-black pb-2">05. How it ships</h2>
          <div className="divide-y-2 divide-black border-x border-t border-black">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.number} className="py-4 px-2 flex flex-col gap-2 hover:bg-black hover:text-white transition-colors">
                <div className="flex justify-between items-baseline gap-4">
                  <span className="font-bold underline">{step.title}</span>
                  <span className="text-xs">{step.number}</span>
                </div>
                <p className="text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </FadeSection>

        <FadeSection id="contact" className="space-y-6 scroll-mt-24">
          <h2 className="text-2xl font-bold uppercase border-b-2 border-black pb-2">06. Transmission</h2>
          <div className="border-2 border-black p-8 text-center space-y-4">
            <p className="text-xl">Need help or a demo walkthrough?</p>
            <p className="text-2xl font-bold">
              <Link to="/support" className="hover:underline decoration-4">
                Open support
              </Link>
            </p>
            <div className="flex flex-wrap justify-center gap-8 pt-4 text-sm font-bold">
              <Link to="/privacy" className="hover:underline underline-offset-4">
                Privacy (PDPA)
              </Link>
              <Link to="/child-login" className="hover:underline underline-offset-4">
                Child login
              </Link>
              <a href="mailto:hello@gametime.sg" className="hover:underline underline-offset-4">
                hello@gametime.sg
              </a>
            </div>
          </div>
        </FadeSection>

        <FadeSection className="space-y-6">
          <div className="border-t-2 border-black pt-8 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1">
              <h3 className="font-bold uppercase">The ledger</h3>
              <p className="text-xs text-neutral-600">Product updates — no fluff, no spam.</p>
            </div>
            <form
              className="flex w-full md:w-auto gap-0 border-2 border-black"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <input
                type="email"
                name="email"
                placeholder="EMAIL_ADDRESS"
                className="border-0 px-4 py-2 text-sm flex-1 md:w-64 outline-none focus:ring-2 focus:ring-black focus:ring-inset font-mono bg-white"
                autoComplete="email"
              />
              <button
                type="submit"
                className="bg-black text-white px-6 py-2 text-sm font-bold uppercase hover:bg-white hover:text-black border-l-2 border-black transition-colors"
              >
                Join
              </button>
            </form>
          </div>
          <div className="text-xs flex gap-4 opacity-50">
            <Link to="/works" className="hover:underline">
              WORKS
            </Link>
            <Link to="/blog" className="hover:underline">
              BLOG
            </Link>
          </div>
        </FadeSection>

        <footer className="border-t-2 border-black pt-12 text-xs flex flex-col md:flex-row justify-between gap-4 opacity-70">
          <div>
            © {new Date().getFullYear()} Gametime · Singapore
            <br />
            Built with React, Tailwind, and blunt borders.
          </div>
          <div className="text-right md:text-right">
            WEB_UI: BRUTAL_MONO
            <br />
            VERSION: 1.0.0-STABLE
          </div>
        </footer>
      </main>
    </div>
  );
}
