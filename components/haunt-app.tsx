"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Archive, Bell, CalendarDays, Check, CheckCheck, ChevronDown, ChevronRight,
  CircleDollarSign, Clock3, CloudMoon, Ghost, House, Plus, Search,
  Settings2, Shield, Sparkles, SunMoon, Volume2, VolumeX, WandSparkles, X,
  AlertTriangle, ArrowUpRight, MoreHorizontal, CalendarClock, FileText, Mic,
  Paperclip, Moon, RotateCcw, Trash2, Pencil, CheckCircle2, LockKeyhole,
  SlidersHorizontal, Download, Menu,
} from "lucide-react";
import type { Commitment, CommitmentCategory, Recurrence, ViewId } from "@/lib/types";
import { dayDiff, formatDate, isSameDay, money, relativeDue } from "@/lib/date-utils";
import { initialCommitments, SETTINGS_KEY, STORAGE_KEY } from "@/lib/seed";
import { parseCapture } from "@/lib/capture";

type Settings = { ambience: boolean; effects: boolean; volume: number; reduceMotion: boolean; currency: string };
const defaultSettings: Settings = { ambience: false, effects: false, volume: 24, reduceMotion: false, currency: "ZAR" };
const categoryLabels: Record<CommitmentCategory, string> = {
  payment: "Payment", subscription: "Subscription", appointment: "Appointment", renewal: "Renewal", household: "Household", work: "Work", personal: "Personal",
};
const navItems: { id: ViewId; label: string; subtitle: string; icon: typeof House }[] = [
  { id: "today", label: "The Hall", subtitle: "Today", icon: House },
  { id: "archive", label: "The Archive", subtitle: "All commitments", icon: Archive },
  { id: "clocktower", label: "The Clocktower", subtitle: "Recurring", icon: Clock3 },
  { id: "crypt", label: "The Crypt", subtitle: "Completed", icon: CheckCheck },
  { id: "keeper", label: "Keeper's Room", subtitle: "Preferences", icon: Settings2 },
];

function uid() { return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function localDateValue(value?: string) {
  const date = value ? new Date(value) : new Date(Date.now() + 86_400_000);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
function classNames(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(" "); }

function useHauntSound(settings: Settings) {
  const contextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const ensureContext = useCallback(() => {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!contextRef.current) contextRef.current = new AudioContextCtor();
    if (contextRef.current.state === "suspended") void contextRef.current.resume();
    return contextRef.current;
  }, []);
  const stopAmbience = useCallback(() => {
    if (gainRef.current && contextRef.current) {
      const gain = gainRef.current;
      gain.gain.cancelScheduledValues(contextRef.current.currentTime);
      gain.gain.setTargetAtTime(0, contextRef.current.currentTime, 0.35);
      window.setTimeout(() => { try { oscillatorRef.current?.stop(); } catch { /* already stopped */ } oscillatorRef.current = null; gainRef.current = null; }, 1300);
    }
  }, []);
  useEffect(() => {
    if (!settings.ambience) { stopAmbience(); return; }
    const context = ensureContext();
    if (!context || oscillatorRef.current) return;
    const oscillator = context.createOscillator();
    const sub = context.createOscillator();
    const gain = context.createGain();
    const subGain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 48;
    sub.type = "triangle";
    sub.frequency.value = 53;
    gain.gain.value = Math.max(0.001, settings.volume / 1000);
    subGain.gain.value = 0.004;
    oscillator.connect(gain).connect(context.destination);
    sub.connect(subGain).connect(context.destination);
    oscillator.start(); sub.start();
    oscillatorRef.current = oscillator; gainRef.current = gain;
    return () => { try { oscillator.stop(); sub.stop(); } catch { /* ignored */ } oscillatorRef.current = null; gainRef.current = null; };
  }, [settings.ambience, settings.volume, ensureContext, stopAmbience]);
  const chime = useCallback((kind: "complete" | "add" | "warning" = "add") => {
    if (!settings.effects) return;
    const context = ensureContext();
    if (!context) return;
    const frequencies = kind === "complete" ? [523.25, 659.25, 783.99] : kind === "warning" ? [110, 103.83] : [392, 523.25];
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "warning" ? "sine" : "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.08);
      gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.015, settings.volume / 3000), context.currentTime + index * 0.08 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.08 + (kind === "warning" ? 0.55 : 0.32));
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + index * 0.08);
      oscillator.stop(context.currentTime + index * 0.08 + 0.62);
    });
  }, [ensureContext, settings.effects, settings.volume]);
  return { chime };
}

