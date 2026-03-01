import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import {
  SignInButton,
  SignUpButton,
  SignedOut,
} from "@clerk/nextjs"
import {
  Camera,
  Heart,
  MessageCircle,
  Receipt,
  Share2,
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const samplePosts = [
  {
    id: 1,
    username: "priya_deals",
    avatar: "PS",
    caption:
      "Got this jacket for 70% off! Myntra end-of-season sale is no joke",
    amount: "₹899",
    originalAmount: "₹2,999",
    tag: "#steal",
    tagColor: "text-emerald-700",
    bgAccent: "from-emerald-100",
    likes: 234,
    comments: 45,
  },
  {
    id: 2,
    username: "angry_commuter",
    avatar: "AM",
    caption: "₹500 for PARKING?! Bangalore malls are out of control",
    amount: "₹500",
    tag: "#outrage",
    tagColor: "text-orange-700",
    bgAccent: "from-orange-100",
    likes: 1247,
    comments: 89,
  },
  {
    id: 3,
    username: "foodie_raj",
    avatar: "RK",
    caption:
      "First date spot. We ordered too much and talked for 4 hours. Best ₹1200 I ever spent.",
    amount: "₹1,200",
    tag: "#memory",
    tagColor: "text-violet-700",
    bgAccent: "from-violet-100",
    likes: 892,
    comments: 67,
  },
]

const emotionalHooks = [
  {
    icon: TrendingUp,
    title: "Flex Your Finds",
    description: "Share those 70% off steals. Watch the jealousy roll in.",
    color: "text-emerald-600",
  },
  {
    icon: Zap,
    title: "Vent About Prices",
    description:
      "₹500 for parking? Post it. Let the internet share your outrage.",
    color: "text-orange-600",
  },
  {
    icon: Heart,
    title: "Remember Moments",
    description:
      "Bills are artifacts. That coffee shop receipt? It's a memory.",
    color: "text-rose-600",
  },
  {
    icon: Trophy,
    title: "Save Together",
    description: "Follow deal hunters. Compare prices. Win at spending.",
    color: "text-amber-600",
  },
]

const steps = [
  {
    num: "01",
    icon: Camera,
    title: "Snap your bill",
    description: "Photo, screenshot, or let us grab it from notifications.",
  },
  {
    num: "02",
    icon: Receipt,
    title: "Add your story",
    description: "The deal, the outrage, the memory — give it context.",
  },
  {
    num: "03",
    icon: Share2,
    title: "Share with the world",
    description: "Or keep it private. You control who sees what.",
  },
]

function BillCard({ post }: { post: (typeof samplePosts)[0] }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md hover:border-neutral-300">
      <div
        className={`relative h-28 bg-gradient-to-br ${post.bgAccent} to-neutral-50`}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)`,
          }}
        />
        <div className="absolute inset-x-4 top-4 flex items-start justify-between">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${post.tagColor} bg-white/70`}
          >
            {post.tag}
          </span>
          <div className="text-right">
            <p className="text-2xl font-bold text-neutral-900">{post.amount}</p>
            {post.originalAmount && (
              <p className="text-xs text-neutral-400 line-through">
                {post.originalAmount}
              </p>
            )}
          </div>
        </div>
        <div className="absolute bottom-2 right-3 rotate-[-8deg] rounded border-2 border-neutral-300 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
          Posted
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-500">
            {post.avatar}
          </div>
          <p className="text-sm text-neutral-500">@{post.username}</p>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-neutral-600">
          {post.caption}
        </p>
        <div className="mt-3 flex items-center gap-4 text-neutral-400">
          <span className="flex items-center gap-1 text-xs">
            <Heart className="size-3.5" />
            {post.likes >= 1000
              ? `${(post.likes / 1000).toFixed(1)}k`
              : post.likes}
          </span>
          <span className="flex items-center gap-1 text-xs">
            <MessageCircle className="size-3.5" />
            {post.comments}
          </span>
        </div>
      </div>
    </div>
  )
}

export default async function LandingPage() {
  const { userId } = await auth()
  if (userId) redirect("/feed")

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Receipt className="size-5 text-amber-500" />
            <span className="text-base font-semibold tracking-tight">
              Bills
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                size="sm"
                className="text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button
                size="sm"
                className="bg-amber-500 text-white hover:bg-amber-600"
              >
                Get started
              </Button>
            </SignUpButton>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-white">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.05),transparent_45%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(139,92,246,0.05),transparent_50%)]" />
          </div>

          <div className="relative mx-auto max-w-5xl px-4 py-20 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700">
                <Sparkles className="size-4" />
                Social network for your receipts
              </div>

              <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Every Bill Tells
                <br className="hidden sm:block" /> a Story
              </h1>

              <p className="mx-auto mt-5 max-w-lg text-pretty text-base leading-relaxed text-neutral-500 sm:text-lg">
                Share your wins. Vent your outrage. Remember the moments money
                can&apos;t capture.
              </p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button
                      size="lg"
                      className="w-full bg-amber-500 text-white hover:bg-amber-600 sm:w-auto"
                    >
                      Get early access
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 sm:w-auto"
                  asChild
                >
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>

              <p className="mt-4 text-xs text-neutral-400">
                Join 2,400+ on the waitlist. No spam, just launch updates.
              </p>
            </div>
          </div>
        </section>

        {/* Why Bills */}
        <section className="border-t border-neutral-200 bg-neutral-50">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                Why share bills?
              </p>
              <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                Because every purchase has a story
              </h2>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {emotionalHooks.map((hook) => (
                <div
                  key={hook.title}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-neutral-300"
                >
                  <hook.icon className={`size-6 ${hook.color}`} />
                  <h3 className="mt-4 text-base font-semibold">{hook.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                    {hook.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sample Posts */}
        <section className="border-t border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                The feed
              </p>
              <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                What people are posting
              </h2>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {samplePosts.map((post) => (
                <BillCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          className="border-t border-neutral-200 bg-neutral-50"
        >
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                How it works
              </p>
              <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                Three taps to post
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.num}
                  className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm"
                >
                  <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-neutral-100">
                    <step.icon className="size-5 text-neutral-600" />
                  </div>
                  <span className="mt-4 block text-xs font-medium text-neutral-300">
                    {step.num}
                  </span>
                  <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-neutral-500">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="waitlist" className="border-t border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
            <div className="mx-auto max-w-md text-center">
              <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                Be the first to share your bills
              </h2>
              <p className="mt-3 text-sm text-neutral-500">
                We&apos;re building in public. Join early and shape what this
                becomes.
              </p>

              <div className="mt-8">
                <SignUpButton mode="modal">
                  <Button
                    size="lg"
                    className="bg-amber-500 text-white hover:bg-amber-600"
                  >
                    Create your account
                  </Button>
                </SignUpButton>
              </div>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                No spam. Just launch updates.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm text-neutral-400">
              &copy; {new Date().getFullYear()} Bill&apos;s App
            </span>
            <div className="flex gap-6 text-sm text-neutral-400">
              <a href="#" className="transition hover:text-neutral-600">
                Privacy
              </a>
              <a href="#" className="transition hover:text-neutral-600">
                Terms
              </a>
              <a href="#" className="transition hover:text-neutral-600">
                @billsapp
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
