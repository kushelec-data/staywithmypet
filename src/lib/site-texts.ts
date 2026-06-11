/**
 * General site & legal page text from EST and ENG texts.xlsx
 * Regenerate: node scripts/sync-site-texts.mjs
 */

import type { Locale } from "@/i18n/translations";

export type LegalBlock = { en: string; et: string | null };

export type LegalDocument = {
  titleEn: string;
  titleEt: string;
  blocks: LegalBlock[];
};

export const legalDocuments = {
  privacy: {
    titleEn: "Privacy Policy",
    titleEt: "Privaatsustingimused",
    blocks: [
      {
        en: "Privacy Policy",
        et: "Privaatsustingimused",
      },
      {
        en: "Effective Date:12/20/2025",
        et: null,
      },
      {
        en: "Your privacy is important to us. This Privacy Policy explains how Stay With My Pet (“we”, “us”, “our”) collects, uses, stores, and protects your personal data when you use our website, mobile application, or related services (collectively, “the Service”).",
        et: null,
      },
      {
        en: "By registering or using the Service, you agree to this Privacy Policy. Please read it carefully to understand how we handle your personal data.",
        et: null,
      },
      {
        en: "1. Data Controller",
        et: null,
      },
      {
        en: "Stay With My Pet acts as the data controller for the processing of personal data under this Policy.",
        et: null,
      },
      {
        en: "Käesolevate privaatsustingimuste alusel on isikuandmete vastutav töötleja Stay With My Pet.",
        et: null,
      },
      {
        en: "We are established in the Republic of Estonia and comply with applicable Estonian and EU data protection laws, including the General Data Protection Regulation (EU) 2016/679 (“GDPR”).",
        et: null,
      },
      {
        en: "Meie tegevuskoht asub Eesti Vabariigis ning järgime kohaldatavaid Eesti ja Euroopa Liidu andmekaitsealaseid õigusakte, sealhulgas Euroopa Liidu isikuandmete kaitse üldmäärust (EL) 2016/679 (GDPR).",
        et: null,
      },
      {
        en: "Contact details:",
        et: null,
      },
      {
        en: "Kontaktandmed:",
        et: null,
      },
      {
        en: "Stay With My Pet",
        et: null,
      },
      {
        en: "Stay With My Pet",
        et: null,
      },
      {
        en: "Legal Name Lareflexion OÜ /  Registration No. 16757645",
        et: null,
      },
      {
        en: "Registrikood: 16757645",
        et: null,
      },
      {
        en: "Registered Address: Juhkentali 16/1, Tallinn, Eestonia",
        et: null,
      },
      {
        en: "E-post: info@staywithmypet.ee",
        et: null,
      },
      {
        en: "Email Address: info@staywithmypet.ee",
        et: null,
      },
      {
        en: "Telefon: +372 5901 7916",
        et: null,
      },
      {
        en: "Phone Number: +372 5901 7916",
        et: null,
      },
      {
        en: "Kui teil on küsimusi või muresid seoses isikuandmete töötlemisega, võtke meiega ühendust ülaltoodud kontaktidel.",
        et: null,
      },
      {
        en: "If you have questions or concerns about your data, you may contact us using the details above.",
        et: null,
      },
      {
        en: "2. Milliseid andmeid me kogume",
        et: null,
      },
      {
        en: "2. Information We Collect",
        et: null,
      },
      {
        en: "We collect and process personal data necessary to provide our Service safely and effectively. This includes:",
        et: null,
      },
      {
        en: "(a) Identity and Contact Information",
        et: null,
      },
      {
        en: "Name, surname",
        et: null,
      },
      {
        en: "Email address, phone number",
        et: null,
      },
      {
        en: "Residential area or city (not exact address, unless required for a confirmed booking)",
        et: null,
      },
      {
        en: "Profile photo (optional)",
        et: null,
      },
      {
        en: "(b) Account and Profile Data",
        et: null,
      },
      {
        en: "Role type (Pet Parent, Pet Friend, or both)",
        et: null,
      },
      {
        en: "Profile description and preferences",
        et: null,
      },
      {
        en: "Pet information (name, age, species, breed, vaccination status, temperament)",
        et: null,
      },
      {
        en: "Availability and home environment details (e.g. presence of garden, other pets, family members)",
        et: null,
      },
      {
        en: "(c) Subscription and Transaction Data",
        et: null,
      },
      {
        en: "Subscription plan details (one-time, 3-month, or 12-month)",
        et: null,
      },
      {
        en: "Payment method (credit/debit card or other method)",
        et: null,
      },
      {
        en: "Payment confirmation and transaction history (processed via a secure third-party provider; we do not store full card details)",
        et: null,
      },
      {
        en: "Renewal and cancellation data",
        et: null,
      },
      {
        en: "(d) Communication and Interaction Data",
        et: null,
      },
      {
        en: "Messages exchanged between Users via the platform",
        et: null,
      },
      {
        en: "Booking requests and confirmations",
        et: null,
      },
      {
        en: "Reviews, feedback, or ratings",
        et: null,
      },
      {
        en: "Support or complaint correspondence with the Stay With My Pet team",
        et: null,
      },
      {
        en: "(e) Technical and Usage Data",
        et: null,
      },
      {
        en: "IP address, device type, browser version, operating system",
        et: null,
      },
      {
        en: "Log data (time and date of visits, pages viewed, actions taken)",
        et: null,
      },
      {
        en: "Cookies and similar technologies (see section 7)",
        et: null,
      },
      {
        en: "3. Purpose of Processing",
        et: null,
      },
      {
        en: "We process your personal data for the following purposes:",
        et: null,
      },
      {
        en: "Legal Basis",
        et: "maksete kinnitused ja tehinguajalugu",
      },
      {
        en: "Purpose",
        et: "(makseid töötleb turvaline kolmas osapool; me ei säilita täielikke kaardiandmeid)",
      },
      {
        en: "To register your account and manage your user profile",
        et: null,
      },
      {
        en: "To provide access to the Service and facilitate Bookings",
        et: "pikendamise ja tühistamise info",
      },
      {
        en: "To process payments and manage subscriptions",
        et: null,
      },
      {
        en: "To ensure the safety and wellbeing of pets",
        et: "(d) Suhtlus- ja kasutusandmed",
      },
      {
        en: "To enable communication between Pet Parents and Pet Friends",
        et: null,
      },
      {
        en: "To maintain community trust (e.g. identity verification, reviews)",
        et: "kasutajatevahelised sõnumid platvormil",
      },
      {
        en: "To send administrative notifications (e.g. subscription updates, service alerts)",
        et: null,
      },
      {
        en: "To send marketing communications (where consent is given)",
        et: "broneeringupäringud ja kinnitused",
      },
      {
        en: "To improve our platform and user experience",
        et: null,
      },
      {
        en: "To comply with legal and regulatory obligations",
        et: null,
      },
      {
        en: "4. No Peer-to-Peer Payments or Earnings",
        et: null,
      },
      {
        en: "Stay With My Pet is a non-commercial connection platform between pet owners (“Pet Parents”) and pet lovers (“Pet Friends”).",
        et: null,
      },
      {
        en: "All payments are made to the platform, not between Users.",
        et: null,
      },
      {
        en: "Users cannot earn money or receive financial compensation from each other through the Service.",
        et: null,
      },
      {
        en: "This structure ensures transparency, fairness, and a focus on animal welfare and companionship, not profit.",
        et: null,
      },
      {
        en: "5. Data Sharing and Disclosure",
        et: null,
      },
      {
        en: "We will only share your personal data when necessary for the operation of the Service, or when required by law. We may share data with:",
        et: null,
      },
      {
        en: "Other Users, when necessary for a confirmed booking (e.g. first name, general location, pet details).",
        et: null,
      },
      {
        en: "Service providers and processors, including:",
        et: null,
      },
      {
        en: "payment processors;",
        et: null,
      },
      {
        en: "hosting and IT infrastructure providers;",
        et: null,
      },
      {
        en: "insurance and veterinary partners (if applicable).",
        et: null,
      },
      {
        en: "Public authorities, if required to comply with legal obligations, such as for safety, animal welfare, or regulatory inquiries.",
        et: null,
      },
      {
        en: "All service providers are contractually bound to handle your data in accordance with applicable data protection laws and only for the purposes defined by Stay With My Pet.",
        et: null,
      },
      {
        en: "Õigustatud huvi / Õiguslik kohustus",
        et: null,
      },
      {
        en: "6. Data Retention",
        et: null,
      },
      {
        en: "We retain your personal data only for as long as necessary to fulfil the purposes for which it was collected, or as required by law.",
        et: null,
      },
      {
        en: "maksete töötlemine ja tellimuste haldamine – lepingu täitmine / õiguslik kohustus",
        et: null,
      },
      {
        en: "Profile and booking data are retained while your account is active.",
        et: null,
      },
      {
        en: "Transaction data may be stored for up to 7 years to comply with accounting and tax regulations.",
        et: null,
      },
      {
        en: "Communications and review data may be retained for community integrity and dispute resolution.",
        et: null,
      },
      {
        en: "Once data is no longer required, it is securely deleted or anonymised.",
        et: null,
      },
      {
        en: "7. Cookies and Similar Technologies",
        et: null,
      },
      {
        en: "We use cookies to enhance your experience and ensure the proper functioning of our Service.",
        et: null,
      },
      {
        en: "Types of cookies:",
        et: null,
      },
      {
        en: "Essential cookies – required for platform functionality and security.",
        et: null,
      },
      {
        en: "Analytics cookies – help us understand usage patterns (only with your consent).",
        et: null,
      },
      {
        en: "Preference cookies – remember your settings or login status.",
        et: null,
      },
      {
        en: "You can manage or disable cookies through your browser settings. Consent-based cookies will only be activated with your explicit permission.",
        et: null,
      },
      {
        en: "seadusest tulenevate kohustuste täitmine – õiguslik kohustus",
        et: null,
      },
      {
        en: "8. Data Security",
        et: null,
      },
      {
        en: "We apply appropriate technical and organisational measures to protect personal data from unauthorised access, loss, or misuse, including:",
        et: null,
      },
      {
        en: "Secure (SSL/TLS) encryption of communications;",
        et: null,
      },
      {
        en: "Access control and data minimisation;",
        et: null,
      },
      {
        en: "Regular system monitoring and security reviews;",
        et: null,
      },
      {
        en: "Limiting access to personal data to authorised personnel only.",
        et: null,
      },
      {
        en: "Despite these measures, no online service can guarantee absolute security. You are responsible for maintaining the confidentiality of your login credentials.",
        et: null,
      },
      {
        en: "9. International Data Transfers",
        et: null,
      },
      {
        en: "If your personal data is transferred outside the European Economic Area (EEA), we ensure adequate protection through:",
        et: null,
      },
      {
        en: "5. Andmete jagamine ja avaldamine",
        et: null,
      },
      {
        en: "EU Commission adequacy decisions, or",
        et: null,
      },
      {
        en: "Standard Contractual Clauses (SCCs) approved by the European Commission.",
        et: null,
      },
      {
        en: "We ensure that such transfers comply with GDPR requirements.",
        et: null,
      },
      {
        en: "teiste kasutajatega, kinnitatud broneeringu korral (nt eesnimi, üldine asukoht, lemmiku info)",
        et: null,
      },
      {
        en: "10. Your Rights",
        et: null,
      },
      {
        en: "Under the GDPR and Estonian Personal Data Protection Act, you have the following rights:",
        et: null,
      },
      {
        en: "Access – to request a copy of your personal data.",
        et: null,
      },
      {
        en: "Rectification – to correct inaccurate or incomplete data.",
        et: null,
      },
      {
        en: "Erasure (“Right to be Forgotten”) – to request deletion of data when legally possible.",
        et: null,
      },
      {
        en: "Restriction – to limit how your data is processed in specific situations.",
        et: null,
      },
      {
        en: "Portability – to receive your data in a structured, machine-readable format.",
        et: null,
      },
      {
        en: "Objection – to object to processing based on legitimate interests, including direct marketing.",
        et: null,
      },
      {
        en: "Withdraw consent – at any time where processing is based on consent.",
        et: null,
      },
      {
        en: "To exercise any of these rights, please contact us at [info@staywithmypet.ee].",
        et: null,
      },
      {
        en: "Kõik teenusepakkujad on lepinguliselt kohustatud töötlema isikuandmeid üksnes vastavalt meie juhistele ja kehtivatele andmekaitsenõuetele.",
        et: null,
      },
      {
        en: "We will respond within one month, or notify you if an extension is needed.",
        et: null,
      },
      {
        en: "6. Andmete säilitamine",
        et: null,
      },
      {
        en: "11. Children’s Data",
        et: null,
      },
      {
        en: "The Service is not intended for users under 18 years of age.",
        et: null,
      },
      {
        en: "We do not knowingly collect or process personal data from minors.",
        et: null,
      },
      {
        en: "If we become aware of any such collection, we will delete the data immediately.",
        et: null,
      },
      {
        en: "12. Changes to This Policy",
        et: null,
      },
      {
        en: "We may update this Privacy Policy from time to time to reflect changes in our practices or legal obligations.",
        et: null,
      },
      {
        en: "Kui andmeid ei ole enam vaja, kustutatakse või anonüümitakse need turvaliselt.",
        et: null,
      },
      {
        en: "Any significant updates will be communicated via email or through the platform.",
        et: null,
      },
      {
        en: "7. Küpsised ja sarnased tehnoloogiad",
        et: null,
      },
      {
        en: "The latest version will always be available on our website.",
        et: null,
      },
      {
        en: "Kasutame küpsiseid ja sarnaseid tehnoloogiaid Teenuse toimimise ja kasutajakogemuse parandamiseks.",
        et: null,
      },
      {
        en: "Continued use of the Service after changes means you accept the updated Policy.",
        et: null,
      },
      {
        en: "Küpsiste tüübid:",
        et: null,
      },
      {
        en: "13. Contact and Complaints",
        et: null,
      },
      {
        en: "If you have any questions, requests, or concerns regarding this Privacy Policy or your data, please contact:",
        et: null,
      },
      {
        en: "Stay With My Pet",
        et: null,
      },
      {
        en: "Legal Name Lareflexion OÜ /  Registration No. 16757645",
        et: null,
      },
      {
        en: "Registered Address: Juhkentali 16/1, Tallinn, Eestonia",
        et: null,
      },
      {
        en: "Email Address: info@staywithmypet.ee",
        et: null,
      },
      {
        en: "Phone Number: +372 5901 7916",
        et: null,
      },
      {
        en: "If you are not satisfied with our response, you have the right to lodge a complaint with the Estonian Data Protection Inspectorate (Andmekaitse Inspektsioon) or your local data protection authority within the EU.",
        et: "krüpteeritud andmeside (SSL/TLS)",
      },
    ],
  },
  terms: {
    titleEn: "Terms of Use",
    titleEt: "Kasutustingimused",
    blocks: [
      {
        en: "Terms of Use",
        et: "Stay With My Pet — Kasutustingimused",
      },
      {
        en: "Effective Date: [DD Month YYYY]",
        et: "Jõustumiskuupäev: [PP kuu AAAA]",
      },
      {
        en: "Last Updated: [DD Month YYYY]",
        et: "Viimati uuendatud: [PP kuu AAAA]",
      },
      {
        en: "These Terms of Use (“Terms”) govern your access to and use of the Stay With My Pet website, web application, and related services (collectively, the “Service”), operated by Lareflexion OÜ, registry code 16757645 (“Stay With My Pet”, “we”, “us”, “our”).",
        et: "Käesolevad kasutustingimused („Tingimused“) reguleerivad teie juurdepääsu ja kasutamist Stay With My Pet veebilehele, veebirakendusele ja seotud teenustele (edaspidi ühiselt „Teenust“), mida haldab Lareflexion OÜ, registrikood 16757645 („Stay With My Pet“, „meie“, „meid“, „meie oma“).",
      },
      {
        en: "By creating an account, purchasing a membership, or using the Service, you (“User”, “you”) agree to these Terms.",
        et: "Konto loomisel, liikmelisuse ostmisel või Teenuse kasutamisel nõustute nende Tingimustega. Kui te Tingimustega ei nõustu, ei tohi te Teenust kasutada.",
      },
      {
        en: "If you do not agree, you must not use the Service.",
        et: null,
      },
      {
        en: "Consumer notice: If you are a consumer in the EU/EEA, you have certain mandatory rights under consumer protection law. Nothing in these Terms limits rights that cannot be limited by law.",
        et: null,
      },
      {
        en: "1. Company Information",
        et: "1. Ettevõtte andmed",
      },
      {
        en: "Legal entity: Lareflexion OÜ",
        et: "Ärinimi: Lareflexion OÜ",
      },
      {
        en: "Registry code: 16757645",
        et: "Registrikood: 16757645",
      },
      {
        en: "Registered address: Juhkentali 16/1, Tallinn, Estonia",
        et: "Registrijärgne aadress: Juhkentali 16/1, Tallinn, Eesti",
      },
      {
        en: "Email: info@staywithmypet.ee",
        et: "E-post: info@staywithmypet.ee",
      },
      {
        en: "Phone: +372 5901 7916",
        et: "Telefon: +372 5901 7916",
      },
      {
        en: "2. Definitions",
        et: "2. Mõisted",
      },
      {
        en: "User – any individual who registers or uses the Service.",
        et: "Kasutaja – füüsiline isik, kes loob kasutajakonto või kasutab Stay With My Pet platvormi.",
      },
      {
        en: "Pet Parent – a User who owns or is responsible for a pet and wishes to find a trusted temporary carer through the Service.",
        et: "Loomaomanik – Kasutaja, kes on lemmiklooma omanik või vastutab lemmiklooma eest ning soovib platvormi kaudu leida usaldusväärse ajutise hoidja või seltsilise.",
      },
      {
        en: "Pet Friend – a User who wishes to spend time with or care for a pet through the Service.",
        et: "Loomasõber – Kasutaja, kes soovib platvormi kaudu pakkuda lemmikloomale ajutist hoidmist või seltsi.",
      },
      {
        en: "Listing – a profile created by a Pet Parent or a Pet Friend describing either the pet and its care needs, or the Pet Friend’s experience, preferences, and care availability.",
        et: "Profiil – Loomaomaniku või loomasõbra koostatud teabekirjeldus, mille eesmärk on tutvustada vastavalt kas lemmiklooma ja tema hooldusvajadusi või loomasõbra isikut, kogemust, eelistusi ja hoidmisvõimalusi.",
      },
      {
        en: "Booking Request – a request proposing specific care dates and terms.",
        et: "Broneerimistaotlus – ühe Kasutaja poolt teisele esitatud ettepanek konkreetse hoidmise perioodi ja tingimuste osas.",
      },
      {
        en: "Booking – a confirmed care arrangement between a Pet Parent and a Pet Friend made through the Service under an active Membership.",
        et: "Broneering – loomaomaniku ja loomasõbra vahel sõlmitud ning platvormi kaudu kinnitatud kokkulepe lemmiklooma hoidmiseks kehtiva liikmelisuse alusel.",
      },
      {
        en: "Membership – a paid access plan that enables messaging, booking requests, booking confirmation, and other membership-only features for a defined billing period.",
        et: "Liikmelisus – tasuline kasutusõigus kindlaksmääratud ajavahemikuks, mis võimaldab sõnumivahetust, broneerimistaotluse esitamist ja kinnitamist ning muid piiratud funktsioone.",
      },
      {
        en: "One-Time Booking – a non-recurring, single-use paid access option linked to one booking.",
        et: "Ühekordne broneering – kordumatu, ühekordne tasuline juurdepääs, mis on seotud ühe broneeringuga.",
      },
      {
        en: "Content – all text, images, messages, reviews, and other materials submitted by Users.",
        et: "Sisu – kogu tekst, pildid, sõnumid, hinnangud ja muu materjal, mille Kasutajad avaldavad või edastavad platvormi kaudu.",
      },
      {
        en: "3. Role of the Platform",
        et: "3. Platvormi roll",
      },
      {
        en: "Stay With My Pet is a community-based digital platform that facilitates connections between Pet Parents and Pet Friends.",
        et: "Stay With My Pet on kogukonnapõhine digiplatvorm, mille eesmärk on aidata loomaomanikel ja loomasõpradel teineteist leida ning sõlmida ajutise hoidmise kokkuleppeid.",
      },
      {
        en: "We do not provide pet care services ourselves, do not supervise care, and are not a party to any care arrangement between Users.",
        et: "Me ei paku ise lemmikloomahoiu teenuseid, ei jälgi ega kontrolli hoidmise läbiviimist ning ei ole osapool ühegi Kasutajate vahelise kokkuleppe puhul.",
      },
      {
        en: "Users do not pay each other; all payments are made to the platform for access and related benefits.",
        et: "Kasutajate vahel rahalisi arveldusi ei toimu; kõik tasud makstakse platvormile juurdepääsu ja sellega seotud funktsioonide kasutamise eest",
      },
      {
        en: "4. Eligibility and Accounts",
        et: "4. Sobivus ja kontod",
      },
      {
        en: "4.1 You must be at least 18 years old and legally capable of entering into binding agreements.",
        et: "4.1 Teenuse kasutamiseks pead olema vähemalt 18-aastane ning omama õigust sõlmida siduvaid lepinguid.",
      },
      {
        en: "4.2 You must provide accurate and complete information and keep it up to date.",
        et: "4.2 Pead esitama tõesed, täpsed ja ajakohased andmed ning hoidma need vajadusel uuendatuna.",
      },
      {
        en: "4.3 You are responsible for all activity under your account and for keeping your login credentials secure.",
        et: "4.3 Vastutad kogu tegevuse eest, mis toimub sinu konto kaudu, ning oma sisselogimisandmete turvalisuse eest.",
      },
      {
        en: "4.4 You may register as a Pet Parent, a Pet Friend, or both.",
        et: "4.4 Registreeruda võib loomaomaniku, loomasõbra või mõlema rollis.",
      },
      {
        en: "5. Memberships, Listings, and Bookings",
        et: "5. Liikmelisused, profiilid ja broneeringud",
      },
      {
        en: "5.1 Free access",
        et: "5.1 Tasuta juurdepääs",
      },
      {
        en: "You may use the Service for free to:",
        et: "Teenust saab tasuta kasutada järgmistel eesmärkidel:",
      },
      {
        en: "create an account,",
        et: "konto loomine,",
      },
      {
        en: "create Listings, and",
        et: "profiilide (listingute) loomine,",
      },
      {
        en: "browse profiles.",
        et: "profiilide sirvimine.",
      },
      {
        en: "5.2 Membership-only features",
        et: "5.2 Liikmelisusega seotud funktsioonid",
      },
      {
        en: "An active Membership is required to:",
        et: "Aktiivne liikmelisus on vajalik:",
      },
      {
        en: "send and receive messages,",
        et: "sõnumite saatmiseks ja vastuvõtmiseks,",
      },
      {
        en: "send or accept booking requests,",
        et: "broneeringupäringute saatmiseks või vastuvõtmiseks,",
      },
      {
        en: "confirm bookings, and",
        et: "broneeringute kinnitamiseks,",
      },
      {
        en: "leave or receive reviews.",
        et: "arvustuste jätmiseks ja vastuvõtmiseks.",
      },
      {
        en: "5.3 Membership types",
        et: "5.3 Liikmelisuse tüübid",
      },
      {
        en: "We may offer the following paid access options:",
        et: "Võime pakkuda järgmisi tasulisi juurdepääsuvõimalusi:",
      },
      {
        en: "One-Time Booking",
        et: "Ühekordne broneering",
      },
      {
        en: "A single, non-recurring payment that unlocks messaging and one care arrangement of any length.",
        et: "Ühekordne tasu, mis avab sõnumivahetuse ja ühe hoidmise kokkuleppe mis tahes kestusega.",
      },
      {
        en: "Recurring Memberships",
        et: "Korduvad liikmelisused:",
      },
      {
        en: "3-Month Membership",
        et: "3-kuuline liikmelisus",
      },
      {
        en: "12-Month Membership",
        et: "12-kuuline liikmelisus",
      },
      {
        en: "Recurring memberships provide unlimited bookings and messaging during the active membership period.",
        et: "Korduvad liikmelisused võimaldavad piiramatul hulgal broneeringuid ja sõnumivahetust kehtivusperioodi jooksul.",
      },
      {
        en: "5.4 Automatic renewal",
        et: "5.4 Automaatne pikenemine",
      },
      {
        en: "Recurring memberships renew automatically at the end of each billing period unless cancelled before the renewal date.",
        et: "Korduvad liikmelisused pikenevad automaatselt iga arveldusperioodi lõpus, kui neid ei tühistata enne pikenemiskuupäeva.",
      },
      {
        en: "Renewal charges will be applied using the payment method on file.",
        et: "Tasu võetakse kontol registreeritud makseviisilt.",
      },
      {
        en: "You will be clearly informed of renewal terms before purchase, including price and billing cycle.",
        et: "Enne ostu teavitatakse teid selgelt hinnast, arveldustsüklist ja pikenemise tingimustest.",
      },
      {
        en: "The One-Time Booking Membership does not renew automatically.",
        et: "Ühekordse broneeringu liikmelisus ei pikene automaatselt.",
      },
      {
        en: "5.5 Cancelling renewal",
        et: "5.5 Pikenemise tühistamine",
      },
      {
        en: "You may cancel automatic renewal at any time in your account settings.",
        et: "Automaatse pikenemise saate igal ajal tühistada oma konto seadetes.",
      },
      {
        en: "Cancellation stops future billing.",
        et: "Tühistamine peatab edasise arveldamise.",
      },
      {
        en: "Access remains active until the end of the current paid period.",
        et: "Juurdepääs kehtib kuni jooksva tasulise perioodi lõpuni.",
      },
      {
        en: "5.6 No off-platform payments",
        et: "5.6 Platvormivälised maksed keelatud",
      },
      {
        en: "Users must not exchange money or other compensation directly with each other. Any attempt to do so may result in suspension or termination.",
        et: "Kasutajad ei tohi vahetada omavahel raha ega muud hüvitist. Sellise tegevuse katsed võivad kaasa tuua konto peatamise või sulgemise.",
      },
      {
        en: "6. User Responsibilities",
        et: "6. Kasutajate kohustused",
      },
      {
        en: "6.1 Pet Parents must:",
        et: "6.1 Loomaomanik peab:",
      },
      {
        en: "provide truthful information about their pet (health, behaviour, routines, diet),",
        et: "esitama ausa ja täieliku info lemmiklooma tervise, käitumise, rutiinide ja toitumise kohta,",
      },
      {
        en: "supply all necessary items for care,",
        et: "varustama loomasõpra kõigi vajalike tarvetega,",
      },
      {
        en: "provide emergency contacts and instructions, and",
        et: "edastama hädaolukorra kontaktid ja juhised,",
      },
      {
        en: "comply with animal welfare laws.",
        et: "järgima loomakaitse ja loomade heaolu nõudeid.",
      },
      {
        en: "6.2 Pet Friends must:",
        et: "6.2 Loomasõber peab:",
      },
      {
        en: "provide a safe and caring environment,",
        et: "tagama turvalise ja hooliva keskkonna,",
      },
      {
        en: "follow agreed instructions,",
        et: "järgima kokkulepitud juhiseid,",
      },
      {
        en: "act promptly in case of illness, injury, or emergency, and",
        et: "reageerima viivitamatult haiguse, vigastuse või hädaolukorra korral,",
      },
      {
        en: "use the Service for non-commercial, companionship-based purposes only.",
        et: "kasutama Teenust ainult mitteärilisel, seltsil ja vastutustundel põhineval eesmärgil.",
      },
      {
        en: "6.3 Animal welfare",
        et: "6.3 Loomade heaolu",
      },
      {
        en: "Animal wellbeing is fundamental. We reserve the right to restrict or remove Users who compromise animal safety.",
        et: "Loomade heaolu on keskne väärtus. Jätame endale õiguse piirata või eemaldada Kasutajaid, kelle tegevus seab ohtu loomade turvalisuse.",
      },
      {
        en: "7. Bookings, Communication, and Reviews",
        et: "7. Broneeringud, suhtlus ja arvustused",
      },
      {
        en: "7.1 A Booking is confirmed only when both parties confirm through the Service.",
        et: "7.1 Broneering loetakse kinnitatuks ainult siis, kui mõlemad osapooled kinnitavad selle Teenuse kaudu.",
      },
      {
        en: "7.2 Users must communicate respectfully and honestly.",
        et: "7.2 Kasutajad peavad suhtlema lugupidavalt ja ausalt.",
      },
      {
        en: "7.3 Reviews must be truthful and relevant. We may remove content that violates these Terms or undermines trust.",
        et: "7.3 Arvustused peavad olema tõesed ja asjakohased. Võime eemaldada Sisu, mis rikub Tingimusi või kahjustab kogukonna usaldust.",
      },
      {
        en: "8. Fees and Payments",
        et: "8. Tasud ja maksed",
      },
      {
        en: "8.1 All payments are processed through our designated payment system.",
        et: "8.1 Kõik maksed töödeldakse meie määratud maksesüsteemi kaudu.",
      },
      {
        en: "8.2 Prices, renewal terms, and key conditions are displayed clearly before purchase, in accordance with EU and Estonian e-commerce rules.",
        et: "8.2 Hinnad, pikenemistingimused ja olulised tingimused kuvatakse enne ostu selgelt vastavalt ELi ja Eesti e-kaubanduse nõuetele.",
      },
      {
        en: "8.3 We may change pricing or membership options with prior notice; changes apply only to future billing periods.",
        et: "8.3 Võime muuta hindu või liikmelisuse tingimusi ette teatades. Muudatused kehtivad ainult tulevastele arveldusperioodidele.",
      },
      {
        en: "9. Cancellations, Withdrawal Rights, and Refunds",
        et: "9. Tühistamine, taganemisõigus ja tagasimaksed",
      },
      {
        en: "9.1 Booking cancellations",
        et: "9.1 Broneeringu tühistamine",
      },
      {
        en: "Bookings may be cancelled by either party. We recommend cancelling as early as possible. Repeated late cancellations or no-shows may result in account limitations.",
        et: "Broneeringu võib tühistada kumbki osapool. Soovitame seda teha võimalikult varakult. Korduvad hilised tühistamised või ilmumata jätmised võivad kaasa tuua konto piiranguid.",
      },
      {
        en: "9.2 EU/EEA right of withdrawal (14 days)",
        et: "9.2 EL/EMP tarbija taganemisõigus (14 päeva)",
      },
      {
        en: "If you are a consumer in the EU/EEA, you generally have the right to withdraw from a distance contract within 14 days from the day the contract is concluded, unless an exception applies.",
        et: "EL/EMP tarbijal on üldjuhul õigus taganeda kauglepingust 14 päeva jooksul alates lepingu sõlmimisest, kui seadus ei sätesta erandit.",
      },
      {
        en: "9.3 Immediate access to digital services",
        et: "9.3 Digiteenuse kohene kasutamine",
      },
      {
        en: "Memberships provide digital services (messaging, booking tools).",
        et: "Liikmelisus annab juurdepääsu digiteenustele (nt sõnumid, broneerimistööriistad).",
      },
      {
        en: "If you request immediate access to these features during the withdrawal period, we will ask for:",
        et: "Kui taotlete teenuse kohest kasutamist taganemisperioodi jooksul, küsime:",
      },
      {
        en: "your express consent to start the service immediately, and",
        et: "teie selgesõnalist nõusolekut teenuse koheseks alustamiseks ning",
      },
      {
        en: "your acknowledgement that you lose the right of withdrawal once the service begins.",
        et: "kinnitust, et teenuse kasutamisega kaotate taganemisõiguse.",
      },
      {
        en: "The service is considered to have started when you use paid features, including:",
        et: "Teenust loetakse alustatud hetkest, mil kasutate tasulisi funktsioone, sh:",
      },
      {
        en: "sending or receiving messages,",
        et: "sõnumite saatmine või vastuvõtmine,",
      },
      {
        en: "sending or accepting booking requests, or",
        et: "broneeringupäringute saatmine või vastuvõtmine,",
      },
      {
        en: "confirming a booking.",
        et: "broneeringu kinnitamine.",
      },
      {
        en: "9.4 Refunds",
        et: "9.4 Tagasimaksed",
      },
      {
        en: "If you did not request immediate access and withdraw within 14 days, payments will be refunded in accordance with applicable law.",
        et: "Kui te ei taotlenud kohest juurdepääsu ja taganete 14 päeva jooksul, tagastatakse tasu vastavalt seadusele.",
      },
      {
        en: "If you requested immediate access and the service has started, membership fees are non-refundable, except where mandatory law requires otherwise.",
        et: "Kui teenus on alustatud, ei kuulu liikmelisuse tasu tagastamisele, välja arvatud juhul, kui seadus nõuab teisiti.",
      },
      {
        en: "Renewal charges already processed are not refunded for unused periods.",
        et: "Juba töödeldud pikenemistasusid kasutamata perioodide eest ei tagastata.",
      },
      {
        en: "10. Safety, Incidents, and Insurance",
        et: "10. Ohutus, vahejuhtumid ja kindlustus",
      },
      {
        en: "10.1 Users should agree emergency procedures in advance.",
        et: "10.1 Kasutajad peavad hädaolukorra protseduurid eelnevalt kokku leppima.",
      },
      {
        en: "10.2 Stay With My Pet does not provide veterinary or emergency services.",
        et: "10.2 Stay With My Pet ei paku veterinaar- ega erakorralisi teenuseid.",
      },
      {
        en: "10.3 Unless explicitly stated otherwise on the Service, insurance is not included. If insurance becomes available, details will be shown before use.",
        et: "10.3 Kui Teenuses ei ole selgesõnaliselt teisiti märgitud, ei sisaldu kindlustus Teenuses. Kui kindlustus muutub kättesaadavaks, kuvatakse vastav info enne kasutamist.",
      },
      {
        en: "11. Intellectual Property",
        et: "11. Intellektuaalomand",
      },
      {
        en: "All platform branding, design elements, and system content belong to Stay With My Pet or its licensors. Users may not copy or use them without permission.",
        et: "Kogu platvormi kaubamärk, disain ja süsteemisisu kuuluvad Stay With My Petile või tema litsentsiandjatele. Ilma loata ei tohi neid kopeerida ega kasutada.",
      },
      {
        en: "12. User Content Licence",
        et: "12. Kasutajasisu litsents",
      },
      {
        en: "By posting Content, you grant Stay With My Pet a non-exclusive, worldwide, royalty-free licence to host and display such content for operating and improving the Service.",
        et: "Sisu postitamisel annate Stay With My Petile mitteainuõigusliku, ülemaailmse ja tasuta litsentsi Sisu majutamiseks ja kuvamiseks Teenuse toimimise ja arendamise eesmärgil.",
      },
      {
        en: "13. Platform Disclaimer and Liability",
        et: "13. Vastutuse piirang",
      },
      {
        en: "Stay With My Pet acts solely as a facilitator.",
        et: "Stay With My Pet tegutseb üksnes vahendajana.",
      },
      {
        en: "We do not control pets or Users and cannot guarantee outcomes.",
        et: "Me ei kontrolli Kasutajaid ega lemmikloomi ning ei saa garanteerida tulemusi.",
      },
      {
        en: "To the maximum extent permitted by law, we are not liable for indirect or consequential losses arising from User interactions.",
        et: "Seadusega lubatud ulatuses ei vastuta me kaudsete või tulenevate kahjude eest, mis tekivad Kasutajatevahelisest suhtlusest.",
      },
      {
        en: "Nothing in these Terms limits liability that cannot be limited under consumer protection law.",
        et: "Miski nendes Tingimustes ei piira vastutust, mida tarbijakaitseseaduse alusel piirata ei saa.",
      },
      {
        en: "14. Suspension and Termination",
        et: "14. Konto peatamine ja lõpetamine",
      },
      {
        en: "We may suspend or terminate accounts if these Terms are violated, animals or Users are endangered, or fraudulent or abusive behaviour occurs.",
        et: "Võime konto peatada või sulgeda, kui Tingimusi rikutakse, loomade või Kasutajate turvalisus on ohus või esineb pettuslik või kuritarvitav käitumine.",
      },
      {
        en: "15. Privacy",
        et: "15. Privaatsus",
      },
      {
        en: "Personal data is processed in accordance with our Privacy Policy, available on our website.",
        et: "Isikuandmeid töödeldakse vastavalt meie Privaatsustingimustele, mis on kättesaadavad meie veebilehel.",
      },
      {
        en: "16. Governing Law",
        et: "16. Kohaldatav õigus",
      },
      {
        en: "These Terms are governed by the laws of the Republic of Estonia.",
        et: "Käesolevatele Tingimustele kohaldatakse Eesti Vabariigi õigust.",
      },
      {
        en: "17. Consumer Complaints and Dispute Resolution",
        et: "17. Tarbijakaebused ja vaidluste lahendamine",
      },
      {
        en: "If you are a consumer and have a complaint, contact us first at info@staywithmypet.ee.",
        et: "Kui olete tarbija ja teil on kaebus, võtke esmalt meiega ühendust aadressil info@staywithmypet.ee",
      },
      {
        en: "Estonian consumers may also submit disputes to the Consumer Disputes Committee (Tarbijavaidluste komisjon).",
        et: "Eesti tarbijad võivad pöörduda ka Tarbijavaidluste komisjoni poole.",
      },
      {
        en: "18. Contact",
        et: "18. Kontakt",
      },
      {
        en: "Stay With My Pet – Lareflexion OÜ",
        et: "Stay With My Pet – Lareflexion OÜ",
      },
      {
        en: "Juhkentali 16/1, Tallinn, Estonia",
        et: "Juhkentali 16/1, Tallinn, Eesti",
      },
      {
        en: "Email: info@staywithmypet.ee",
        et: "E-post: info@staywithmypet.ee",
      },
      {
        en: "Phone: +372 5901 7916",
        et: "Telefon: +372 5901 7916",
      },
    ],
  },
  safety: {
    titleEn: "Safety Guidelines",
    titleEt: "Ohutusjuhised",
    blocks: [
      {
        en: "Safety Guidelines",
        et: null,
      },
      {
        en: "A safe and caring experience starts with clear expectations",
        et: null,
      },
      {
        en: "Stay With My Pet is a community-based platform where animal wellbeing and mutual trust always come first. These safety guidelines are designed to support a calm, secure, and positive experience for pets and people alike.",
        et: null,
      },
      {
        en: "Safety isn’t about rules for the sake of rules — it’s about thoughtful choices, open communication, and shared responsibility.",
        et: null,
      },
      {
        en: "General principles for everyone",
        et: null,
      },
      {
        en: "A pet’s wellbeing always comes first",
        et: null,
      },
      {
        en: "Communication should be honest and clear",
        et: null,
      },
      {
        en: "All important expectations should be agreed before care begins",
        et: null,
      },
      {
        en: "If something is unclear, ask — assumptions rarely help",
        et: null,
      },
      {
        en: "For Pet Parents",
        et: null,
      },
      {
        en: "Clarity and preparation create a safe stay",
        et: null,
      },
      {
        en: "As a pet parent, your role is to give your pet friend a clear and honest picture of your pet’s needs, so care can happen smoothly and without surprises.",
        et: null,
      },
      {
        en: "Complete your pet’s profile thoughtfully",
        et: null,
      },
      {
        en: "Your pet’s profile is the foundation for finding the right match. Please make sure to:",
        et: null,
      },
      {
        en: "describe daily routines (feeding, walks, rest)",
        et: null,
      },
      {
        en: "share personality traits and behavioural characteristics",
        et: null,
      },
      {
        en: "note any health-related needs, medications, or allergies",
        et: null,
      },
      {
        en: "mention situations that may cause stress or anxiety",
        et: null,
      },
      {
        en: "The more accurate the information, the calmer the experience for everyone.",
        et: null,
      },
      {
        en: "Agree on details before care starts",
        et: null,
      },
      {
        en: "Before confirming care, discuss:",
        et: null,
      },
      {
        en: "where and when care will take place",
        et: null,
      },
      {
        en: "daily routines and house rules",
        et: null,
      },
      {
        en: "how you’ll communicate during the stay",
        et: null,
      },
      {
        en: "what to do if plans change or something unexpected happens",
        et: null,
      },
      {
        en: "Clear agreements create confidence for both sides.",
        et: null,
      },
      {
        en: "Share essential contacts and instructions",
        et: null,
      },
      {
        en: "Before care begins, make sure your pet friend has:",
        et: null,
      },
      {
        en: "your up-to-date contact details",
        et: null,
      },
      {
        en: "your veterinarian’s name and contact information",
        et: null,
      },
      {
        en: "guidance on how to act in case of an emergency",
        et: null,
      },
      {
        en: "This helps everyone respond calmly and quickly if needed.",
        et: null,
      },
      {
        en: "Stay available during care",
        et: null,
      },
      {
        en: "A good experience continues throughout the stay. We recommend that you:",
        et: null,
      },
      {
        en: "remain reachable",
        et: null,
      },
      {
        en: "answer questions clearly and calmly",
        et: null,
      },
      {
        en: "provide updates if anything changes",
        et: null,
      },
      {
        en: "Open communication allows care to adapt to your pet’s needs.",
        et: null,
      },
      {
        en: "Leave honest feedback after care",
        et: null,
      },
      {
        en: "After care ends, share your experience:",
        et: null,
      },
      {
        en: "what worked well",
        et: null,
      },
      {
        en: "what could be improved next time",
        et: null,
      },
      {
        en: "Kind and honest feedback helps keep the community safe and trustworthy.",
        et: null,
      },
      {
        en: "For Pet Friends",
        et: null,
      },
      {
        en: "Experience is not required — care and responsibility are",
        et: null,
      },
      {
        en: "Stay With My Pet welcomes pet friends with or without prior experience. What matters most is commitment, willingness to learn, and a responsible mindset.",
        et: null,
      },
      {
        en: "Choose care situations that fit your schedule, comfort level, and confidence.",
        et: null,
      },
      {
        en: "Choose thoughtfully and ask questions",
        et: null,
      },
      {
        en: "Safe care starts with informed choices:",
        et: null,
      },
      {
        en: "accept stays you feel comfortable with",
        et: null,
      },
      {
        en: "ask questions before care begins",
        et: null,
      },
      {
        en: "be honest if something feels too challenging",
        et: null,
      },
      {
        en: "Asking questions is a sign of responsibility.",
        et: null,
      },
      {
        en: "Follow the agreed routine",
        et: null,
      },
      {
        en: "Pets feel safest when:",
        et: null,
      },
      {
        en: "their daily rhythm stays familiar",
        et: null,
      },
      {
        en: "feeding, walks, play, and rest follow agreed routines",
        et: null,
      },
      {
        en: "care is calm, attentive, and consistent",
        et: null,
      },
      {
        en: "If you notice changes, inform the pet parent.",
        et: null,
      },
      {
        en: "Be present and attentive",
        et: null,
      },
      {
        en: "A great pet friend:",
        et: null,
      },
      {
        en: "is genuinely present, not rushed",
        et: null,
      },
      {
        en: "observes the pet’s mood and behaviour",
        et: null,
      },
      {
        en: "stays calm in unexpected situations",
        et: null,
      },
      {
        en: "You don’t need to know everything — what matters is care, awareness, and asking for help when needed.",
        et: null,
      },
      {
        en: "If something feels uncertain",
        et: null,
      },
      {
        en: "If:",
        et: null,
      },
      {
        en: "a pet’s behaviour or condition changes",
        et: null,
      },
      {
        en: "you’re unsure how to proceed",
        et: null,
      },
      {
        en: "a situation feels unusual",
        et: null,
      },
      {
        en: "contact the pet parent or reach out to us.",
        et: null,
      },
      {
        en: "You’re not alone — we’re here to support you.",
        et: null,
      },
      {
        en: "Emergencies and unexpected situations",
        et: null,
      },
      {
        en: "Accidents are rare, but preparedness brings peace of mind. We recommend that you:",
        et: null,
      },
      {
        en: "know the pet’s veterinary details",
        et: null,
      },
      {
        en: "keep the pet parent’s contact information accessible",
        et: null,
      },
      {
        en: "act calmly and responsibly",
        et: null,
      },
      {
        en: "If urgent action is required, the pet’s wellbeing always comes first.",
        et: null,
      },
      {
        en: "Respect and trust within the community",
        et: null,
      },
      {
        en: "Stay With My Pet is built on mutual respect:",
        et: null,
      },
      {
        en: "communicate kindly and respectfully",
        et: null,
      },
      {
        en: "honour agreements",
        et: null,
      },
      {
        en: "give feedback honestly and constructively",
        et: null,
      },
      {
        en: "Every experience helps shape a caring and safe community.",
        et: null,
      },
      {
        en: "When you need support or have questions",
        et: null,
      },
      {
        en: "If anything feels unclear or you need help, don’t hesitate to get in touch.",
        et: null,
      },
      {
        en: "We’re here to support — not to judge or penalise.",
        et: null,
      },
      {
        en: "Creating safer experiences together",
        et: null,
      },
      {
        en: "Safety is not the responsibility of one person alone.",
        et: null,
      },
      {
        en: "It’s a shared commitment to care, awareness, and trust.",
        et: null,
      },
    ],
  },
} as const;

export function getLegalDocument(slug: keyof typeof legalDocuments, locale: Locale): {
  title: string;
  paragraphs: string[];
} {
  const doc = legalDocuments[slug];
  const title = locale === "et" ? doc.titleEt : doc.titleEn;
  const paragraphs = doc.blocks.map((b) => (locale === "et" && b.et ? b.et : b.en));
  return { title, paragraphs };
}
