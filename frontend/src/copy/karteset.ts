export const karteset = {
  title: "כרטסת",
  factLabel: "עובדה קבועה",
  placeholder: "למשל: עובד בחברת אד־טק מאוגוסט 2024",
  submit: "רשמו בכרטסת",
  all: "הכול",
  categories: {
    personal: "אישי",
    work: "עבודה",
    family: "משפחה",
    routine: "שגרה",
  },
  usedIn: (n: number) => `שימש ב-${n} ידיעות`,

  emptyIntro: "רשמו עובדה קבועה לידיעות הבאות.",
  emptyPlaceholder: "איפה אתה גר? במה אתה עובד? מי קרוב אליך?",
  filterEmpty: "אין עובדות בקטגוריה הזו.",
  startersTitle: "שלוש שורות שכדאי להתחיל מהן",
  starters: ["עומר, 29, חיפה", "עובד בפיתוח תוכנה", "בן זוג ושותפה לדירה"],
} as const;
