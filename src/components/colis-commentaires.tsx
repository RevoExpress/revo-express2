import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Send, Reply, Pencil, Trash2, Loader2, Tag as TagIcon, Store, Headset } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ajouterCommentaire, listCommentaires, modifierCommentaire, supprimerCommentaire,
} from "@/lib/commentaires.functions";

const TAGS: { value: string; label: string; cls: string }[] = [
  { value: "reclamation",          label: "Réclamation",         cls: "bg-destructive/15 text-destructive" },
  { value: "demande_client",       label: "Demande client",      cls: "bg-info/15 text-info" },
  { value: "pb_operations",        label: "Pb opérations",       cls: "bg-warning/15 text-warning" },
  { value: "remarque_commerciale", label: "Remarque commerciale",cls: "bg-primary/15 text-primary" },
  { value: "autre",                label: "Autre",               cls: "bg-muted text-foreground" },
];
const tagInfo = (v?: string | null) => TAGS.find((t) => t.value === v);

type Commentaire = {
  id: string; colis_id: string; auteur_id: string | null; auteur_nom: string | null;
  contenu: string; tag: string | null; parent_id: string | null;
  created_at: string; updated_at: string;
};

// visibleClient=false (défaut) → Notes internes, comme avant, staff uniquement
// visibleClient=true → Commentaires partagés, visibles et modifiables par le client aussi
export function ColisCommentaires({ colisId, visibleClient = false }: { colisId: string; visibleClient?: boolean }) {
  const listFn = useServerFn(listCommentaires);
  const addFn = useServerFn(ajouterCommentaire);
  const editFn = useServerFn(modifierCommentaire);
  const delFn = useServerFn(supprimerCommentaire);

  const [items, setItems] = useState<Commentaire[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contenu, setContenu] = useState("");
  const [tag, setTag] = useState<string>("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      const r = await listFn({ data: { colis_id: colisId, visible_client: visibleClient } });
      setItems(r.commentaires as Commentaire[]);
      setMe(r.me);
      setClientId(r.clientId ?? null);
    } catch (e: any) {
      // Pas d'accès : on n'affiche rien
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [colisId, visibleClient]);

  async function send() {
    if (!contenu.trim()) return;
    setSending(true);
    try {
      await addFn({
        data: {
          colis_id: colisId, contenu: contenu.trim(),
          tag: tag || undefined, parent_id: replyTo || undefined,
          visible_client: visibleClient,
        },
      });
      setContenu(""); setTag(""); setReplyTo(null);
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  }

  async function saveEdit(id: string) {
    try {
      await editFn({ data: { id, contenu: editText.trim() } });
      setEditId(null); setEditText("");
      await load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    try { await delFn({ data: { id } }); await load(); }
    catch (e: any) { toast.error(e.message); }
  }

  const racines = items.filter((c) => !c.parent_id);
  const reponses = (pid: string) => items.filter((c) => c.parent_id === pid);

  if (loading) {
    return <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>;
  }

  const titre = visibleClient ? "Commentaires" : "Notes internes";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold">
        <MessageSquare className="h-5 w-5 text-primary" /> {titre} ({items.length})
      </h3>

      <div className="space-y-3">
        {racines.map((c) => (
          <div key={c.id} className="rounded-xl border border-border/60 bg-background p-3">
            <CommentBody
              c={c} me={me} clientId={clientId} visibleClient={visibleClient}
              onReply={() => { setReplyTo(c.id); }}
              onEdit={() => { setEditId(c.id); setEditText(c.contenu); }}
              onDelete={() => remove(c.id)}
              editing={editId === c.id}
              editText={editText} setEditText={setEditText}
              onSaveEdit={() => saveEdit(c.id)}
            />
            {reponses(c.id).length > 0 && (
              <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
                {reponses(c.id).map((r) => (
                  <CommentBody
                    key={r.id} c={r} me={me} clientId={clientId} visibleClient={visibleClient}
                    onEdit={() => { setEditId(r.id); setEditText(r.contenu); }}
                    onDelete={() => remove(r.id)}
                    editing={editId === r.id}
                    editText={editText} setEditText={setEditText}
                    onSaveEdit={() => saveEdit(r.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        {!racines.length && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {visibleClient ? "Aucun commentaire pour ce colis." : "Aucune note interne pour ce colis."}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background p-3">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>↳ En réponse à un commentaire</span>
            <button onClick={() => setReplyTo(null)} className="text-primary hover:underline">Annuler</button>
          </div>
        )}
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder={visibleClient ? "Écrire un commentaire…" : "Écrire une note interne…"}
          rows={2}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {/* Les tags (réclamation, pb opérations...) restent réservés aux notes internes */}
          {!visibleClient ? (
            <div className="flex flex-wrap items-center gap-1">
              <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
              {TAGS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTag(tag === t.value ? "" : t.value)}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                    tag === t.value ? t.cls + " ring-1 ring-current" : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : <span />}
          <Button size="sm" onClick={send} disabled={sending || !contenu.trim()}
            className="bg-gradient-primary text-white hover:opacity-95">
            {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommentBody({
  c, me, clientId, visibleClient, onReply, onEdit, onDelete, editing, editText, setEditText, onSaveEdit,
}: {
  c: Commentaire; me: string | null; clientId: string | null; visibleClient: boolean;
  onReply?: () => void; onEdit: () => void; onDelete: () => void;
  editing: boolean; editText: string; setEditText: (s: string) => void; onSaveEdit: () => void;
}) {
  const t = tagInfo(c.tag);
  const mine = me && c.auteur_id === me;
  const estLeClient = visibleClient && clientId && c.auteur_id === clientId;
  const date = new Date(c.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {visibleClient && (estLeClient
            ? <Store className="h-3.5 w-3.5 text-info" />
            : <Headset className="h-3.5 w-3.5 text-primary" />)}
          <span className="text-sm font-semibold">{c.auteur_nom ?? "—"}</span>
          {visibleClient && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${estLeClient ? "bg-info/15 text-info" : "bg-primary/15 text-primary"}`}>
              {estLeClient ? "Client" : "Équipe Revo"}
            </span>
          )}
          {t && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${t.cls}`}>{t.label}</span>}
          <span className="text-[11px] text-muted-foreground">{date}</span>
        </div>
        <div className="flex items-center gap-1">
          {onReply && (
            <button onClick={onReply} title="Répondre" className="text-muted-foreground hover:text-primary">
              <Reply className="h-3.5 w-3.5" />
            </button>
          )}
          {mine && !editing && (
            <>
              <button onClick={onEdit} title="Modifier" className="text-muted-foreground hover:text-primary">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={onDelete} title="Supprimer" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      {editing ? (
        <div className="mt-1">
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2}
            className="w-full resize-none rounded-md border border-input bg-background px-2 py-1 text-sm" />
          <div className="mt-1 flex gap-2">
            <Button size="sm" onClick={onSaveEdit}>Enregistrer</Button>
          </div>
        </div>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{c.contenu}</p>
      )}
    </div>
  );
}