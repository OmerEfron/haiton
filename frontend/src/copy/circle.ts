export const circle = {
  kicker: "מערכת העיתון",
  title: "מעגל הקרובים",
  intro:
    "מי מחובר אליך. המהדורות שלהם מגיעות לשולחן שלך, והמהדורה שלך מגיעה אליהם — חיבור אחד, שני הכיוונים.",
  add: "הוספת חיבור",
  addShort: "+ חיבור חדש",
  pendingTitle: "הזמנות ממתינות",
  manage: "ניהול",
  requestBody: (name: string) => `${name} מבקש/ת להתחבר אליך.`,
  copyInvite: "העתקת קישור הזמנה",
  copied: "הועתק",
  joinTitle: (name: string) => `הזמנה מהמהדורה של ${name}`,
  joinBody: "התחברו ואז אשרו את החיבור בפרופיל.",
  loginCta: "כניסה / הרשמה",
  joining: "מצטרפים…",
  gateGuest: "זו ידיעה במעגל הקרוב. היכנסו כדי לבקש חיבור ולקרוא את ההמשך.",
  gateJoin: "הצטרפו למעגל כדי לקרוא את הידיעה המלאה.",
  gateApprove: "אשרו את החיבור כדי לקרוא את ההמשך.",
  joinWallTitle: "המהדורה הזו במעגל הקרוב",
  joinWallBody: "צריך חיבור מאושר כדי לקרוא את העיתון הזה.",
  emptyPeople: "עוד אין חיבורים — שתפו את קישור ההזמנה.",

  dialog: {
    relationLabel: "מה הקשר",
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
  invite: "הזמנה",

  cardTitle: "המעגל הקרוב",
  cardSubtitle: "מחוברים — המהדורות שלהם מגיעות לשולחן שלך",
  cardCount: (n: number, pending: number) => `${n} חיבורים · ${pending} בקשות ממתינות`,
} as const;

export const profileCopy = {
  kicker: "כתב הבית",
  editDetails: "עריכת פרטים",
  updateKarteset: "עדכון רקע בכרטסת",
  fields: {
    name: "שם",
    city: "עיר",
    headline: "שורת תיאור",
  },
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
  archiveIntro: "ראיונות קודמים והידיעות שנוסחו — לקריאה בלבד.",
  archiveEmpty: "עוד אין ידיעות בארכיון",
} as const;

export const authCopy = {
  signIn: "כניסה",
  signUp: "הרשמה",
  email: "דוא״ל",
  password: "סיסמה",
  confirmPassword: "אימות סיסמה",
  name: "שם",
  nameHint: "שם — יופיע כשם המהדורה",
  noAccount: "אין לך עדיין עיתון?",
  openEdition: "הירשמו",
  signUpTitle: "הרשמה — שלושה שדות",
  emailPlaceholder: "email",
  passwordPlaceholder: "password",
  passwordTooShort: "הסיסמה חייבת להיות לפחות 8 תווים",
  passwordMismatch: "הסיסמאות לא תואמות",
} as const;
