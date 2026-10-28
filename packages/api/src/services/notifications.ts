import { NOTIFICATION_KINDS, type AppNotification, type NotificationKind } from "@madrasty/core";
import type { Json } from "../database.types";
import type { TypedSupabaseClient } from "../client";
import { unwrap } from "../errors";

function isKind(value: string): value is NotificationKind {
  return (NOTIFICATION_KINDS as readonly string[]).includes(value);
}

function toData(value: Json): AppNotification["data"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string | number | boolean | null] =>
        entry[1] === null || ["string", "number", "boolean"].includes(typeof entry[1]),
    ),
  );
}

/**
 * The signed-in user's inbox. Rows are written by DB triggers only; RLS lets recipients read
 * theirs and change nothing but `read_at`.
 */
export function createNotificationsService(client: TypedSupabaseClient) {
  return {
    async list(limit = 20): Promise<AppNotification[]> {
      const rows = unwrap(
        await client
          .from("notifications")
          .select("id, kind, data, read_at, created_at")
          .order("created_at", { ascending: false })
          .limit(limit),
      );
      return rows.flatMap((row) =>
        isKind(row.kind)
          ? [{ id: row.id, kind: row.kind, data: toData(row.data), readAt: row.read_at, createdAt: row.created_at }]
          : [],
      );
    },

    async unreadCount(): Promise<number> {
      const { count, error } = await client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      unwrap({ data: null, error });
      return count ?? 0;
    },

    async markRead(ids: string[]): Promise<void> {
      if (ids.length === 0) return;
      unwrap(
        await client
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .in("id", ids)
          .is("read_at", null),
      );
    },

    async markAllRead(): Promise<void> {
      unwrap(
        await client
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .is("read_at", null),
      );
    },
  };
}

export type NotificationsService = ReturnType<typeof createNotificationsService>;
