import { useState } from "react";
import { MessageSquare, X, MessageCircle } from "lucide-react";
import { ColisCommentaires } from "@/components/colis-commentaires";
import { ModalPortal } from "@/components/modal-portal";
import { useAuth } from "@/hooks/use-auth";

export function ColisMessagesButton({ colis, count }: { colis: any; count?: number }) {
  const { role } = useAuth();
  const isStaff = !!role && role !== "client";
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"commentaires" | "notes">("commentaires");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Commentaires et notes internes"
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
      >
        <MessageSquare className="h-4 w-4" />
        {!!count && count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="shrink-0 font-bold">Messages</h2>
                  <span className="truncate rounded-md bg-info/15 px-2 py-0.5 font-mono text-sm font-bold text-info">
                    {colis.tracking}
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Fermer"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {isStaff ? (
                <div className="flex gap-1 border-b border-border px-5 pt-3">
                  <button
                    onClick={() => setTab("commentaires")}
                    className={`rounded-t-lg px-4 py-2 text-sm font-bold transition-colors ${
                      tab === "commentaires" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MessageCircle className="mr-1.5 inline h-4 w-4" /> Commentaires
                  </button>
                  <button
                    onClick={() => setTab("notes")}
                    className={`rounded-t-lg px-4 py-2 text-sm font-bold transition-colors ${
                      tab === "notes" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="mr-1.5 inline h-4 w-4" /> Notes internes
                  </button>
                </div>
              ) : null}

              <div className="max-h-[70vh] overflow-y-auto p-5">
                {isStaff && tab === "notes"
                  ? <ColisCommentaires colisId={colis.id} />
                  : <ColisCommentaires colisId={colis.id} visibleClient />}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}