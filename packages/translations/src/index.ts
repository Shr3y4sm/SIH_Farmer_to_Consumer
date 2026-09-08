export const translations = {
  en: {
    farmer: "Farmer workspace",
    consumer: "Consumer workspace",
    operator: "Operator workspace",
    offer: "Your weekly offer",
    reserve: "Reserve this demo offer",
    decline: "Decline offer",
  },
  kn: {
    farmer: "ರೈತ ಕಾರ್ಯಕ್ಷೇತ್ರ",
    consumer: "ಗ್ರಾಹಕ ಕಾರ್ಯಕ್ಷೇತ್ರ",
    operator: "ನಿರ್ವಾಹಕ ಕಾರ್ಯಕ್ಷೇತ್ರ",
    offer: "ನಿಮ್ಮ ವಾರದ ಕೊಡುಗೆ",
    reserve: "ಈ ಡೆಮೋ ಕೊಡುಗೆಯನ್ನು ಕಾಯ್ದಿರಿಸಿ",
    decline: "ಕೊಡುಗೆಯನ್ನು ನಿರಾಕರಿಸಿ",
  },
} as const;

export type Locale = keyof typeof translations;