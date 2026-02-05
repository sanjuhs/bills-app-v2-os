import Image from "next/image"
import Link from "next/link"
import {
  ArrowRightIcon,
  ChevronDownIcon,
  LockIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"

import logo from "@/assets/mascot/logo/Gemini_Generated_Image_6gx2tt6gx2tt6gx2.png"
import crow from "@/assets/mascot/crow/origami-crow.png"
import golem from "@/assets/mascot/golem/receipt-golem.png"
import piggy from "@/assets/mascot/piggy/piggy-kintsugi.png"

const navItems = [
  { label: "Product", href: "#product", hasMenu: true },
  { label: "Solutions", href: "#solutions", hasMenu: true },
  { label: "Security", href: "#security", hasMenu: false },
  { label: "Customers", href: "#customers", hasMenu: true },
  { label: "News", href: "#news", hasMenu: true },
  { label: "Careers", href: "#careers", hasMenu: false },
]

const footerColumns: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "PRODUCT",
    links: [
      { label: "Overview", href: "#product" },
      { label: "Workflows", href: "#workflows" },
      { label: "Audit trail", href: "#audit" },
      { label: "Portal", href: "#portal" },
    ],
  },
  {
    title: "SOLUTIONS",
    links: [
      { label: "Accounts Payable", href: "#solutions" },
      { label: "Controllers", href: "#solutions" },
      { label: "Founder mode", href: "#solutions" },
    ],
  },
  {
    title: "CUSTOMERS",
    links: [{ label: "Overview", href: "#customers" }],
  },
  {
    title: "JOIN US",
    links: [{ label: "Careers", href: "#careers" }],
  },
  {
    title: "COMPANY",
    links: [
      { label: "About", href: "#company" },
      { label: "Contact", href: "#contact" },
      { label: "LinkedIn", href: "#social" },
      { label: "X", href: "#social" },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { label: "Terms", href: "#legal" },
      { label: "Privacy", href: "#legal" },
      { label: "Security", href: "#security" },
    ],
  },
]

