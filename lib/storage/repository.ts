import type { Commitment, Settings } from "@/lib/domain/schema";

/**
 * Persistence boundary. Every call takes a userId so a server-backed
 * implementation can replace the local one without changing callers.
 * Implementations must never return or modify another user's records.
 */
export interface CommitmentRepository {
  list(userId: string): Promise<Commitment[]>;
  get(userId: string, id: string): Promise<Commitment | undefined>;
  /** Insert or update. Rejects when `commitment.userId` differs from `userId`. */
  save(userId: string, commitment: Commitment): Promise<void>;
  remove(userId: string, id: string): Promise<boolean>;
  replaceAll(userId: string, commitments: Commitment[]): Promise<void>;
  getSettings(userId: string): Promise<Settings>;
  saveSettings(userId: string, settings: Settings): Promise<void>;
  /** Remove every record and setting for this user. */
  deleteAll(userId: string): Promise<void>;
}

export type LoadStatus =
  | { kind: "empty" }
  | { kind: "loaded" }
  | { kind: "migrated"; rejected: number; notes: string[] }
  | { kind: "corrupt"; backupKey: string };