export default function HauntApp() {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [view, setView] = useState<ViewId>("today");
  const [hydrated, setHydrated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Commitment | null>(null);
  const [quickText, setQuickText] = useState("");
  const [proposal, setProposal] = useState<ReturnType<typeof parseCapture> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { chime } = useHauntSound(settings);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setCommitments(saved ? JSON.parse(saved) as Commitment[] : initialCommitments);
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) setSettings({ ...defaultSettings, ...(JSON.parse(savedSettings) as Partial<Settings>) });
    } catch {
      setCommitments(initialCommitments);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commitments));
  }, [commitments, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.dataset.reduceMotion = settings.reduceMotion ? "true" : "false";
  }, [settings, hydrated]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const active = useMemo(() => commitments.filter((item) => item.status === "pending"), [commitments]);
  const overdue = useMemo(() => active.filter((item) => dayDiff(item.dueAt) < 0).sort((a, b) => a.dueAt.localeCompare(b.dueAt)), [active]);
  const dueToday = useMemo(() => active.filter((item) => isSameDay(item.dueAt, new Date())).sort((a, b) => a.dueAt.localeCompare(b.dueAt)), [active]);
  const upcoming = useMemo(() => active.filter((item) => dayDiff(item.dueAt) > 0 && dayDiff(item.dueAt) <= 7).sort((a, b) => a.dueAt.localeCompare(b.dueAt)), [active]);
  const completed = useMemo(() => commitments.filter((item) => item.status === "completed").sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")), [commitments]);
  const recurring = useMemo(() => active.filter((item) => item.recurrence !== "none").sort((a, b) => a.dueAt.localeCompare(b.dueAt)), [active]);
  const upcomingTotal = useMemo(() => upcoming.reduce((total, item) => total + (item.amount ?? 0), 0), [upcoming]);
  const restlessCount = overdue.length;
  const currentNav = navItems.find((item) => item.id === view) ?? navItems[0];
  const filtered = useMemo(() => {
    const source = view === "crypt" ? completed : view === "clocktower" ? recurring : active;
    if (!searchText.trim()) return source;
    const needle = searchText.toLowerCase();
    return source.filter((item) => `${item.title} ${item.description} ${categoryLabels[item.category]}`.toLowerCase().includes(needle));
  }, [active, completed, recurring, searchText, view]);

  function notify(message: string) { setToast(message); }
  function updateSettings(patch: Partial<Settings>) { setSettings((current) => ({ ...current, ...patch })); }
  function openCreate() { setEditing(null); setProposal(null); setModalOpen(true); }
  function openEdit(item: Commitment) { setEditing(item); setProposal(null); setModalOpen(true); }
  function navigate(next: ViewId) { setView(next); setSearchText(""); setMobileNavOpen(false); }

  function saveCommitment(data: Omit<Commitment, "id" | "createdAt" | "status" | "source"> & { source?: Commitment["source"] }) {
    if (editing) {
      setCommitments((items) => items.map((item) => item.id === editing.id ? { ...item, ...data } : item));
      notify("The record has been rewritten.");
    } else {
      const item: Commitment = { ...data, id: uid(), createdAt: new Date().toISOString(), status: "pending", source: data.source ?? "manual" };
      setCommitments((items) => [item, ...items]);
      chime("add");
      notify("A new commitment has entered the house.");
    }
    setModalOpen(false); setEditing(null); setProposal(null); setQuickText("");
  }

  function completeCommitment(item: Commitment) {
    setCommitments((items) => items.map((entry) => entry.id === item.id ? { ...entry, status: "completed", completedAt: new Date().toISOString() } : entry));
    chime("complete");
    notify("Laid to rest. Well done.");
  }
  function restoreCommitment(item: Commitment) {
    setCommitments((items) => items.map((entry) => entry.id === item.id ? { ...entry, status: "pending", completedAt: undefined } : entry));
    notify("The commitment has returned to the living.");
  }
  function deleteCommitment(item: Commitment) {
    if (!window.confirm(`Permanently remove “${item.title}”?`)) return;
    setCommitments((items) => items.filter((entry) => entry.id !== item.id));
    notify("The record has been destroyed.");
  }
  function handleQuickCapture() {
    if (!quickText.trim()) return;
    const parsed = parseCapture(quickText);
    setProposal(parsed);
    setEditing(null);
    setModalOpen(true);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), commitments, settings }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `the-haunt-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
    notify("Your ledger has been exported.");
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <aside className={classNames("sidebar", mobileNavOpen && "sidebar-open")}>
        <div className="brand-lockup">
          <div className="brand-mark"><Ghost size={21} strokeWidth={1.5} /></div>
          <div><div className="brand-name">THE HAUNT<span>™</span></div><div className="brand-caption">PERSONAL LEDGER OF THE LIVING</div></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={17}/></button>
        </div>
        <div className="sidebar-rule"><span>YOUR HOUSE</span><i /></div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={classNames("nav-item", view === item.id && "nav-item-active")} onClick={() => navigate(item.id)}>
              <Icon size={17} strokeWidth={1.7}/><span>{item.label}</span>
              {item.id === "today" && restlessCount > 0 && <em className="nav-count">{restlessCount}</em>}
            </button>;
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="house-status-card">
          <div className="status-top"><span className="status-dot"/><span>HOUSE STATUS</span><span className="status-live">LIVE</span></div>
          <div className="status-title">{restlessCount === 0 ? "Quiet... for now." : `${restlessCount} restless ${restlessCount === 1 ? "spirit" : "spirits"}.`}</div>
          <div className="status-description">{restlessCount === 0 ? "Nothing overdue. Keep it that way." : "Some commitments are waiting to be laid to rest."}</div>
          <div className="status-meter"><span style={{ width: `${Math.min(100, restlessCount * 22)}%` }}/></div>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-user-avatar">K</div>
          <div className="sidebar-user-text"><strong>The Keeper</strong><span>Local sanctuary</span></div>
          <button className="icon-button tiny" onClick={() => navigate("keeper")} aria-label="Open settings"><Settings2 size={16}/></button>
        </div>
      </aside>
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <section className="main-column">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={19}/></button>
          <div className="breadcrumb"><span>THE HAUNT</span><ChevronRight size={13}/><strong>{currentNav.label.toUpperCase()}</strong></div>
          <div className="topbar-actions">
            <button className="topbar-search" onClick={() => setSearchOpen((open) => !open)}><Search size={15}/><span>Search the house</span><kbd>⌘ K</kbd></button>
            <button className="icon-button sound-button" onClick={() => updateSettings({ effects: !settings.effects })} aria-label={settings.effects ? "Mute sound effects" : "Enable sound effects"} title="Sound effects"><span className={classNames("sound-indicator", settings.effects && "sound-indicator-on")}/>{settings.effects ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button>
            <div className="topbar-avatar">K</div>
          </div>
        </header>

        {searchOpen && <div className="search-popover"><Search size={16}/><input autoFocus value={searchText} onChange={(event) => { setSearchText(event.target.value); if (view === "today") setView("archive"); }} placeholder="Search commitments, notes, categories..."/><button className="icon-button tiny" onClick={() => { setSearchOpen(false); setSearchText(""); }}><X size={15}/></button></div>}

        <div className="page-content">
          {view === "today" && <>
            <section className="hero-panel">
              <div className="hero-copy">
                <div className="eyebrow"><span className="eyebrow-line"/> {new Intl.DateTimeFormat("en-ZA", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date()).toUpperCase()} <span className="eyebrow-line"/></div>
                <h1>The house<br/><em>remembers</em><br/>everything<span className="title-period">.</span></h1>
                <p className="hero-subtitle">Good evening, Keeper. There are a few loose ends<br className="desktop-only"/> wandering the halls tonight.</p>
                <button className="hero-cta" onClick={openCreate}><Plus size={15}/> Capture a commitment <span>↗</span></button>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="moon-halo"><div className="moon-disc"/></div>
                <div className="hero-fog hero-fog-a"/><div className="hero-fog hero-fog-b"/>
                <div className="manor-frame"><div className="manor-spotlight"/><img src="/haunted-manor.svg" alt="" className="manor-image"/></div>
                <div className="hero-silhouette"/>
                <div className="firefly firefly-one"/><div className="firefly firefly-two"/><div className="firefly firefly-three"/>
              </div>
              <div className="hero-bottom-note"><Moon size={12}/> THE VEIL IS THIN TONIGHT <span>·</span> YOUR LEDGER IS OPEN</div>
            </section>

            <section className="stat-grid" aria-label="Commitment overview">
              <StatCard label="ACTIVE COMMITMENTS" value={String(active.length).padStart(2, "0")} note="Still in the realm" icon={<Archive size={16}/>} />
              <StatCard label="RESTLESS" value={String(overdue.length).padStart(2, "0")} note="Past their due date" icon={<Ghost size={17}/>} warning={overdue.length > 0}/>
              <StatCard label="NEXT 7 DAYS" value={String(upcoming.length + dueToday.length).padStart(2, "0")} note="Approaching the threshold" icon={<CalendarClock size={16}/>} />
              <StatCard label="UPCOMING TOTAL" value={money(upcomingTotal, settings.currency)} note="Known amounts · next 7 days" icon={<CircleDollarSign size={16}/>} compact />
            </section>

            <section className="content-grid">
              <div className="content-main">
                <div className="section-heading"><div><div className="eyebrow-small">THE PRESENT</div><h2>Needs your attention<span>.</span></h2></div><button className="text-link" onClick={() => navigate("archive")}>View all <ArrowUpRight size={14}/></button></div>
                <div className="commitment-list">
                  {dueToday.length === 0 ? <EmptyState title="The hall is quiet." text="Nothing is due today. The house is almost peaceful." onAction={openCreate}/> : dueToday.map((item) => <CommitmentRow key={item.id} item={item} onComplete={completeCommitment} onEdit={openEdit} onDelete={deleteCommitment} onRestore={restoreCommitment}/>) }
                </div>
                {overdue.length > 0 && <div className="restless-section"><div className="section-heading compact-heading"><div><div className="eyebrow-small warning-text"><span className="pulse-dot"/> THE RESTLESS</div><h2>Still waiting<span>.</span></h2></div><span className="count-chip count-chip-danger">{overdue.length} overdue</span></div><div className="commitment-list">{overdue.slice(0, 3).map((item) => <CommitmentRow key={item.id} item={item} onComplete={completeCommitment} onEdit={openEdit} onDelete={deleteCommitment} onRestore={restoreCommitment} overdue/>)}</div></div>}
                <div className="section-heading upcoming-heading"><div><div className="eyebrow-small">ON THE HORIZON</div><h2>Approaching<span>.</span></h2></div><button className="text-link" onClick={() => navigate("archive")}>Full archive <ArrowUpRight size={14}/></button></div>
                <div className="commitment-list">{upcoming.length === 0 ? <EmptyState title="Nothing approaching." text="Add a future commitment and it will appear here." onAction={openCreate}/> : upcoming.slice(0, 4).map((item) => <CommitmentRow key={item.id} item={item} onComplete={completeCommitment} onEdit={openEdit} onDelete={deleteCommitment} onRestore={restoreCommitment}/>)}</div>
              </div>
              <aside className="content-aside">
                <div className="capture-card">
                  <div className="capture-card-top"><span className="mini-seal"><WandSparkles size={15}/></span><span>THE SÉANCE ROOM</span><span className="capture-status">OPEN</span></div>
                  <h3>Something on<br/>your mind?</h3>
                  <p>Speak it, write it, leave it here. We'll help you remember.</p>
                  <div className="capture-input-wrap"><textarea value={quickText} onChange={(event) => setQuickText(event.target.value)} placeholder={'“Fibre is due on the 25th every month...”'} rows={3}/><div className="capture-input-footer"><span><Sparkles size={12}/> QUICK CAPTURE</span><button onClick={handleQuickCapture} disabled={!quickText.trim()} aria-label="Interpret quick capture"><ArrowUpRight size={16}/></button></div></div>
                  <div className="capture-methods"><span><FileText size={13}/> Paste text</span><span><Mic size={13}/> Voice soon</span><span><Paperclip size={13}/> Files soon</span></div>
                </div>
                <div className="moon-card"><div className="moon-card-top"><span>THE NIGHT WATCH</span><CloudMoon size={16}/></div><div className="moon-phase"><div className="phase-moon"/><div><strong>{new Intl.DateTimeFormat("en", { weekday: "long" }).format(new Date())}</strong><span>THE HOUSE IS {restlessCount === 0 ? "AT REST" : "RESTLESS"}</span></div></div><div className="moon-card-rule"/><div className="moon-card-bottom"><span>Next commitment</span><strong>{[...active].sort((a,b) => a.dueAt.localeCompare(b.dueAt))[0] ? relativeDue([...active].sort((a,b) => a.dueAt.localeCompare(b.dueAt))[0].dueAt) : "None in sight"}</strong></div></div>
                <div className="whisper-card"><div className="whisper-mark">“</div><p>What is remembered<br/>cannot return to haunt you.</p><span>— A NOTE FROM THE HOUSE</span></div>
              </aside>
            </section>
          </>}

          {view !== "today" && <>
            <section className="inner-page-heading"><div className="eyebrow"><span className="eyebrow-line"/> THE HOUSE / {currentNav.label.toUpperCase()}</div><div className="inner-heading-row"><div><h1>{view === "archive" ? <>The <em>Archive</em></> : view === "clocktower" ? <>The <em>Clocktower</em></> : view === "crypt" ? <>The <em>Crypt</em></> : <>The Keeper's <em>Room</em></>}</h1><p>{view === "archive" ? "Every loose end, every promise, every date worth remembering." : view === "clocktower" ? "The cycles that turn, again and again." : view === "crypt" ? "The commitments you've successfully laid to rest." : "Make the house feel the way you want it to."}</p></div>{view !== "keeper" && <button className="hero-cta compact-cta" onClick={openCreate}><Plus size={15}/> New commitment</button>}</div></section>
            {view === "keeper" ? <SettingsView settings={settings} updateSettings={updateSettings} exportData={exportData} total={commitments.length} /> : <>
              <div className="list-toolbar"><div className="filter-count">{filtered.length} {view === "crypt" ? "resting records" : "records in this room"}</div><div className="toolbar-search"><Search size={14}/><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search the ledger..."/><SlidersHorizontal size={14}/></div></div>
              <div className="commitment-list large-list">{filtered.length === 0 ? <EmptyState title={view === "crypt" ? "The crypt is empty." : "Nothing stirs here."} text={view === "crypt" ? "Completed commitments will find their resting place here." : "No commitments match this room yet."} onAction={openCreate}/> : filtered.map((item) => <CommitmentRow key={item.id} item={item} onComplete={completeCommitment} onEdit={openEdit} onDelete={deleteCommitment} onRestore={restoreCommitment} completed={view === "crypt"}/>)}</div>
            </>}
          </>}
          <footer className="page-footer"><span>THE HAUNT © 2026</span><span>KEEP LIFE'S LOOSE ENDS FROM COMING BACK TO HAUNT YOU.</span><span>BUILT FOR THE LIVING <Ghost size={12}/></span></footer>
        </div>
      </section>
      <button className="floating-add" onClick={openCreate} aria-label="Add commitment"><Plus size={21}/></button>

      {modalOpen && <CommitmentModal initial={editing} proposal={proposal} onClose={() => { setModalOpen(false); setEditing(null); setProposal(null); }} onSave={saveCommitment}/>}
      {toast && <div className="toast" role="status" aria-live="polite"><span className="toast-icon"><Check size={14}/></span>{toast}</div>}
      {!hydrated && <div className="boot-screen"><div className="boot-mark"><Ghost size={28}/></div><span>THE HAUNT</span><i>THE HOUSE IS WAKING</i></div>}
    </main>
  );
}

function StatCard({ label, value, note, icon, warning, compact }: { label: string; value: string; note: string; icon: ReactNode; warning?: boolean; compact?: boolean }) {
  return <div className="stat-card"><div className="stat-card-top"><span>{label}</span><span className={classNames("stat-icon", warning && "stat-icon-warning")}>{icon}</span></div><div className={classNames("stat-value", compact && "stat-value-money", warning && "stat-value-warning")}>{value}</div><div className="stat-note">{note}</div></div>;
}

function CommitmentRow({ item, onComplete, onEdit, onDelete, onRestore, overdue, completed }: { item: Commitment; onComplete: (item: Commitment) => void; onEdit: (item: Commitment) => void; onDelete: (item: Commitment) => void; onRestore: (item: Commitment) => void; overdue?: boolean; completed?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const categoryIcon = item.category === "payment" ? <CircleDollarSign size={16}/> : item.category === "subscription" ? <RotateCcw size={16}/> : item.category === "appointment" ? <CalendarDays size={16}/> : item.category === "renewal" ? <Shield size={16}/> : item.category === "household" ? <House size={16}/> : <FileText size={16}/>;
  return <article className={classNames("commitment-row", overdue && "commitment-row-overdue", completed && "commitment-row-completed")}>
    <button className={classNames("complete-control", completed && "complete-control-done")} onClick={() => completed ? undefined : onComplete(item)} disabled={completed} aria-label={completed ? "Completed" : "Mark complete"}>{completed ? <Check size={14}/> : <span/>}</button>
    <div className="commitment-type-icon">{categoryIcon}</div>
    <div className="commitment-info"><div className="commitment-title-line"><button className="commitment-title" onClick={() => onEdit(item)}>{item.title}</button>{item.recurrence !== "none" && <span className="recurring-indicator"><RotateCcw size={10}/>{item.recurrence}</span>}</div><div className="commitment-meta"><span>{categoryLabels[item.category]}</span><i>·</i><span>{item.description || "No additional details"}</span></div></div>
    <div className="commitment-due"><strong className={classNames(overdue && "danger-text")}>{relativeDue(item.dueAt)}</strong><span>{formatDate(item.dueAt, { day: "2-digit", month: "short", year: "numeric" })}</span></div>
    <div className="commitment-amount">{money(item.amount, item.currency)}</div>
    <div className="row-menu-wrap"><button className="icon-button tiny row-more" aria-label="More actions" onClick={() => setMenuOpen((open) => !open)}><MoreHorizontal size={17}/></button>{menuOpen && <><button className="menu-dismiss" aria-label="Close actions" onClick={() => setMenuOpen(false)}/><div className="row-menu">{!completed && <button onClick={() => { onComplete(item); setMenuOpen(false); }}><CheckCircle2 size={14}/> Mark complete</button>}<button onClick={() => { onEdit(item); setMenuOpen(false); }}><Pencil size={14}/> Edit record</button>{completed && <button onClick={() => { onRestore(item); setMenuOpen(false); }}><RotateCcw size={14}/> Restore</button>}<button className="danger-menu" onClick={() => { onDelete(item); setMenuOpen(false); }}><Trash2 size={14}/> Delete</button></div></>}</div>
  </article>;
}

function EmptyState({ title, text, onAction }: { title: string; text: string; onAction: () => void }) {
  return <div className="empty-state"><div className="empty-ghost"><Ghost size={27}/><span className="empty-orbit"/></div><strong>{title}</strong><p>{text}</p><button onClick={onAction}><Plus size={13}/> Add a commitment</button></div>;
}

function CommitmentModal({ initial, proposal, onClose, onSave }: {
  initial: Commitment | null;
  proposal: ReturnType<typeof parseCapture> | null;
  onClose: () => void;
  onSave: (data: Omit<Commitment, "id" | "createdAt" | "status" | "source"> & { source?: Commitment["source"] }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? proposal?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? proposal?.description ?? "");
  const [category, setCategory] = useState<CommitmentCategory>(initial?.category ?? proposal?.category ?? "personal");
  const [dueAt, setDueAt] = useState(initial ? localDateValue(initial.dueAt) : proposal ? (proposal.dueAt ? localDateValue(proposal.dueAt) : "") : localDateValue());
  const [recurrence, setRecurrence] = useState<Recurrence>(initial?.recurrence ?? proposal?.recurrence ?? "none");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? proposal?.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? proposal?.currency ?? "ZAR");
  const [reminders, setReminders] = useState<number[]>(initial?.reminders ?? [3, 1]);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(proposal));
  const isProposal = Boolean(proposal && !initial);
  const canSave = title.trim().length > 0 && Boolean(dueAt);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    onSave({ title: title.trim(), description: description.trim(), category, dueAt: new Date(dueAt).toISOString(), recurrence, amount: amount.trim() === "" ? null : Number(amount), currency, reminders, source: proposal ? "text" : "manual" });
  }
  function toggleReminder(value: number) { setReminders((current) => current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value].sort((a,b) => b-a)); }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="commitment-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div className="modal-topline"><span><span className="modal-seal"><WandSparkles size={14}/></span>{isProposal ? "THE SÉANCE ROOM / REVIEW" : initial ? "THE ARCHIVE / EDIT" : "THE ARCHIVE / NEW RECORD"}</span><button className="icon-button" onClick={onClose} aria-label="Close modal"><X size={18}/></button></div>
    <h2 id="modal-title">{isProposal ? <>Review the <em>omen</em>.</> : initial ? <>Rewrite the <em>record</em>.</> : <>What must be <em>remembered</em>?</>}</h2>
    <p className="modal-intro">{isProposal ? "We've interpreted your note. Check every detail before it enters the ledger." : "Give this loose end a name, a date and a place in the ledger."}</p>
    {isProposal && <div className={classNames("extraction-notice", `confidence-${proposal?.confidence}`)}><Sparkles size={15}/><div><strong>{proposal?.confidence === "high" ? "A clear signal was found" : proposal?.confidence === "medium" ? "Some details were found" : "The signal is unclear"}</strong><span>This is a local prototype parser, not a connected AI service. Verify the details below.</span></div></div>}
    <form onSubmit={submit}>
      <label className="field-label">COMMITMENT NAME<input className="field-control" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Pay school fees" autoFocus required maxLength={120}/></label>
      <label className="field-label">DETAILS <span className="optional-label">OPTIONAL</span><textarea className="field-control field-textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a note to your future self..." rows={2}/></label>
      <div className="field-row"><label className="field-label">CATEGORY<select className="field-control" value={category} onChange={(event) => setCategory(event.target.value as CommitmentCategory)}>{Object.entries(categoryLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label className="field-label">DUE DATE<input className="field-control" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} required/></label></div>
      <div className="field-row"><label className="field-label">REPEAT<select className="field-control" value={recurrence} onChange={(event) => setRecurrence(event.target.value as Recurrence)}><option value="none">Does not repeat</option><option value="weekly">Every week</option><option value="fortnightly">Every two weeks</option><option value="monthly">Every month</option><option value="quarterly">Every 3 months</option><option value="yearly">Every year</option></select></label><label className="field-label">AMOUNT <span className="optional-label">OPTIONAL</span><div className="amount-control"><select className="field-control currency-select" value={currency} onChange={(event) => setCurrency(event.target.value)}><option>ZAR</option><option>USD</option><option>GBP</option><option>EUR</option></select><input className="field-control" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00"/></div></label></div>
      <div className="reminder-config"><div className="reminder-head"><span>REMIND ME BEFORE</span><button type="button" onClick={() => setShowAdvanced((show) => !show)}>{showAdvanced ? "Hide" : "Customise"} <ChevronDown size={13}/></button></div>{showAdvanced && <div className="reminder-chips">{[14, 7, 3, 1, 0].map((value) => <button type="button" key={value} className={classNames("reminder-chip", reminders.includes(value) && "reminder-chip-active")} onClick={() => toggleReminder(value)}>{value === 0 ? "On the day" : `${value} day${value === 1 ? "" : "s"} before`}</button>)}</div>}</div>
      <div className="modal-actions"><button type="button" className="button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button-primary" disabled={!canSave}>{isProposal ? <><Check size={15}/> Confirm & add to ledger</> : <><Plus size={15}/> {initial ? "Save changes" : "Add to the ledger"}</>}</button></div>
    </form>
    <div className="modal-footnote"><LockKeyhole size={11}/> Your entries stay in this browser in this prototype.</div>
  </section></div>;
}

function SettingsView({ settings, updateSettings, exportData, total }: { settings: Settings; updateSettings: (patch: Partial<Settings>) => void; exportData: () => void; total: number }) {
  return <div className="settings-layout">
    <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><Volume2 size={17}/></span><div><h3>Atmosphere & sound</h3><p>Decide how loudly the house should speak.</p></div></div>
      <SettingToggle title="Ambient atmosphere" description="A low, original synthesized room tone." checked={settings.ambience} onChange={(value) => updateSettings({ ambience: value })}/>
      <SettingToggle title="Interaction sounds" description="Subtle tones when records are created or laid to rest." checked={settings.effects} onChange={(value) => updateSettings({ effects: value })}/>
      <div className="setting-range"><div><strong>Sound intensity</strong><span>Keep the volume comfortable.</span></div><div className="range-control"><input type="range" min="0" max="70" value={settings.volume} onChange={(event) => updateSettings({ volume: Number(event.target.value) })}/><b>{settings.volume}%</b></div></div>
    </section>
    <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><SunMoon size={17}/></span><div><h3>Visual experience</h3><p>Keep the darkness comfortable and accessible.</p></div></div>
      <SettingToggle title="Reduced motion" description="Reduce environmental movement and animated transitions." checked={settings.reduceMotion} onChange={(value) => updateSettings({ reduceMotion: value })}/>
      <div className="setting-range"><div><strong>Display currency</strong><span>Used for commitment amount summaries.</span></div><select className="field-control settings-select" value={settings.currency} onChange={(event) => updateSettings({ currency: event.target.value })}><option>ZAR</option><option>USD</option><option>GBP</option><option>EUR</option></select></div>
    </section>
    <section className="settings-card settings-data-card"><div className="settings-card-heading"><span className="settings-icon"><Shield size={17}/></span><div><h3>Your personal ledger</h3><p>This prototype stores commitments in this browser only.</p></div></div><div className="data-summary"><div><span>STORED RECORDS</span><strong>{total.toString().padStart(2, "0")}</strong></div><div><span>STORAGE MODE</span><strong>LOCAL</strong></div></div><div className="settings-actions"><button className="button-secondary" onClick={exportData}><Download size={14}/> Export my data</button><span><LockKeyhole size={12}/> No account or cloud sync is connected yet.</span></div></section>
    <div className="prototype-note"><AlertTriangle size={15}/><p><strong>Prototype notice.</strong> Reminders, AI document extraction, voice capture and cloud synchronisation are not connected in this first build. The current version demonstrates the working local commitment ledger and horror interface.</p></div>
  </div>;
}

function SettingToggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="setting-toggle-row"><div><strong>{title}</strong><span>{description}</span></div><button className={classNames("toggle-switch", checked && "toggle-switch-on")} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}><span/></button></div>;
}
