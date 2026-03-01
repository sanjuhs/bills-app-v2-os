"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignedIn, UserButton } from "@clerk/nextjs"
import {
  Coins,
  Heart,
  Home,
  Menu,
  Moon,
  PlusSquare,
  Receipt,
  Search,
  Sun,
  User,
} from "lucide-react"

type NavItem = {
  href?: string
  action?: () => void
  icon: typeof Home
  label: string
}

export function Sidebar({ onCreateClick, coins }: { onCreateClick?: () => void; coins?: number }) {
  const pathname = usePathname()
  const [profileHandle, setProfileHandle] = useState("")
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const h = localStorage.getItem("bills_handle")
    if (h) setProfileHandle(h)
    const saved = localStorage.getItem("bills_theme")
    const isDark = saved ? saved === "dark" : true
    setDark(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("bills_theme", next ? "dark" : "light")
  }

  const items: NavItem[] = [
    { href: "/feed", icon: Home, label: "Home" },
    { href: "#", icon: Search, label: "Search" },
    { href: "#", icon: Heart, label: "Notifications" },
    { action: onCreateClick, href: "/feed", icon: PlusSquare, label: "Create" },
    ...(profileHandle
      ? [{ href: `/profile/${profileHandle}`, icon: User, label: "Profile" }]
      : []),
  ]

  function isActive(href?: string) {
    if (!href || href === "#") return false
    if (href === "/feed") return pathname === "/feed"
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop sidebar — collapsed 60px, expands to 220px on hover */}
      <aside className="group/sb fixed left-0 top-0 z-40 hidden h-screen w-[60px] flex-col border-r border-border bg-background px-1.5 py-6 transition-[width] duration-200 ease-in-out hover:w-[220px] hover:shadow-2xl md:flex">
        {/* Logo */}
        <Link
          href="/"
          className="mb-8 flex items-center gap-2.5 rounded-lg px-3 py-2 transition hover:bg-accent"
        >
          <Receipt className="size-5 shrink-0 text-amber-500" />
          <span className="whitespace-nowrap text-lg font-semibold tracking-tight opacity-0 transition-opacity duration-200 group-hover/sb:opacity-100">
            Bills
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5">
          {items.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            if (item.action) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition hover:bg-accent"
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="whitespace-nowrap text-sm opacity-0 transition-opacity duration-200 group-hover/sb:opacity-100">
                    {item.label}
                  </span>
                </button>
              )
            }

            return (
              <Link
                key={item.label}
                href={item.href!}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                  active
                    ? "font-bold text-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon
                  strokeWidth={active ? 2.5 : 1.75}
                  className="size-5 shrink-0"
                />
                <span className="whitespace-nowrap text-sm opacity-0 transition-opacity duration-200 group-hover/sb:opacity-100">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Coins */}
        {coins != null && (
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-amber-500">
            <Coins className="size-5 shrink-0" />
            <span className="whitespace-nowrap text-sm font-semibold opacity-0 transition-opacity duration-200 group-hover/sb:opacity-100">
              {coins} coins
            </span>
          </div>
        )}

        {/* Bottom */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition hover:bg-accent"
          >
            {dark ? (
              <Sun className="size-5 shrink-0" />
            ) : (
              <Moon className="size-5 shrink-0" />
            )}
            <span className="whitespace-nowrap text-sm opacity-0 transition-opacity duration-200 group-hover/sb:opacity-100">
              {dark ? "Light mode" : "Dark mode"}
            </span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition hover:bg-accent"
          >
            <Menu className="size-5 shrink-0" />
            <span className="whitespace-nowrap text-sm opacity-0 transition-opacity duration-200 group-hover/sb:opacity-100">
              More
            </span>
          </button>
          <SignedIn>
            <div className="flex items-center gap-3 px-3 py-2">
              <UserButton
                appearance={{ elements: { avatarBox: "size-6" } }}
              />
            </div>
          </SignedIn>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background py-2 md:hidden">
        {items.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          if (item.action) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="p-2 text-muted-foreground"
              >
                <Icon className="size-5" />
              </button>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href!}
              className={`p-2 ${active ? "text-foreground" : "text-muted-foreground"}`}
            >
              <Icon
                strokeWidth={active ? 2.5 : 1.75}
                className="size-5"
              />
            </Link>
          )
        })}
      </nav>
    </>
  )
}
