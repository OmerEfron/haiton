export const karteset = {
  title: "כרטסת",
  factLabel: "עובדה קבועה",
  placeholder: "למשל: חולה על הפועל רמת גן",
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
  startersTitle: "דוגמאות למילוי — לא עובדות אמיתיות",
  starters: ["עיר מגורים", "במה אתה עובד", "מי גר איתך"],
} as const;
