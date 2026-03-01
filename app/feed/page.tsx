"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Coins,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Send,
  Sparkles,
  X,
} from "lucide-react"

import { Sidebar } from "@/components/sidebar"

const API = process.env.NEXT_PUBLIC_DJANGO_API_URL ?? "http://127.0.0.1:8000"

type PostProfile = { handle: string; display_name: string; avatar_url: string }
type AIAnalysis = {
  status?: string; amount?: number; original_amount?: number | null; currency?: string
  category?: string; location?: string; tags?: string[]
  is_bill?: boolean; is_monetary?: boolean; description?: string; confidence?: number; error?: string
}
type CommentNode = {
  id: number; profile: { handle: string; display_name: string }
  text: string; parent_id: number | null; edited_at: string | null
  created_at: string; replies: CommentNode[]
}
type FeedPost = {
  id: number; profile: PostProfile; images: string[]; image_url: string; caption: string
  amount: string | null; original_amount: string | null; category: string
  tag: string; location: string; ai_analysis: AIAnalysis; tips_total: number
  likes: number; liked_by_me: boolean; comments: number; created_at: string
}
type MyProfile = {
  handle: string; display_name: string; avatar_url: string; bio: string
  country: string; preferred_currency: string; coins: number
  followers: number; is_verified: boolean; posts_count: number
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return "now"
  if (d < 3600) return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  if (d < 604800) return `${Math.floor(d / 86400)}d`
  return `${Math.floor(d / 604800)}w`
}
function fmt(n: number) { return n >= 1e6 ? `${(n/1e6).toFixed(1)}m` : n >= 1e3 ? `${(n/1e3).toFixed(1)}k` : String(n) }
function initials(n: string) { return n.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() }
function inr(n: number | string) { return parseFloat(String(n)).toLocaleString("en-IN") }
function countReplies(node: CommentNode): number {
  return node.replies.reduce((sum, r) => sum + 1 + countReplies(r), 0)
}

function Avatar({ url, name, size = 32 }: { url?: string; name: string; size?: number }) {
  const cls = `flex shrink-0 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground`
  if (url) {
    return <img src={url} alt={name} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  }
  const fs = size <= 24 ? 9 : size <= 32 ? 10 : size <= 40 ? 12 : 14
  return <div className={cls} style={{ width: size, height: size, fontSize: fs }}>{initials(name)}</div>
}

