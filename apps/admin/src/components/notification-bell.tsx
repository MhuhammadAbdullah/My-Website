"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button, Popover, PopoverContent, PopoverTrigger, Skeleton, toast } from "@agency/ui";
import { request } from "@/lib/api";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 30_000;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = React.useState<NotificationItem[] | null>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(() => {
    request<{ items: NotificationItem[]; unreadCount: number }>("/notifications?limit=20")
      .then((r) => {
        setItems(r.items);
        setUnreadCount(r.unreadCount);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    load();
    // Polling, not a websocket -- this app has no realtime transport
    // anywhere else, and a 30s bell-badge lag is an acceptable tradeoff
    // against introducing one just for this.
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) load();
  }

  async function handleItemClick(item: NotificationItem) {
    setOpen(false);
    if (!item.isRead) {
      setItems((prev) => prev?.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)) ?? null);
      setUnreadCount((c) => Math.max(0, c - 1));
      request(`/notifications/${item.id}/read`, { method: "PATCH" }).catch(() => {});
    }
    if (item.linkUrl) router.push(item.linkUrl);
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
    setUnreadCount(0);
    try {
      await request("/notifications/read-all", { method: "POST" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      load();
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative size-11">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-error-500 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <p className="text-body-sm font-semibold text-heading">Notifications</p>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-label text-accent-600 hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!items ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-body-sm text-neutral-400">No notifications yet.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="flex w-full gap-2.5 border-b border-neutral-50 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
              >
                <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.isRead ? "bg-transparent" : "bg-accent-500"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-medium text-heading">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-body-sm text-neutral-500">{item.body}</p>
                  <p className="mt-1 text-label text-neutral-400">{timeAgo(item.createdAt)}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
