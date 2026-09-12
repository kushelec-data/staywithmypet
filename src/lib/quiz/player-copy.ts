import type { QuizLocale } from "@/lib/quiz/locale";
import type { QuizReaction } from "@/lib/quiz/pin";

export type PlayerCopy = {
  chooseLanguage: string;
  chooseLanguageEt: string;
  estonian: string;
  english: string;
  joinTitle: string;
  gamePin: string;
  join: string;
  yourName: string;
  letsPlay: string;
  pinInvalid: string;
  pinInactive: string;
  nameInvalid: string;
  nameTaken: string;
  joinFailed: string;
  joining: string;
  backToPin: string;
  youreIn: (name: string) => string;
  waitingStart: string;
  questionOf: (index: number, total: number) => string;
  answerSubmitted: string;
  waitingEveryone: string;
  timesUp: string;
  waitingReveal: string;
  correct: string;
  notQuite: string;
  youAnswered: string;
  correctAnswer: string;
  points: string;
  plusPoints: (n: number) => string;
  leaderboard: string;
  yourRank: string;
  top5: string;
  exit: string;
  leaveQuiz: string;
  leaveHint: string;
  cancel: string;
  leave: string;
  lobby: string;
  finished: string;
  finalScores: string;
  youPlaced: (rank: number, score: number) => string;
  knowPets: string;
  meetPeople: string;
  iHaveAPet: string;
  iWantToCare: string;
  waitingNext: string;
  reactions: Record<QuizReaction, string>;
};

export const PLAYER_COPY: Record<QuizLocale, PlayerCopy> = {
  en: {
    chooseLanguage: "Choose language",
    chooseLanguageEt: "Vali keel",
    estonian: "Eesti",
    english: "English",
    joinTitle: "Join the quiz",
    gamePin: "Game PIN",
    join: "JOIN",
    yourName: "What's your name?",
    letsPlay: "LET'S PLAY",
    pinInvalid: "Enter the 6-digit game PIN",
    pinInactive: "That PIN is not active",
    nameInvalid: "Enter a name (2–24 characters)",
    nameTaken: "That name is already in this game",
    joinFailed: "Could not join",
    joining: "Joining…",
    backToPin: "Back to PIN",
    youreIn: (name) => `You’re in, ${name}`,
    waitingStart: "Waiting for the host to start…",
    questionOf: (index, total) => `Question ${index} of ${total}`,
    answerSubmitted: "Answer submitted",
    waitingEveryone: "Waiting for everyone...",
    timesUp: "Time's up!",
    waitingReveal: "Waiting for the host to reveal the answer...",
    correct: "Correct!",
    notQuite: "Not quite",
    youAnswered: "You answered:",
    correctAnswer: "Correct answer",
    points: "points",
    plusPoints: (n) => `+${n} points`,
    leaderboard: "Leaderboard",
    yourRank: "Your rank",
    top5: "Top 5",
    exit: "Exit",
    leaveQuiz: "Leave the quiz?",
    leaveHint: "The game will continue without you on this phone.",
    cancel: "Cancel",
    leave: "Leave",
    lobby: "Lobby",
    finished: "Finished",
    finalScores: "Final scores",
    youPlaced: (rank, score) => `You placed #${rank} with ${score} points`,
    knowPets: "You really know your pets!",
    meetPeople: "Now meet people who love them as much as you do.",
    iHaveAPet: "I have a pet",
    iWantToCare: "I want to care for a pet",
    waitingNext: "Waiting for the next question…",
    reactions: {
      love: "Love it",
      wow: "Wow",
      funny: "Funny",
      angry: "No way!",
    },
  },
  et: {
    chooseLanguage: "Choose language",
    chooseLanguageEt: "Vali keel",
    estonian: "Eesti",
    english: "English",
    joinTitle: "Liitu viktoriiniga",
    gamePin: "Mängu PIN",
    join: "LIITU",
    yourName: "Mis su nimi on?",
    letsPlay: "HAKKAME MÄNGIMA",
    pinInvalid: "Sisesta 6-kohaline mängu PIN",
    pinInactive: "See PIN pole aktiivne",
    nameInvalid: "Sisesta nimi (2–24 tähemärki)",
    nameTaken: "See nimi on selles mängus juba kasutusel",
    joinFailed: "Liitumine ebaõnnestus",
    joining: "Liitume…",
    backToPin: "Tagasi PIN-i juurde",
    youreIn: (name) => `Oled mängus, ${name}`,
    waitingStart: "Ootame, kuni mängujuht alustab…",
    questionOf: (index, total) => `Küsimus ${index} / ${total}`,
    answerSubmitted: "Vastus saadetud",
    waitingEveryone: "Ootame teisi mängijaid...",
    timesUp: "Aeg sai läbi!",
    waitingReveal: "Ootame, kuni mängujuht vastuse avaldab...",
    correct: "Õige!",
    notQuite: "Seekord mitte",
    youAnswered: "Sinu vastus:",
    correctAnswer: "Õige vastus",
    points: "punkti",
    plusPoints: (n) => `+${n} punkti`,
    leaderboard: "Edetabel",
    yourRank: "Sinu koht",
    top5: "Esiviisik",
    exit: "Välju",
    leaveQuiz: "Kas soovid viktoriinist lahkuda?",
    leaveHint: "Mäng jätkub ilma sinuta sellel telefonil.",
    cancel: "Tühista",
    leave: "Lahku",
    lobby: "Ootesaal",
    finished: "Lõppenud",
    finalScores: "Lõpptulemused",
    youPlaced: (rank, score) => `Sinu koht on #${rank} — ${score} punkti`,
    knowPets: "Sa tunned oma lemmikloomi tõesti hästi!",
    meetPeople: "Kohtu nüüd inimestega, kes armastavad neid sama palju.",
    iHaveAPet: "Mul on lemmikloom",
    iWantToCare: "Tahan lemmiklooma hooldada",
    waitingNext: "Ootame järgmist küsimust…",
    reactions: {
      love: "Meeldib",
      wow: "Vau",
      funny: "Naljakas",
      angry: "Ei usu!",
    },
  },
};

export function playerCopy(locale: QuizLocale): PlayerCopy {
  return PLAYER_COPY[locale] ?? PLAYER_COPY.en;
}

export function joinErrorCopy(locale: QuizLocale, message: string): string {
  const t = playerCopy(locale);
  if (message.includes("6-digit") || message.includes("6-kohaline")) return t.pinInvalid;
  if (message.includes("not active") || message.includes("pole aktiivne")) return t.pinInactive;
  if (message.includes("2–24") || message.includes("2-24")) return t.nameInvalid;
  if (message.includes("already in this game") || message.includes("juba kasutusel")) return t.nameTaken;
  return t.joinFailed;
}
