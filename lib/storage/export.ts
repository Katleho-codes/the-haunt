import { z } from "zod";
import {
  commitmentSchema, occurrenceSchema, reminderInstanceSchema, settingsSchema,
  type Commitment, type Occurrence, type ReminderInstance, type Settings,
} from "@/lib/domain/schema";

/**
 * The file a person downloads from "Export my data". It carries everything the app stores for them: commitments,
 * completion history, reminder records and settings. Import is not built yet; the schema exists so that a future
 * import validates the file before using any of it.
 */
export const EXPORT_VERSION = 1;

export const exportBundleSchema = z.object({
  app: z.literal("the-haunt"),
  version: z.literal(EXPORT_VERSION),
  exportedAt: z.string().datetime(),
  commitments: z.array(commitmentSchema),
  occurrences: z.array(occurrenceSchema),
  reminders: z.array(reminderInstanceSchema),
  settings: settingsSchema,
});
export type ExportBundle = z.infer<typeof exportBundleSchema>;

export function buildExportBundle(
  data: { commitments: Commitment[]; occurrences: Occurrence[]; reminders: ReminderInstance[]; settings: Settings },
  nowIso: string,
): ExportBundle {
  return exportBundleSchema.parse({ app: "the-haunt", version: EXPORT_VERSION, exportedAt: nowIso, ...data });
}
