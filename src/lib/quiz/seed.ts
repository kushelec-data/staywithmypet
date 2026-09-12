import { QUIZ_QUESTION_SECONDS } from "@/lib/quiz/timer";
import type { QuizQuestionRow } from "@/lib/quiz/types";

export type SeedChoice = { id: "a" | "b" | "c" | "d"; text: string; textEt: string };

export type SeedQuestion = {
  sortOrder: number;
  prompt: string;
  promptEt: string;
  choices: [SeedChoice, SeedChoice, SeedChoice, SeedChoice];
  correctId: "a" | "b" | "c" | "d";
  explanation: string;
  explanationEt: string;
  sourceLabel: string;
  sourceUrl: string;
  timerSeconds: number;
  imageUrl?: string | null;
};

export const SEEDED_QUIZ_TITLE = "How Well Do You Really Know Dogs & Cats?";
export const DENNY_QUESTION_IMAGE = "/quiz/denny.jpg";

export function seedQuestionToRow(question: SeedQuestion, id = `seed-${question.sortOrder}`): QuizQuestionRow {
  return {
    id,
    quizId: "seed",
    sortOrder: question.sortOrder,
    promptEn: question.prompt,
    promptEt: question.promptEt,
    choices: question.choices.map((choice) => ({
      id: choice.id,
      textEn: choice.text,
      textEt: choice.textEt,
    })),
    correctId: question.correctId,
    explanationEn: question.explanation,
    explanationEt: question.explanationEt,
    sourceLabel: question.sourceLabel,
    sourceUrl: question.sourceUrl,
    timerSeconds: QUIZ_QUESTION_SECONDS,
    imageUrl: question.imageUrl ?? null,
  };
}

