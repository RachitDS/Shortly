"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowDownLeft, ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, Bell, BookOpen, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Code2, Copy, Download, ExternalLink, Globe, LayoutDashboard, Link2, Loader2, Menu, MoreHorizontal, MousePointer2, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, TrendingUp, X, Zap, Pencil, Archive, RotateCcw } from "lucide-react";

type Link = { id: number; url: string; shortCode: string; title: string; accessCount: number; archived: boolean; createdAt: string; updatedAt: string };
type Activity = { day: string; count: number };
type View = "Overview" | "My links" | "Analytics" | "API & docs" | "Settings";
type Modal = { type: "edit" | "delete" | "stats"; link: Link } | { type: "help" } | null;
const format = (n: number) => new Intl.NumberFormat("en-US").format(n);
const shortDate = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const navItems = [{ label: "Overview", icon: LayoutDashboard }, { label: "My links", icon: Link2 }, { label: "Analytics", icon: BarChart3 }, { label: "API & docs", icon: Code2 }] as const;

async function readJson(response: Response): Promise<{ error?: string; [key: string]: unknown } | null> {
  const body = await response.text();
  if (!body) return null;
  try { return JSON.parse(body); } catch { return null; }
}

export default function Dashboard() {
  const [view, setView] = useState<View>("Overview");
  const [links, setLinks] = useState<Link[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [title, setTitle] = useState("");
  const [customize, setCustomize] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<Link | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [modal, setModal] = useState<Modal>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [modalError, setModalError] = useState("");
  const [toast, setToast] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [period, setPeriod] = useState("30");
  const [workspace, setWorkspace] = useState("My workspace");
  const [autoCopy, setAutoCopy] = useState(false);
  const [origin, setOrigin] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/shorten", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load your links. Please try again.");
      const data = await readJson(response);
      if (!data || !Array.isArray(data.links) || !Array.isArray(data.activity)) throw new Error("The server returned an invalid response. Please try again.");
      setLinks(data.links as Link[]); setActivity(data.activity as Activity[]); setLoadError("");
    } catch (e) { setLoadError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    setOrigin(window.location.origin);
    setWorkspace(localStorage.getItem("shortly-workspace") || "My workspace");
    setAutoCopy(localStorage.getItem("shortly-autocopy") === "true");
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(""), 3500); return () => clearTimeout(id); } }, [toast]);
  useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === "Escape") { setModal(null); setMenu(null); setNotifications(false); setMobileNav(false); } }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);
  useEffect(() => { setPage(1); }, [search, filter, sort]);
  const shortUrl = (link: Link) => `${origin}/s/${link.shortCode}`;
  async function copy(link: Link) {
    try { await navigator.clipboard.writeText(shortUrl(link)); setToast("Short link copied to clipboard"); } catch { setToast("Clipboard unavailable. Copy the URL from the link details."); }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setFormError(""); setCreated(null);
    try {
      const response = await fetch("/shorten", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, shortCode: alias, title: title || undefined }) });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data?.error || "Could not create the short link. Please try again.");
      if (!data || typeof data.shortCode !== "string") throw new Error("The server returned an invalid response. Please try again.");
      const link = data as unknown as Link;
      setCreated(link); setUrl(""); setAlias(""); setTitle(""); setToast("Your short link is ready to share"); if (autoCopy) await copy(link); await refresh();
    } catch (e) { setFormError((e as Error).message); } finally { setBusy(false); }
  }
  function newLink() { setView("Overview"); setMobileNav(false); setTimeout(() => { inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); inputRef.current?.focus({ preventScroll: true }); }, 80); }
  function openModal(type: "edit" | "delete" | "stats", link: Link) { setModal({ type, link }); setEditUrl(link.url); setEditTitle(link.title); setModalError(""); setMenu(null); }
  async function mutate(link: Link, method: string, body?: object) {
    const response = await fetch(`/shorten/${link.shortCode}`, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) { const data = await readJson(response); throw new Error(data?.error || "Could not update the link. Please try again."); }
    await refresh();
  }
  async function saveModal(e: React.FormEvent) {
    e.preventDefault(); if (!modal || modal.type === "help") return;
    setBusy(true); setModalError("");
    try { await mutate(modal.link, modal.type === "delete" ? "DELETE" : "PUT", modal.type === "edit" ? { url: editUrl, title: editTitle } : undefined); setToast(modal.type === "delete" ? "Link permanently deleted" : "Link updated successfully"); setModal(null); } catch (e) { setModalError((e as Error).message); } finally { setBusy(false); }
  }
  async function archive(link: Link) {
    setMenu(null); try { await mutate(link, "PUT", { archived: !link.archived }); setToast(link.archived ? "Link reactivated" : "Link archived. Redirects are now disabled."); } catch (e) { setToast((e as Error).message); }
  }
  function exportLinks() {
    const csv = ["Title,Original URL,Short URL,Clicks,Status,Created", ...links.map(l => [l.title, l.url, shortUrl(l), l.accessCount, l.archived ? "Archived" : "Active", l.createdAt].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const a = document.createElement("a"); const blob = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.href = blob; a.download = "shortly-links.csv"; a.click(); URL.revokeObjectURL(blob); setToast("Your links have been exported");
  }
  const totalClicks = links.reduce((sum, l) => sum + l.accessCount, 0);
  const active = links.filter(l => !l.archived).length;
  const today = new Date().toISOString().slice(0, 10);
  const todayClicks = activity.find(a => a.day === today)?.count || 0;
  const filtered = links.filter(l => (filter === "all" || (filter === "active" ? !l.archived : l.archived)) && `${l.url} ${l.title} ${l.shortCode}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "clicks" ? b.accessCount - a.accessCount : sort === "oldest" ? +new Date(a.createdAt) - +new Date(b.createdAt) : +new Date(b.createdAt) - +new Date(a.createdAt));
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 5, currentPage * 5);
  const chartDays = Array.from({ length: Number(period) }, (_, i) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - (Number(period) - 1 - i)); const day = d.toISOString().slice(0, 10); return { day, count: activity.find(a => a.day === day)?.count || 0 }; });
  const chartMax = Math.max(1, ...chartDays.map(d => d.count));

  return <div className="app-shell">
    {mobileNav && <div className="sidebar-scrim" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <Link className="brand" href="/" aria-label="Shortly home"><span className="brand-symbol"><Link2 size={25} strokeWidth={2.6} /></span>shortly<span className="brand-dot">.</span></Link>
      <button className="workspace-switch" onClick={() => { setView("Settings"); setMobileNav(false); }}><span className="workspace-avatar">W</span><span>{workspace}<small>Personal workspace</small></span><ChevronDown size={15} /></button>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{navItems.map(({ label, icon: Icon }) => <button className={`nav-item ${view === label ? "selected" : ""}`} key={label} onClick={() => { setView(label); setMobileNav(false); setSearch(""); }}><Icon size={19} /><span>{label}</span>{label === "My links" && <span className="nav-count">{links.length}</span>}{label === "API & docs" && <ArrowUpRight className="nav-external" size={15} />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="little-card"><span className="little-card-icon"><Sparkles size={19} /></span><strong>Small links. Big possibilities.</strong><p>One simple link can open<br />a world of opportunities.</p><button onClick={() => setView("API & docs")}>Explore the API <ArrowUpRight size={15} /></button></div>
        <button className={`nav-item ${view === "Settings" ? "selected" : ""}`} onClick={() => setView("Settings")}><Settings size={19} /><span>Settings</span></button>
        <button className="nav-item" onClick={() => setModal({ type: "help" })}><CircleHelp size={19} /><span>Help & support</span><ArrowUpRight size={15} /></button>
        <div className="profile"><span className="profile-avatar">JD</span><div><strong>Jamie Davis</strong><small>Personal account</small></div><span className="free-badge">Free</span></div>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="mobile-toggle icon-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button><span>Workspace</span><ChevronRight size={14} /><strong>{view}</strong></div><div className="topbar-right"><span className="system-status"><i />All systems operational</span><span className="top-divider" /><div className="notification-wrap"><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotifications(!notifications)}><Bell size={19} /><i /></button>{notifications && <div className="notification-panel"><strong>You’re all caught up <CheckCheck size={17} /></strong><p>Your workspace is ready. Create a link to start tracking visits.</p><small>No new notifications</small></div>}</div><button className="top-avatar" onClick={() => setView("Settings")} aria-label="Account settings">JD</button></div></header>
      <main className="main-content">
        <div className="page-heading"><div><div className="eyebrow">YOUR LINKS, SIMPLIFIED</div><h1>{view === "Overview" ? "A little link. A lot of possibility." : view === "My links" ? "All your links, in one place." : view === "Analytics" ? "See the bigger picture." : view === "API & docs" ? "Small API. Endless possibilities." : "Make yourself at home."}</h1><p>{view === "Overview" ? "Shorten, share, and keep track of what connects." : view === "My links" ? "Manage every destination and make every connection count." : view === "Analytics" ? "Real visits. Clear insights. Know how your links are performing." : view === "API & docs" ? "Everything you need to build with the Shortly API." : "A few little details to make this workspace yours."}</p></div><button className="button primary heading-create" onClick={newLink}><Plus size={17} />Create a link</button></div>

        {(view === "Overview" || view === "Analytics") && <div className="metrics-grid">
          {[{ title: "Total links", value: links.length, icon: Link2, note: "All your links in one place", type: "links" }, { title: "Total clicks", value: totalClicks, icon: MousePointer2, note: "Connections made, and counting", type: "clicks" }, { title: "Active links", value: active, icon: Zap, note: "Ready to take people places", type: "active" }, { title: "Clicks today", value: todayClicks, icon: TrendingUp, note: "A fresh day of possibilities", type: "today" }].map(({ title, value, icon: Icon, note, type }) => <section className="metric-card" key={title}><div className="metric-label">{title}<span className={`metric-icon ${type}`}><Icon size={17} /></span></div><div className="metric-value">{loading ? "—" : format(value)}<svg viewBox="0 0 95 33" className="sparkline" aria-hidden="true"><path d={value > 0 && type === "links" ? "M2 29 L17 29 L17 22 L33 22 L33 25 L48 25 L48 16 L64 16 L64 10 L80 10 L93 3" : value > 0 && type === "active" ? "M2 28 L18 24 L29 27 L43 17 L54 20 L70 11 L80 15 L93 5" : "M2 26 L93 26"} /></svg></div><div className="metric-note"><span className="tiny-dot" />{note}</div></section>)}
        </div>}

        {view === "Overview" && <section className="create-section" id="create-link"><div className="create-form-panel"><div className="section-title"><span className="title-icon"><Link2 size={20} /></span><h2>Make your next connection</h2><span className="subtle-badge">SHORTEN A LINK</span></div><p className="section-description">Long URL? Let’s make it short, sweet, and shareable.</p><form onSubmit={create}><label className="field-label" htmlFor="destination">Destination URL</label><div className="url-input-row"><div className="url-input-wrap"><Link2 size={18} /><input ref={inputRef} id="destination" type="url" required maxLength={4096} placeholder="Paste your long link here..." value={url} onChange={e => setUrl(e.target.value)} /></div><button className="button primary shorten-button" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}Shorten link<ArrowRight size={16} /></button></div><div className="form-bottom"><button type="button" className={`text-button customize ${customize ? "is-open" : ""}`} onClick={() => setCustomize(!customize)}><SlidersHorizontal size={14} />Customize your link <ChevronDown size={13} /></button><span><ShieldCheck size={13} />Secure, reliable, and always yours.</span></div>{customize && <div className="custom-fields"><label>Link title <span>(optional)</span><input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} placeholder="e.g. My portfolio" /></label><label>Custom alias <span>(optional)</span><input value={alias} maxLength={32} onChange={e => setAlias(e.target.value)} placeholder="e.g. my-portfolio" pattern="[a-zA-Z0-9_-]{3,32}" /></label></div>}{formError && <p className="error-message" role="alert">{formError}</p>}{created && <div className="created-link"><Check size={17} /><a href={`/s/${created.shortCode}`} target="_blank" rel="noreferrer">{shortUrl(created)}</a><button type="button" className="text-button" onClick={() => copy(created)}><Copy size={15} />Copy</button></div>}</form></div><div className="create-art"><span className="art-star star-one">✳</span><span className="art-star star-two">✧</span><span className="art-dot" /><div className="chain-art"><div className="chain-loop loop-back" /><div className="chain-loop loop-front" /></div><span className="art-dash" /><p>Less length.<br /><strong>More impact.</strong></p><svg className="art-arrow" viewBox="0 0 70 50"><path d="M4 5 C20 44 56 40 59 16 M49 22 L60 13 L65 27" /></svg></div></section>}

        {(view === "Overview" || view === "My links") && <section className="links-section"><div className="links-heading"><div><h2>{view === "Overview" ? "Your links" : "Link library"}<span className="number-badge">{links.length}</span></h2><p>A small link for everything you share.</p></div><button className="button secondary export-button" onClick={exportLinks} disabled={!links.length}><ArrowDownToLine size={15} />Export <span className="hide-small">links</span></button></div><div className="table-card"><div className="table-toolbar"><div className="filter-tabs">{["all", "active", "archived"].map(f => <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f === "all" ? "All links" : f[0].toUpperCase() + f.slice(1)}{f === "all" && <span>{links.length}</span>}</button>)}</div><div className="table-tools"><div className="search-box"><Search size={16} /><input aria-label="Search links" placeholder="Search your links..." value={search} onChange={e => setSearch(e.target.value)} />{search && <button className="icon-button" onClick={() => setSearch("")} aria-label="Clear search"><X size={13} /></button>}</div><div className="sort-select"><SlidersHorizontal size={14} /><select aria-label="Sort links" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="clicks">Most clicks</option></select><ChevronDown size={12} /></div></div></div>
          <div className="table-scroll"><table><thead><tr><th className="link-column">Link <ArrowDown size={12} /></th><th>Short link</th><th className="clicks-column">Clicks</th><th>Status</th><th>Created</th><th className="actions-column"><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map((link, i) => <tr key={link.id}><td><div className="destination-cell"><div className={`site-icon site-${i % 5}`}>{getSiteIcon(link.url)}</div><div><button className="link-title" onClick={() => openModal("stats", link)}>{link.title}</button><a className="original-url" href={link.url} target="_blank" rel="noreferrer">{link.url.replace(/^https?:\/\//, "")}</a></div></div></td><td><div className="short-link-cell"><a href={`/s/${link.shortCode}`} target="_blank" rel="noreferrer" title={shortUrl(link)}>shortly / {link.shortCode}</a><button className="icon-button copy-button" onClick={() => copy(link)} aria-label={`Copy ${link.title}`}><Copy size={14} /></button></div></td><td><button className="clicks-cell" onClick={() => openModal("stats", link)}><BarChart3 size={14} />{format(link.accessCount)}</button></td><td><span className={`status-badge ${link.archived ? "archived" : ""}`}><i />{link.archived ? "Archived" : "Active"}</span></td><td className="date-cell">{shortDate(link.createdAt)}</td><td><div className="row-actions"><button className="icon-button external-button" aria-label={`Open ${link.title}`} onClick={() => window.open(`/s/${link.shortCode}`, "_blank", "noopener,noreferrer")}><ArrowUpRight size={16} /></button><button className="icon-button" onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setMenuPosition({ top: Math.min(rect.bottom + 5, window.innerHeight - 190), right: window.innerWidth - rect.right }); setMenu(menu === link.id ? null : link.id); }} aria-label={`Actions for ${link.title}`}><MoreHorizontal size={18} /></button>{menu === link.id && <><div className="menu-backdrop" onClick={() => setMenu(null)} /><div className="action-menu" style={{ position: "fixed", top: menuPosition.top, right: menuPosition.right }}><button onClick={() => openModal("stats", link)}><BarChart3 size={15} />View statistics</button><button onClick={() => openModal("edit", link)}><Pencil size={15} />Edit link</button><button onClick={() => archive(link)}>{link.archived ? <RotateCcw size={15} /> : <Archive size={15} />}{link.archived ? "Reactivate link" : "Archive link"}</button><button className="danger-text" onClick={() => openModal("delete", link)}><Trash2 size={15} />Delete link</button></div></>}</div></td></tr>)}</tbody></table></div>
          {loading && <div className="empty-state"><Loader2 className="spin" size={25} /><p>Gathering your links…</p></div>}{!loading && loadError && <div className="empty-state"><CircleHelp size={26} /><p>{loadError}</p><button className="button secondary" onClick={() => { setLoading(true); refresh(); }}>Try again</button></div>}{!loading && !loadError && visible.length === 0 && <div className="empty-state"><span className="empty-icon"><Link2 size={25} /></span><h3>{search || filter !== "all" ? "No matching links" : "Your next connection starts here"}</h3><p>{search || filter !== "all" ? "Try a different search or filter." : "Paste a URL above to create your first short link."}</p><button className="button secondary" onClick={search || filter !== "all" ? () => { setSearch(""); setFilter("all"); } : newLink}>{search || filter !== "all" ? "Clear filters" : "Create your first link"}<ArrowRight size={14} /></button></div>}
          <div className="table-footer"><span>Showing <strong>{filtered.length ? (currentPage - 1) * 5 + 1 : 0}–{Math.min(currentPage * 5, filtered.length)}</strong> of <strong>{filtered.length}</strong> links</span><div className="pagination"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>{Array.from({ length: pages }, (_, i) => i + 1).filter(p => p === 1 || p === pages || Math.abs(p - currentPage) < 2).map((p, i, a) => <span key={p}>{i > 0 && p - a[i - 1] > 1 && <span className="page-ellipsis">…</span>}<button className={p === currentPage ? "current" : ""} onClick={() => setPage(p)}>{p}</button></span>)}<button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} aria-label="Next page"><ChevronRight size={15} /></button></div></div>
        </div><div className="below-table"><span><ShieldCheck size={14} />Your links are safe and always in your control.</span><button className="text-button" onClick={() => setView("API & docs")}>Built for sharing. Designed for you. <ArrowUpRight size={13} /></button></div></section>}

        {view === "Analytics" && <><section className="panel analytics-panel"><div className="panel-heading"><div><h2>Clicks over time</h2><p>Tracked visits across all your links · UTC</p></div><select className="standard-select" value={period} onChange={e => setPeriod(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></div><div className="chart-summary"><strong>{format(chartDays.reduce((s, d) => s + d.count, 0))}</strong><span>clicks in this period</span></div><div className="chart"><div className="chart-grid"><span>{chartMax}</span><span>{Math.round(chartMax / 2)}</span><span>0</span></div><div className="chart-bars">{chartDays.map(d => <div key={d.day} className="bar-track" title={`${d.day}: ${d.count} clicks`}><div style={{ height: `${Math.max(1, d.count / chartMax * 100)}%` }} /></div>)}</div></div><div className="chart-labels"><span>{shortDate(chartDays[0].day)}</span><span>{shortDate(today)}</span></div>{!totalClicks && <p className="chart-note">Share a short link to see your first click appear here.</p>}</section><section className="panel top-links"><h2>Top performing links</h2><p>Your most visited destinations, ranked by lifetime clicks.</p>{[...links].sort((a, b) => b.accessCount - a.accessCount).slice(0, 5).map((l, i) => <button className="top-link-row" key={l.id} onClick={() => openModal("stats", l)}><span className="rank">0{i + 1}</span><span><strong>{l.title}</strong><small>/s/{l.shortCode}</small></span><b>{format(l.accessCount)} <small>clicks</small></b><ArrowUpRight size={16} /></button>)}{!links.length && <div className="empty-state"><p>No links yet. Create one to start measuring.</p><button className="button primary" onClick={newLink}>Create a link</button></div>}</section></>}

        {view === "API & docs" && <div className="docs-layout"><section className="panel docs-panel"><span className="docs-tag"><Code2 size={15} />REST API · v1</span><h2>A simple API for every connection.</h2><p>Create, manage, and measure short links with JSON requests. No API key is required for this personal project.</p><div className="docs-notice"><ShieldCheck size={18} /><span>This is a single-workspace demo. Add authentication and rate limiting before deploying it as a public multi-user service.</span></div><h3>Base URL</h3><code className="code-block">{origin || "http://localhost:3000"}</code><h3>Endpoints</h3>{[{ method: "POST", path: "/shorten", description: "Create a short link. Returns 201 Created." }, { method: "GET", path: "/shorten", description: "List links and daily access activity." }, { method: "GET", path: "/shorten/{code}", description: "Retrieve a destination and increment its access count." }, { method: "PUT", path: "/shorten/{code}", description: "Update the URL, title, or archived state." }, { method: "DELETE", path: "/shorten/{code}", description: "Permanently delete a link. Returns 204 No Content." }, { method: "GET", path: "/shorten/{code}/stats", description: "Get link statistics without incrementing the count." }, { method: "GET", path: "/s/{code}", description: "Track a visit and redirect to the destination (302)." }].map(ep => <div className="endpoint" key={ep.method + ep.path}><div><span className={`method method-${ep.method.toLowerCase()}`}>{ep.method}</span><code>{ep.path}</code></div><p>{ep.description}</p></div>)}<h3>Create your first link</h3><pre className="code-block">{`curl -X POST '${origin || "http://localhost:3000"}/shorten' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"url":"https://example.com/a-long-url",\n       "title":"My first link"}'`}</pre><h3>Validation & errors</h3><p>Use a complete HTTP(S) URL. Optional aliases accept 3–32 letters, numbers, hyphens, or underscores. Invalid requests return 400, missing links return 404, and duplicate aliases return 409. Errors use <code>{'{"error":"Description"}'}</code>.</p></section><aside className="docs-side panel"><BookOpen size={25} /><h3>Take the whole project.</h3><p>Source code, database schema, setup guide, and API tests. Everything you need to run Shortly on your own machine.</p><a className="button primary" href="/downloads/shortly-source.zip" download><Download size={16} />Download project ZIP</a><a className="text-button roadmap-link" href="https://roadmap.sh/projects/url-shortening-service" target="_blank" rel="noreferrer">View project brief <ArrowUpRight size={14} /></a><div className="stack-list"><span>Next.js App Router</span><span>TypeScript & React</span><span>PostgreSQL & Drizzle ORM</span><span>Tailwind CSS & Lucide</span></div></aside></div>}

        {view === "Settings" && <section className="panel settings-panel"><h2>Workspace settings</h2><p>A personal space for your links. Preferences are saved in this browser.</p><form onSubmit={e => { e.preventDefault(); localStorage.setItem("shortly-workspace", workspace.trim() || "My workspace"); setWorkspace(workspace.trim() || "My workspace"); localStorage.setItem("shortly-autocopy", String(autoCopy)); setToast("Workspace preferences saved"); }}><label className="settings-label">Workspace name<input required maxLength={30} value={workspace} onChange={e => setWorkspace(e.target.value)} /></label><div className="setting-row"><div><strong>Copy new links automatically</strong><p>Put each new short link on your clipboard.</p></div><button type="button" role="switch" aria-checked={autoCopy} aria-label="Automatically copy new links" className={`toggle ${autoCopy ? "on" : ""}`} onClick={() => setAutoCopy(!autoCopy)}><span /></button></div><div className="setting-row"><div><strong>Default short-link domain</strong><p>Links use the domain where Shortly is running.</p></div><code>{origin.replace(/^https?:\/\//, "")}</code></div><button className="button primary" type="submit"><Check size={16} />Save preferences</button></form><div className="settings-download"><div><h3>Your project, your way.</h3><p>Download the complete source and run your own instance.</p></div><a href="/downloads/shortly-source.zip" download className="button secondary"><Download size={16} />Download ZIP</a></div></section>}

        {view === "Overview" && <div className="tip-banner"><span className="tip-icon"><Sparkles size={18} /></span><p><strong>A little tip</strong> A memorable custom link goes a long way. Make your next one uniquely yours.</p><button className="text-button" onClick={() => { setCustomize(true); newLink(); }}>Give it a try <ArrowRight size={15} /></button></div>}
        <footer className="page-footer"><span>© {new Date().getFullYear()} Shortly. Good things come in small links.</span><div><span className="footer-dot" />Made to connect <Link2 size={13} /></div></footer>
      </main>
    </div>
    {toast && <div className="toast" role="status"><span><Check size={16} /></span>{toast}<button aria-label="Dismiss notification" onClick={() => setToast("")}><X size={15} /></button></div>}
    {modal && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !busy) setModal(null); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close icon-button" aria-label="Close dialog" onClick={() => setModal(null)}><X size={20} /></button>{modal.type === "help" ? <><span className="modal-icon"><CircleHelp size={25} /></span><h2 id="modal-title">A little help, whenever you need it.</h2><p>Shortly makes your long links easy to share.</p><div className="help-item"><strong>1. Create a link</strong><p>Paste a full URL into the destination field. Add a title or a custom alias to make it yours.</p></div><div className="help-item"><strong>2. Share it anywhere</strong><p>Use the copy button next to your short link. Each visit redirects to the destination and records a click.</p></div><div className="help-item"><strong>3. Keep an eye on it</strong><p>Open Analytics for daily visits, or use a link’s menu to edit, archive, and delete it.</p></div><button className="button primary" onClick={() => { setModal(null); setView("API & docs"); }}>Read the API guide <ArrowRight size={16} /></button></> : modal.type === "stats" ? <><span className="modal-icon"><BarChart3 size={25} /></span><h2 id="modal-title">Link insights</h2><p>{modal.link.title}</p><div className="detail-stat"><strong>{format(modal.link.accessCount)}</strong><span>Total clicks</span><span className={`status-badge ${modal.link.archived ? "archived" : ""}`}><i />{modal.link.archived ? "Archived" : "Active"}</span></div><label className="field-label">Your short link</label><div className="detail-url"><input aria-label="Short URL" readOnly value={shortUrl(modal.link)} /><button className="icon-button" onClick={() => copy(modal.link)} aria-label="Copy short link"><Copy size={17} /></button></div><div className="detail-destination"><span>Destination</span><a href={modal.link.url} target="_blank" rel="noreferrer">{modal.link.url}<ExternalLink size={14} /></a></div><div className="detail-dates"><span>Created <strong>{shortDate(modal.link.createdAt)}</strong></span><span>Updated <strong>{shortDate(modal.link.updatedAt)}</strong></span></div><button className="button secondary" onClick={() => openModal("edit", modal.link)}><Pencil size={15} />Edit link</button></> : <form onSubmit={saveModal}><span className={`modal-icon ${modal.type === "delete" ? "danger-icon" : ""}`}>{modal.type === "delete" ? <Trash2 size={25} /> : <Pencil size={25} />}</span><h2 id="modal-title">{modal.type === "delete" ? "Delete this link?" : "A new destination. Same little link."}</h2><p>{modal.type === "delete" ? `“${modal.link.title}” and its click history will be permanently deleted. This cannot be undone.` : "Update the details without changing the short link you’ve shared."}</p>{modal.type === "edit" && <div className="modal-fields"><label>Link title<input autoFocus required maxLength={120} value={editTitle} onChange={e => setEditTitle(e.target.value)} /></label><label>Destination URL<input type="url" required maxLength={4096} value={editUrl} onChange={e => setEditUrl(e.target.value)} /></label></div>}{modalError && <p className="error-message" role="alert">{modalError}</p>}<div className="modal-buttons"><button type="button" className="button secondary" disabled={busy} onClick={() => setModal(null)}>Cancel</button><button className={`button ${modal.type === "delete" ? "danger" : "primary"}`} disabled={busy}>{busy && <Loader2 className="spin" size={16} />}{modal.type === "delete" ? "Delete link" : "Save changes"}</button></div></form>}</section></div>}
  </div>;
}

function getSiteIcon(url: string) {
  const host = new URL(url).hostname;
  if (host.includes("github")) return <Code2 size={20} />;
  if (host.includes("figma")) return <span className="figma-mark"><i /><i /><i /><i /><i /></span>;
  if (host.includes("notion")) return <span className="notion-mark">N</span>;
  if (host.includes("youtube")) return <span className="youtube-mark">▶</span>;
  if (host.includes("spotify")) return <span className="spotify-mark">≋</span>;
  if (host.includes("roadmap")) return <ArrowDownLeft size={21} />;
  return <Globe size={20} />;
}