export default function FeedPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  const [myProfile, setMyProfile] = useState<MyProfile | null>(null)
  const [profileState, setProfileState] = useState<"loading"|"exists"|"missing">("loading")
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [caption, setCaption] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [uploadingBanner, setUploadingBanner] = useState<string | null>(null)

  const [openComments, setOpenComments] = useState<Set<number>>(new Set())
  const [commentsData, setCommentsData] = useState<Record<number, CommentNode[]>>({})
  const [replyTarget, setReplyTarget] = useState<{ postId: number; parentId: number | null } | null>(null)
  const [commentText, setCommentText] = useState("")
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoaded || !user) return
    fetch(`${API}/api/profiles/me/?clerk_id=${user.id}`)
      .then(r => { if (r.status === 404) { setProfileState("missing"); return null } return r.json() })
      .then(data => {
        if (data?.profile) {
          setMyProfile(data.profile)
          setProfileState("exists")
          localStorage.setItem("bills_handle", data.profile.handle)
          localStorage.setItem("bills_coins", String(data.profile.coins))
        }
      })
      .catch(() => setProfileState("exists"))
  }, [isLoaded, user])

  useEffect(() => { if (profileState === "missing") router.push("/onboarding") }, [profileState, router])

  const fetchFeed = useCallback((handle?: string) => {
    const qs = handle ? `?my_handle=${handle}` : ""
    fetch(`${API}/api/feeds/main/${qs}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data?.items)) setPosts(data.items) })
      .catch(() => {})
      .finally(() => setFeedLoading(false))
  }, [])

  useEffect(() => {
    if (profileState === "exists" && myProfile) {
      fetchFeed(myProfile.handle)
    } else if (profileState !== "loading") {
      fetchFeed()
    }
  }, [profileState, myProfile, fetchFeed])

  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files])

  function pollPostUntilReady(postId: number) {
    const check = async () => {
      try {
        const r = await fetch(`${API}/api/posts/${postId}/`)
        if (!r.ok) return
        const data = await r.json()
        const p = data.post as FeedPost
        if (p.ai_analysis?.status === "pending") {
          setTimeout(check, 3000)
          return
        }
        setPosts(prev => prev.map(existing => existing.id === postId ? p : existing))
        setUploadingBanner(null)
      } catch {
        setTimeout(check, 5000)
      }
    }
    setTimeout(check, 3000)
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (!myProfile || !caption.trim()) return
    const pendingFiles = [...files]
    const pendingCaption = caption.trim()

    setShowComposer(false)
    setCaption("")
    setFiles([])
    setUploadingBanner(pendingFiles.length ? `Uploading ${pendingFiles.length} image${pendingFiles.length > 1 ? "s" : ""} & analyzing...` : "Publishing your post...")

    ;(async () => {
      try {
        const s3Keys: string[] = []
        for (let i = 0; i < pendingFiles.length; i++) {
          const f = pendingFiles[i]
          const pr = await fetch(`${API}/api/media/presign/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: f.name, content_type: f.type }) })
          if (!pr.ok) throw new Error(`Failed to get upload URL for image ${i + 1}`)
          const pd = await pr.json()
          const up = await fetch(pd.upload_url, { method: "PUT", body: f, headers: { "Content-Type": f.type } })
          if (!up.ok) throw new Error(`Upload failed for image ${i + 1}`)
          s3Keys.push(pd.s3_key)
        }
        if (s3Keys.length) setUploadingBanner("Analyzing your bill with AI...")
        const res = await fetch(`${API}/api/posts/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: myProfile.handle, s3_keys: s3Keys, caption: pendingCaption }) })
        if (!res.ok) throw new Error(`Post creation failed (${res.status})`)
        const data = await res.json()
        const newPost = data.post as FeedPost
        setPosts(prev => [newPost, ...prev])
        if (newPost.ai_analysis?.status === "pending") {
          pollPostUntilReady(newPost.id)
        } else {
          setUploadingBanner(null)
        }
      } catch (err) {
        setUploadingBanner(`Error: ${err instanceof Error ? err.message : "Something went wrong"}`)
        setTimeout(() => setUploadingBanner(null), 5000)
      }
    })()
  }

  async function handleDelete(postId: number) {
    try { const r = await fetch(`${API}/api/posts/${postId}/`, { method: "DELETE" }); if (r.ok) setPosts(prev => prev.filter(p => p.id !== postId)) } catch {}
  }

  async function handleLike(postId: number) {
    if (!myProfile) return
    const post = posts.find(p => p.id === postId)
    if (!post) return
    const wasLiked = post.liked_by_me
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_me: !wasLiked, likes: wasLiked ? Math.max(0, p.likes - 1) : p.likes + 1 } : p))
    try {
      const r = await fetch(`${API}/api/posts/${postId}/like/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: myProfile.handle }),
      })
      if (r.ok) {
        const data = await r.json()
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_me: data.liked, likes: data.likes } : p))
      }
    } catch {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_me: wasLiked, likes: post.likes } : p))
    }
  }

  async function toggleComments(postId: number) {
    const next = new Set(openComments)
    if (next.has(postId)) { next.delete(postId) } else {
      next.add(postId)
      if (!commentsData[postId]) {
        try {
          const r = await fetch(`${API}/api/posts/${postId}/comments/`)
          const data = await r.json()
          setCommentsData(prev => ({ ...prev, [postId]: data.comments }))
        } catch {}
      }
    }
    setOpenComments(next)
  }

  async function submitComment() {
    if (!myProfile || !replyTarget || !commentText.trim()) return
    setCommentSubmitting(true)
    try {
      const r = await fetch(`${API}/api/posts/${replyTarget.postId}/comments/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: myProfile.handle, text: commentText.trim(), parent_id: replyTarget.parentId }),
      })
      if (r.ok) {
        const fresh = await fetch(`${API}/api/posts/${replyTarget.postId}/comments/`)
        const data = await fresh.json()
        setCommentsData(prev => ({ ...prev, [replyTarget.postId]: data.comments }))
        setPosts(prev => prev.map(p => p.id === replyTarget.postId ? { ...p, comments: p.comments + 1 } : p))
        setCommentText("")
        setReplyTarget(null)
      }
    } catch {} finally { setCommentSubmitting(false) }
  }

  async function handleEditComment(commentId: number, newText: string) {
    if (!myProfile) return
    try {
      const r = await fetch(`${API}/api/comments/${commentId}/`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: myProfile.handle, text: newText }),
      })
      if (r.ok) {
        const data = await r.json()
        setCommentsData(prev => {
          const updated = { ...prev }
          for (const postId of Object.keys(updated)) {
            updated[Number(postId)] = patchCommentInTree(updated[Number(postId)], commentId, data.comment.text, data.comment.edited_at)
          }
          return updated
        })
      }
    } catch {}
  }

  async function handleTip(postId: number) {
    if (!myProfile || myProfile.coins < 1) return
    try {
      const r = await fetch(`${API}/api/posts/${postId}/tip/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_handle: myProfile.handle, amount: 1 }),
      })
      if (r.ok) {
        const data = await r.json()
        setMyProfile(prev => prev ? { ...prev, coins: data.your_coins } : prev)
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, tips_total: data.post_tips } : p))
        localStorage.setItem("bills_coins", String(data.your_coins))
      }
    } catch {}
  }

  if (!isLoaded || profileState === "loading" || profileState === "missing") {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar onCreateClick={() => setShowComposer(true)} coins={myProfile?.coins} />

      <main className="pb-16 md:ml-[60px] md:pb-0">
        <div className="mx-auto max-w-[470px] px-4 py-4">
          {uploadingBanner && (
            <div className={`mb-4 flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium ${uploadingBanner.startsWith("Error") ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
              {!uploadingBanner.startsWith("Error") && <Loader2 className="size-4 animate-spin" />}
              {uploadingBanner}
            </div>
          )}
          {feedLoading ? (
            <div className="flex items-center justify-center py-32"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : posts.length === 0 ? (
            <p className="py-32 text-center text-sm text-muted-foreground">
              No posts yet. Hit <button onClick={() => setShowComposer(true)} className="text-amber-500 hover:underline">Create</button> to share a bill.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {posts.map(post => {
                const isOwn = myProfile && post.profile.handle === myProfile.handle
                const ai = post.ai_analysis
                const aiPending = ai?.status === "pending"
                const aiAmount = aiPending ? null : (ai?.amount ?? (post.amount ? parseFloat(post.amount) : null))
                const aiOriginal = aiPending ? null : (ai?.original_amount ?? (post.original_amount ? parseFloat(post.original_amount) : null))
                const aiTags = aiPending ? [] : (ai?.tags ?? (post.tag ? post.tag.split(" ").filter(Boolean) : []))
                const commentsOpen = openComments.has(post.id)
                const comments = commentsData[post.id] ?? []

                return (
                  <article key={post.id} className="py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Link href={`/profile/${post.profile.handle}`} className="flex items-center gap-3 transition hover:opacity-80">
                        <div className="rounded-full bg-gradient-to-br from-amber-400 to-rose-500 p-[2px]">
                          <Avatar url={post.profile.avatar_url} name={post.profile.display_name} size={32} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight">{post.profile.handle}</p>
                          {(ai?.location || post.location) && <p className="text-[11px] text-muted-foreground">{ai?.location || post.location}</p>}
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground/60">{timeAgo(post.created_at)}</span>
                        {isOwn && <button onClick={() => handleDelete(post.id)} className="rounded p-1 text-muted-foreground/40 transition hover:text-foreground"><MoreHorizontal className="size-5" /></button>}
                      </div>
                    </div>

                    {(post.images?.length > 0 || post.image_url) && (
                      <Carousel images={post.images?.length ? post.images : [post.image_url]} />
                    )}

                    {aiPending && (
                      <div className="flex items-center gap-2 rounded-b-lg bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-600 dark:text-violet-400">
                        <Loader2 className="size-3.5 animate-spin" />
                        <Sparkles className="size-3" /> AI is analyzing this bill...
                      </div>
                    )}

                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-4">
                        <button onClick={() => handleLike(post.id)} className="transition hover:opacity-60">
                          <Heart className={`size-6 ${post.liked_by_me ? "fill-red-500 text-red-500" : ""}`} />
                        </button>
                        <button onClick={() => { toggleComments(post.id); if (!openComments.has(post.id)) setReplyTarget({ postId: post.id, parentId: null }) }} className="transition hover:opacity-60"><MessageCircle className="size-6" /></button>
                        <button className="transition hover:opacity-60"><Send className="size-6" /></button>
                        {!isOwn && (
                          <button onClick={() => handleTip(post.id)} className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 transition hover:bg-amber-500/20 dark:text-amber-400" title="Tip 1 coin">
                            <Coins className="size-3.5" />
                            {post.tips_total > 0 && <span>{post.tips_total}</span>}
                          </button>
                        )}
                        {isOwn && post.tips_total > 0 && (
                          <span className="flex items-center gap-1 text-xs text-amber-500"><Coins className="size-3.5" />{post.tips_total}</span>
                        )}
                      </div>
                      {aiAmount != null && aiAmount > 0 && (
                        <div className="flex items-center gap-1.5">
                          {aiOriginal != null && aiOriginal > 0 && aiOriginal !== aiAmount && <span className="text-xs text-muted-foreground line-through">₹{inr(aiOriginal)}</span>}
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-sm font-bold text-emerald-500 dark:text-emerald-400">₹{inr(aiAmount)}</span>
                          {ai?.confidence != null && <span className="text-[10px] text-muted-foreground/50">{Math.round(ai.confidence * 100)}%</span>}
                        </div>
                      )}
                    </div>

                    <p className="text-sm font-semibold">{fmt(post.likes)} likes</p>

                    <p className="mt-1 text-sm">
                      <Link href={`/profile/${post.profile.handle}`} className="font-semibold hover:underline">{post.profile.handle}</Link>{" "}
                      <span className="text-foreground/80">{post.caption}</span>
                    </p>

                    {aiTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {aiTags.map(t => <span key={t} className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">{t}</span>)}
                        {ai && !ai.error && <span className="flex items-center gap-0.5 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-400"><Sparkles className="size-3" /> AI</span>}
                      </div>
                    )}

                    {ai?.description && <p className="mt-1 text-[11px] text-muted-foreground/50 italic">{ai.description}</p>}

                    <button onClick={() => toggleComments(post.id)} className="mt-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                      {commentsOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      {post.comments > 0 ? `${commentsOpen ? "Hide" : "View all"} ${post.comments} comments` : "Add a comment"}
                    </button>

                    {commentsOpen && (
                      <div className="mt-2 space-y-0">
                        {comments.map(c => (
                          <CommentThread
                            key={c.id}
                            comment={c}
                            depth={0}
                            myHandle={myProfile?.handle ?? ""}
                            onReply={(parentId) => setReplyTarget({ postId: post.id, parentId })}
                            onEdit={handleEditComment}
                          />
                        ))}

                        {replyTarget?.postId === post.id && myProfile && (
                          <div className="mt-2 flex items-center gap-2">
                            <Avatar url={myProfile.avatar_url} name={myProfile.display_name} size={24} />
                            <input
                              value={commentText}
                              onChange={e => setCommentText(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment() } }}
                              placeholder={replyTarget.parentId ? "Write a reply..." : "Add a comment..."}
                              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/30"
                            />
                            {replyTarget.parentId && (
                              <button onClick={() => setReplyTarget({ postId: post.id, parentId: null })} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
                            )}
                            <button onClick={submitComment} disabled={commentSubmitting || !commentText.trim()} className="text-sm font-semibold text-amber-500 disabled:opacity-30">
                              {commentSubmitting ? "..." : "Post"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <button onClick={() => setShowComposer(false)} className="text-muted-foreground transition hover:text-foreground"><X className="size-5" /></button>
              <h2 className="text-sm font-semibold">Create new post</h2>
              <button onClick={() => handleSubmit()} disabled={!caption.trim()} className="text-sm font-semibold text-amber-500 transition hover:text-amber-400 disabled:opacity-40">
                Share
              </button>
            </div>
            <div className="grid md:grid-cols-2">
              <div className="relative flex aspect-square items-center justify-center border-b border-border bg-black/10 dark:bg-black/30 md:border-b-0 md:border-r">
                {previews.length > 0 ? (
                  <div className="relative size-full">
                    <Carousel images={previews} />
                    <label className="absolute bottom-3 right-3 z-10 flex cursor-pointer items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-black/80">
                      <ImagePlus className="size-3.5" /> Add more
                      <input type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) setFiles(prev => [...prev, ...Array.from(e.target.files!)]) }} />
                    </label>
                  </div>
                ) : (
                  <label className="flex size-full cursor-pointer flex-col items-center justify-center gap-3 transition hover:bg-accent/30">
                    <ImagePlus className="size-16 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">Upload bill photos</p>
                    <p className="text-[11px] text-muted-foreground/40">Select multiple for a carousel</p>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) setFiles(Array.from(e.target.files)) }} />
                  </label>
                )}
              </div>
              <div className="flex flex-col gap-3 p-4">
                {myProfile && (
                  <div className="flex items-center gap-2">
                    <Avatar url={myProfile.avatar_url} name={myProfile.display_name} size={28} />
                    <span className="text-sm font-semibold">{myProfile.handle}</span>
                  </div>
                )}
                <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={6} placeholder="Write a caption..."
                  className="flex-1 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/40" />
                <p className="text-[11px] text-muted-foreground/40"><Sparkles className="mr-1 inline size-3" />AI will auto-tag price, category &amp; location from your image</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function Carousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0)
  const count = images.length
  if (count === 0) return null
  if (count === 1) return <img src={images[0]} alt="" className="w-full rounded" />

  return (
    <div className="group/car relative overflow-hidden rounded">
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {images.map((src, i) => (
          <img key={i} src={src} alt="" className="w-full shrink-0 object-cover" />
        ))}
      </div>
      {idx > 0 && (
        <button
          onClick={() => setIdx(idx - 1)}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white opacity-0 transition group-hover/car:opacity-100"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      {idx < count - 1 && (
        <button
          onClick={() => setIdx(idx + 1)}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white opacity-0 transition group-hover/car:opacity-100"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
      <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`size-1.5 rounded-full transition ${i === idx ? "bg-white" : "bg-white/40"}`}
          />
        ))}
      </div>
      <span className="absolute right-3 top-3 z-10 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
        {idx + 1}/{count}
      </span>
    </div>
  )
}


function patchCommentInTree(nodes: CommentNode[], id: number, text: string, editedAt: string): CommentNode[] {
  return nodes.map(n => ({
    ...n,
    text: n.id === id ? text : n.text,
    edited_at: n.id === id ? editedAt : n.edited_at,
    replies: patchCommentInTree(n.replies, id, text, editedAt),
  }))
}


function CommentThread({
  comment, depth, myHandle, onReply, onEdit,
}: {
  comment: CommentNode; depth: number; myHandle: string
  onReply: (parentId: number) => void
  onEdit: (commentId: number, newText: string) => void
}) {
  const [collapsed, setCollapsed] = useState(depth >= 2)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.text)

  const isOwn = comment.profile.handle === myHandle
  const replyCount = countReplies(comment)
  const hasReplies = comment.replies.length > 0

  function saveEdit() {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === comment.text) { setEditing(false); return }
    onEdit(comment.id, trimmed)
    setEditing(false)
  }

  return (
    <div className={depth > 0 ? "ml-5 border-l border-border pl-3" : ""}>
      <div className="flex gap-2 py-1.5">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
          {initials(comment.profile.display_name)}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveEdit() } if (e.key === "Escape") setEditing(false) }}
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-amber-500/50"
                autoFocus
              />
              <button onClick={saveEdit} className="text-xs font-semibold text-amber-500">Save</button>
              <button onClick={() => { setEditing(false); setEditText(comment.text) }} className="text-xs text-muted-foreground">Cancel</button>
            </div>
          ) : (
            <>
              <p className="text-sm">
                <span className="font-semibold">{comment.profile.handle}</span>{" "}
                <span className="text-foreground/80">{comment.text}</span>
                {comment.edited_at && <span className="ml-1 text-[10px] text-muted-foreground/50">(edited)</span>}
              </p>
              <div className="mt-0.5 flex gap-3 text-[11px] text-muted-foreground">
                <span>{timeAgo(comment.created_at)}</span>
                {depth < 4 && <button onClick={() => onReply(comment.id)} className="hover:text-foreground">Reply</button>}
                {isOwn && <button onClick={() => setEditing(true)} className="hover:text-foreground"><Pencil className="inline size-2.5" /> Edit</button>}
              </div>
            </>
          )}
        </div>
      </div>

      {hasReplies && (
        <>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-8 flex items-center gap-1 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
            {collapsed ? `${replyCount} ${replyCount === 1 ? "reply" : "replies"}` : "Hide replies"}
          </button>
          {!collapsed && comment.replies.map(r => (
            <CommentThread key={r.id} comment={r} depth={depth + 1} myHandle={myHandle} onReply={onReply} onEdit={onEdit} />
          ))}
        </>
      )}
    </div>
  )
}