function NavLink({
  href,
  label,
  hasMenu,
}: {
  href: string
  label: string
  hasMenu?: boolean
}) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      <span>{label}</span>
      {hasMenu ? (
        <ChevronDownIcon className="size-4 text-white/60 transition group-hover:text-white/80" />
      ) : null}
    </a>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={logo}
              alt="Bills App"
              width={36}
              height={36}
              priority
              className="rounded-lg border border-white/10 bg-white/95 shadow-sm"
            />
            <span className="hidden text-sm font-semibold tracking-tight text-white sm:inline">
              Bills App
            </span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                href={item.href}
                label={item.label}
                hasMenu={item.hasMenu}
              />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="hidden text-white/80 hover:bg-white/10 hover:text-white md:inline-flex"
              asChild
            >
              <a href="#login">Log in</a>
            </Button>
            <Button
              className="bg-white text-neutral-950 hover:bg-white/90"
              asChild
            >
              <a href="#demo">Book a demo</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-neutral-950 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(34,211,238,0.18),transparent_45%),radial-gradient(circle_at_70%_40%,rgba(163,230,53,0.12),transparent_55%),linear-gradient(to_bottom,rgba(0,0,0,0.2),rgba(0,0,0,0.75))]" />
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:py-24">
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                <SparklesIcon className="size-4 text-white/70" />
                Bills that close themselves.
              </div>

              <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
                Modern AP for teams that want speed, certainty, and zero chaos.
              </h1>

              <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-white/70 sm:text-lg">
                Bills App turns invoices, receipts, and approvals into a clean,
                searchable system. Built for high-signal workflows, not busywork.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  className="h-11 bg-white text-neutral-950 hover:bg-white/90"
                  asChild
                >
                  <a href="#demo">
                    Book a demo <ArrowRightIcon className="ml-1.5 size-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  className="h-11 text-white/80 hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <a href="#product">Explore product</a>
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-white/60">
                <div className="inline-flex items-center gap-2">
                  <ZapIcon className="size-4" />
                  Fast approvals
                </div>
                <div className="inline-flex items-center gap-2">
                  <LockIcon className="size-4" />
                  Audit-ready
                </div>
                <div className="inline-flex items-center gap-2">
                  <SparklesIcon className="size-4" />
                  Clean search
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="absolute -inset-8 rounded-[40px] bg-white/5 blur-2xl" />
              <div className="relative grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <Image
                    src={golem}
                    alt="Receipt golem mascot"
                    width={512}
                    height={512}
                    className="h-auto w-full rounded-2xl"
                  />
                  <p className="mt-3 text-sm font-medium text-white">
                    Ingest receipts instantly
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/60">
                    One place for every bill, attachment, and note.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <Image
                      src={piggy}
                      alt="Piggy mascot"
                      width={512}
                      height={512}
                      className="h-auto w-full rounded-2xl"
                    />
                    <p className="mt-3 text-sm font-medium text-white">
                      Reduce leakage
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/60">
                      Catch duplicates, missing fields, and drift.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <Image
                      src={crow}
                      alt="Origami crow mascot"
                      width={512}
                      height={512}
                      className="h-auto w-full rounded-2xl"
                    />
                    <p className="mt-3 text-sm font-medium text-white">
                      Audit trail that reads well
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/60">
                      Every change is attributable and searchable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
            <Button
              className="bg-white text-neutral-950 hover:bg-white/90"
              asChild
            >
              <a href="#demo">Book a demo</a>
            </Button>
          </div>
        </section>

        <section id="product" className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-widest text-neutral-500">
                PRODUCT
              </p>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                Simple surfaces. Serious depth.
              </h2>
              <p className="mt-4 text-pretty text-base leading-7 text-neutral-600">
                Built like a modern control room: dense where it matters, quiet
                everywhere else.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
                <p className="text-sm font-semibold text-neutral-950">
                  Approvals that don’t stall
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Route bills by policy, keep context inline, and get to “paid”
                  without Slack archaeology.
                </p>
              </div>
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
                <p className="text-sm font-semibold text-neutral-950">
                  Search that actually finds
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Vendors, amounts, line items, attachments—retrieval feels
                  instant and obvious.
                </p>
              </div>
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
                <p className="text-sm font-semibold text-neutral-950">
                  Exportable, defensible records
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Keep an audit trail that survives handoffs, reviews, and time.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="workflows" className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
              <div>
                <p className="text-xs font-semibold tracking-widest text-neutral-500">
                  WORKFLOWS
                </p>
                <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                  From inbox to paid—without losing the plot.
                </h2>
                <p className="mt-4 text-pretty text-base leading-7 text-neutral-600">
                  The product is built around the actual sequence your team
                  follows, not a generic ticketing abstraction.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>
                      What does the API look like right now?
                    </AccordionTrigger>
                    <AccordionContent>
                      Minimal by design: the Django backend currently exposes a
                      hello-world endpoint at{" "}
                      <code className="rounded bg-white px-1 py-0.5 text-xs">
                        /api/hello/
                      </code>{" "}
                      to validate wiring. We’ll grow endpoints as the Bills App
                      schema stabilizes.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>Is this secure by default?</AccordionTrigger>
                    <AccordionContent>
                      We keep surfaces small, log meaningful breakpoints, and
                      prefer explicit access controls over “magic.” Production
                      hardening comes next (secrets, hosts, auth, rate limits).
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger>
                      Can we tune this for high information density?
                    </AccordionTrigger>
                    <AccordionContent>
                      Yes—this UI is built with compact, lawyer-grade hierarchy:
                      primary actions upfront, detail on demand, and a focus on
                      readability.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <p className="text-xs font-semibold tracking-widest text-neutral-500">
                  SECURITY
                </p>
                <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-neutral-950">
                  Designed for certainty.
                </h2>
                <p className="mt-4 text-sm leading-6 text-neutral-600">
                  Strong defaults, minimal surfaces, and an audit-friendly trail.
                </p>
              </div>

              <div className="grid gap-4 lg:col-span-2 md:grid-cols-2">
                <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
                  <div className="inline-flex size-10 items-center justify-center rounded-2xl border border-neutral-200 bg-white">
                    <LockIcon className="size-5 text-neutral-800" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-neutral-950">
                    Policy-driven access
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Keep permissions explicit and auditable across workflows.
                  </p>
                </div>
                <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
                  <div className="inline-flex size-10 items-center justify-center rounded-2xl border border-neutral-200 bg-white">
                    <ZapIcon className="size-5 text-neutral-800" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-neutral-950">
                    Fast, traceable operations
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    High-signal telemetry where it matters; no noisy logs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <Image
                  src={logo}
                  alt="Bills App"
                  width={36}
                  height={36}
                  className="rounded-lg border border-neutral-200 bg-white shadow-sm"
                />
              </div>
              <Button className="bg-neutral-950 text-white hover:bg-neutral-900" asChild>
                <a href="#demo">Book a demo</a>
              </Button>
            </div>

            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
              {footerColumns.map((col) => (
                <div key={col.title} className="space-y-3">
                  <p className="text-xs font-semibold tracking-widest text-neutral-500">
                    {col.title}
                  </p>
                  <ul className="space-y-2">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <a
                          href={l.href}
                          className="text-sm text-neutral-700 hover:text-neutral-950"
                        >
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-16 border-t border-neutral-200 pt-10">
              <p className="text-xs text-neutral-500">
                © {new Date().getFullYear()} Bills App. All rights reserved.
              </p>
              <div className="mt-8 select-none text-balance font-serif text-[min(18vw,180px)] leading-[0.85] tracking-tight text-neutral-950">
                BILLS APP
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
