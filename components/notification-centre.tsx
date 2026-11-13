"use client";

import { useEffect, useRef } from "react";
import { BellRing, FlaskConical, X } from "lucide-react";
import { diffDays, formatDateOnly } from "@/lib/domain/dates";
import type { Commitment, ReminderInstance } from "@/lib/domain/schema";

export type SnoozeChoice = "hour" | "tomorrow";

interface NotificationCentreProps {
  reminders: ReminderInstance[];
  commitments: Commitment[];
  today: string;
  locale: string;
  reminderTime: string;
  showTest: boolean;
  onClose: () => void;
  onSnooze: (id: string, choice: SnoozeChoice) => void;
  onDismiss: (id: string) => void;
  onOpen: (commitmentId: string) => void;
  onSendTest: () => void;
  onDismissTest: () => void;
}

function offsetText(days: number): string {
  return days === 0 ? "on the day" : `${days} day${days === 1 ? "" : "s"} before`;
}

/** In-app reminders only. Nothing here is sent by email, push or SMS. */
export function NotificationCentre(props: NotificationCentreProps) {
  const { reminders, commitments, today, locale, reminderTime, showTest, onClose } = props;
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    function handleKey(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const empty = reminders.length === 0 && !showTest;
  return (
    <>
      <button className="menu-dismiss notification-dismiss" aria-label="Close reminders" onClick={onClose} />
      <section className="notification-centre" ref={panelRef} tabIndex={-1} role="dialog" aria-label="Reminders">
        <div className="notification-head">
          <strong><BellRing size={14} /> Reminders</strong>
          <button className="icon-button tiny" onClick={onClose} aria-label="Close reminders"><X size={15} /></button>
        </div>
        <p className="notification-note">In-app only. These appear while THE HAUNT is open, at {reminderTime} on the chosen day. Nothing is sent by email, push or text message.</p>

        {showTest && (
          <article className="notification-item notification-test">
            <div>
              <span className="notification-state">TEST</span>
              <strong>This is a test reminder</strong>
              <span>No commitment is involved. Real reminders look like this, with a due date and a state.</span>
            </div>
            <div className="notification-actions"><button onClick={props.onDismissTest}>Dismiss</button></div>
          </article>
        )}

        {empty && <p className="notification-empty">Nothing is asking for your attention.</p>}

        <ul className="notification-list">
          {reminders.map((reminder) => {
            const commitment = commitments.find((item) => item.id === reminder.commitmentId);
            const days = diffDays(reminder.dueDate, today);
            const when = days < 0 ? `${Math.abs(days)} day${days === -1 ? "" : "s"} overdue` : days === 0 ? "due today" : `due in ${days} day${days === 1 ? "" : "s"}`;
            return (
              <li key={reminder.id} className="notification-item">
                <div>
                  <span className="notification-state">{reminder.state === "due" ? "NEW" : "SEEN"}</span>
                  <strong>{commitment?.title ?? "Commitment"}</strong>
                  <span>{formatDateOnly(reminder.dueDate, locale, { day: "numeric", month: "short" })} · {when} · reminder {offsetText(reminder.offsetDays)}</span>
                </div>
                <div className="notification-actions">
                  <button onClick={() => props.onOpen(reminder.commitmentId)}>Open</button>
                  <button onClick={() => props.onSnooze(reminder.id, "hour")}>Snooze 1 hour</button>
                  <button onClick={() => props.onSnooze(reminder.id, "tomorrow")}>Tomorrow</button>
                  <button onClick={() => props.onDismiss(reminder.id)}>Dismiss</button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="notification-foot">
          <button className="button-secondary" onClick={props.onSendTest}><FlaskConical size={13} /> Send test reminder</button>
        </div>
      </section>
    </>
  );
}