export const SEEDED_QUIZ_QUESTIONS: SeedQuestion[] = [
  {
    sortOrder: 1,
    prompt: "A typical dog has about how many scent receptors, compared with a human’s roughly 6 million?",
    promptEt: "Kui palju lõhnaretseptoreid on tüüpilisel koeral, võrreldes inimese umbes 6 miljoniga?",
    choices: [
      { id: "a", text: "About 30 million", textEt: "Umbes 30 miljonit" },
      { id: "b", text: "About 300 million", textEt: "Umbes 300 miljonit" },
      { id: "c", text: "About 3 million", textEt: "Umbes 3 miljonit" },
      { id: "d", text: "About 30 billion", textEt: "Umbes 30 miljardit" },
    ],
    correctId: "b",
    explanation: "Dogs can have around 300 million olfactory receptors — one reason scent work feels almost supernatural next to our 6 million.",
    explanationEt: "Koertel võib olla umbes 300 miljonit haistmisretseptorit — üks põhjus, miks nende haistmine tundub meie 6 miljoni kõrval peaaegu üleloomulik.",
    sourceLabel: "American Kennel Club",
    sourceUrl: "https://www.akc.org/expert-advice/nutrition/does-your-dog-have-a-good-sense-of-smell/",
    timerSeconds: QUIZ_QUESTION_SECONDS,
  },
  {
    sortOrder: 2,
    prompt: "Which pair of colours can dogs generally tell apart most clearly?",
    promptEt: "Millist värvipaari suudavad koerad üldiselt kõige selgemini eristada?",
    choices: [
      { id: "a", text: "Red and green", textEt: "Punast ja rohelist" },
      { id: "b", text: "Blue and yellow", textEt: "Sinist ja kollast" },
      { id: "c", text: "They only see black and white", textEt: "Nad näevad ainult must-valget" },
      { id: "d", text: "The same rainbow humans see", textEt: "Sama vikerkaart, mida näevad inimesed" },
    ],
    correctId: "b",
    explanation: "Dogs are dichromatic: blues and yellows stand out. Reds and greens often look muddy, which is why the old “black and white” myth stuck.",
    explanationEt: "Koerad on dikromaadid: sinine ja kollane paistavad selgelt. Punane ja roheline jäävad sageli mudaseks — sellest ka vana müüt, et nad näevad ainult must-valget.",
    sourceLabel: "American Kennel Club",
    sourceUrl: "https://www.akc.org/expert-advice/health/are-dogs-color-blind/",
    timerSeconds: QUIZ_QUESTION_SECONDS,
  },
  {
    sortOrder: 3,
    prompt: "A cat can hear sounds up to roughly which frequency?",
    promptEt: "Kui kõrgeid helisid suudab kass umbes kuulda?",
    choices: [
      { id: "a", text: "20 kHz — the same as a young human", textEt: "20 kHz — sama mis noor inimene" },
      { id: "b", text: "35 kHz", textEt: "35 kHz" },
      { id: "c", text: "About 64 kHz", textEt: "Umbes 64 kHz" },
      { id: "d", text: "120 kHz", textEt: "120 kHz" },
    ],
    correctId: "c",
    explanation: "Cats hear well into the ultrasonic range (around 64 kHz), handy for hunting rodents that squeak far above our hearing.",
    explanationEt: "Kassid kuulevad hästi ultrahelivahemikku (umbes 64 kHz), mis aitab hiiri jahti pidada — nende piiksumine jääb meie kuulmisest kõrgemale.",
    sourceLabel: "VCA Animal Hospitals",
    sourceUrl: "https://vcahospitals.com/know-your-pet/cat-behavior-problems-noise-phobias-and-noise-aversion",
    timerSeconds: QUIZ_QUESTION_SECONDS,
  },
  {
    sortOrder: 4,
    prompt: "Why don’t cats usually chase sweet treats the way people do?",
    promptEt: "Miks ei torma kassid magusate maiuste järele nagu inimesed?",
    choices: [
      { id: "a", text: "They have no taste buds at all", textEt: "Neil pole üldse maitsemeeli" },
      { id: "b", text: "They lack a working sweet-taste receptor", textEt: "Neil puudub töötav magusamaitse retseptor" },
      { id: "c", text: "Sugar is instantly toxic to every cat", textEt: "Suhkur on igale kassile kohe mürgine" },
      { id: "d", text: "Their tongues are too rough to taste", textEt: "Nende keel on maitsmiseks liiga kare" },
    ],
    correctId: "b",
    explanation: "Cats have a broken sweet-taste receptor gene, so sugar doesn’t register the way it does for us. That’s biology, not pickiness.",
    explanationEt: "Kassidel on katkine magusamaitse geeni, seega suhkur ei registreeru nagu meil. See on bioloogia, mitte valivus.",
    sourceLabel: "Cornell Feline Health Center",
    sourceUrl: "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feeding-your-cat",
    timerSeconds: QUIZ_QUESTION_SECONDS,
  },
  {
    sortOrder: 5,
    prompt: "The tapetum lucidum in a cat’s eye mainly helps by:",
    promptEt: "Kasside silmas olev tapetum lucidum aitab peamiselt:",
    choices: [
      { id: "a", text: "Making cats completely colour-blind", textEt: "Tehes kassid täiesti värvipimedaks" },
      { id: "b", text: "Reflecting light to boost night vision", textEt: "Peegeldades valgust, et parandada nägemist pimedas" },
      { id: "c", text: "Blocking ultraviolet light like sunglasses", textEt: "Blokeerides ultraviolettvalgust nagu päikeseprillid" },
      { id: "d", text: "Letting cats see infrared body heat", textEt: "Lastes kassidel näha infrapunast kehasoojust" },
    ],
    correctId: "b",
    explanation: "That mirror-like layer bounces light back through the retina — the glow you see in flash photos, and a big night-hunting advantage.",
    explanationEt: "See peegellaadne kiht põrkab valguse võrkkesta kaudu tagasi — sähvatus, mida näed välguga fotodel, ja suur eelis öisel jahil.",
    sourceLabel: "Cornell Feline Health Center",
    sourceUrl: "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feline-vision",
    timerSeconds: QUIZ_QUESTION_SECONDS,
  },
  {
    sortOrder: 6,
    prompt: "A cat’s whiskers are especially useful because they:",
    promptEt: "Kasside vurrud on eriti kasulikud, sest need:",
    choices: [
      { id: "a", text: "Are only for looking cute", textEt: "On ainult armsuse pärast" },
      { id: "b", text: "Help judge whether a gap is wide enough", textEt: "Aitavad hinnata, kas vahe on piisavalt lai" },
      { id: "c", text: "Taste sugar in the air", textEt: "Maitsvad õhus olevat suhkrut" },
      { id: "d", text: "Replace the need for hearing", textEt: "Asendavad kuulmist" },
    ],
    correctId: "b",
    explanation: "Whiskers are precision sensors. Their spread is a living ruler for “will I fit?” — which is why trimmed whiskers stress cats.",
    explanationEt: "Vurrud on täpsed andurid. Nende ulatus on elav joonlaud küsimusele „kas ma mahun?“ — seepärast teeb vurrude lõikamine kassile stressi.",
    sourceLabel: "Cornell Feline Health Center",
    sourceUrl: "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feline-behavior-problems-scratching-behavior",
    timerSeconds: QUIZ_QUESTION_SECONDS,
  },
  {
    sortOrder: 7,
    prompt: "A wagging tail always means a dog is happy and wants to be petted. True?",
    promptEt: "Saba liputamine tähendab alati, et koer on õnnelik ja tahab pai. Tõsi?",
    choices: [
      { id: "a", text: "Always true", textEt: "Alati tõsi" },
      { id: "b", text: "False — wagging can mean arousal, uncertainty, or a warning", textEt: "Vale — liputamine võib tähendada erutust, ebakindlust või hoiatust" },
      { id: "c", text: "True only for puppies", textEt: "Tõsi ainult kutsikate puhul" },
      { id: "d", text: "True only for Labrador Retrievers", textEt: "Tõsi ainult labradori retriiverite puhul" },
    ],
    correctId: "b",
    explanation: "Tail language is context. A stiff, high, fast wag can be a “stay back” flag, not an invitation. Read the whole dog.",
    explanationEt: "Saba keel oleneb kontekstist. Kange, kõrge, kiire liputus võib öelda „hoia eemale“, mitte „tule lähemale“. Loe kogu koera.",
    sourceLabel: "American Kennel Club",
    sourceUrl: "https://www.akc.org/expert-advice/advice/dog-tail-wagging-meaning/",
    timerSeconds: QUIZ_QUESTION_SECONDS,
  },
  {
    sortOrder: 8,
    prompt: "A dog’s nose print is:",
    promptEt: "Koera ninajälg on:",
    choices: [
      { id: "a", text: "The same for every dog in a breed", textEt: "Igal sama tõu koeral ühesugune" },
      { id: "b", text: "Unique, similar to a human fingerprint", textEt: "Unikaalne, sarnane inimese sõrmejäljega" },
      { id: "c", text: "Only found on wet noses", textEt: "Ainult märjal ninal" },
      { id: "d", text: "Wiped clean and redrawn every week", textEt: "Iga nädal puhtaks pühitav ja uuesti joonistatav" },
    ],
    correctId: "b",
    explanation: "The pattern of ridges on a dog’s nose is individual — one of those “wait, really?” ID facts trainers love.",
    explanationEt: "Koera nina harjade muster on individuaalne — üks neist „oot, päriselt?“ faktidest, mida treenerid armastavad.",
    sourceLabel: "American Kennel Club",
    sourceUrl: "https://www.akc.org/expert-advice/lifestyle/nose-print-identification/",
    timerSeconds: QUIZ_QUESTION_SECONDS,
  },
  {
    sortOrder: 9,
    prompt: "Cats are often described as crepuscular. That means they are most active:",
    promptEt: "Kasse nimetatakse sageli videvikuloomadeks. See tähendab, et nad on kõige aktiivsemad:",
    choices: [
      { id: "a", text: "At high noon", textEt: "Keskpäeval" },
      { id: "b", text: "At dawn and dusk", textEt: "Koidikul ja ehaajal" },
      { id: "c", text: "Only in pitch darkness", textEt: "Ainult pimedas" },
      { id: "d", text: "One afternoon a week", textEt: "Kord nädalas pärastlõunal" },
    ],
    correctId: "b",
    explanation: "Dawn and dusk are prime hunting hours. That 5 a.m. zoomie is not a personal attack — it’s ancestral scheduling.",
    explanationEt: "Koidik ja eha on peamised jahi tunnid. See hommikune kella viie tormamine pole isiklik rünnak — see on esivanemate ajakava.",
    sourceLabel: "Cornell Feline Health Center",
    sourceUrl: "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/play-and-predatory-behavior",
    timerSeconds: QUIZ_QUESTION_SECONDS,
  },
  {
    sortOrder: 10,
    prompt: "Who is the Chief Happiness Officer of StayWithMyPet?",
    promptEt: "Kes on StayWithMyPeti Chief Happiness Officer?",
    choices: [
      { id: "a", text: "Kush Chadha", textEt: "Kush Chadha" },
      { id: "b", text: "Gerly Kullamaa", textEt: "Gerly Kullamaa" },
      { id: "c", text: "Denny", textEt: "Denny" },
      { id: "d", text: "None of the above", textEt: "Mitte ükski neist" },
    ],
    correctId: "c",
    explanation: "Denny is StayWithMyPet’s Chief Happiness Officer — and the Boston Terrier you may have already spotted at the event! 🐾",
    explanationEt: "Denny on StayWithMyPeti Chief Happiness Officer — ja Boston terjer, keda võisid juba tänasel üritusel märgata! 🐾",
    sourceLabel: "StayWithMyPet",
    sourceUrl: "https://www.staywithmypet.ee/about",
    timerSeconds: QUIZ_QUESTION_SECONDS,
    imageUrl: DENNY_QUESTION_IMAGE,
  },
  {
    sortOrder: 11,
    prompt: "What is the main idea behind StayWithMyPet?",
    promptEt: "Mis on StayWithMyPeti peamine idee?",
    choices: [
      { id: "a", text: "An online pet shop", textEt: "Veebipõhine lemmikloomapood" },
      { id: "b", text: "Connecting pet owners with people who would love to spend time with pets", textEt: "Ühendada lemmikloomaomanikud inimestega, kes tahaksid lemmikutega aega veeta" },
      { id: "c", text: "A veterinary clinic", textEt: "Loomakliinik" },
      { id: "d", text: "A dog training school", textEt: "Koerte kool" },
    ],
    correctId: "b",
    explanation: "StayWithMyPet connects pet parents with pet friends — creating more flexible pet care and more companionship for pets.",
    explanationEt: "StayWithMyPet ühendab lemmikloomaomanikud lemmikusõpradega, pakkudes paindlikumat lemmikloomahoidu ja rohkem seltsi lemmikutele.",
    sourceLabel: "StayWithMyPet",
    sourceUrl: "https://www.staywithmypet.ee/about",
    timerSeconds: QUIZ_QUESTION_SECONDS,
  },
  {
    sortOrder: 12,
    prompt: "If you love animals but don't currently have a pet, what can you be on StayWithMyPet?",
    promptEt: "Kui armastad loomi, kuid sul endal praegu lemmikut pole, kes saad olla StayWithMyPetis?",
    choices: [
      { id: "a", text: "Pet Friend", textEt: "Lemmikusõber" },
      { id: "b", text: "Veterinarian", textEt: "Loomaarst" },
      { id: "c", text: "Pet Shop Manager", textEt: "Lemmikloomapoe juhataja" },
      { id: "d", text: "You cannot join", textEt: "Liituda ei saa" },
    ],
    correctId: "a",
    explanation: "You can become a Pet Friend and connect with pet parents who are looking for trusted help and companionship for their pets. 🐾",
    explanationEt: "Saad olla lemmikusõber ja tutvuda lemmikloomaomanikega, kes otsivad oma lemmikule usaldusväärset abi ja seltsi. 🐾",
    sourceLabel: "StayWithMyPet",
    sourceUrl: "https://www.staywithmypet.ee/find-pets",
    timerSeconds: QUIZ_QUESTION_SECONDS,
  },
];

export const SEEDED_QUIZ_QUESTION_COUNT = SEEDED_QUIZ_QUESTIONS.length;
