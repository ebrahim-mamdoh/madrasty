"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBrowserServices } from "@/lib/services.client";

export const notificationsQueryKey = ["notifications"] as const;

const notifications = () => getBrowserServices().notifications;

/** Polled (and refreshed on focus) so new alerts show up without a reload. */
const POLL_MS = 60_000;

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: [...notificationsQueryKey, "list"],
    queryFn: () => notifications().list(),
    enabled,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: [...notificationsQueryKey, "unread"],
    queryFn: () => notifications().unreadCount(),
    refetchInterval: POLL_MS,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[] | "all") =>
      ids === "all" ? notifications().markAllRead() : notifications().markRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });
}
