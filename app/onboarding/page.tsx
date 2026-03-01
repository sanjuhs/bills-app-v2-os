"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Loader2, Receipt } from "lucide-react"

import { Button } from "@/components/ui/button"

const API = process.env.NEXT_PUBLIC_DJANGO_API_URL ?? "http://127.0.0.1:8000"

const CURRENCIES = [
  { value: "INR", label: "₹ INR — Indian Rupee" },
  { value: "USD", label: "$ USD — US Dollar" },
  { value: "EUR", label: "€ EUR — Euro" },
  { value: "GBP", label: "£ GBP — British Pound" },
  { value: "JPY", label: "¥ JPY — Japanese Yen" },
  { value: "AUD", label: "A$ AUD — Australian Dollar" },
  { value: "CAD", label: "C$ CAD — Canadian Dollar" },
  { value: "SGD", label: "S$ SGD — Singapore Dollar" },
  { value: "AED", label: "د.إ AED — UAE Dirham" },
]

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  const [handle, setHandle] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [country, setCountry] = useState("")
  const [currency, setCurrency] = useState("INR")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!isLoaded || !user) return
    setDisplayName(user.fullName || "")
    const suggested = (user.firstName || "user").toLowerCase().replace(/[^a-z0-9]/g, "_")
    setHandle(suggested)

    fetch(`${API}/api/profiles/me/?clerk_id=${user.id}`)
      .then((r) => {
        if (r.ok) router.replace("/feed")
        else setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [isLoaded, user, router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch(`${API}/api/profiles/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerk_user_id: user.id,
          handle: handle.trim().toLowerCase(),
          display_name: displayName.trim() || handle.trim(),
          bio: bio.trim(),
          country: country.trim(),
          preferred_currency: currency,
          avatar_url: user.imageUrl || "",
        }),
      })

      if (res.ok) {
        localStorage.setItem("bills_handle", handle.trim().toLowerCase())
        router.push("/feed")
      } else {
        const data = await res.json()
        setError(data.error || "Something went wrong")
        setSubmitting(false)
      }
    } catch {
      setError("Could not reach the server")
      setSubmitting(false)
    }
  }

  if (!isLoaded || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-500/15">
            <Receipt className="size-7 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to Bills</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set up your profile to start sharing
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Handle</label>
            <div className="flex items-center rounded-lg border border-border bg-background focus-within:border-amber-500/40">
              <span className="pl-3 text-sm text-muted-foreground/50">@</span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                required maxLength={30} placeholder="your_handle"
                className="w-full bg-transparent px-1.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Display name</label>
            <input
              value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              maxLength={120} placeholder="Your Name"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/30 focus:border-amber-500/40"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Bio <span className="text-muted-foreground/30">(optional)</span>
            </label>
            <textarea
              value={bio} onChange={(e) => setBio(e.target.value)}
              rows={2} maxLength={280} placeholder="Deal hunter, outrage documenter..."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/30 focus:border-amber-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Country</label>
              <input
                value={country} onChange={(e) => setCountry(e.target.value)}
                maxLength={100} placeholder="India"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/30 focus:border-amber-500/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Currency</label>
              <select
                value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500/40"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <Button
            type="submit" disabled={submitting || !handle.trim()}
            className="w-full bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-40"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Create profile"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground/40">
            You'll get 100 coins daily to tip great posts
          </p>
        </form>
      </div>
    </div>
  )
}
