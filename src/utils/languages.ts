export const languages = [
  {
    code: "de-DE",
    name: "German (Germany)",
  },
  {
    code: "de-CH",
    name: "German (Switzerland)",
  },
  {
    code: "en-US",
    name: "English (US)",
  },
] as const;

export type LanguageDefinition = (typeof languages)[number];
export type LanguageCode = (typeof languages)[number]["code"];
