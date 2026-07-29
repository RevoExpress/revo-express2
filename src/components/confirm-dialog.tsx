import { useSyncExternalStore } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmRequest = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  resolve: (ok: boolean) => void;
};

let current: ConfirmRequest | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  return current;
}
function emit() {
  for (const listener of listeners) listener();
}

/** Promise-based replacement for `window.confirm()`, rendered via `<ConfirmDialogHost />` mounted once at the app root. */
export function confirmAction(options: {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    current = { ...options, resolve };
    emit();
  });
}

export function ConfirmDialogHost() {
  const request = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  function settle(ok: boolean) {
    request?.resolve(ok);
    current = null;
    emit();
  }

  return (
    <AlertDialog open={!!request} onOpenChange={(open) => { if (!open) settle(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.description ? (
            <AlertDialogDescription className="whitespace-pre-line">
              {request.description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>
            {request?.cancelLabel ?? "Annuler"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => settle(true)}
            className={request?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            {request?.confirmLabel ?? "Confirmer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
