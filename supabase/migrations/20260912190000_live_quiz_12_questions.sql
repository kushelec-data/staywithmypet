-- Shrink the default live quiz to 12 questions and add optional image_url.
-- Idempotent: delete + insert for the oldest quiz leaves exactly these 12 rows.

alter table public.quiz_questions add column if not exists image_url text;

do $$
declare
  v_quiz_id uuid;
begin
  select id into v_quiz_id from public.quizzes order by created_at asc limit 1;
  if v_quiz_id is null then
    return;
  end if;

  begin
    alter table public.live_quiz_reactions disable trigger live_quiz_reactions_count_sync;
  exception
    when undefined_object then null;
    when undefined_table then null;
  end;

  delete from public.live_quiz_reaction_counts
  where question_id in (select id from public.quiz_questions where quiz_questions.quiz_id = v_quiz_id)
     or game_id in (select id from public.live_quiz_games where live_quiz_games.quiz_id = v_quiz_id);

  delete from public.live_quiz_reactions
  where question_id in (select id from public.quiz_questions where quiz_questions.quiz_id = v_quiz_id)
     or game_id in (select id from public.live_quiz_games where live_quiz_games.quiz_id = v_quiz_id);

  delete from public.live_quiz_reaction_counts
  where question_id in (select id from public.quiz_questions where quiz_questions.quiz_id = v_quiz_id)
     or game_id in (select id from public.live_quiz_games where live_quiz_games.quiz_id = v_quiz_id);

  delete from public.live_quiz_answers
  where question_id in (select id from public.quiz_questions where quiz_questions.quiz_id = v_quiz_id)
     or game_id in (select id from public.live_quiz_games where live_quiz_games.quiz_id = v_quiz_id);

  delete from public.live_quiz_roster
  where game_id in (select id from public.live_quiz_games where live_quiz_games.quiz_id = v_quiz_id);

  delete from public.live_quiz_players
  where game_id in (select id from public.live_quiz_games where live_quiz_games.quiz_id = v_quiz_id);

  delete from public.live_quiz_games
  where live_quiz_games.quiz_id = v_quiz_id;

  delete from public.quiz_questions
  where quiz_questions.quiz_id = v_quiz_id;

  begin
    alter table public.live_quiz_reactions enable trigger live_quiz_reactions_count_sync;
  exception
    when undefined_object then null;
    when undefined_table then null;
  end;

  insert into public.quiz_questions (
    quiz_id, sort_order, prompt, prompt_et,
    choice_a, choice_b, choice_c, choice_d,
    choice_a_et, choice_b_et, choice_c_et, choice_d_et,
    correct_id, explanation, explanation_et,
    source_label, source_url, timer_seconds, image_url
  ) values
  (
    v_quiz_id, 1,
    $en$A typical dog has about how many scent receptors, compared with a human’s roughly 6 million?$en$,
    $et$Kui palju lõhnaretseptoreid on tüüpilisel koeral, võrreldes inimese umbes 6 miljoniga?$et$,
    $en$About 30 million$en$, $en$About 300 million$en$, $en$About 3 million$en$, $en$About 30 billion$en$,
    $et$Umbes 30 miljonit$et$, $et$Umbes 300 miljonit$et$, $et$Umbes 3 miljonit$et$, $et$Umbes 30 miljardit$et$,
    'b',
    $en$Dogs can have around 300 million olfactory receptors — one reason scent work feels almost supernatural next to our 6 million.$en$,
    $et$Koertel võib olla umbes 300 miljonit haistmisretseptorit — üks põhjus, miks nende haistmine tundub meie 6 miljoni kõrval peaaegu üleloomulik.$et$,
    'American Kennel Club',
    'https://www.akc.org/expert-advice/nutrition/does-your-dog-have-a-good-sense-of-smell/',
    30, null
  ),
  (
    v_quiz_id, 2,
    $en$Which pair of colours can dogs generally tell apart most clearly?$en$,
    $et$Millist värvipaari suudavad koerad üldiselt kõige selgemini eristada?$et$,
    $en$Red and green$en$, $en$Blue and yellow$en$, $en$They only see black and white$en$, $en$The same rainbow humans see$en$,
    $et$Punast ja rohelist$et$, $et$Sinist ja kollast$et$, $et$Nad näevad ainult must-valget$et$, $et$Sama vikerkaart, mida näevad inimesed$et$,
    'b',
    $en$Dogs are dichromatic: blues and yellows stand out. Reds and greens often look muddy, which is why the old “black and white” myth stuck.$en$,
    $et$Koerad on dikromaadid: sinine ja kollane paistavad selgelt. Punane ja roheline jäävad sageli mudaseks — sellest ka vana müüt, et nad näevad ainult must-valget.$et$,
    'American Kennel Club',
    'https://www.akc.org/expert-advice/health/are-dogs-color-blind/',
    30, null
  ),
  (
    v_quiz_id, 3,
    $en$A cat can hear sounds up to roughly which frequency?$en$,
    $et$Kui kõrgeid helisid suudab kass umbes kuulda?$et$,
    $en$20 kHz — the same as a young human$en$, $en$35 kHz$en$, $en$About 64 kHz$en$, $en$120 kHz$en$,
    $et$20 kHz — sama mis noor inimene$et$, $et$35 kHz$et$, $et$Umbes 64 kHz$et$, $et$120 kHz$et$,
    'c',
    $en$Cats hear well into the ultrasonic range (around 64 kHz), handy for hunting rodents that squeak far above our hearing.$en$,
    $et$Kassid kuulevad hästi ultrahelivahemikku (umbes 64 kHz), mis aitab hiiri jahti pidada — nende piiksumine jääb meie kuulmisest kõrgemale.$et$,
    'VCA Animal Hospitals',
    'https://vcahospitals.com/know-your-pet/cat-behavior-problems-noise-phobias-and-noise-aversion',
    30, null
  ),
  (
    v_quiz_id, 4,
    $en$Why don’t cats usually chase sweet treats the way people do?$en$,
    $et$Miks ei torma kassid magusate maiuste järele nagu inimesed?$et$,
    $en$They have no taste buds at all$en$, $en$They lack a working sweet-taste receptor$en$, $en$Sugar is instantly toxic to every cat$en$, $en$Their tongues are too rough to taste$en$,
    $et$Neil pole üldse maitsemeeli$et$, $et$Neil puudub töötav magusamaitse retseptor$et$, $et$Suhkur on igale kassile kohe mürgine$et$, $et$Nende keel on maitsmiseks liiga kare$et$,
    'b',
    $en$Cats have a broken sweet-taste receptor gene, so sugar doesn’t register the way it does for us. That’s biology, not pickiness.$en$,
    $et$Kassidel on katkine magusamaitse geeni, seega suhkur ei registreeru nagu meil. See on bioloogia, mitte valivus.$et$,
    'Cornell Feline Health Center',
    'https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feeding-your-cat',
    30, null
  ),
  (
    v_quiz_id, 5,
    $en$The tapetum lucidum in a cat’s eye mainly helps by:$en$,
    $et$Kasside silmas olev tapetum lucidum aitab peamiselt:$et$,
    $en$Making cats completely colour-blind$en$, $en$Reflecting light to boost night vision$en$, $en$Blocking ultraviolet light like sunglasses$en$, $en$Letting cats see infrared body heat$en$,
    $et$Tehes kassid täiesti värvipimedaks$et$, $et$Peegeldades valgust, et parandada nägemist pimedas$et$, $et$Blokeerides ultraviolettvalgust nagu päikeseprillid$et$, $et$Lastes kassidel näha infrapunast kehasoojust$et$,
    'b',
    $en$That mirror-like layer bounces light back through the retina — the glow you see in flash photos, and a big night-hunting advantage.$en$,
    $et$See peegellaadne kiht põrkab valguse võrkkesta kaudu tagasi — sähvatus, mida näed välguga fotodel, ja suur eelis öisel jahil.$et$,
    'Cornell Feline Health Center',
    'https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feline-vision',
    30, null
  ),
  (
    v_quiz_id, 6,
    $en$A cat’s whiskers are especially useful because they:$en$,
    $et$Kasside vurrud on eriti kasulikud, sest need:$et$,
    $en$Are only for looking cute$en$, $en$Help judge whether a gap is wide enough$en$, $en$Taste sugar in the air$en$, $en$Replace the need for hearing$en$,
    $et$On ainult armsuse pärast$et$, $et$Aitavad hinnata, kas vahe on piisavalt lai$et$, $et$Maitsvad õhus olevat suhkrut$et$, $et$Asendavad kuulmist$et$,
    'b',
    $en$Whiskers are precision sensors. Their spread is a living ruler for “will I fit?” — which is why trimmed whiskers stress cats.$en$,
    $et$Vurrud on täpsed andurid. Nende ulatus on elav joonlaud küsimusele „kas ma mahun?“ — seepärast teeb vurrude lõikamine kassile stressi.$et$,
    'Cornell Feline Health Center',
    'https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feline-behavior-problems-scratching-behavior',
    30, null
  ),
  (
    v_quiz_id, 7,
    $en$A wagging tail always means a dog is happy and wants to be petted. True?$en$,
    $et$Saba liputamine tähendab alati, et koer on õnnelik ja tahab pai. Tõsi?$et$,
    $en$Always true$en$, $en$False — wagging can mean arousal, uncertainty, or a warning$en$, $en$True only for puppies$en$, $en$True only for Labrador Retrievers$en$,
    $et$Alati tõsi$et$, $et$Vale — liputamine võib tähendada erutust, ebakindlust või hoiatust$et$, $et$Tõsi ainult kutsikate puhul$et$, $et$Tõsi ainult labradori retriiverite puhul$et$,
    'b',
    $en$Tail language is context. A stiff, high, fast wag can be a “stay back” flag, not an invitation. Read the whole dog.$en$,
    $et$Saba keel oleneb kontekstist. Kange, kõrge, kiire liputus võib öelda „hoia eemale“, mitte „tule lähemale“. Loe kogu koera.$et$,
    'American Kennel Club',
    'https://www.akc.org/expert-advice/advice/dog-tail-wagging-meaning/',
    30, null
  ),
  (
    v_quiz_id, 8,
    $en$A dog’s nose print is:$en$,
    $et$Koera ninajälg on:$et$,
    $en$The same for every dog in a breed$en$, $en$Unique, similar to a human fingerprint$en$, $en$Only found on wet noses$en$, $en$Wiped clean and redrawn every week$en$,
    $et$Igal sama tõu koeral ühesugune$et$, $et$Unikaalne, sarnane inimese sõrmejäljega$et$, $et$Ainult märjal ninal$et$, $et$Iga nädal puhtaks pühitav ja uuesti joonistatav$et$,
    'b',
    $en$The pattern of ridges on a dog’s nose is individual — one of those “wait, really?” ID facts trainers love.$en$,
    $et$Koera nina harjade muster on individuaalne — üks neist „oot, päriselt?“ faktidest, mida treenerid armastavad.$et$,
    'American Kennel Club',
    'https://www.akc.org/expert-advice/lifestyle/nose-print-identification/',
    30, null
  ),
  (
    v_quiz_id, 9,
    $en$Cats are often described as crepuscular. That means they are most active:$en$,
    $et$Kasse nimetatakse sageli videvikuloomadeks. See tähendab, et nad on kõige aktiivsemad:$et$,
    $en$At high noon$en$, $en$At dawn and dusk$en$, $en$Only in pitch darkness$en$, $en$One afternoon a week$en$,
    $et$Keskpäeval$et$, $et$Koidikul ja ehaajal$et$, $et$Ainult pimedas$et$, $et$Kord nädalas pärastlõunal$et$,
    'b',
    $en$Dawn and dusk are prime hunting hours. That 5 a.m. zoomie is not a personal attack — it’s ancestral scheduling.$en$,
    $et$Koidik ja eha on peamised jahi tunnid. See hommikune kella viie tormamine pole isiklik rünnak — see on esivanemate ajakava.$et$,
    'Cornell Feline Health Center',
    'https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/play-and-predatory-behavior',
    30, null
  ),
  (
    v_quiz_id, 10,
    $en$Who is the Chief Happiness Officer of StayWithMyPet?$en$,
    $et$Kes on StayWithMyPeti Chief Happiness Officer?$et$,
    $en$Kush Chadha$en$, $en$Gerly Kullamaa$en$, $en$Denny$en$, $en$None of the above$en$,
    $et$Kush Chadha$et$, $et$Gerly Kullamaa$et$, $et$Denny$et$, $et$Mitte ükski neist$et$,
    'c',
    $en$Denny is StayWithMyPet’s Chief Happiness Officer — and the Boston Terrier you may have already spotted at the event! 🐾$en$,
    $et$Denny on StayWithMyPeti Chief Happiness Officer — ja Boston terjer, keda võisid juba tänasel üritusel märgata! 🐾$et$,
    'StayWithMyPet',
    'https://www.staywithmypet.ee/about',
    30, '/quiz/denny.jpg'
  ),
  (
    v_quiz_id, 11,
    $en$What is the main idea behind StayWithMyPet?$en$,
    $et$Mis on StayWithMyPeti peamine idee?$et$,
    $en$An online pet shop$en$, $en$Connecting pet owners with people who would love to spend time with pets$en$, $en$A veterinary clinic$en$, $en$A dog training school$en$,
    $et$Veebipõhine lemmikloomapood$et$, $et$Ühendada lemmikloomaomanikud inimestega, kes tahaksid lemmikutega aega veeta$et$, $et$Loomakliinik$et$, $et$Koerte kool$et$,
    'b',
    $en$StayWithMyPet connects pet parents with pet friends — creating more flexible pet care and more companionship for pets.$en$,
    $et$StayWithMyPet ühendab lemmikloomaomanikud lemmikusõpradega, pakkudes paindlikumat lemmikloomahoidu ja rohkem seltsi lemmikutele.$et$,
    'StayWithMyPet',
    'https://www.staywithmypet.ee/about',
    30, null
  ),
  (
    v_quiz_id, 12,
    $en$If you love animals but don't currently have a pet, what can you be on StayWithMyPet?$en$,
    $et$Kui armastad loomi, kuid sul endal praegu lemmikut pole, kes saad olla StayWithMyPetis?$et$,
    $en$Pet Friend$en$, $en$Veterinarian$en$, $en$Pet Shop Manager$en$, $en$You cannot join$en$,
    $et$Lemmikusõber$et$, $et$Loomaarst$et$, $et$Lemmikloomapoe juhataja$et$, $et$Liituda ei saa$et$,
    'a',
    $en$You can become a Pet Friend and connect with pet parents who are looking for trusted help and companionship for their pets. 🐾$en$,
    $et$Saad olla lemmikusõber ja tutvuda lemmikloomaomanikega, kes otsivad oma lemmikule usaldusväärset abi ja seltsi. 🐾$et$,
    'StayWithMyPet',
    'https://www.staywithmypet.ee/find-pets',
    30, null
  );
end $$;
