import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "fr" | "ar";

type Dict = Record<string, { fr: string; ar: string }>;

export const t_dict: Dict = {
  // Nav
  "nav.home": { fr: "Accueil", ar: "الرئيسية" },
  "nav.services": { fr: "Services", ar: "الخدمات" },
  "nav.tarifs": { fr: "Tarifs", ar: "الأسعار" },
  "nav.zone": { fr: "Zone", ar: "المنطقة" },
  "nav.faq": { fr: "FAQ", ar: "الأسئلة" },
  "nav.suivi": { fr: "Suivi", ar: "التتبع" },
  "nav.bordereau": { fr: "Bordereau", ar: "الإيصال" },
  "nav.dashboard": { fr: "Dashboard", ar: "لوحة التحكم" },
  "nav.commander": { fr: "Commander", ar: "اطلب" },
  "nav.login": { fr: "Connexion", ar: "تسجيل الدخول" },
  "nav.signup": { fr: "Inscription", ar: "إنشاء حساب" },
  "nav.signout": { fr: "Sortir", ar: "خروج" },
  "nav.install": { fr: "Installer", ar: "تثبيت" },
  "nav.space.admin": { fr: "Admin", ar: "المسؤول" },
  "nav.space.livreur": { fr: "Livreur", ar: "السائق" },
  "nav.space.client": { fr: "Mon espace", ar: "حسابي" },
  "nav.quick.new": { fr: "Nouveau", ar: "جديد" },
  "nav.quick.mycolis": { fr: "Mes colis", ar: "طروداتي" },
  "nav.quick.myreturns": { fr: "Mes retours", ar: "إرجاعاتي" },
  "nav.quick.neworder": { fr: "Nouvelle commande", ar: "طلب جديد" },
  "nav.quick.myspace": { fr: "Mon espace", ar: "حسابي" },

  // Floating banner
  "fb.title": { fr: "REVO EXPRESS, l'excellence en mouvement.", ar: "ريفو إكسبرس، التميّز في حركة." },
  "fb.sub": { fr: "Livrez aujourd'hui, en toute confiance.", ar: "أرسل اليوم بكل ثقة." },
  "fb.cta": { fr: "Demander un livreur", ar: "اطلب سائقًا" },

  // Processus 4 étapes
  "pr.tag": { fr: "PROCESSUS", ar: "العملية" },
  "pr.title": { fr: "Une livraison simple en 4 étapes.", ar: "توصيل بسيط في 4 خطوات." },
  "pr.sub": { fr: "Un parcours clair pour que chaque client sache exactement ce qui se passe après sa demande.", ar: "مسار واضح حتى يعرف كل عميل ما يحدث بعد طلبه." },
  "pr.1.t": { fr: "Demande", ar: "الطلب" },
  "pr.1.x": { fr: "Le client renseigne les informations de livraison et reçoit une estimation.", ar: "يدخل العميل معلومات التوصيل ويستلم تقديرًا للسعر." },
  "pr.2.t": { fr: "Confirmation", ar: "التأكيد" },
  "pr.2.x": { fr: "Notre équipe vérifie les détails, confirme la course et organise l'enlèvement.", ar: "يتحقق فريقنا من التفاصيل ويؤكد المهمة وينظم الاستلام." },
  "pr.3.t": { fr: "Ramassage", ar: "الاستلام" },
  "pr.3.x": { fr: "Un livreur prend en charge le colis à l'adresse indiquée.", ar: "يستلم السائق الطرد من العنوان المحدد." },
  "pr.4.t": { fr: "Livraison", ar: "التسليم" },
  "pr.4.x": { fr: "Le colis est remis au destinataire avec professionnalisme et courtoisie.", ar: "يُسلَّم الطرد إلى المستلم باحترافية ولطف." },

  // FAQ
  "faq.tag": { fr: "FAQ", ar: "الأسئلة" },
  "faq.title": { fr: "Questions fréquentes.", ar: "أسئلة شائعة." },
  "faq.1.q": { fr: "Le prix affiché est-il définitif ?", ar: "هل السعر المعروض نهائي؟" },
  "faq.1.a": { fr: "Il s'agit d'une estimation. Le prix peut être confirmé selon le volume, l'urgence ou les contraintes de livraison.", ar: "هو تقدير. يمكن تأكيد السعر حسب الحجم والاستعجال أو قيود التوصيل." },
  "faq.2.q": { fr: "Travaillez-vous avec les commerces ?", ar: "هل تعملون مع المتاجر؟" },
  "faq.2.a": { fr: "Oui, nous proposons des solutions flexibles pour les commerces, boutiques en ligne et entreprises.", ar: "نعم، نقدم حلولاً مرنة للمتاجر والمحلات الإلكترونية والشركات." },
  "faq.3.q": { fr: "Livrez-vous les documents ?", ar: "هل توصلون الوثائق؟" },
  "faq.3.a": { fr: "Oui, nous prenons en charge les documents, plis administratifs et petits colis.", ar: "نعم، نتكفّل بالوثائق والمراسلات الإدارية والطرود الصغيرة." },
  "faq.4.q": { fr: "Peut-on programmer des tournées régulières ?", ar: "هل يمكن جدولة جولات منتظمة؟" },
  "faq.4.a": { fr: "Oui, nos prestations peuvent s'adapter à une fréquence régulière selon les besoins.", ar: "نعم، يمكن تكييف خدماتنا حسب وتيرة منتظمة وفق الحاجة." },

  // Zone
  "zn.tag": { fr: "ZONE", ar: "المنطقة" },
  "zn.title": { fr: "Toute la wilaya d'Alger couverte.", ar: "تغطية كاملة لولاية الجزائر." },
  "zn.sub": { fr: "38 communes desservies avec des tarifs transparents par zone.", ar: "38 بلدية مغطاة بأسعار شفافة حسب المنطقة." },

  // Hero
  "hero.badge": { fr: "Livraison same-day à Alger", ar: "توصيل في نفس اليوم بالجزائر" },
  "hero.title.1": { fr: "L'excellence", ar: "التميّز" },
  "hero.title.2": { fr: "en mouvement", ar: "في حركة دائمة" },
  "hero.sub": {
    fr: "Livrez aujourd'hui, en toute confiance. Prise en charge en 30 minutes, suivi temps réel, tarifs transparents.",
    ar: "أرسل اليوم بكل ثقة. الاستلام خلال 30 دقيقة، تتبع لحظي، أسعار شفافة.",
  },
  "hero.cta.order": { fr: "Demander un livreur", ar: "اطلب سائقًا" },
  "hero.cta.track": { fr: "Suivre mon colis", ar: "تتبع طردي" },
  "hero.stat.pickup": { fr: "Prise en charge", ar: "الاستلام" },
  "hero.stat.sameday": { fr: "Same-day", ar: "نفس اليوم" },
  "hero.stat.communes": { fr: "Communes", ar: "بلديات" },
  "hero.card.status": { fr: "Livraison en cours", ar: "جارٍ التوصيل" },
  "hero.step.1": { fr: "Colis enregistré", ar: "تم تسجيل الطرد" },
  "hero.step.2": { fr: "Pris en charge", ar: "تم الاستلام" },
  "hero.step.3": { fr: "En cours de livraison", ar: "في طريق التوصيل" },
  "hero.step.4": { fr: "Livré", ar: "تم التسليم" },

  // Services
  "sv.title.1": { fr: "Une logistique", ar: "لوجستيك" },
  "sv.title.2": { fr: "sans friction", ar: "بدون عقبات" },
  "sv.sub": { fr: "Trois piliers pour livrer vite, bien et au juste prix.", ar: "ثلاث ركائز للتوصيل بسرعة وجودة وسعر مناسب." },
  "sv.1.t": { fr: "Same-day garanti", ar: "ضمان نفس اليوم" },
  "sv.1.x": { fr: "Prise en charge sous 30 minutes, livraison avant la fin de la journée.", ar: "استلام خلال 30 دقيقة، توصيل قبل نهاية اليوم." },
  "sv.2.t": { fr: "Suivi temps réel", ar: "تتبع لحظي" },
  "sv.2.x": { fr: "Visualisez chaque étape de la livraison, du dépôt au destinataire.", ar: "تتبع كل مراحل التوصيل من الإيداع إلى المستلم." },
  "sv.3.t": { fr: "Sécurité totale", ar: "أمان كامل" },
  "sv.3.x": { fr: "Bordereau, QR code et code-barres pour une traçabilité complète.", ar: "إيصال ورمز QR وباركود لتتبع كامل." },

  // How
  "how.title": { fr: "Comment ça marche", ar: "كيف يعمل" },
  "how.sub": { fr: "3 étapes, c'est tout.", ar: "ثلاث خطوات فقط." },
  "how.1.t": { fr: "Commandez", ar: "اطلب" },
  "how.1.x": { fr: "Remplissez le formulaire en 60 secondes. Un bordereau est généré.", ar: "املأ النموذج في 60 ثانية. يتم إنشاء إيصال." },
  "how.2.t": { fr: "On récupère", ar: "نستلم" },
  "how.2.x": { fr: "Un livreur passe sous 30 minutes pour la prise en charge.", ar: "يمر السائق خلال 30 دقيقة للاستلام." },
  "how.3.t": { fr: "Livré", ar: "تم التسليم" },
  "how.3.x": { fr: "Le destinataire reçoit le colis, vous êtes notifié.", ar: "يستلم المرسل إليه الطرد، ويتم إشعارك." },

  // Final CTA
  "cta.title": { fr: "Prêt à livrer aujourd'hui ?", ar: "هل أنت مستعد للإرسال اليوم؟" },
  "cta.sub": { fr: "À partir de 300 DA. Sans engagement.", ar: "ابتداءً من 300 دج. بدون التزام." },
  "cta.btn": { fr: "Commander maintenant", ar: "اطلب الآن" },

  // Footer
  "ft.tag": { fr: "Livraison same-day rapide, fiable et sécurisée à Alger.", ar: "توصيل سريع وآمن في نفس اليوم بالجزائر." },
  "ft.nav": { fr: "Navigation", ar: "التنقل" },
  "ft.account": { fr: "Compte", ar: "الحساب" },
  "ft.contact": { fr: "Contact", ar: "اتصل بنا" },
  "ft.rights": { fr: "Tous droits réservés", ar: "جميع الحقوق محفوظة" },

  // Services strip (offre complète)
  "of.title.1": { fr: "Nos services", ar: "خدماتنا" },
  "of.title.2": { fr: "tout inclus", ar: "كل شيء مشمول" },
  "of.sub": { fr: "Une offre logistique complète pour e-commerçants et particuliers.", ar: "عرض لوجستي كامل لأصحاب المتاجر الإلكترونية والأفراد." },
  "of.1.t": { fr: "Same-day delivery", ar: "التوصيل في نفس اليوم" },
  "of.1.x": { fr: "Commande avant midi, livrée avant la fin de la journée.", ar: "اطلب قبل الظهر، يُسلَّم قبل نهاية اليوم." },
  "of.2.t": { fr: "Retour gratuit", ar: "إرجاع مجاني" },
  "of.2.x": { fr: "Colis refusé ou non livré ? Le retour à l'expéditeur est offert.", ar: "إذا رُفض الطرد، الإرجاع إلى المرسل مجاني." },
  "of.3.t": { fr: "COD — Cash on Delivery", ar: "الدفع عند الاستلام" },
  "of.3.x": { fr: "Encaissement à la livraison, reversement rapide au marchand.", ar: "تحصيل المبلغ عند التسليم وتحويل سريع للتاجر." },
  "of.4.t": { fr: "3 tentatives par jour", ar: "3 محاولات في اليوم" },
  "of.4.x": { fr: "On rappelle et on repasse jusqu'à 3 fois pour livrer.", ar: "نتصل ونعيد المرور حتى 3 مرات للتسليم." },
  "of.5.t": { fr: "Créneaux flexibles", ar: "مواعيد مرنة" },
  "of.5.x": { fr: "Le destinataire choisit le moment qui l'arrange.", ar: "يختار المستلم الوقت المناسب." },
  "of.6.t": { fr: "Couverture 38 communes", ar: "تغطية 38 بلدية" },
  "of.6.x": { fr: "Tout Alger desservi, tarifs transparents par zone.", ar: "كل الجزائر العاصمة مغطاة، أسعار شفافة حسب المنطقة." },

  // Commander
  "cmd.title": { fr: "Commander une livraison", ar: "اطلب توصيلاً" },
  "cmd.sub": { fr: "Remplissez le formulaire — votre bordereau est généré instantanément.", ar: "املأ النموذج — يُنشأ الإيصال فورًا." },
  "cmd.login.title": { fr: "Connectez-vous pour commander", ar: "سجّل الدخول للطلب" },
  "cmd.login.sub": { fr: "Créez un compte gratuit en 30 secondes pour passer commande et suivre vos livraisons.", ar: "أنشئ حسابًا مجانيًا في 30 ثانية لتقديم طلبك ومتابعة شحناتك." },
  "cmd.signup": { fr: "Créer un compte", ar: "إنشاء حساب" },
  "cmd.ok": { fr: "Commande enregistrée", ar: "تم تسجيل الطلب" },
  "cmd.tracking": { fr: "Numéro de suivi", ar: "رقم التتبع" },
  "cmd.print": { fr: "Imprimer le bordereau", ar: "طباعة الإيصال" },
  "cmd.follow": { fr: "Suivre ce colis", ar: "تتبع هذا الطرد" },
  "cmd.new": { fr: "Nouvelle commande", ar: "طلب جديد" },
  "cmd.sender": { fr: "Expéditeur", ar: "المرسِل" },
  "cmd.recipient": { fr: "Destinataire", ar: "المستلم" },
  "cmd.details": { fr: "Détails du colis", ar: "تفاصيل الطرد" },
  "cmd.trip": { fr: "Trajet & prix", ar: "المسار والسعر" },
  "cmd.fullname": { fr: "Nom complet", ar: "الاسم الكامل" },
  "cmd.phone": { fr: "Téléphone", ar: "الهاتف" },
  "cmd.address": { fr: "Adresse complète", ar: "العنوان الكامل" },
  "cmd.wilaya": { fr: "Wilaya", ar: "الولاية" },
  "cmd.zip": { fr: "Code postal", ar: "الرمز البريدي" },
  "cmd.price": { fr: "Prix du colis (DA)", ar: "سعر الطرد (دج)" },
  "cmd.price.hint": { fr: "Montant à encaisser auprès du destinataire (COD).", ar: "المبلغ المُحصَّل من المستلم (الدفع عند الاستلام)." },
  "cmd.desc": { fr: "Description (facultatif)", ar: "الوصف (اختياري)" },
  "cmd.desc.ph": { fr: "Documents, vêtements, électronique...", ar: "وثائق، ملابس، إلكترونيات..." },
  "cmd.from": { fr: "Commune de départ", ar: "بلدية الانطلاق" },
  "cmd.to": { fr: "Commune d'arrivée", ar: "بلدية الوصول" },
  "cmd.choose": { fr: "— Choisir —", ar: "— اختر —" },
  "cmd.est": { fr: "Estimation", ar: "التقدير" },
  "cmd.distance": { fr: "Distance", ar: "المسافة" },
  "cmd.choose.both": { fr: "Sélectionnez les deux communes", ar: "اختر البلديتين" },
  "cmd.submit": { fr: "Valider & générer le bordereau", ar: "تأكيد وإنشاء الإيصال" },
  "cmd.err.calc": { fr: "Impossible de calculer le prix", ar: "تعذر حساب السعر" },
  "cmd.err.login": { fr: "Connectez-vous d'abord", ar: "سجّل الدخول أولاً" },
  "cmd.err.create": { fr: "Erreur création", ar: "خطأ في الإنشاء" },
  "cmd.ok.toast": { fr: "Colis créé", ar: "تم إنشاء الطرد" },
  "cmd.type": { fr: "Type de livraison", ar: "نوع التوصيل" },
  "cmd.type.std": { fr: "Standard", ar: "عادي" },
  "cmd.type.std.x": { fr: "Forfait 500 DA — toutes distances", ar: "سعر ثابت 500 دج — لجميع المسافات" },
  "cmd.type.urg": { fr: "Urgent", ar: "مستعجل" },
  "cmd.type.urg.x": { fr: "Tarif selon la distance — prise en charge prioritaire", ar: "السعر حسب المسافة — استلام بالأولوية" },

  // Bordereau (printable)
  "bd.sender": { fr: "EXPÉDITEUR", ar: "المرسِل" },
  "bd.recipient": { fr: "DESTINATAIRE", ar: "المستلم" },
  "bd.tel": { fr: "Tél", ar: "هاتف" },
  "bd.desc": { fr: "Description", ar: "الوصف" },
  "bd.desc.default": { fr: "Colis standard", ar: "طرد قياسي" },
  "bd.from": { fr: "Départ", ar: "الانطلاق" },
  "bd.cod": { fr: "Prix du colis (COD)", ar: "سعر الطرد (الدفع عند الاستلام)" },
  "bd.fees": { fr: "Frais livraison", ar: "رسوم التوصيل" },
  "bd.type": { fr: "Type de livraison", ar: "نوع التوصيل" },
  "bd.total": { fr: "Total à encaisser", ar: "المجموع المُحصَّل" },
  "bd.keep": { fr: "Conservez ce bordereau jusqu'à la livraison", ar: "احتفظ بهذا الإيصال حتى التسليم" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof t_dict) => string };
const I18nContext = createContext<Ctx | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default fr on SSR + first client render to avoid hydration mismatch
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("revo_lang")) as Lang | null;
    if (stored === "ar" || stored === "fr") setLangState(stored);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("revo_lang", l);
  };

  const t = (k: keyof typeof t_dict) => t_dict[k]?.[lang] ?? String(k);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
