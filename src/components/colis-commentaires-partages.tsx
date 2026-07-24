import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Send, Trash2, Loader2, Store, Headset } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  listCommentairesPartages, ajouterCommentairePartage, supprimerCommentairePartage,
} from "@/lib/commentaires-partages.functions";

type CommentairePartage = {
  id: string; auteur_id: string; auteur_nom: string | null;
  auteur_est_staff: boolean; contenu: string; created_at: string;
};

export function ColisCommentairesPartages({ colisId }: { colisId: string }) {
  const listFn = useServerFn(listCommentairesPartages);
  const addFn = useServerFn(ajouterCommentairePartage);
  const delFn = useServerFn(supprimerCommentairePartage);

  const [items, setItems] = useState<CommentairePartage[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contenu, setContenu] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      const r = await listFn({ data: { colis_id: colisId } });
      setItems(r.commentaires as CommentairePartage[]);
      setMe(r.me);
    } catch (e: any) {
      toast.error(e.message ?? "Impossible de charger les commentaires");
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [colisId]);

  async function send() {
    if (!contenu.trim()) return;
    setSending(true);
    try {
      await addFn({ data: { colis_id: colisId, contenu: contenu.trim() } });
      setContenu("");
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  }

  async function remove(id: string) {
    try { await delFn({ data: { id } }); await load(); }
    catch (e: any) { toast.error(e.message); }
  }

  if (loading) {
    return <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>;
  }

  return (
    <div>
      <div className="space-y-3">
        {items.map((c) => {
          const mine = me && c.auteur_id === me;
          const date = new Date(c.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
          return (
            <div key={c.id} className="rounded-xl border border-border/60 bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {c.auteur_est_staff
                    ? <Headset className="h-3.5 w-3.5 text-primary" />
                    : <Store className="h-3.5 w-3.5 text-info" />}
                  <span className="text-sm font-semibold">{c.auteur_nom ?? "—"}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.auteur_est_staff ? "bg-primary/15 text-primary" : "bg-info/15 text-info"}`}>
                    {c.auteur_est_staff ? "Équipe Revo" : "Client"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{date}</span>
                </div>
                {mine && (
                  <button onClick={() => remove(c.id)} title="Supprimer" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{c.contenu}</p>
            </div>
          );
        })}
        {!items.length && (
          <p className="py-4 text-center text-sm text-muted-foreground">Aucun commentaire pour ce colis.</p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background p-3">
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Écrire un commentaire…"
          rows={2}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={send} disabled={sending || !contenu.trim()} className="bg-gradient-primary text-white hover:opacity-95">
            {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}