import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, Package, Truck, XCircle, CircleCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  user_id: string;
  colis_id: string | null;
  type: string;
  title: string;
  message: string | null;
  tracking: string | null;
  read: boolean;
  created_at: string;
};

const TITLE_TO_ICON = (title: string) => {
  if (title.includes("livré") || title.includes("Livré")) return CircleCheck;
  if (title.includes("échou") || title.includes("Échou")) return XCircle;
  if (title.includes("cours") || title.includes("route")) return Truck;
  return Package;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    let mounted = true;
    setLoading(true);
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (mounted) {
          setItems((data as Notif[]) || []);
          setLoading(false);
        }
      });

    // Realtime: new + updates. Unique channel name per mount to avoid
    // re-using an already-subscribed channel (which throws
    // "cannot add postgres_changes callbacks after subscribe()").
    const ch = supabase
      .channel(`notifs-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notif;
          setItems((prev) => [n, ...prev].slice(0, 30));
          toast(n.title, { description: n.message ?? undefined });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notif;
          setItems((prev) => prev.map((x) => (x.id === n.id ? n : x)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const id = (payload.old as { id: string }).id;
          setItems((prev) => prev.filter((x) => x.id !== id));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(ch);
    };
  }, [user]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }

  async function markAllRead() {
    if (!user || unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  }

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full hover:bg-primary/10"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] overflow-hidden p-0"
      >
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
          <div>
            <div className="text-sm font-bold">Notifications</div>
            <div className="text-[11px] text-muted-foreground">
              {unread > 0 ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est à jour"}
            </div>
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tout marquer lu
            </Button>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
            </div>
          )}
          {!loading &&
            items.map((n) => {
              const Icon = TITLE_TO_ICON(n.title);
              const inner = (
                <div
                  className={cn(
                    "flex gap-3 border-b border-border/60 px-4 py-3 transition-colors hover:bg-accent/40",
                    !n.read && "bg-primary/[0.04]",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      n.read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm leading-tight", !n.read && "font-semibold")}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    {n.message && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.message}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{timeAgo(n.created_at)}</span>
                      {n.tracking && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{n.tracking}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
              return n.tracking ? (
                <Link
                  key={n.id}
                  to="/suivi"
                  search={{ t: n.tracking } as never}
                  onClick={() => {
                    void markRead(n.id);
                    setOpen(false);
                  }}
                  className="block"
                >
                  {inner}
                </Link>
              ) : (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void markRead(n.id)}
                  className="block w-full text-left"
                >
                  {inner}
                </button>
              );
            })}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border bg-muted/40 px-3 py-2 text-center">
            <Link
              to="/mes-colis"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Voir tous mes colis →
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Re-export markRead helper if other components need it later
export { Check };
