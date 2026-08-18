export const circle = {
  kicker: "מערכת העיתון",
  title: "מעגל הקרובים",
  intro:
    "מי מחובר אליך. המהדורות שלהם מגיעות לשולחן שלך, והמהדורה שלך מגיעה אליהם — חיבור אחד, שני הכיוונים.",
  add: "הוספת חיבור",
  addShort: "+ חיבור חדש",
  sentInvitations: "הזמנות שנשלחו",
  stats: {
    connections: "חיבורים מאושרים",
    pending: "הזמנות ממתינות",
    updated: "מהדורות שהתעדכנו השבוע",
  },
  columns: { who: "מחובר", relation: "קשר", actions: "פעולות" },
  all: "הכול",
  pendingFilter: "ממתינים",
  pendingTitle: "הזמנות ממתינות",
  manage: "ניהול",
  manageCircle: "ניהול המעגל",
  resend: "שליחה חוזרת",
  newRequest: "בקשה חדשה",
  requestBody: (name: string) => `${name} מבקשת להתחבר אליך.`,

  dialog: {
    title: "הוספת חיבור למעגל",
    intro:
      "חיבור הוא הדדי: תראה מה הוא מפרסם, והוא יראה מה אתה מפרסם. אפשר לחפש קורא שכבר יש לו עיתון, או להזמין מישהו חדש.",
    searchLabel: "חיפוש לפי שם, דוא״ל או טלפון",
    search: "חיפוש",
    resultsTitle: "קוראים עם עיתון",
    noResults: "לא נמצאו קוראים בשם הזה — אפשר להזמין אותם בכל זאת",
    choose: "בחירה",
    chosen: "נבחר",
    relationLabel: "מה הקשר",
    sectionLabel: "מדור לאזכורים בידיעות שלי",
    settingsTitle: "הגדרות חיבור",
    settings: {
      seesMyEdition: {
        title: "רואה את המהדורה שלי",
        detail: "רק ידיעות שפרסמתי בפועל — טיוטות נשארות אצלי",
      },
      showsFullName: {
        title: "מופיע בשמו המלא",
        detail: "אחרת יופיע לפי סוג הקשר בלבד",
      },
      notifyOnPublish: {
        title: "התראה כשהוא מפרסם",
        detail: "מבזק בשולחן שלך על כל ידיעה חדשה",
      },
    },
    noteLabel: "הערה להזמנה (לא חובה)",
    notePlaceholder: "«נועה, פתחתי עיתון — תראי מה מתפרסם אצלי, ואני אצלך»",
    send: "שליחת הזמנה",
    privacyNote: "אף אחד לא רואה טיוטות — רק ידיעות שפרסמת",
  },

  relations: {
    family: "משפחה",
    friend: "חבר/ה",
    work: "עבודה",
    neighbour: "שכן",
    other: "אחר",
  },

  emptyTitle: "המהדורה שלך עוד לא מגיעה לאף אחד",
  emptyBody:
    "הוסיפו את מי שתרצו שיקרא את הידיעות שלכם — והמהדורות שלהם יגיעו לשולחן שלכם.",
  emptyCta: "הוספת חיבור ראשון",
  shareLink: "שיתוף קישור הזמנה",
  suggestedTitle: "מוצע מהראיונות שלך",
  invite: "הזמנה",

  cardTitle: "המעגל הקרוב",
  cardSubtitle: "מחוברים — המהדורות שלהם מגיעות לשולחן שלך",
  cardCount: (n: number, pending: number) => `${n} חיבורים · ${pending} בקשות ממתינות`,
} as const;

export const profileCopy = {
  kicker: "כתב הבית",
  editDetails: "עריכת פרטים",
  updateKarteset: "עדכון רקע בכרטסת",
  stats: {
    storiesPublished: "ידיעות שפורסמו",
    flashes: "מבזקים",
    facts: "עובדות בכרטסת",
    draftsInProgress: "טיוטה בעריכה",
  },
  mySections: "המדורים שלי",
  editionSettings: "הגדרות מהדורה",
  settings: {
    editionName: { title: "שם המהדורה", detail: "מופיע תחת הלוגו" },
    editionTag: {
      title: "תג מהדורה בידיעות",
      detail: "להציג מאיזו מהדורה הגיעה כל ידיעה",
    },
    reminder: { title: "תזכורת ראיון", detail: "הכתב יזכיר לך בסוף כל יום" },
  },
  reminderValue: (at: string | null) => (at ? `כל יום ב-${at}` : "כבוי"),
  archive: "ארכיון",
  archiveIntro: "כל המהדורות שיצאו מאז ינואר 2026, לפי חודש.",
} as const;

export const authCopy = {
  signIn: "כניסה",
  signUp: "הרשמה",
  email: "דוא״ל",
  password: "סיסמה",
  name: "שם",
  nameHint: "שם — יופיע כשם המהדורה",
  noAccount: "אין לך עדיין עיתון?",
  openEdition: "פתחו מהדורה חדשה",
  signUpTitle: "הרשמה — שלושה שדות",
  emailPlaceholder: "email",
  passwordPlaceholder: "password",
} as const;
