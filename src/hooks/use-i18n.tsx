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
  "a11y.toggle.short": { fr: "Accessibilité", ar: "إتاحة" },
  "a11y.toggle.on": { fr: "Activer le mode grands caractères et contraste élevé", ar: "تفعيل وضع الأحرف الكبيرة والتباين العالي" },
  "a11y.toggle.off": { fr: "Désactiver le mode grands caractères et contraste élevé", ar: "إيقاف وضع الأحرف الكبيرة والتباين العالي" },
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

  // Common / shared words
  "common.actions": { fr: "Actions", ar: "إجراءات" },
  "common.print": { fr: "Imprimer", ar: "طباعة" },
  "common.export": { fr: "Exporter", ar: "تصدير" },
  "common.all": { fr: "Tous", ar: "الكل" },
  "common.reset": { fr: "Réinitialiser", ar: "إعادة تعيين" },
  "common.close": { fr: "Fermer", ar: "إغلاق" },
  "common.cancel": { fr: "Annuler", ar: "إلغاء" },
  "common.confirm": { fr: "Confirmer", ar: "تأكيد" },
  "common.save": { fr: "Enregistrer", ar: "حفظ" },
  "common.send": { fr: "Envoyer", ar: "إرسال" },
  "common.edit": { fr: "Modifier", ar: "تعديل" },
  "common.delete": { fr: "Supprimer", ar: "حذف" },
  "common.copy": { fr: "Copier", ar: "نسخ" },
  "common.colis": { fr: "colis", ar: "طرد" },
  "common.selected": { fr: "sélectionné(s)", ar: "محدد" },
  "common.perPage": { fr: "Par page :", ar: "لكل صفحة:" },
  "common.pageOf": { fr: "Page {n} / {m}", ar: "الصفحة {n} / {m}" },
  "common.loading": { fr: "Chargement…", ar: "جارٍ التحميل…" },
  "common.details": { fr: "Détails", ar: "التفاصيل" },
  "common.viewDetails": { fr: "Voir les détails", ar: "عرض التفاصيل" },
  "common.viewHistory": { fr: "Voir l'historique", ar: "عرض السجل" },
  "common.standard": { fr: "Standard", ar: "عادي" },
  "common.urgent": { fr: "Urgent", ar: "مستعجل" },

  // Statuts colis
  "st.en-preparation": { fr: "En préparation", ar: "قيد التحضير" },
  "st.ramasse": { fr: "Ramassé", ar: "تم الاستلام" },
  "st.expedie": { fr: "Expédié", ar: "تم الشحن" },
  "st.en-livraison": { fr: "En livraison", ar: "قيد التوصيل" },
  "st.contact-client": { fr: "Contact client", ar: "الاتصال بالعميل" },
  "st.client-injoignable-1": { fr: "Client injoignable 1", ar: "تعذر الاتصال بالعميل 1" },
  "st.client-injoignable-2": { fr: "Client injoignable 2", ar: "تعذر الاتصال بالعميل 2" },
  "st.client-injoignable-3": { fr: "Client injoignable 3", ar: "تعذر الاتصال بالعميل 3" },
  "st.livre": { fr: "Livré", ar: "تم التسليم" },
  "st.livre.paye": { fr: "Livré (payé)", ar: "تم التسليم (مدفوع)" },
  "st.paye.badge": { fr: "Payé", ar: "مدفوع" },
  "st.reporte": { fr: "Reporté", ar: "مؤجل" },
  "st.echec-livraison": { fr: "Échec de livraison", ar: "فشل التسليم" },
  "st.retourne-vendeur": { fr: "Retourné au vendeur", ar: "أعيد إلى البائع" },
  "st.annule": { fr: "Annulé", ar: "ملغى" },

  // Mes colis
  "mc.dashboard": { fr: "Tableau de bord", ar: "لوحة التحكم" },
  "mc.title": { fr: "Mes colis", ar: "طروداتي" },
  "mc.subtitle": { fr: "Suivez, imprimez et exportez tous vos bordereaux.", ar: "تابع واطبع وصدّر جميع إيصالاتك." },
  "dash.subtitle": { fr: "Vue d'ensemble de votre activité et de vos performances.", ar: "نظرة عامة على نشاطك وأدائك." },
  "mc.newOrder": { fr: "Nouvelle commande", ar: "طلب جديد" },
  "mc.importExcel": { fr: "Importer depuis Excel", ar: "استيراد من Excel" },
  "mc.requestPickup": { fr: "Demander un ramassage", ar: "طلب استلام" },
  "mc.stat.total": { fr: "Total", ar: "المجموع" },
  "mc.stat.enCours": { fr: "En cours", ar: "قيد التنفيذ" },
  "mc.stat.livres": { fr: "Livrés", ar: "تم تسليمها" },
  "mc.stat.echecs": { fr: "Échecs", ar: "فاشلة" },
  "mc.stat.cod": { fr: "COD encaissé", ar: "الدفع عند الاستلام المُحصَّل" },
  "mc.search.ph": { fr: "Tracking, nom, téléphone, commune...", ar: "التتبع، الاسم، الهاتف، البلدية..." },
  "mc.allTypes": { fr: "Tous les types", ar: "جميع الأنواع" },
  "mc.allCommunes": { fr: "Toutes les communes", ar: "جميع البلديات" },
  "mc.communeTitle": { fr: "Commune (Alger)", ar: "البلدية (الجزائر)" },
  "mc.dateFrom": { fr: "Date du", ar: "من تاريخ" },
  "mc.dateTo": { fr: "Date au", ar: "إلى تاريخ" },
  "mc.empty.none": { fr: "Aucun colis", ar: "لا يوجد طرود" },
  "mc.empty.noResult": { fr: "Aucun résultat", ar: "لا توجد نتائج" },
  "mc.empty.startCta": { fr: "Passez votre première commande pour commencer.", ar: "قم بأول طلب لك للبدء." },
  "mc.empty.changeFilters": { fr: "Modifiez vos filtres pour voir d'autres colis.", ar: "عدّل الفلاتر لرؤية طرود أخرى." },
  "mc.empty.order": { fr: "Commander", ar: "اطلب الآن" },
  "mc.empty.resetFilters": { fr: "Réinitialiser les filtres", ar: "إعادة تعيين الفلاتر" },
  "mc.th.tracking": { fr: "Tracking", ar: "التتبع" },
  "mc.th.type": { fr: "Type", ar: "النوع" },
  "mc.th.statut": { fr: "Statut", ar: "الحالة" },
  "mc.th.destinataire": { fr: "Destinataire", ar: "المستلم" },
  "mc.th.commune": { fr: "Commune", ar: "البلدية" },
  "mc.th.date": { fr: "Date", ar: "التاريخ" },
  "mc.th.prix": { fr: "Prix colis", ar: "سعر الطرد" },
  "mc.th.action": { fr: "Action", ar: "إجراء" },
  "mc.selectPage": { fr: "Sélectionner cette page ({n})", ar: "تحديد هذه الصفحة ({n})" },
  "mc.selectedOf": { fr: "{n} sélectionné(s) sur {m}", ar: "{n} محدد من {m}" },
  "mc.colisFiltered": { fr: "{n} colis (filtré sur {m})", ar: "{n} طرد (منقّى من {m})" },
  "mc.colisCount": { fr: "{n} colis", ar: "{n} طرد" },
  "mc.selectedCount": { fr: "{n} sélectionné(s)", ar: "{n} محدد" },
  "mc.modal.sent": { fr: "Demande envoyée", ar: "تم إرسال الطلب" },
  "mc.modal.opsNotified": { fr: "{n} colis — les Opérations ont été prévenues.", ar: "{n} طرد — تم إعلام قسم العمليات." },
  "mc.modal.whatsapp": { fr: "Informer le Service Client par WhatsApp", ar: "إعلام خدمة العملاء عبر واتساب" },
  "mc.toast.copied": { fr: "{n} copié", ar: "تم نسخ {n}" },
  "mc.toast.copyFail": { fr: "Impossible de copier", ar: "تعذر النسخ" },
  "mc.toast.selectPrep": { fr: "Sélectionnez au moins un colis « En préparation » pour demander un ramassage.", ar: "اختر طردًا واحدًا على الأقل بحالة «قيد التحضير» لطلب الاستلام." },
  "mc.toast.ignoredCount": { fr: "{n} colis ignoré(s) (pas « En préparation », ou ramassage déjà demandé).", ar: "تم تجاهل {n} طرد (ليس «قيد التحضير»، أو تم طلب الاستلام له مسبقًا)." },
  "mc.toast.reqFail": { fr: "Échec de la demande", ar: "فشل الطلب" },
  "mc.toast.pickupSent": { fr: "Demande de ramassage envoyée ({n} colis)", ar: "تم إرسال طلب الاستلام ({n} طرد)" },
  "mc.confirm.deleteTitle": { fr: "Supprimer le colis {t} ?", ar: "هل تريد حذف الطرد {t} ؟" },
  "mc.confirm.deleteDesc": { fr: "Cette action est irréversible.", ar: "هذا الإجراء لا يمكن التراجع عنه." },
  "mc.toast.delFail": { fr: "Échec de la suppression", ar: "فشل الحذف" },
  "mc.toast.deleted": { fr: "Colis {t} supprimé", ar: "تم حذف الطرد {t}" },
  "mc.pickupRequested": { fr: "Ramassage déjà demandé", ar: "تم طلب الاستلام مسبقًا" },
  "mc.th.fraisLivraison": { fr: "Frais livraison", ar: "رسوم التوصيل" },
  "mc.blockedWarning": { fr: "En préparation depuis plus de 48h — pensez à demander un ramassage.", ar: "قيد التحضير منذ أكثر من 48 ساعة — فكّر في طلب الاستلام." },

  // Mes retours
  "mr.title": { fr: "Mes retours", ar: "إرجاعاتي" },
  "mr.subtitle": { fr: "Colis non livrés et retournés à l'expéditeur.", ar: "الطرود غير المسلَّمة والمرتجعة إلى المرسِل." },
  "mr.exportCount": { fr: "Exporter ({n})", ar: "تصدير ({n})" },
  "mr.importExcel": { fr: "Import Excel", ar: "استيراد Excel" },
  "mr.viewAll": { fr: "Voir tous mes colis", ar: "عرض جميع طروداتي" },
  "mr.stat.total": { fr: "Total retours", ar: "مجموع الإرجاعات" },
  "mr.stat.valeur": { fr: "Valeur non livrée", ar: "القيمة غير المسلَّمة" },
  "mr.stat.frais": { fr: "Frais perdus", ar: "الرسوم المفقودة" },
  "mr.search.ph": { fr: "Rechercher par tracking, nom, wilaya...", ar: "ابحث بالتتبع، الاسم، الولاية..." },
  "mr.empty.none": { fr: "Aucun retour", ar: "لا يوجد إرجاعات" },
  "mr.empty.noResult": { fr: "Aucun résultat", ar: "لا توجد نتائج" },
  "mr.empty.allDelivered": { fr: "Tous vos colis ont été livrés avec succès.", ar: "تم تسليم جميع طرودك بنجاح." },
  "mr.empty.changeSearch": { fr: "Modifiez votre recherche pour voir d'autres retours.", ar: "عدّل بحثك لرؤية إرجاعات أخرى." },
  "mr.th.tracking": { fr: "Tracking", ar: "التتبع" },
  "mr.th.destinataire": { fr: "Destinataire", ar: "المستلم" },
  "mr.th.wilaya": { fr: "Wilaya", ar: "الولاية" },
  "mr.th.valeur": { fr: "Valeur", ar: "القيمة" },
  "mr.th.date": { fr: "Date", ar: "التاريخ" },

  // TrackingActions
  "ta.viewDetails": { fr: "Voir les détails", ar: "عرض التفاصيل" },
  "ta.print": { fr: "Imprimer le bordereau", ar: "طباعة الإيصال" },
  "ta.waRecipient": { fr: "WhatsApp destinataire", ar: "واتساب المستلم" },
  "ta.waRecipientTitle": { fr: "WhatsApp au destinataire", ar: "واتساب إلى المستلم" },
  "ta.waSender": { fr: "WhatsApp expéditeur", ar: "واتساب المرسِل" },
  "ta.waSenderTitle": { fr: "WhatsApp à l'expéditeur", ar: "واتساب إلى المرسِل" },

  // TrackingBadge
  "tbg.ech.title": { fr: "Ce colis générera un retour Échange", ar: "سينتج عن هذا الطرد إرجاع تبادل" },
  "tbg.spl.title": { fr: "Ce colis générera un retour Split", ar: "سينتج عن هذا الطرد إرجاع جزئي" },

  // ClientDashboardPanel
  "cdp.codMonth": { fr: "COD encaissé ce mois", ar: "الدفع عند الاستلام المُحصَّل هذا الشهر" },
  "cdp.today": { fr: "Aujourd'hui", ar: "اليوم" },
  "cdp.week": { fr: "Semaine", ar: "الأسبوع" },
  "cdp.month": { fr: "Mois", ar: "الشهر" },
  "cdp.total": { fr: "Total", ar: "المجموع" },
  "cdp.breakdown": { fr: "Répartition", ar: "التوزيع" },
  "cdp.delivered": { fr: "Livrés", ar: "تم تسليمها" },
  "cdp.inProgress": { fr: "En cours", ar: "قيد التنفيذ" },
  "cdp.failed": { fr: "Échecs", ar: "فاشلة" },
  "cdp.topDest": { fr: "Destinations fréquentes", ar: "الوجهات الأكثر تكرارًا" },
  "cdp.noData": { fr: "Aucune donnée.", ar: "لا توجد بيانات." },

  // ColisHistoriqueModal
  "chm.title": { fr: "Suivi du colis", ar: "تتبع الطرد" },
  "chm.loadError": { fr: "Impossible de charger l'historique de ce colis.", ar: "تعذر تحميل سجل هذا الطرد." },
  "chm.tab.history": { fr: "Historique", ar: "السجل" },
  "chm.tab.comments": { fr: "Commentaires", ar: "التعليقات" },
  "chm.tab.notes": { fr: "Notes internes", ar: "ملاحظات داخلية" },
  "chm.detailTitle": { fr: "Historique détaillé", ar: "السجل التفصيلي" },
  "chm.noEvents": { fr: "Aucun évènement enregistré pour le moment.", ar: "لا توجد أحداث مسجَّلة حتى الآن." },
  "chm.fullPage": { fr: "Page de suivi complète", ar: "صفحة التتبع الكاملة" },
  "chm.by": { fr: "par", ar: "بواسطة" },

  // ColisMessagesButton
  "cmb.title": { fr: "Commentaires et notes internes", ar: "التعليقات والملاحظات الداخلية" },
  "cmb.messages": { fr: "Messages", ar: "الرسائل" },

  // ColisCommentaires
  "cc.internalNotes": { fr: "Notes internes", ar: "ملاحظات داخلية" },
  "cc.replyingTo": { fr: "↳ En réponse à un commentaire", ar: "↳ ردًا على تعليق" },
  "cc.writeComment": { fr: "Écrire un commentaire…", ar: "اكتب تعليقًا…" },
  "cc.writeNote": { fr: "Écrire une note interne…", ar: "اكتب ملاحظة داخلية…" },
  "cc.noComments": { fr: "Aucun commentaire pour ce colis.", ar: "لا توجد تعليقات لهذا الطرد." },
  "cc.noNotes": { fr: "Aucune note interne pour ce colis.", ar: "لا توجد ملاحظات داخلية لهذا الطرد." },
  "cc.reply": { fr: "Répondre", ar: "الرد" },
  "cc.client": { fr: "Client", ar: "العميل" },
  "cc.team": { fr: "Équipe Revo", ar: "فريق ريفو" },
  "cc.tag.reclamation": { fr: "Réclamation", ar: "شكوى" },
  "cc.tag.demandeClient": { fr: "Demande client", ar: "طلب العميل" },
  "cc.tag.pbOperations": { fr: "Pb opérations", ar: "مشكلة عمليات" },
  "cc.tag.remarqueCommerciale": { fr: "Remarque commerciale", ar: "ملاحظة تجارية" },
  "cc.tag.autre": { fr: "Autre", ar: "أخرى" },

  // ColisDetailsModal
  "cdm.title": { fr: "Détails du colis", ar: "تفاصيل الطرد" },
  "cdm.dates": { fr: "Dates", ar: "التواريخ" },
  "cdm.creation": { fr: "Création", ar: "الإنشاء" },
  "cdm.expedition": { fr: "Expédition", ar: "الشحن" },
  "cdm.recipient": { fr: "Destinataire", ar: "المستلم" },
  "cdm.name": { fr: "Nom", ar: "الاسم" },
  "cdm.phone": { fr: "Téléphone", ar: "الهاتف" },
  "cdm.address": { fr: "Adresse", ar: "العنوان" },
  "cdm.trip": { fr: "Trajet", ar: "المسار" },
  "cdm.colis": { fr: "Colis", ar: "الطرد" },
  "cdm.designation": { fr: "Désignation", ar: "التسمية" },
  "cdm.colisPrice": { fr: "Prix du colis", ar: "سعر الطرد" },
  "cdm.deliveryFees": { fr: "Frais de livraison", ar: "رسوم التوصيل" },
  "cdm.declaredValue": { fr: "Valeur déclarée", ar: "القيمة المصرح بها" },
  "cdm.returnProduct": { fr: "Produit retour", ar: "منتج الإرجاع" },
  "cdm.physicalPackage": { fr: "Colis physique", ar: "الطرد الفعلي" },
  "cdm.dimensions": { fr: "Dimensions", ar: "الأبعاد" },
  "cdm.weight": { fr: "Poids", ar: "الوزن" },

  // Service client (admin panel)
  "sc.title": { fr: "Espace service client", ar: "فضاء خدمة العملاء" },
  "sc.subtitle.agent": { fr: "Accédez aux colis et aux clients pour les assister.", ar: "تصفّح الطرود والعملاء لمساعدتهم." },
  "sc.subtitle.admin": { fr: "Créez et gérez les agents du service client.", ar: "أنشئ وأدر وكلاء خدمة العملاء." },
  "sc.agentHint": { fr: "Utilisez la barre de recherche du tableau colis pour assister les clients.", ar: "استخدم شريط البحث في جدول الطرود لمساعدة العملاء." },
  "sc.newAgent": { fr: "Nouvel agent", ar: "وكيل جديد" },
  "sc.field.fullname": { fr: "Nom complet", ar: "الاسم الكامل" },
  "sc.field.phone": { fr: "Téléphone", ar: "الهاتف" },
  "sc.field.email": { fr: "Email (login)", ar: "البريد الإلكتروني (تسجيل الدخول)" },
  "sc.field.password": { fr: "Mot de passe", ar: "كلمة المرور" },
  "sc.field.password.ph": { fr: "Min. 6 caractères", ar: "6 أحرف كحد أدنى" },
  "sc.createAgent": { fr: "Créer l'agent", ar: "إنشاء الوكيل" },
  "sc.agentsCount": { fr: "Agents service client ({n})", ar: "وكلاء خدمة العملاء ({n})" },
  "sc.th.name": { fr: "Nom", ar: "الاسم" },
  "sc.th.email": { fr: "Email", ar: "البريد الإلكتروني" },
  "sc.th.phone": { fr: "Tél", ar: "الهاتف" },
  "sc.noAgent": { fr: "Aucun agent", ar: "لا يوجد وكلاء" },
  "sc.toast.created": { fr: "Agent créé : {n}", ar: "تم إنشاء الوكيل: {n}" },
  "sc.toast.createFail": { fr: "Création échouée", ar: "فشل الإنشاء" },

  // Comptes (DG account management)
  "cpt.title": { fr: "Gestion des comptes", ar: "إدارة الحسابات" },
  "cpt.subtitle": { fr: "Créez et gérez tous les comptes internes (directeurs, commerciaux, opérations, livreurs).", ar: "أنشئ وأدر جميع الحسابات الداخلية (المديرون، التجاريون، العمليات، السائقون)." },
  "cpt.newAccount": { fr: "Nouveau compte", ar: "حساب جديد" },
  "cpt.type.dirCom": { fr: "Directeur Commercial", ar: "المدير التجاري" },
  "cpt.type.dirCom.desc": { fr: "Chef des commerciaux, voit tous les clients", ar: "رئيس التجاريين، يرى جميع العملاء" },
  "cpt.type.dirOps": { fr: "Directeur des Opérations", ar: "مدير العمليات" },
  "cpt.type.dirOps.desc": { fr: "Gère colis, livreurs, valide les retours", ar: "يدير الطرود والسائقين ويصادق على الإرجاعات" },
  "cpt.type.adminSC": { fr: "Admin Service Client", ar: "مسؤول خدمة العملاء" },
  "cpt.type.adminSC.desc": { fr: "Chef du service client", ar: "رئيس خدمة العملاء" },
  "cpt.type.commercial": { fr: "Commercial", ar: "تجاري" },
  "cpt.type.commercial.desc": { fr: "Gère son portefeuille de clients", ar: "يدير محفظة عملائه" },
  "cpt.type.agentSC": { fr: "Agent Service Client", ar: "وكيل خدمة العملاء" },
  "cpt.type.agentSC.desc": { fr: "Gère tous les colis, corrections", ar: "يدير جميع الطرود والتصحيحات" },
  "cpt.type.livreur": { fr: "Livreur", ar: "السائق" },
  "cpt.type.livreur.desc": { fr: "Voit ses colis affectés", ar: "يرى الطرود المسندة إليه" },
  "cpt.field.fullname": { fr: "Nom complet", ar: "الاسم الكامل" },
  "cpt.field.phone": { fr: "Téléphone", ar: "الهاتف" },
  "cpt.field.email": { fr: "E-mail", ar: "البريد الإلكتروني" },
  "cpt.field.password": { fr: "Mot de passe", ar: "كلمة المرور" },
  "cpt.field.password.ph": { fr: "min. 6 caractères", ar: "6 أحرف كحد أدنى" },
  "cpt.createAccount": { fr: "Créer le compte", ar: "إنشاء الحساب" },
  "cpt.existingAccounts": { fr: "Comptes existants ({n})", ar: "الحسابات الحالية ({n})" },
  "cpt.search.ph": { fr: "Rechercher...", ar: "بحث..." },
  "cpt.th.name": { fr: "Nom", ar: "الاسم" },
  "cpt.th.email": { fr: "Email", ar: "البريد الإلكتروني" },
  "cpt.th.phone": { fr: "Téléphone", ar: "الهاتف" },
  "cpt.th.role": { fr: "Rôle", ar: "الدور" },
  "cpt.th.status": { fr: "Statut", ar: "الحالة" },
  "cpt.th.action": { fr: "Action", ar: "إجراء" },
  "cpt.status.active": { fr: "Actif", ar: "نشط" },
  "cpt.status.suspended": { fr: "Suspendu", ar: "موقوف" },
  "cpt.suspend": { fr: "Suspendre", ar: "إيقاف" },
  "cpt.reactivate": { fr: "Réactiver", ar: "إعادة تفعيل" },
  "cpt.noAccount": { fr: "Aucun compte pour le moment", ar: "لا يوجد حساب حاليًا" },
  "cpt.toast.created": { fr: "Compte créé avec succès", ar: "تم إنشاء الحساب بنجاح" },
  "cpt.toast.createFail": { fr: "Création impossible", ar: "تعذر الإنشاء" },
  "cpt.toast.suspended": { fr: "Compte suspendu", ar: "تم إيقاف الحساب" },
  "cpt.toast.reactivated": { fr: "Compte réactivé", ar: "تم إعادة تفعيل الحساب" },
  "cpt.role.dirCom": { fr: "Dir. Commercial", ar: "مدير تجاري" },
  "cpt.role.dirOps": { fr: "Dir. Opérations", ar: "مدير عمليات" },
  "cpt.role.adminSC": { fr: "Admin SC", ar: "مسؤول خ.ع" },
  "cpt.role.commercial": { fr: "Commercial", ar: "تجاري" },
  "cpt.role.serviceClient": { fr: "Service Client", ar: "خدمة العملاء" },
  "cpt.role.livreur": { fr: "Livreur", ar: "السائق" },

  // Admin dashboard (colis board)
  "adm.title": { fr: "Tableau de bord admin", ar: "لوحة تحكم المسؤول" },
  "adm.subtitle": { fr: "Gérez tous les colis et assignez les livreurs en temps réel.", ar: "أدر جميع الطرود وأسند السائقين في الوقت الفعلي." },
  "adm.exportAll": { fr: "Exporter tous les colis", ar: "تصدير جميع الطرود" },
  "adm.toast.noExport": { fr: "Aucun colis à exporter", ar: "لا يوجد طرود للتصدير" },
  "adm.toast.exported": { fr: "{n} colis exportés", ar: "تم تصدير {n} طرد" },
  "adm.search.ph": { fr: "Rechercher : tracking, nom, téléphone, commune, adresse, boutique…", ar: "بحث: التتبع، الاسم، الهاتف، البلدية، العنوان، المتجر…" },
  "adm.noColis": { fr: "Aucun colis trouvé", ar: "لا يوجد طرود" },
  "adm.blockedSince": { fr: "depuis plus de 48h", ar: "منذ أكثر من 48 ساعة" },
  "adm.blockedCount": { fr: "{n} bloqué(s)", ar: "{n} معلَّق" },
  "adm.assign": { fr: "Assigner…", ar: "إسناد…" },
  "adm.th.boutique": { fr: "Boutique / Destinataire", ar: "المتجر / المستلم" },
  "adm.th.destination": { fr: "Destination", ar: "الوجهة" },
  "adm.th.livreur": { fr: "Livreur", ar: "السائق" },
  "adm.th.prix": { fr: "Prix", ar: "السعر" },
  "adm.boutiqueDefault": { fr: "Boutique", ar: "متجر" },
  "adm.livreursTitle": { fr: "Gestion des livreurs", ar: "إدارة السائقين" },
  "adm.livreursHint": { fr: "Les livreurs se créent depuis la page /comptes (réservée au DG).", ar: "يتم إنشاء السائقين من صفحة /comptes (مخصصة للمدير العام)." },
  "adm.currentLivreurs": { fr: "Livreurs actuels :", ar: "السائقون الحاليون:" },
  "adm.noneMasc": { fr: "— Aucun —", ar: "— لا يوجد —" },
  "adm.noLivreur": { fr: "Aucun livreur — créez-en un via /comptes", ar: "لا يوجد سائق — أنشئ واحدًا عبر /comptes" },
  "adm.removeLivreur": { fr: "Retirer le livreur", ar: "إزالة السائق" },
  "adm.toast.statutLabel": { fr: "Statut : {s}", ar: "الحالة: {s}" },
  "adm.toast.livreurAssigned": { fr: "Livreur assigné", ar: "تم إسناد السائق" },
  "adm.toast.livreurRemoved": { fr: "Livreur retiré", ar: "تم إزالة السائق" },
  "adm.stats.toggle": { fr: "Tableau de bord", ar: "لوحة المعلومات" },
  "adm.callTitle": { fr: "Appeler — passe le colis en Contact client", ar: "اتصال — ينقل الطرد إلى «التواصل مع العميل»" },
  "adm.filter.boutique": { fr: "Boutique", ar: "المتجر" },
  "adm.filter.allBoutiques": { fr: "Toutes les boutiques", ar: "جميع المتاجر" },
  "adm.filter.advanced": { fr: "Filtres avancés", ar: "فلاتر متقدمة" },
  "adm.kpi.total": { fr: "Total", ar: "الإجمالي" },
  "adm.kpi.aTraiter": { fr: "À traiter", ar: "قيد المعالجة" },
  "adm.kpi.enCours": { fr: "En cours", ar: "جارية" },
  "adm.kpi.livres": { fr: "Livrés", ar: "تم التسليم" },
  "adm.kpi.problemes": { fr: "Problèmes", ar: "مشاكل" },
  "adm.row.moreActions": { fr: "Plus d'actions", ar: "المزيد من الإجراءات" },
  "adm.price.edit": { fr: "Modifier le prix", ar: "تعديل السعر" },
  "adm.price.colis": { fr: "Prix du colis (DA)", ar: "سعر الطرد (دج)" },
  "adm.price.livraison": { fr: "Frais de livraison (DA)", ar: "رسوم التوصيل (دج)" },
  "adm.price.updated": { fr: "Prix mis à jour", ar: "تم تحديث السعر" },
  "adm.price.invalid": { fr: "Montants invalides", ar: "مبالغ غير صالحة" },
  "common.clearSearch": { fr: "Effacer la recherche", ar: "مسح البحث" },

  // ColisStatusMenu
  "csm.changeStatus": { fr: "Changer le statut", ar: "تغيير الحالة" },
  "csm.changeStatusBulk": { fr: "Changer le statut de {n} colis", ar: "تغيير حالة {n} طرد" },
  "csm.otherStatuses": { fr: "Autres statuts", ar: "حالات أخرى" },
  "csm.motif.title": { fr: "{s} pour :", ar: "{s} بسبب:" },
  "csm.motif.back": { fr: "Retour", ar: "رجوع" },
  "csm.motif.confirm": { fr: "Confirmer", ar: "تأكيد" },
  "csm.motif.autrePlaceholder": { fr: "Précisez…", ar: "يرجى التوضيح…" },
  "csm.split.title": { fr: "Quels articles ont été livrés ?", ar: "ما هي المنتجات التي تم تسليمها؟" },
  "csm.split.hint": { fr: "Décochez un article si le client ne l'a pas accepté — le montant à encaisser est recalculé automatiquement.", ar: "ألغِ تحديد منتج إذا لم يقبله العميل — يُعاد حساب المبلغ المطلوب تلقائيًا." },
  "csm.split.article1": { fr: "Article 1", ar: "المنتج 1" },
  "csm.split.article2": { fr: "Article 2", ar: "المنتج 2" },
  "csm.split.total": { fr: "Montant à encaisser", ar: "المبلغ المطلوب تحصيله" },
  "motif.reporte.nouvelleDate": { fr: "Client demande une nouvelle date", ar: "العميل يطلب موعدًا جديدًا" },
  "motif.reporte.absent": { fr: "Client absent", ar: "العميل غائب" },
  "motif.reporte.adresse": { fr: "Problème d'adresse", ar: "مشكلة في العنوان" },
  "motif.reporte.meteo": { fr: "Conditions météo", ar: "ظروف جوية" },
  "motif.autre": { fr: "Autre", ar: "أخرى" },
  "adm.bulk.selectedCount": { fr: "{n} colis sélectionné(s)", ar: "تم تحديد {n} طرد" },
  "adm.bulk.changeStatus": { fr: "Changer le statut", ar: "تغيير الحالة" },
  "adm.bulk.clear": { fr: "Annuler la sélection", ar: "إلغاء التحديد" },
  "adm.bulk.selectGroup": { fr: "Tout sélectionner dans ce groupe", ar: "تحديد الكل في هذه المجموعة" },
  "adm.bulk.toastUpdated": { fr: "{n} colis mis à jour", ar: "تم تحديث {n} طرد" },
  "adm.bulk.assignLivreur": { fr: "Assigner à un livreur", ar: "إسناد إلى سائق" },
  "adm.bulk.export": { fr: "Exporter", ar: "تصدير" },
  "adm.bulk.toastAssigned": { fr: "{n} colis assigné(s)", ar: "تم إسناد {n} طرد" },

  // AdminStats / OpsStatsPanel
  "ast.kpi.total": { fr: "Total colis", ar: "إجمالي الطرود" },
  "ast.kpi.livres": { fr: "Livrés", ar: "تم تسليمها" },
  "ast.kpi.deliveryRate": { fr: "{n}% taux livraison", ar: "{n}% نسبة التسليم" },
  "ast.kpi.enCours": { fr: "En cours", ar: "قيد التنفيذ" },
  "ast.kpi.enPreparation": { fr: "En préparation", ar: "قيد التحضير" },
  "ast.kpi.caEncaisse": { fr: "CA encaissé", ar: "رقم الأعمال المُحصَّل" },
  "ast.kpi.colisLivres": { fr: "colis livrés", ar: "طرود مسلَّمة" },
  "ast.kpi.caEnCours": { fr: "CA en cours", ar: "رقم الأعمال الجاري" },
  "ast.kpi.aEncaisser": { fr: "à encaisser", ar: "قيد التحصيل" },
  "ast.kpi.echecsRetours": { fr: "Échecs / Retours", ar: "فاشلة / مرتجعة" },
  "ast.kpi.livreurs": { fr: "Livreurs", ar: "السائقون" },
  "ast.activity30d": { fr: "Activité — 30 derniers jours", ar: "النشاط — آخر 30 يومًا" },
  "ast.activity30d.sub": { fr: "Colis créés et livrés par jour", ar: "الطرود المُنشأة والمُسلَّمة يوميًا" },
  "ast.chart.created": { fr: "Créés", ar: "أُنشئت" },
  "ast.chart.delivered": { fr: "Livrés", ar: "سُلِّمت" },
  "ast.breakdown": { fr: "Répartition par statut", ar: "التوزيع حسب الحالة" },
  "ast.noData": { fr: "Aucune donnée", ar: "لا توجد بيانات" },
  "ast.topDest": { fr: "Top destinations", ar: "أفضل الوجهات" },
  "ast.chart.colis": { fr: "Colis", ar: "طرود" },
  "ast.driverPerf": { fr: "Performance des livreurs", ar: "أداء السائقين" },
  "ast.noAssigned": { fr: "Aucun colis assigné pour le moment", ar: "لا يوجد طرود مسندة حاليًا" },
  "ast.livreurDefault": { fr: "Livreur", ar: "سائق" },

  // OpsStatsPanel
  "ops.driversToday": { fr: "Livreurs du jour", ar: "سائقو اليوم" },
  "ops.noneToday": { fr: "Aucune livraison enregistrée aujourd'hui.", ar: "لا توجد عملية تسليم مسجَّلة اليوم." },
  "ops.delivered": { fr: "livré(s)", ar: "تسليم" },
  "ops.todayVsYesterday": { fr: "Aujourd'hui vs hier", ar: "اليوم مقابل الأمس" },
  "ops.colisCreated": { fr: "Colis créés", ar: "طرود مُنشأة" },
  "ops.delivered.label": { fr: "Livrés", ar: "تم تسليمها" },
  "ops.failed": { fr: "Échecs", ar: "فاشلة" },
  "ops.sameAsYesterday": { fr: "= hier", ar: "= الأمس" },
  "ops.vsYesterday": { fr: "vs hier", ar: "مقابل الأمس" },

  // Service client agent colis board
  "sc.board.subtitle": { fr: "Recherchez, suivez et assistez les clients sur tous les colis de la plateforme.", ar: "ابحث وتابع وساعد العملاء في جميع طرود المنصة." },
  "sc.board.search.ph": { fr: "Rechercher : tracking, nom, téléphone, commune, boutique…", ar: "بحث: التتبع، الاسم، الهاتف، البلدية، المتجر…" },
  "sc.board.noResult": { fr: "Aucun colis trouvé", ar: "لا يوجد طرود" },
  "sc.board.boutiqueDefault": { fr: "Boutique", ar: "متجر" },
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: keyof typeof t_dict) => string;
  tf: (k: keyof typeof t_dict, vars: Record<string, string | number>) => string;
};
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
  const tf = (k: keyof typeof t_dict, vars: Record<string, string | number>) => {
    let s = t(k);
    for (const [key, val] of Object.entries(vars)) s = s.replaceAll(`{${key}}`, String(val));
    return s;
  };

  return <I18nContext.Provider value={{ lang, setLang, t, tf }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

// Force LTR reading order for data that must stay left-to-right even in an
// RTL page: tracking codes, phone numbers, amounts, dates.
export function Ltr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span dir="ltr" className={className}>
      {children}
    </span>
  );
}

// Translated label for a colis statut key (falls back to the raw key if unknown).
export function statutLabel(key: string, t: Ctx["t"]): string {
  const k = `st.${key}`;
  return k in t_dict ? t(k as keyof typeof t_dict) : key;
}
