"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Archive, Bell, CalendarDays, Check, CheckCheck, ChevronDown, ChevronRight,
  CircleDollarSign, Clock3, CloudMoon, Ghost, House, Plus, Search,
  Settings2, Shield, Sparkles, SunMoon, Volume2, VolumeX, WandSparkles, X,
  AlertTriangle, ArrowUpRight, MoreHorizontal, CalendarClock, FileText, Mic,
  Paperclip, Moon, RotateCcw, Trash2, Pencil, CheckCircle2, LockKeyhole,
  SlidersHorizontal, Download, Menu,
} from "lucide-react";
import type { ViewId } from "@/lib/types";
import { parseCapture } from "@/lib/capture/deterministic-parser";
import { proposalToReview, type ProposalReview } from "@/lib/capture/review";
import { archiveCommitment, completeCommitment as completeItem, filterCommitments, groupForHall, restoreCommitment as restoreItem } from "@/lib/domain/commitments";
import { buildDemoCommitments } from "@/lib/domain/demo-data";
import { formatDateOnly, todayIn } from "@/lib/domain/dates";
import {
  draftFromCommitment, draftToCommitment, emptyDraft, type CommitmentDraft, type RepeatChoice,
} from "@/lib/domain/draft";
import { formatMoney, sumByCurrency } from "@/lib/domain/money";
import { dueLabel, recurrenceLabel, TYPE_LABELS } from "@/lib/domain/present";
import { COMMITMENT_TYPES, settingsSchema, type Commitment, type CommitmentType, type Occurrence, type ReminderInstance, type Settings } from "@/lib/domain/schema";
import { completeOccurrence, nextDates, undoLatestCompletion } from "@/lib/recurrence/series";
import { zonedDateTimeToInstant } from "@/lib/recurrence/zoned";
import { reconcileReminders } from "@/lib/reminders/reconcile";
import { dismissReminder, evaluateReminders, isUnseen, isVisible, markShown, snoozeReminder } from "@/lib/reminders/state";
import { NotificationCentre, type SnoozeChoice } from "@/components/notification-centre";
import { addDays } from "@/lib/domain/dates";
import { ambienceGain, effectGain, GAIN_CEILING } from "@/lib/audio/levels";
import { computeHouseState } from "@/lib/domain/house-state";
import { shouldReduceMotion } from "@/lib/domain/motion";
import { buildExportBundle } from "@/lib/storage/export";
import { LocalStorageRepository } from "@/lib/storage/local-storage-repository";
import type { LoadStatus } from "@/lib/storage/repository";

const LOCAL_USER = "local";
const CHECK_LABELS: Record<string, string> = { title: "Name", type: "Category", dueDate: "Due date", amountMinor: "Amount", currency: "Currency", recurrence: "Repeat", general: "Note" };
type ProposalState = ProposalReview & { parser: "deterministic" | "llm"; sourceSummary?: string };
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Johannesburg";
const defaultSettings: Settings = settingsSchema.parse({});
const categoryLabels = TYPE_LABELS;
const navItems: { id: ViewId; label: string; subtitle: string; icon: typeof House }[] = [
  { id: "today", label: "The Hall", subtitle: "Today", icon: House },
  { id: "archive", label: "The Archive", subtitle: "All commitments", icon: Archive },
  { id: "clocktower", label: "The Clocktower", subtitle: "Recurring", icon: Clock3 },
  { id: "crypt", label: "The Crypt", subtitle: "Completed", icon: CheckCheck },
  { id: "keeper", label: "Keeper's Room", subtitle: "Preferences", icon: Settings2 },
];

