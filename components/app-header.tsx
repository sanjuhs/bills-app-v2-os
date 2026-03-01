"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignedIn, UserButton } from "@clerk/nextjs"
import { Receipt } from "lucide-react"

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Receipt className="size-5 text-amber-400" />
          <span className="text-base font-semibold tracking-tight text-white">
            Bills
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/feed"
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              pathname === "/feed"
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            Feed
          </Link>
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-8",
                },
              }}
            />
          </SignedIn>
        </nav>
      </div>
    </header>
  )
}
