import { createPortal } from "react-dom";

// Force le rendu d'une fenêtre modale à la racine du document,
// pour échapper aux ancêtres qui cassent position:fixed (backdrop-filter, transform...)
export function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}