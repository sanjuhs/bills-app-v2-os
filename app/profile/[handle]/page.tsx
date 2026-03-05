"use client"

import { TouchEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Heart,
  ImagePlus,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react"

import { Sidebar } from "@/components/sidebar"

const API = process.env.NEXT_PUBLIC_DJANGO_API_URL ?? "http://127.0.0.1:8000"

type PostProfile = { handle: string; display_name: string; avatar_url: string }

type AIAnalysis = {
  status?: string
  amount?: number
  original_amount?: number | null
  tags?: string[]
  location?: string
  description?: string
  confidence?: number
}

type FeedPost = {
  id: number
  profile: PostProfile
  images: string[]
  image_url: string
  caption: string
  amount: string | null
  original_amount: string | null
  tag: string
  location: string
  ai_analysis: AIAnalysis
  likes: number
  liked_by_me: boolean
  comments: number
  created_at: string
}

type ProfileData = {
  handle: string
  display_name: string
  avatar_url: string
  bio: string
  country: string
  preferred_currency: string
  coins: number
  followers: number
  is_verified: boolean
  posts_count: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

function AvatarImg({ url, name, size = 150 }: { url?: string; name: string; size?: number }) {
  if (url) {
    return <img src={url} alt={name} className="size-full rounded-full object-cover" />
  }
  const fs = size >= 100 ? 30 : size >= 40 ? 14 : 10
  return <div className="flex size-full items-center justify-center rounded-full bg-background font-bold text-muted-foreground" style={{ fontSize: fs }}>{initials(name)}</div>
}

function inr(n: number | string) {
  return parseFloat(String(n)).toLocaleString("en-IN")
}

export default function ProfilePage() {
  const { handle } = useParams<{ handle: string }>()
  const router = useRouter()
  const { user } = useUser()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  // Edit profile state
  const [showEdit, setShowEdit] = useState(false)
  const [editBio, setEditBio] = useState("")
  const [editName, setEditName] = useState("")
  const [editCountry, setEditCountry] = useState("")
  const [editCurrency, setEditCurrency] = useState("INR")
  const [editSaving, setEditSaving] = useState(false)
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  useEffect(() => {
    if (!handle) return
    const myHandle = localStorage.getItem("bills_handle") ?? ""
    const ac = new AbortController()
    fetch(`${API}/api/feeds/profile/${handle}/?my_handle=${myHandle}`, { signal: ac.signal })
      .then((r) => { if (!r.ok) throw new Error("not found"); return r.json() })
      .then((data) => {
        if (data.profile) setProfile(data.profile)
        if (Array.isArray(data.items)) setPosts(data.items)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ac.abort()
  }, [handle])

  useEffect(() => {
    const myHandle = localStorage.getItem("bills_handle")
    setIsOwnProfile(!!myHandle && myHandle === handle)
  }, [handle])

  function openEditModal() {
    if (!profile) return
    setEditBio(profile.bio)
    setEditName(profile.display_name)
    setEditCountry(profile.country)
    setEditCurrency(profile.preferred_currency)
    setShowEdit(true)
  }

  async function saveProfile() {
    if (!profile) return
    setEditSaving(true)
    try {
      const res = await fetch(`${API}/api/profiles/${profile.handle}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: editBio, display_name: editName, country: editCountry, preferred_currency: editCurrency }),
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
        setShowEdit(false)
      }
    } catch {} finally { setEditSaving(false) }
  }

  async function handleAvatarUpload(file: File) {
    if (!profile) return
    try {
      const pr = await fetch(`${API}/api/media/presign/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, content_type: file.type }),
      })
      const pd = await pr.json()
      await fetch(pd.upload_url, { method: "PUT", body: file, headers: { "Content-Type": file.type } })

      const res = await fetch(`${API}/api/profiles/${profile.handle}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: pd.s3_key }),
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar />
        <main className="pb-16 md:ml-[60px] md:pb-0">
          <div className="flex items-center justify-center py-32">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar />
        <main className="pb-16 md:ml-[60px] md:pb-0">
          <div className="mx-auto max-w-[935px] px-4 py-20 text-center">
            <p className="text-lg text-muted-foreground">Profile not found</p>
            <Link href="/feed" className="mt-4 inline-block text-sm text-amber-500 hover:underline">
              Back to feed
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const expandedPost = expanded !== null ? posts.find((p) => p.id === expanded) : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar onCreateClick={() => router.push("/feed")} />

      <main className="pb-16 md:ml-[60px] md:pb-0">
        <div className="mx-auto max-w-[935px] px-4 py-8">
          {/* ── Profile Header ── */}
          <header className="flex flex-col items-center gap-6 border-b border-border pb-10 pt-4 sm:flex-row sm:items-start sm:gap-14">
            {/* Avatar */}
            <div className="relative group">
              <div className="flex size-[150px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 p-[3px]">
                <AvatarImg url={profile.avatar_url} name={profile.display_name} size={150} />
              </div>
              {isOwnProfile && (
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <ImagePlus className="size-6 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleAvatarUpload(f)
                  }} />
                </label>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <h1 className="text-xl">{profile.handle}</h1>
                {profile.is_verified && <ShieldCheck className="size-5 text-amber-500" />}
                {isOwnProfile ? (
                  <button
                    onClick={openEditModal}
                    className="flex items-center gap-1.5 rounded-lg bg-muted px-4 py-1.5 text-sm font-semibold transition hover:bg-accent"
                  >
                    <Pencil className="size-3.5" /> Edit profile
                  </button>
                ) : (
                  <button className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-400">
                    Follow
                  </button>
                )}
              </div>

              <div className="mt-5 flex justify-center gap-10 text-sm sm:justify-start">
                <div><span className="font-semibold">{profile.posts_count}</span> <span className="text-muted-foreground">posts</span></div>
                <div><span className="font-semibold">{fmt(profile.followers)}</span> <span className="text-muted-foreground">followers</span></div>
                <div><span className="font-semibold">0</span> <span className="text-muted-foreground">following</span></div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold">{profile.display_name}</p>
                {profile.bio && <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {profile.country && <span className="rounded-full bg-muted px-2 py-0.5">{profile.country}</span>}
                  <span className="rounded-full bg-muted px-2 py-0.5">{profile.preferred_currency}</span>
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
                    <Coins className="size-3" />{profile.coins} coins
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* ── Posts Grid ── */}
          {posts.length === 0 ? (
            <p className="py-20 text-center text-sm text-muted-foreground">No posts yet.</p>
          ) : (
            <div className="mt-1 grid grid-cols-3 gap-1">
              {posts.map((post) => {
                const ai = post.ai_analysis
                const amt = ai?.amount ?? (post.amount ? parseFloat(post.amount) : null)
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setExpanded(post.id)}
                    className="group relative aspect-square overflow-hidden bg-muted"
                  >
                    {(post.images?.length > 0 || post.image_url) ? (
                      <>
                        <img src={post.images?.[0] || post.image_url} alt="" className="size-full object-cover" />
                        {post.images?.length > 1 && (
                          <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold text-white">
                            1/{post.images.length}
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="flex size-full items-center justify-center text-2xl font-bold text-muted-foreground/20">
                        {amt ? `₹${inr(amt)}` : "—"}
                      </div>
                    )}
                    <div className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
                      <div className="flex gap-5 text-sm font-semibold text-white">
                        <span className="flex items-center gap-1.5"><Heart className="size-4 fill-white" />{fmt(post.likes)}</span>
                        <span className="flex items-center gap-1.5"><MessageCircle className="size-4 fill-white" />{fmt(post.comments)}</span>
                      </div>
                    </div>
                    {amt != null && amt > 0 && (
                      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        ₹{inr(amt)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Expanded Post Modal ── */}
      {expandedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setExpanded(null)}>
          <div className="relative w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setExpanded(null)} className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80">
              <X className="size-4" />
            </button>
            <div className="grid md:grid-cols-2">
              {(expandedPost.images?.length > 0 || expandedPost.image_url) ? (
                <ProfileCarousel images={expandedPost.images?.length ? expandedPost.images : [expandedPost.image_url]} />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-muted text-5xl font-bold text-muted-foreground/15">₹</div>
              )}
              <div className="flex flex-col p-5">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    <AvatarImg url={expandedPost.profile.avatar_url} name={expandedPost.profile.display_name} size={36} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{expandedPost.profile.handle}</p>
                    {(expandedPost.ai_analysis?.location || expandedPost.location) && (
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="size-3" />{expandedPost.ai_analysis?.location || expandedPost.location}</p>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                  <p className="text-sm">
                    <span className="font-semibold">{expandedPost.profile.handle}</span>{" "}
                    <span className="text-foreground/70">{expandedPost.caption}</span>
                  </p>
                  {expandedPost.ai_analysis?.tags && expandedPost.ai_analysis.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {expandedPost.ai_analysis.tags.map((t) => (
                        <span key={t} className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">{t}</span>
                      ))}
                      <span className="flex items-center gap-0.5 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
                        <Sparkles className="size-3" /> AI
                      </span>
                    </div>
                  )}
                  {expandedPost.ai_analysis?.description && (
                    <p className="mt-2 text-[11px] text-muted-foreground/50 italic">{expandedPost.ai_analysis.description}</p>
                  )}
                </div>
                <div className="border-t border-border pt-4">
                  {(() => {
                    const ai = expandedPost.ai_analysis
                    const amt = ai?.amount ?? (expandedPost.amount ? parseFloat(expandedPost.amount) : null)
                    const orig = ai?.original_amount ?? (expandedPost.original_amount ? parseFloat(expandedPost.original_amount) : null)
                    if (!amt || amt <= 0) return null
                    return (
                      <div className="mb-3 flex items-center gap-2">
                        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-base font-bold text-emerald-500 dark:text-emerald-400">₹{inr(amt)}</span>
                        {orig != null && orig > 0 && orig !== amt && (
                          <span className="text-sm text-muted-foreground line-through">₹{inr(orig)}</span>
                        )}
                        {ai?.confidence != null && (
                          <span className="text-[10px] text-muted-foreground/50">{Math.round(ai.confidence * 100)}% conf.</span>
                        )}
                      </div>
                    )
                  })()}
                  <div className="flex gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-sm"><Heart className="size-5" />{fmt(expandedPost.likes)}</span>
                    <span className="flex items-center gap-1.5 text-sm"><MessageCircle className="size-5" />{fmt(expandedPost.comments)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Profile Modal ── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowEdit(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit profile</h2>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Display name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500/50" maxLength={120} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Bio</label>
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500/50" maxLength={500} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Country</label>
                  <input value={editCountry} onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500/50" maxLength={100} placeholder="India" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Currency</label>
                  <select value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500/50">
                    {["INR","USD","EUR","GBP","JPY","AUD","CAD","SGD","AED"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={saveProfile} disabled={editSaving}
                className="w-full rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:opacity-50">
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function ProfileCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchDeltaX = useRef(0)
  const count = images.length
  const clampedIdx = Math.min(idx, Math.max(0, count - 1))
  const SWIPE_THRESHOLD = 45

  function goPrev() {
    setIdx(prev => Math.max(0, Math.min(prev, count - 1) - 1))
  }

  function goNext() {
    setIdx(prev => Math.min(count - 1, Math.min(prev, count - 1) + 1))
  }

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    touchStartX.current = e.touches[0]?.clientX ?? null
    touchDeltaX.current = 0
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current == null) return
    touchDeltaX.current = (e.touches[0]?.clientX ?? 0) - touchStartX.current
  }

  function handleTouchEnd() {
    const delta = touchDeltaX.current
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      if (delta < 0) goNext()
      if (delta > 0) goPrev()
    }
    touchStartX.current = null
    touchDeltaX.current = 0
  }

  if (count === 1) return <img src={images[0]} alt="" className="aspect-square w-full object-cover" />

  return (
    <div
      className="group/car relative aspect-square overflow-hidden touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="flex h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(-${clampedIdx * 100}%)` }}>
        {images.map((src, i) => (
          <img key={i} src={src} alt="" className="aspect-square w-full shrink-0 object-cover" />
        ))}
      </div>
      {clampedIdx > 0 && (
        <button onClick={goPrev} className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white opacity-0 transition group-hover/car:opacity-100">
          <ChevronLeft className="size-4" />
        </button>
      )}
      {clampedIdx < count - 1 && (
        <button onClick={goNext} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white opacity-0 transition group-hover/car:opacity-100">
          <ChevronRight className="size-4" />
        </button>
      )}
      <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
        {images.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} className={`size-1.5 rounded-full transition ${i === clampedIdx ? "bg-white" : "bg-white/40"}`} />
        ))}
      </div>
      <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
        {clampedIdx + 1}/{count}
      </span>
    </div>
  )
}
