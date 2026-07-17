// Bouton WhatsApp flottant, visible en bas à droite de toutes les pages.
import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "213793461877"; // +213 793 46 18 77

export function WhatsappButton() {
  return (
    <a
      href={"https://wa.me/" + WHATSAPP_NUMBER}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous contacter sur WhatsApp"
      title="Nous contacter sur WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}