function uid() { return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function classNames(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(" "); }

/**
 * Synthesized sound. Nothing is created until the user has interacted with the page, and nothing plays unless a
 * sound setting is on. Everything goes through one master gain node, and each source is capped by lib/audio/levels.
 */
function useHauntSound(settings: Settings, activated: boolean) {
  const contextRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const ensureContext = useCallback(() => {
    if (!activated) return null;
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!contextRef.current) {
      const context = new AudioContextCtor();
      const master = context.createGain();
      master.gain.value = 1;
      master.connect(context.destination);
      contextRef.current = context;
      masterRef.current = master;
    }
    if (contextRef.current.state === "suspended") void contextRef.current.resume();
    return contextRef.current;
  }, [activated]);

  useEffect(() => {
    if (!settings.ambience) return;
    const context = ensureContext();
    const master = masterRef.current;
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const sub = context.createOscillator();
    const gain = context.createGain();
    const subGain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 48;
    sub.type = "triangle";
    sub.frequency.value = 53;
    gain.gain.value = ambienceGain(settings.volume);
    subGain.gain.value = Math.min(0.004, GAIN_CEILING);
    oscillator.connect(gain).connect(master);
    sub.connect(subGain).connect(master);
    oscillator.start();
    sub.start();
    return () => {
      const now = context.currentTime;
      gain.gain.setTargetAtTime(0, now, 0.15);
      subGain.gain.setTargetAtTime(0, now, 0.15);
      window.setTimeout(() => { try { oscillator.stop(); sub.stop(); } catch { /* already stopped */ } }, 900);
    };
  }, [settings.ambience, settings.volume, ensureContext]);

  const chime = useCallback((kind: "complete" | "add" | "warning" = "add") => {
    if (!settings.effects) return;
    const context = ensureContext();
    const master = masterRef.current;
    if (!context || !master) return;
    const frequencies = kind === "complete" ? [523.25, 659.25, 783.99] : kind === "warning" ? [110, 103.83] : [392, 523.25];
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.08;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(effectGain(settings.volume), start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (kind === "warning" ? 0.55 : 0.32));
      oscillator.connect(gain).connect(master);
      oscillator.start(start);
      oscillator.stop(start + 0.62);
    });
  }, [ensureContext, settings.effects, settings.volume]);
  return { chime };
}
export default function HauntApp() {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [reminderBase, setReminderBase] = useState<ReminderInstance[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showTestReminder, setShowTestReminder] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [view, setView] = useState<ViewId>("today");
  const [hydrated, setHydrated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Commitment | null>(null);
  const [quickText, setQuickText] = useState("");
  const [proposal, setProposal] = useState<ProposalState | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>({ kind: "empty" });
  const [now, setNow] = useState(() => new Date());
  const [toast, setToast] = useState<{ message: string; undoId?: string } | null>(null);
  const [seal, setSeal] = useState<number | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"active" | "archived">("active");
  const [searchText, setSearchText] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activated, setActivated] = useState(false);
  const { chime } = useHauntSound(settings, activated);

  const repository = useMemo(
    () => (typeof window === "undefined" ? null : new LocalStorageRepository({ storage: window.localStorage, timezone: browserTimeZone() })),
    [],
  );

  useEffect(() => {
    if (!repository) return;
    let cancelled = false;
    (async () => {
      const status = await repository.init(LOCAL_USER);
      const [items, history, storedReminders, stored] = await Promise.all([repository.list(LOCAL_USER), repository.listOccurrences(LOCAL_USER), repository.listReminders(LOCAL_USER), repository.getSettings(LOCAL_USER)]);
      if (cancelled) return;
      setLoadStatus(status);
      setCommitments(items);
      setOccurrences(history);
      setReminderBase(storedReminders);
      setSettings(stored);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [repository]);

  useEffect(() => {
    if (!hydrated || !repository) return;
    void repository.replaceAll(LOCAL_USER, commitments);
  }, [commitments, hydrated, repository]);
  useEffect(() => {
    if (!hydrated || !repository) return;
    void repository.replaceOccurrences(LOCAL_USER, occurrences);
  }, [occurrences, hydrated, repository]);
  useEffect(() => {
    if (!hydrated || !repository) return;
    void repository.saveSettings(LOCAL_USER, settings);
    document.documentElement.dataset.motion = settings.motion;
    document.documentElement.dataset.intensity = settings.intensity;
  }, [settings, hydrated, repository]);
  // Ctrl+K or Cmd+K opens search.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Audio may only start after the person has interacted with the page.
  useEffect(() => {
    const activate = () => setActivated(true);
    window.addEventListener("pointerdown", activate, { once: true });
    window.addEventListener("keydown", activate, { once: true });
    return () => { window.removeEventListener("pointerdown", activate); window.removeEventListener("keydown", activate); };
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.undoId ? 8000 : 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const today = todayIn(settings.timezone, now);
  // Reminders are derived: stored instances reconciled with the commitments and evaluated against the clock.
  const reminders = useMemo(
    () => evaluateReminders(reconcileReminders(reminderBase, commitments, { timezone: settings.timezone, reminderTime: settings.reminderTime }, now), now),
    [reminderBase, commitments, settings.timezone, settings.reminderTime, now],
  );
  // Fold the derived result back into state so a reminder planned earlier is not lost once its time passes.
  // This is the documented "adjust state while rendering" pattern; it stops as soon as the two are identical.
  if (hydrated && reminders !== reminderBase) setReminderBase(reminders);
  const visibleReminders = useMemo(() => reminders.filter(isVisible), [reminders]);
  const unseenReminders = useMemo(() => reminders.filter(isUnseen).length, [reminders]);
  useEffect(() => {
    if (!hydrated || !repository) return;
    void repository.replaceReminders(LOCAL_USER, reminders);
  }, [reminders, hydrated, repository]);
  const groups = useMemo(() => groupForHall(commitments, today), [commitments, today]);
  const active = useMemo(() => commitments.filter((item) => item.status === "active"), [commitments]);
  const overdue = groups.overdue;
  const dueToday = groups.dueToday;
  const upcoming = groups.upcoming;
  // The Crypt shows finished one-off commitments plus each completed occurrence of recurring ones.
  const completed = useMemo(() => {
    const occurrenceRows: Commitment[] = occurrences.flatMap((entry) => {
      const master = commitments.find((item) => item.id === entry.commitmentId);
      return master ? [{ ...master, id: entry.id, status: "completed" as const, dueDate: entry.dueDate, completedAt: entry.completedAt }] : [];
    });
    const oneOffs = commitments.filter((item) => item.status === "completed");
    return [...oneOffs, ...occurrenceRows].sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  }, [commitments, occurrences]);
  const recurring = useMemo(() => filterCommitments(active, { recurring: true }).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [active]);
  const upcomingTotals = useMemo(() => sumByCurrency([...dueToday, ...upcoming]), [dueToday, upcoming]);
  const restlessCount = overdue.length;
  const mood = useMemo(() => computeHouseState(commitments, today), [commitments, today]);
  const nextDue = useMemo(() => [...active].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0], [active]);
  const currentNav = navItems.find((item) => item.id === view) ?? navItems[0];
  // Archived commitments keep their history and are listed under The Archive > Archived, where they can be restored.
  const archived = useMemo(() => commitments.filter((item) => item.status === "archived"), [commitments]);
  const showingArchived = view === "archive" && archiveTab === "archived";
  const filtered = useMemo(() => {
    const source = showingArchived ? archived : view === "crypt" ? completed : view === "clocktower" ? recurring : active;
    return filterCommitments(source, { text: searchText }).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
  }, [active, archived, completed, recurring, searchText, showingArchived, view]);

  function notify(message: string, undoId?: string) { setToast({ message, undoId }); }
  const reduceMotionNow = () => shouldReduceMotion(settings.motion, typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  // A short spectral fade of the row that was just finished. It is a copy drawn over the list, so the data change
  // is immediate and nothing depends on timers. Skipped entirely when motion is reduced.
  function dissolveRow(id: string) {
    if (reduceMotionNow()) return;
    const source = document.querySelector<HTMLElement>(`[data-commitment-id="${CSS.escape(id)}"]`);
    if (!source) return;
    const rect = source.getBoundingClientRect();
    const ghost = source.cloneNode(true) as HTMLElement;
    ghost.classList.add("row-ghost");
    ghost.setAttribute("aria-hidden", "true");
    ghost.setAttribute("inert", "");
    ghost.removeAttribute("data-commitment-id");
    Object.assign(ghost.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    ghost.addEventListener("animationend", () => ghost.remove(), { once: true });
    document.body.appendChild(ghost);
  }
  function stampSeal() { if (!reduceMotionNow()) setSeal((n) => (n ?? 0) + 1); }
  // Reminders only become "shown" once the centre has listed them: new ones read NEW while it is open
  // and are recorded as shown when it closes.
  function openNotifications() { setNotificationsOpen(true); }
  function closeNotifications() {
    setReminderBase((current) => {
      const nowDate = new Date();
      const settled = evaluateReminders(reconcileReminders(current, commitments, { timezone: settings.timezone, reminderTime: settings.reminderTime }, nowDate), nowDate);
      return markShown(settled, settled.filter(isUnseen).map((item) => item.id), nowDate.toISOString());
    });
    setNotificationsOpen(false);
    bellRef.current?.focus();
  }
  function snoozeFromCentre(id: string, choice: SnoozeChoice) {
    const until = choice === "hour"
      ? new Date(Date.now() + 3_600_000)
      : zonedDateTimeToInstant(addDays(today, 1), settings.reminderTime, settings.timezone);
    setReminderBase(snoozeReminder(reminders, id, until.toISOString()));
    notify(choice === "hour" ? "Snoozed for one hour." : "Snoozed until tomorrow.");
  }
  function dismissFromCentre(id: string) {
    setReminderBase(dismissReminder(reminders, id, new Date().toISOString()));
  }
  function openFromCentre(commitmentId: string) {
    const target = commitments.find((item) => item.id === commitmentId);
    closeNotifications();
    if (target) openEdit(target);
  }
  function updateSettings(patch: Partial<Settings>) { setSettings((current) => ({ ...current, ...patch })); }
  function openCreate() { setEditing(null); setProposal(null); setModalOpen(true); }
  function openEdit(item: Commitment) {
    // A completed occurrence row edits its series.
    const master = commitments.find((entry) => entry.id === item.id) ?? commitments.find((entry) => occurrences.some((o) => o.id === item.id && o.commitmentId === entry.id));
    if (!master) return;
    setEditing(master); setProposal(null); setModalOpen(true);
  }
  function navigate(next: ViewId) { setView(next); setSearchText(""); setMobileNavOpen(false); }

  function saveCommitment(draft: CommitmentDraft): string[] {
    const result = draftToCommitment(draft, {
      userId: LOCAL_USER,
      timezone: settings.timezone,
      nowIso: new Date().toISOString(),
      newId: uid,
      sourceType: proposal ? "pasted_text" : "manual",
      existing: editing ?? undefined,
    });
    if (!result.ok) return result.errors;
    const saved = result.value;
    if (editing) {
      setCommitments((items) => items.map((item) => item.id === saved.id ? saved : item));
      notify("The record has been rewritten.");
    } else {
      setCommitments((items) => [saved, ...items]);
      chime("add");
      stampSeal();
      notify(proposal ? "Sealed. The commitment has been added to the ledger." : "A new commitment has entered the house.");
    }
    setModalOpen(false); setEditing(null); setProposal(null); setQuickText("");
    return [];
  }

  function completeCommitment(item: Commitment) {
    const nowIso = new Date().toISOString();
    if (item.recurrence) {
      const result = completeOccurrence(item, occurrences, nowIso);
      if (!result.ok) { notify(result.reason); return; }
      dissolveRow(item.id);
      setCommitments((items) => items.map((entry) => entry.id === item.id ? result.commitment : entry));
      setOccurrences(result.occurrences);
      chime("complete");
      notify(result.next ? `Laid to rest. Next: ${formatDateOnly(result.next, settings.locale, { day: "numeric", month: "long" })}.` : "Laid to rest. The series has ended.", result.occurrences[result.occurrences.length - 1].id);
      return;
    }
    dissolveRow(item.id);
    setCommitments((items) => items.map((entry) => entry.id === item.id ? completeItem(entry, nowIso) : entry));
    chime("complete");
    notify("Laid to rest. Well done.", item.id);
  }
  function restoreCommitment(item: Commitment) {
    if (item.status === "archived") {
      setCommitments((items) => items.map((entry) => entry.id === item.id ? restoreItem(entry, new Date().toISOString()) : entry));
      notify("Restored from the archive.");
      return;
    }
    const entry = occurrences.find((o) => o.id === item.id);
    if (entry) {
      const master = commitments.find((c) => c.id === entry.commitmentId);
      const result = master ? undoLatestCompletion(master, occurrences, entry.id, new Date().toISOString()) : undefined;
      if (!result || !result.ok) { notify(result && !result.ok ? result.reason : "That series no longer exists."); return; }
      setCommitments((items) => items.map((c) => c.id === result.commitment.id ? result.commitment : c));
      setOccurrences(result.occurrences);
      notify("The occurrence has returned to the living.");
      return;
    }
    setCommitments((items) => items.map((entry) => entry.id === item.id ? restoreItem(entry, new Date().toISOString()) : entry));
    notify("The commitment has returned to the living.");
  }
  function archiveItem(item: Commitment) {
    setCommitments((items) => items.map((entry) => entry.id === item.id ? archiveCommitment(entry, new Date().toISOString()) : entry));
    notify("Archived. Find it under The Archive > Archived to restore it.");
  }
  function deleteCommitment(item: Commitment) {
    const historyEntry = occurrences.find((o) => o.id === item.id);
    if (historyEntry) {
      if (!window.confirm(`Remove this completed record of “${item.title}” from history? The series keeps going.`)) return;
      setOccurrences((list) => list.filter((o) => o.id !== historyEntry.id));
      notify("The record has been destroyed.");
      return;
    }
    if (!window.confirm(`Permanently remove “${item.title}”${item.recurrence ? " and its completion history" : ""}?`)) return;
    setCommitments((items) => items.filter((entry) => entry.id !== item.id));
    setOccurrences((list) => list.filter((o) => o.commitmentId !== item.id));
    notify("The record has been destroyed.");
  }
  function loadDemoData() {
    const demo = buildDemoCommitments(LOCAL_USER, settings.timezone, new Date().toISOString());
    setCommitments((items) => [...demo.filter((d) => !items.some((i) => i.id === d.id)), ...items]);
    notify("Fictional demo records added.");
  }
  function deleteAllData() {
    if (!window.confirm("Delete every commitment, completion record, reminder and setting stored in this browser, including any backup copies? This cannot be undone. Export first if you want to keep a copy.")) return;
    void repository?.deleteAll(LOCAL_USER).then(() => {
      setCommitments([]);
      setOccurrences([]);
      setReminderBase([]);
      setSettings(settingsSchema.parse({ timezone: browserTimeZone() }));
      notify("All local data has been deleted.");
    });
  }
  function handleQuickCapture() {
    if (!quickText.trim()) return;
    const parsed = parseCapture(quickText, { now: new Date(), timezone: settings.timezone });
    setProposal({
      ...proposalToReview(parsed, { currency: settings.currency, reminderOffsetsDays: settings.defaultReminderOffsets }),
      parser: parsed.parser,
      sourceSummary: parsed.sourceSummary,
    });
    setEditing(null);
    setModalOpen(true);
  }

  function exportData() {
    const bundle = buildExportBundle({ commitments, occurrences, reminders, settings }, new Date().toISOString());
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `the-haunt-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
    notify("Exported: commitments, completion history, reminders and settings. There is no import yet.");
  }

  return (
    <main className="app-shell" data-house={mood.state}>
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <aside className={classNames("sidebar", mobileNavOpen && "sidebar-open")}>
        <div className="brand-lockup">
          <div className="brand-mark"><Ghost size={21} strokeWidth={1.5} /></div>
          <div><div className="brand-name">THE HAUNT</div><div className="brand-caption">PERSONAL LEDGER OF THE LIVING</div></div>
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
          <div className="status-top"><span className="status-dot"/><span>HOUSE STATUS</span><span className="status-live">{mood.label}</span></div>
          <div className="status-title">{mood.state === "calm" ? "Quiet... for now." : mood.state === "watchful" ? "The house is watching." : `${mood.overdue} restless ${mood.overdue === 1 ? "spirit" : "spirits"}.`}</div>
          <div className="status-description">{mood.description}</div>
          <div className={classNames("status-meter", `status-meter-${mood.state}`)}><span style={{ width: `${mood.state === "restless" ? Math.min(100, mood.overdue * 22) : mood.state === "watchful" ? Math.min(100, mood.dueSoon * 14) : 6}%` }}/></div>
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
            <button className="topbar-search" onClick={() => setSearchOpen((open) => !open)} aria-expanded={searchOpen} aria-keyshortcuts="Control+K Meta+K"><Search size={15}/><span>Search the house</span><kbd aria-hidden="true">Ctrl K</kbd></button>
            <button ref={bellRef} className="icon-button bell-button" onClick={() => (notificationsOpen ? closeNotifications() : openNotifications())} aria-label={`Reminders: ${unseenReminders} new, ${visibleReminders.length} in total`} aria-expanded={notificationsOpen} title="Reminders"><Bell size={17}/>{(unseenReminders > 0 || visibleReminders.length > 0) && <em className={classNames("bell-count", unseenReminders > 0 && "bell-count-new")}>{unseenReminders > 0 ? unseenReminders : visibleReminders.length}</em>}</button>
            <button className="icon-button sound-button" onClick={() => updateSettings({ effects: !settings.effects })} aria-label={settings.effects ? "Mute sound effects" : "Enable sound effects"} title="Sound effects"><span className={classNames("sound-indicator", settings.effects && "sound-indicator-on")}/>{settings.effects ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button>
            <div className="topbar-avatar">K</div>
          </div>
        </header>

        {notificationsOpen && <NotificationCentre reminders={visibleReminders} commitments={commitments} today={today} locale={settings.locale} reminderTime={settings.reminderTime} showTest={showTestReminder} onClose={closeNotifications} onSnooze={snoozeFromCentre} onDismiss={dismissFromCentre} onOpen={openFromCentre} onSendTest={() => setShowTestReminder(true)} onDismissTest={() => setShowTestReminder(false)}/>}
        {searchOpen && <div className="search-popover" role="search"><Search size={16}/><input autoFocus aria-label="Search commitments" value={searchText} onKeyDown={(event) => { if (event.key === "Escape") { setSearchOpen(false); setSearchText(""); } }} onChange={(event) => { setSearchText(event.target.value); if (view === "today") setView("archive"); }} placeholder="Search commitments, notes, categories..."/><button className="icon-button tiny" aria-label="Close search" onClick={() => { setSearchOpen(false); setSearchText(""); }}><X size={15}/></button></div>}

        <div className="page-content">
          {hydrated && loadStatus.kind === "corrupt" && <div className="status-banner" role="alert"><AlertTriangle size={15}/><p><strong>Stored data could not be read.</strong> A copy was kept in this browser under <code>{loadStatus.backupKey}</code> and the ledger was started empty.</p></div>}
          {hydrated && loadStatus.kind === "migrated" && <div className="status-banner" role="status"><FileText size={15}/><p><strong>Your earlier prototype data was upgraded.</strong> {loadStatus.rejected > 0 ? `${loadStatus.rejected} record(s) could not be converted and were left out. ` : ""}{loadStatus.notes.join(" ")} The original copy is still stored in this browser.</p></div>}
          {hydrated && commitments.length === 0 && <div className="status-banner" role="status"><Sparkles size={15}/><p><strong>Your ledger is empty.</strong> Add a commitment, or <button className="text-link" onClick={loadDemoData}>load fictional demo data</button> to look around. You can delete it at any time.</p></div>}
          {view === "today" && <>
            <section className="hero-panel">
              <div className="hero-copy">
                <div className="eyebrow"><span className="eyebrow-line"/> {hydrated ? new Intl.DateTimeFormat(settings.locale, { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: settings.timezone }).format(now).toUpperCase() : ""} <span className="eyebrow-line"/></div>
                <h1>The house<br/><em>remembers</em><br/>everything<span className="title-period">.</span></h1>
                <p className="hero-subtitle">Welcome back, Keeper. Some loose ends<br className="desktop-only"/> may be wandering the halls.</p>
                <button className="hero-cta" onClick={openCreate}><Plus size={15}/> Capture a commitment <span>↗</span></button>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="moon-halo"><div className="moon-disc"/></div>
                <div className="hero-fog hero-fog-a"/><div className="hero-fog hero-fog-b"/>
                <div className="manor-frame"><div className="manor-spotlight"/><img src="/haunted-manor.svg" alt="" className="manor-image"/></div>
                <div className="hero-silhouette"/>
                <div className="firefly firefly-one"/><div className="firefly firefly-two"/><div className="firefly firefly-three"/>
              </div>
              <div className="hero-bottom-note"><Moon size={12}/> THE VEIL IS THIN <span aria-hidden="true">·</span> YOUR LEDGER IS OPEN</div>
            </section>

            <section className="stat-grid" aria-label="Commitment overview">
              <StatCard label="ACTIVE COMMITMENTS" value={String(active.length).padStart(2, "0")} note="Still in the realm" icon={<Archive size={16}/>} />
              <StatCard label="RESTLESS" value={String(overdue.length).padStart(2, "0")} note="Past their due date" icon={<Ghost size={17}/>} warning={overdue.length > 0}/>
              <StatCard label="NEXT 7 DAYS" value={String(upcoming.length + dueToday.length).padStart(2, "0")} note="Approaching the threshold" icon={<CalendarClock size={16}/>} />
              <StatCard label="UPCOMING TOTAL" value={upcomingTotals.length === 0 ? "—" : upcomingTotals.map((total) => formatMoney(total.totalMinor, total.currency, settings.locale)).join(" + ")} note="Entered amounts · next 7 days · per currency" icon={<CircleDollarSign size={16}/>} compact />
            </section>

            <section className="content-grid">
              <div className="content-main">
                <div className="section-heading"><div><div className="eyebrow-small">THE PRESENT</div><h2>Needs your attention<span>.</span></h2></div><button className="text-link" onClick={() => navigate("archive")}>View all <ArrowUpRight size={14}/></button></div>
                <div className="commitment-list">
                  {dueToday.length === 0 ? <EmptyState title="The hall is quiet." text="Nothing is due today. The house is almost peaceful." onAction={openCreate}/> : dueToday.map((item) => <CommitmentRow key={item.id} item={item} onComplete={completeCommitment} onEdit={openEdit} onDelete={deleteCommitment} onRestore={restoreCommitment} onArchive={archiveItem} today={today} locale={settings.locale}/>) }
                </div>
                {overdue.length > 0 && <div className="restless-section"><div className="section-heading compact-heading"><div><div className="eyebrow-small warning-text"><span className="pulse-dot"/> THE RESTLESS</div><h2>Still waiting<span>.</span></h2></div><span className="count-chip count-chip-danger">{overdue.length} overdue</span></div><div className="commitment-list">{overdue.slice(0, 3).map((item) => <CommitmentRow key={item.id} item={item} onComplete={completeCommitment} onEdit={openEdit} onDelete={deleteCommitment} onRestore={restoreCommitment} onArchive={archiveItem} today={today} locale={settings.locale} overdue/>)}</div></div>}
                <div className="section-heading upcoming-heading"><div><div className="eyebrow-small">ON THE HORIZON</div><h2>Approaching<span>.</span></h2></div><button className="text-link" onClick={() => navigate("archive")}>Full archive <ArrowUpRight size={14}/></button></div>
                <div className="commitment-list">{upcoming.length === 0 ? <EmptyState title="Nothing approaching." text="Add a future commitment and it will appear here." onAction={openCreate}/> : upcoming.slice(0, 4).map((item) => <CommitmentRow key={item.id} item={item} onComplete={completeCommitment} onEdit={openEdit} onDelete={deleteCommitment} onRestore={restoreCommitment} onArchive={archiveItem} today={today} locale={settings.locale}/>)}</div>
              </div>
              <aside className="content-aside">
                <div className="capture-card">
                  <div className="capture-card-top"><span className="mini-seal"><WandSparkles size={15}/></span><span>THE SÉANCE ROOM</span><span className="capture-status">OPEN</span></div>
                  <h3>Something on<br/>your mind?</h3>
                  <p>Speak it, write it, leave it here. We&apos;ll help you remember.</p>
                  <div className="capture-input-wrap"><textarea aria-label="Quick capture note" value={quickText} onChange={(event) => setQuickText(event.target.value)} placeholder={'“Fibre is due on the 25th every month...”'} rows={3}/><div className="capture-input-footer"><span><Sparkles size={12}/> QUICK CAPTURE</span><button onClick={handleQuickCapture} disabled={!quickText.trim()} aria-label="Interpret quick capture"><ArrowUpRight size={16}/></button></div></div>
                  <div className="capture-methods"><span><FileText size={13}/> Paste text</span><span><Mic size={13}/> Voice soon</span><span><Paperclip size={13}/> Files soon</span></div>
                </div>
                <div className="moon-card"><div className="moon-card-top"><span>THE NIGHT WATCH</span><CloudMoon size={16}/></div><div className="moon-phase"><div className="phase-moon"/><div><strong>{hydrated ? new Intl.DateTimeFormat(settings.locale, { weekday: "long", timeZone: settings.timezone }).format(now) : ""}</strong><span>THE HOUSE IS {mood.label}</span></div></div><div className="moon-card-rule"/><div className="moon-card-bottom"><span>Next commitment</span><strong>{nextDue ? dueLabel(nextDue.dueDate, today, settings.locale) : "None in sight"}</strong></div></div>
                <div className="whisper-card"><div className="whisper-mark" aria-hidden="true">“</div><p>What is remembered<br/>cannot return to haunt you.</p><span>— A NOTE FROM THE HOUSE</span></div>
              </aside>
            </section>
          </>}

          {view !== "today" && <>
            <section className="inner-page-heading"><div className="eyebrow"><span className="eyebrow-line"/> THE HOUSE / {currentNav.label.toUpperCase()}</div><div className="inner-heading-row"><div><h1>{view === "archive" ? <>The <em>Archive</em></> : view === "clocktower" ? <>The <em>Clocktower</em></> : view === "crypt" ? <>The <em>Crypt</em></> : <>The Keeper&apos;s <em>Room</em></>}</h1><p>{view === "archive" ? "Every loose end, every promise, every date worth remembering." : view === "clocktower" ? "The cycles that turn, again and again." : view === "crypt" ? "The commitments you've successfully laid to rest." : "Make the house feel the way you want it to."}</p></div>{view !== "keeper" && <button className="hero-cta compact-cta" onClick={openCreate}><Plus size={15}/> New commitment</button>}</div></section>
            {view === "keeper" ? <SettingsView settings={settings} updateSettings={updateSettings} exportData={exportData} total={commitments.length} loadDemoData={loadDemoData} deleteAllData={deleteAllData} /> : <>
              {view === "archive" && <div className="archive-tabs" role="group" aria-label="Which commitments to show"><button aria-pressed={archiveTab === "active"} className={classNames("archive-tab", archiveTab === "active" && "archive-tab-on")} onClick={() => setArchiveTab("active")}>Active ({active.length})</button><button aria-pressed={archiveTab === "archived"} className={classNames("archive-tab", archiveTab === "archived" && "archive-tab-on")} onClick={() => setArchiveTab("archived")}>Archived ({archived.length})</button></div>}
              <div className="list-toolbar"><div className="filter-count" role="status">{filtered.length} {view === "crypt" ? "resting records" : showingArchived ? "archived records" : "records in this room"}</div><div className="toolbar-search"><Search size={14}/><input aria-label="Search the ledger" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search the ledger..."/><SlidersHorizontal size={14} aria-hidden="true"/></div></div>
              <div className="commitment-list large-list">{filtered.length === 0 ? <EmptyState title={view === "crypt" ? "The crypt is empty." : showingArchived ? "Nothing is archived." : "Nothing stirs here."} text={view === "crypt" ? "Completed commitments will find their resting place here." : showingArchived ? "Archived commitments keep their history and can be restored from here." : "No commitments match this room yet."} onAction={openCreate}/> : filtered.map((item) => <CommitmentRow key={item.id} item={item} onComplete={completeCommitment} onEdit={openEdit} onDelete={deleteCommitment} onRestore={restoreCommitment} onArchive={archiveItem} today={today} locale={settings.locale} completed={view === "crypt"} archived={showingArchived} nextDates={view === "clocktower" ? nextDates(item, 3) : undefined}/>)}</div>
            </>}
          </>}
          <footer className="page-footer"><span>THE HAUNT © 2026</span><span>KEEP LIFE&apos;S LOOSE ENDS FROM COMING BACK TO HAUNT YOU.</span><span>BUILT FOR THE LIVING <Ghost size={12}/></span></footer>
        </div>
      </section>
      <button className="floating-add" onClick={openCreate} aria-label="Add commitment"><Plus size={21}/></button>

      {modalOpen && <CommitmentModal initial={editing} proposal={proposal} defaults={{ dueDate: addDays(today, 1), currency: settings.currency, reminders: settings.defaultReminderOffsets }} onClose={() => { setModalOpen(false); setEditing(null); setProposal(null); }} onSave={saveCommitment}/>}
      {toast && <div className="toast" role="status" aria-live="polite"><span className="toast-icon"><Check size={14}/></span>{toast.message}{toast.undoId && <button className="toast-action" onClick={() => { const target = completed.find((entry) => entry.id === toast.undoId); setToast(null); if (target) restoreCommitment(target); }}>Undo</button>}</div>}
      {seal !== null && <div key={seal} className="seal-stamp" aria-hidden="true" onAnimationEnd={() => setSeal(null)}><WandSparkles size={26}/></div>}
      {!hydrated && <div className="boot-screen"><div className="boot-mark"><Ghost size={28}/></div><span>THE HAUNT</span><i>THE HOUSE IS WAKING</i></div>}
    </main>
  );
}

function StatCard({ label, value, note, icon, warning, compact }: { label: string; value: string; note: string; icon: ReactNode; warning?: boolean; compact?: boolean }) {
  return <div className="stat-card"><div className="stat-card-top"><span>{label}</span><span className={classNames("stat-icon", warning && "stat-icon-warning")}>{icon}</span></div><div className={classNames("stat-value", compact && "stat-value-money", warning && "stat-value-warning")}>{value}</div><div className="stat-note">{note}</div></div>;
}

function CommitmentRow({ item, onComplete, onEdit, onDelete, onRestore, onArchive, today, locale, overdue, completed, archived, nextDates: upcomingDates }: { item: Commitment; onComplete: (item: Commitment) => void; onEdit: (item: Commitment) => void; onDelete: (item: Commitment) => void; onRestore: (item: Commitment) => void; onArchive: (item: Commitment) => void; today: string; locale: string; overdue?: boolean; completed?: boolean; archived?: boolean; nextDates?: string[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const finished = Boolean(completed || archived);
  // Keyboard: focus moves into the menu when it opens; arrows move between items; Escape closes and returns focus.
  useEffect(() => { if (menuOpen) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(); }, [menuOpen]);
  function closeMenu(returnFocus: boolean) { setMenuOpen(false); if (returnFocus) moreRef.current?.focus(); }
  function onMenuKey(event: React.KeyboardEvent) {
    if (event.key === "Escape") { event.stopPropagation(); closeMenu(true); return; }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    items[(index + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
  }
  const categoryIcon = item.type === "bill" ? <CircleDollarSign size={16}/> : item.type === "subscription" ? <RotateCcw size={16}/> : item.type === "appointment" ? <CalendarDays size={16}/> : item.type === "renewal" ? <Shield size={16}/> : item.type === "household" ? <House size={16}/> : <FileText size={16}/>;
  return <article data-commitment-id={item.id} className={classNames("commitment-row", overdue && "commitment-row-overdue", finished && "commitment-row-completed", menuOpen && "commitment-row-menu-open")}>
    <button className={classNames("complete-control", finished && "complete-control-done")} onClick={() => finished ? undefined : onComplete(item)} disabled={finished} aria-label={archived ? `${item.title} is archived` : completed ? `${item.title} is completed` : `Mark ${item.title} complete`}>{finished ? <Check size={14}/> : <span/>}</button>
    <div className="commitment-type-icon">{categoryIcon}</div>
    <div className="commitment-info"><div className="commitment-title-line"><button className="commitment-title" onClick={() => onEdit(item)}>{item.title}</button>{item.recurrence && <span className="recurring-indicator"><RotateCcw size={10}/>{recurrenceLabel(item.recurrence)}</span>}</div><div className="commitment-meta"><span>{categoryLabels[item.type]}</span><i aria-hidden="true">·</i><span>{item.description || "No additional details"}</span></div>{upcomingDates && upcomingDates.length > 0 && <div className="commitment-next">Next: {upcomingDates.map((date) => formatDateOnly(date, locale, { day: "numeric", month: "short" })).join(" · ")}</div>}</div>
    <div className="commitment-due"><strong className={classNames(overdue && "danger-text")}>{dueLabel(item.dueDate, today, locale)}</strong><span>{formatDateOnly(item.dueDate, locale, { day: "2-digit", month: "short", year: "numeric" })}</span></div>
    <div className="commitment-amount">{formatMoney(item.amountMinor, item.currency, locale)}</div>
    <div className="row-menu-wrap"><button ref={moreRef} className="icon-button tiny row-more" aria-label={`More actions for ${item.title}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><MoreHorizontal size={17}/></button>{menuOpen && <><button className="menu-dismiss" aria-hidden="true" tabIndex={-1} onClick={() => closeMenu(false)}/><div className="row-menu" role="menu" aria-label={`Actions for ${item.title}`} ref={menuRef} onKeyDown={onMenuKey}>{!finished && <button role="menuitem" onClick={() => { onComplete(item); closeMenu(false); }}><CheckCircle2 size={14}/> Mark complete</button>}<button role="menuitem" onClick={() => { onEdit(item); closeMenu(false); }}><Pencil size={14}/> Edit record</button>{item.status === "active" && !finished && <button role="menuitem" onClick={() => { onArchive(item); closeMenu(false); }}><Archive size={14}/> Archive</button>}{finished && <button role="menuitem" onClick={() => { onRestore(item); closeMenu(false); }}><RotateCcw size={14}/> Restore</button>}<button role="menuitem" className="danger-menu" onClick={() => { onDelete(item); closeMenu(false); }}><Trash2 size={14}/> Delete</button></div></>}</div>
  </article>;
}

function EmptyState({ title, text, onAction }: { title: string; text: string; onAction: () => void }) {
  return <div className="empty-state"><div className="empty-ghost"><Ghost size={27}/><span className="empty-orbit"/></div><strong>{title}</strong><p>{text}</p><button onClick={onAction}><Plus size={13}/> Add a commitment</button></div>;
}

function CommitmentModal({ initial, proposal, defaults, onClose, onSave }: {
  initial: Commitment | null;
  proposal: ProposalState | null;
  defaults: { dueDate: string; currency: string; reminders?: number[] };
  onClose: () => void;
  onSave: (draft: CommitmentDraft) => string[];
}) {
  const [draft, setDraft] = useState<CommitmentDraft>(() => initial ? draftFromCommitment(initial) : proposal ? proposal.draft : emptyDraft(defaults));
  const [errors, setErrors] = useState<string[]>([]);
  const [opener] = useState(() => (typeof document === "undefined" ? null : document.activeElement));
  const dialogRef = useRef<HTMLElement>(null);
  // Return focus to whatever opened the dialog when it closes.
  useEffect(() => () => { if (opener instanceof HTMLElement && opener.isConnected) opener.focus(); }, [opener]);
  function trapTab(event: React.KeyboardEvent) {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')].filter((node) => node.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  const [showAdvanced, setShowAdvanced] = useState(Boolean(proposal));
  const isProposal = Boolean(proposal && !initial);
  const { title, description, dueDate, amount, currency, reminderOffsetsDays: reminders } = draft;
  const canSave = title.trim().length > 0 && Boolean(dueDate);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const notes = proposal?.notes ?? {};
  // Editing a field the reader was unsure about clears its CHECK THIS marker.
  const FIELD_FOR: Record<string, string> = { title: "title", type: "type", dueDate: "dueDate", amount: "amountMinor", currency: "currency", repeat: "recurrence" };
  const set = (patch: Partial<CommitmentDraft>) => {
    setDraft((current) => ({ ...current, ...patch, ...("dueDate" in patch ? { dayOfMonth: undefined } : {}) }));
    setTouched((current) => new Set([...current, ...Object.keys(patch).map((key) => FIELD_FOR[key]).filter(Boolean)]));
  };
  const checkTag = (field: string) => (notes[field] && !touched.has(field) ? <span className="check-tag">CHECK THIS</span> : null);
  const pendingNotes = Object.entries(notes).filter(([field]) => !touched.has(field));

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setErrors(onSave(draft));
  }  function toggleReminder(value: number) { set({ reminderOffsetsDays: reminders.includes(value) ? reminders.filter((entry) => entry !== value) : [...reminders, value].sort((a, b) => b - a) }); }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="commitment-modal" ref={dialogRef} onKeyDown={trapTab} role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div className="modal-topline"><span><span className="modal-seal"><WandSparkles size={14}/></span>{isProposal ? "THE SÉANCE ROOM / REVIEW" : initial ? "THE ARCHIVE / EDIT" : "THE ARCHIVE / NEW RECORD"}</span><button className="icon-button" onClick={onClose} aria-label="Close modal"><X size={18}/></button></div>
    <h2 id="modal-title">{isProposal ? <>Review the <em>omen</em>.</> : initial ? <>Rewrite the <em>record</em>.</> : <>What must be <em>remembered</em>?</>}</h2>
    <p className="modal-intro">{isProposal ? "We've interpreted your note. Check every detail before it enters the ledger." : "Give this loose end a name, a date and a place in the ledger."}</p>
    {isProposal && proposal && <div className="extraction-notice" role="note"><Sparkles size={15}/><div><strong>{proposal.parser === "deterministic" ? "Read by the built-in rule-based reader (not AI)" : "Read by an AI model"}</strong><span>These are suggestions from your note, not facts. Check every detail before it enters the ledger. Nothing is saved until you confirm.</span>{proposal.sourceSummary && <span className="extraction-source">From your note: “{proposal.sourceSummary}”</span>}{pendingNotes.length > 0 && <ul className="check-list">{pendingNotes.map(([field, note]) => <li key={field}><b>{CHECK_LABELS[field] ?? "Note"}:</b> {note}</li>)}</ul>}</div></div>}
    <form onSubmit={submit}>
      <label className="field-label">COMMITMENT NAME {checkTag("title")}<input className="field-control" value={title} onChange={(event) => set({ title: event.target.value })} placeholder="e.g. Pay school fees" autoFocus required maxLength={120}/></label>
      <label className="field-label">DETAILS <span className="optional-label">OPTIONAL</span><textarea className="field-control field-textarea" value={description} onChange={(event) => set({ description: event.target.value })} placeholder="Add a note to your future self..." rows={2}/></label>
      <div className="field-row"><label className="field-label">CATEGORY {checkTag("type")}<select className="field-control" value={draft.type} onChange={(event) => set({ type: event.target.value as CommitmentType })}>{COMMITMENT_TYPES.map((key) => <option value={key} key={key}>{categoryLabels[key]}</option>)}</select></label><label className="field-label">DUE DATE {checkTag("dueDate")}<input className="field-control" type="date" value={dueDate} onChange={(event) => set({ dueDate: event.target.value })} required/></label></div>
      <div className="field-row"><label className="field-label">REPEAT {checkTag("recurrence")}<select className="field-control" value={draft.repeat} onChange={(event) => set({ repeat: event.target.value as RepeatChoice })}><option value="none">Does not repeat</option><option value="weekly">Every week</option><option value="fortnightly">Every two weeks</option><option value="monthly">Every month</option><option value="quarterly">Every 3 months</option><option value="yearly">Every year</option></select></label><label className="field-label">AMOUNT <span className="optional-label">OPTIONAL</span> {checkTag("amountMinor")}{checkTag("currency")}<div className="amount-control"><select className="field-control currency-select" aria-label="Currency" value={currency} onChange={(event) => set({ currency: event.target.value })}>{[...new Set(["ZAR", "USD", "GBP", "EUR", currency])].map((code) => <option key={code}>{code}</option>)}</select><input className="field-control" type="number" min="0" step="0.01" aria-label="Amount" value={amount} onChange={(event) => set({ amount: event.target.value })} placeholder="0.00"/></div></label></div>
      <div className="reminder-config"><div className="reminder-head"><span>REMIND ME BEFORE</span><button type="button" onClick={() => setShowAdvanced((show) => !show)}>{showAdvanced ? "Hide" : "Customise"} <ChevronDown size={13}/></button></div>{showAdvanced && <div className="reminder-chips">{[14, 7, 3, 1, 0].map((value) => <button type="button" key={value} aria-pressed={reminders.includes(value)} className={classNames("reminder-chip", reminders.includes(value) && "reminder-chip-active")} onClick={() => toggleReminder(value)}>{value === 0 ? "On the day" : `${value} day${value === 1 ? "" : "s"} before`}</button>)}</div>}</div>
      {errors.length > 0 && <p className="form-error" role="alert">{errors.join(". ")}.</p>}<div className="modal-actions"><button type="button" className="button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button-primary" disabled={!canSave}>{isProposal ? <><Check size={15}/> Confirm & add to ledger</> : <><Plus size={15}/> {initial ? "Save changes" : "Add to the ledger"}</>}</button></div>
    </form>
    <div className="modal-footnote"><LockKeyhole size={11}/> Your entries stay on this device. Nothing is sent anywhere.</div>
  </section></div>;
}

function SettingsView({ settings, updateSettings, exportData, total, loadDemoData, deleteAllData }: { settings: Settings; updateSettings: (patch: Partial<Settings>) => void; exportData: () => void; total: number; loadDemoData: () => void; deleteAllData: () => void }) {
  return <div className="settings-layout">
    <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><Volume2 size={17}/></span><div><h3>Atmosphere & sound</h3><p>Decide how loudly the house should speak.</p></div></div>
      <SettingToggle title="Ambient atmosphere" description="A low, original synthesized room tone." checked={settings.ambience} onChange={(value) => updateSettings({ ambience: value })}/>
      <SettingToggle title="Interaction sounds" description="Subtle tones when records are created or laid to rest." checked={settings.effects} onChange={(value) => updateSettings({ effects: value })}/>
      <div className="setting-range"><div><strong>Sound intensity</strong><span>Keep the volume comfortable.</span></div><div className="range-control"><input type="range" min="0" max="70" aria-label="Sound intensity" value={Math.round(settings.volume * 100)} onChange={(event) => updateSettings({ volume: Number(event.target.value) / 100 })}/><b>{Math.round(settings.volume * 100)}%</b></div></div>
    </section>
    <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><SunMoon size={17}/></span><div><h3>Visual experience</h3><p>Keep the darkness comfortable and accessible.</p></div></div>
      <div className="setting-range"><div><strong>Motion</strong><span>Follow your device, or choose. Reduced motion stops drifting fog and animated transitions.</span></div><select className="field-control settings-select" aria-label="Motion" value={settings.motion} onChange={(event) => updateSettings({ motion: event.target.value as Settings["motion"] })}><option value="system">Follow my device</option><option value="reduced">Reduced</option><option value="full">Full</option></select></div>
      <div className="setting-range"><div><strong>Atmosphere</strong><span>How much fog, grain and drifting light is drawn.</span></div><select className="field-control settings-select" aria-label="Atmosphere" value={settings.intensity} onChange={(event) => updateSettings({ intensity: event.target.value as Settings["intensity"] })}><option value="full">Full haunted</option><option value="restrained">Restrained</option><option value="low">Low (no fog or grain)</option></select></div>
      <div className="setting-range"><div><strong>Default currency</strong><span>Pre-selected for new commitments. Totals are always kept per currency.</span></div><select className="field-control settings-select" aria-label="Default currency" value={settings.currency} onChange={(event) => updateSettings({ currency: event.target.value })}><option>ZAR</option><option>USD</option><option>GBP</option><option>EUR</option></select></div>
    </section>
    <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><Bell size={17}/></span><div><h3>Reminders</h3><p>In-app only. They appear while THE HAUNT is open.</p></div></div>
      <div className="setting-range"><div><strong>Reminder time</strong><span>Time of day a reminder becomes due.</span></div><input className="field-control settings-select" type="time" aria-label="Reminder time" value={settings.reminderTime} onChange={(event) => { if (event.target.value) updateSettings({ reminderTime: event.target.value }); }}/></div>
      <div className="setting-range"><div><strong>Default reminders</strong><span>Used for new commitments.</span></div><div className="reminder-chips">{[14, 7, 3, 1, 0].map((value) => <button type="button" key={value} aria-pressed={settings.defaultReminderOffsets.includes(value)} className={classNames("reminder-chip", settings.defaultReminderOffsets.includes(value) && "reminder-chip-active")} onClick={() => updateSettings({ defaultReminderOffsets: settings.defaultReminderOffsets.includes(value) ? settings.defaultReminderOffsets.filter((entry) => entry !== value) : [...settings.defaultReminderOffsets, value].sort((a, b) => b - a) })}>{value === 0 ? "On the day" : `${value}d`}</button>)}</div></div>
    </section>
    <section className="settings-card settings-data-card"><div className="settings-card-heading"><span className="settings-icon"><Shield size={17}/></span><div><h3>Your personal ledger</h3><p>This prototype stores commitments in this browser only.</p></div></div><div className="data-summary"><div><span>STORED RECORDS</span><strong>{total.toString().padStart(2, "0")}</strong></div><div><span>STORAGE MODE</span><strong>LOCAL</strong></div></div><div className="settings-actions"><button className="button-secondary" onClick={exportData}><Download size={14}/> Export my data</button><button className="button-secondary" onClick={loadDemoData}><Sparkles size={14}/> Load fictional demo data</button><button className="button-secondary button-danger" onClick={deleteAllData}><Trash2 size={14}/> Delete all my data</button><span><LockKeyhole size={12}/> No account or cloud sync is connected yet.</span></div><p className="data-note">Export saves your commitments, completion history, reminders and settings as a JSON file. There is no import yet. Delete removes everything stored in this browser, including backup copies.</p></section>
    <div className="prototype-note"><AlertTriangle size={15}/><p><strong>Prototype notice.</strong> Reminders appear inside the app only: there is no email, push, text-message or background delivery. AI document extraction, voice capture and cloud synchronisation are not connected in this first build. The current version demonstrates the working local commitment ledger and horror interface.</p></div>
  </div>;
}

function SettingToggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  const id = useId();
  return <div className="setting-toggle-row"><div><strong id={`${id}-name`}>{title}</strong><span id={`${id}-desc`}>{description}</span></div><button className={classNames("toggle-switch", checked && "toggle-switch-on")} role="switch" aria-checked={checked} aria-labelledby={`${id}-name`} aria-describedby={`${id}-desc`} onClick={() => onChange(!checked)}><span/></button></div>;
}
