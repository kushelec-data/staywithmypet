-- Bilingual question content, player locale, and a fixed 20-second question timer.

alter table public.quiz_questions
  add column if not exists prompt_et text not null default '',
  add column if not exists choice_a_et text not null default '',
  add column if not exists choice_b_et text not null default '',
  add column if not exists choice_c_et text not null default '',
  add column if not exists choice_d_et text not null default '',
  add column if not exists explanation_et text not null default '';

alter table public.live_quiz_players
  add column if not exists locale text not null default 'en';

do $$
begin
  alter table public.live_quiz_players
    add constraint live_quiz_players_locale_check check (locale in ('en', 'et'));
exception
  when duplicate_object then null;
end $$;

update public.quiz_questions set timer_seconds = 20;
alter table public.quiz_questions alter column timer_seconds set default 20;

update public.quiz_questions set
  prompt_et = $et$Kui palju lõhnaretseptoreid on tüüpilisel koeral, võrreldes inimese umbes 6 miljoniga?$et$,
  choice_a_et = $et$Umbes 30 miljonit$et$,
  choice_b_et = $et$Umbes 300 miljonit$et$,
  choice_c_et = $et$Umbes 3 miljonit$et$,
  choice_d_et = $et$Umbes 30 miljardit$et$,
  explanation_et = $et$Koertel võib olla umbes 300 miljonit haistmisretseptorit — üks põhjus, miks nende haistmine tundub meie 6 miljoni kõrval peaaegu üleloomulik.$et$
where prompt = $en$A typical dog has about how many scent receptors, compared with a human’s roughly 6 million?$en$;

update public.quiz_questions set
  prompt_et = $et$Millist värvipaari suudavad koerad üldiselt kõige selgemini eristada?$et$,
  choice_a_et = $et$Punast ja rohelist$et$,
  choice_b_et = $et$Sinist ja kollast$et$,
  choice_c_et = $et$Nad näevad ainult must-valget$et$,
  choice_d_et = $et$Sama vikerkaart, mida näevad inimesed$et$,
  explanation_et = $et$Koerad on dikromaadid: sinine ja kollane paistavad selgelt. Punane ja roheline jäävad sageli mudaseks — sellest ka vana müüt, et nad näevad ainult must-valget.$et$
where prompt = $en$Which pair of colours can dogs generally tell apart most clearly?$en$;

update public.quiz_questions set
  prompt_et = $et$Kui kõrgeid helisid suudab kass umbes kuulda?$et$,
  choice_a_et = $et$20 kHz — sama mis noor inimene$et$,
  choice_b_et = $et$35 kHz$et$,
  choice_c_et = $et$Umbes 64 kHz$et$,
  choice_d_et = $et$120 kHz$et$,
  explanation_et = $et$Kassid kuulevad hästi ultrahelivahemikku (umbes 64 kHz), mis aitab hiiri jahti pidada — nende piiksumine jääb meie kuulmisest kõrgemale.$et$
where prompt = $en$A cat can hear sounds up to roughly which frequency?$en$;

update public.quiz_questions set
  prompt_et = $et$Miks ei torma kassid magusate maiuste järele nagu inimesed?$et$,
  choice_a_et = $et$Neil pole üldse maitsemeeli$et$,
  choice_b_et = $et$Neil puudub töötav magusamaitse retseptor$et$,
  choice_c_et = $et$Suhkur on igale kassile kohe mürgine$et$,
  choice_d_et = $et$Nende keel on maitsmiseks liiga kare$et$,
  explanation_et = $et$Kassidel on katkine magusamaitse geeni, seega suhkur ei registreeru nagu meil. See on bioloogia, mitte valivus.$et$
where prompt = $en$Why don’t cats usually chase sweet treats the way people do?$en$;

update public.quiz_questions set
  prompt_et = $et$Kuidas koerad peamiselt jahtuvad?$et$,
  choice_a_et = $et$Kogu kehaga higistades nagu inimesed$et$,
  choice_b_et = $et$Hingeldades, pluss veidi niiskust käpapadjandite kaudu$et$,
  choice_c_et = $et$Ainult kõrvade kaudu$et$,
  choice_d_et = $et$Ainult vette hüpates$et$,
  explanation_et = $et$Hingeldamine teeb suurema osa jahutusest. Käpapadjanditel on higinäärmeid, aga see pole koera kliimaseade.$et$
where prompt = $en$How do dogs mainly cool themselves?$en$;

update public.quiz_questions set
  prompt_et = $et$Kasside silmas olev tapetum lucidum aitab peamiselt:$et$,
  choice_a_et = $et$Tehes kassid täiesti värvipimedaks$et$,
  choice_b_et = $et$Peegeldades valgust, et parandada nägemist pimedas$et$,
  choice_c_et = $et$Blokeerides ultraviolettvalgust nagu päikeseprillid$et$,
  choice_d_et = $et$Lastes kassidel näha infrapunast kehasoojust$et$,
  explanation_et = $et$See peegellaadne kiht põrkab valguse võrkkesta kaudu tagasi — sähvatus, mida näed välguga fotodel, ja suur eelis öisel jahil.$et$
where prompt = $en$The tapetum lucidum in a cat’s eye mainly helps by:$en$;

update public.quiz_questions set
  prompt_et = $et$Kasside vurrud on eriti kasulikud, sest need:$et$,
  choice_a_et = $et$On ainult armsuse pärast$et$,
  choice_b_et = $et$Aitavad hinnata, kas vahe on piisavalt lai$et$,
  choice_c_et = $et$Maitsvad õhus olevat suhkrut$et$,
  choice_d_et = $et$Asendavad kuulmist$et$,
  explanation_et = $et$Vurrud on täpsed andurid. Nende ulatus on elav joonlaud küsimusele „kas ma mahun?“ — seepärast teeb vurrude lõikamine kassile stressi.$et$
where prompt = $en$A cat’s whiskers are especially useful because they:$en$;

update public.quiz_questions set
  prompt_et = $et$Vastsündinud kutsikad tavaliselt:$et$,
  choice_a_et = $et$Näevad ja kuulevad selgelt esimesest hetkest$et$,
  choice_b_et = $et$Ei näe ega kuule veel — silmad ja kõrvad on suletud$et$,
  choice_c_et = $et$Neil on juba täiskasvanud hambad$et$,
  choice_d_et = $et$Jooksevad ema järel minutitega$et$,
  explanation_et = $et$Kutsikad sünnivad pimedate ja kurtidena. Silmad ja kuulmekäigud avanevad järgnevate nädalate jooksul, kui närvisüsteem järele jõuab.$et$
where prompt = $en$Newborn puppies typically:$en$;

update public.quiz_questions set
  prompt_et = $et$„Koerad näevad ainult must-valget.“ Mis on tõde?$et$,
  choice_a_et = $et$Tõsi — üldse pole värve$et$,
  choice_b_et = $et$Müüt — nad näevad mõnda värvi, eriti sinist ja kollast$et$,
  choice_c_et = $et$Tõsi, välja arvatud puudelid$et$,
  choice_d_et = $et$Müüt — nad näevad rohkem värve kui inimesed$et$,
  explanation_et = $et$Must-valge lugu on klassikaline müüt. Koertel on vähem värvikolvikesi kui meil, aga maailm pole tummfilm.$et$
where prompt = $en$“Dogs see only in black and white.” What’s the verdict?$en$;

update public.quiz_questions set
  prompt_et = $et$Kui kaua magab tavaline kodukass ööpäevas?$et$,
  choice_a_et = $et$4–6 tundi$et$,
  choice_b_et = $et$8 tundi, nagu paljud inimesed$et$,
  choice_c_et = $et$12–16 tundi$et$,
  choice_d_et = $et$22 tundi, eranditeta$et$,
  explanation_et = $et$Kassid on meistrid uinakutest: sageli 12–16 tundi 24 tunni jooksul, lühikeste tsüklitena, mitte ühe pika ööna.$et$
where prompt = $en$A typical house cat sleeps about how long each day?$en$;

update public.quiz_questions set
  prompt_et = $et$Kui palju suudavad paljud kassid kumbagi kõrva pöörata?$et$,
  choice_a_et = $et$Umbes 20 kraadi$et$,
  choice_b_et = $et$Umbes 90 kraadi$et$,
  choice_c_et = $et$Kuni 180 kraadi$et$,
  choice_d_et = $et$Nad ei saa kõrvu iseseisvalt pöörata$et$,
  explanation_et = $et$Sõltumatud, peaaegu 180° kõrvapöörded lasevad kassil kahinat täpselt paikneda ilma pead keeramata — karvaga radarid.$et$
where prompt = $en$How far can many cats rotate each ear?$en$;

update public.quiz_questions set
  prompt_et = $et$Umbes mitu lihast juhib kumbagi kassi kõrva?$et$,
  choice_a_et = $et$2$et$,
  choice_b_et = $et$8$et$,
  choice_c_et = $et$32$et$,
  choice_d_et = $et$100$et$,
  explanation_et = $et$Umbes 32 lihast kõrva kohta annab kassidele satelliitantenni täpsuse. Inimene saab hakkama käputäiega ja enamik meist ei suuda isegi kõrvu liigutada.$et$
where prompt = $en$About how many muscles control each cat ear?$en$;

update public.quiz_questions set
  prompt_et = $et$Täisgalopis võib hurta joosta umbes:$et$,
  choice_a_et = $et$20 miili tunnis (32 km/h)$et$,
  choice_b_et = $et$28 miili tunnis (45 km/h)$et$,
  choice_c_et = $et$45 miili tunnis (72 km/h)$et$,
  choice_d_et = $et$70 miili tunnis (113 km/h)$et$,
  explanation_et = $et$Hurtad on ehitatud nagu vedrud: purskes umbes 72 km/h, ühed kiireimad koeratõud.$et$
where prompt = $en$A Greyhound at a full sprint can reach about:$en$;

update public.quiz_questions set
  prompt_et = $et$Terve kassi puhkeoleku südame löögisagedus on tavaliselt:$et$,
  choice_a_et = $et$40–60 lööki minutis$et$,
  choice_b_et = $et$80–100 lööki minutis$et$,
  choice_c_et = $et$140–220 lööki minutis$et$,
  choice_d_et = $et$300–400 lööki minutis$et$,
  explanation_et = $et$Väiksemad loomad käivad kiirema taktiga. Rahuliku kassi süda on sageli 140–220 lööki minutis — ehmatavalt kiire, kui ootasid inimese pulssi.$et$
where prompt = $en$A healthy cat’s resting heart rate is typically:$en$;

update public.quiz_questions set
  prompt_et = $et$Saba liputamine tähendab alati, et koer on õnnelik ja tahab pai. Tõsi?$et$,
  choice_a_et = $et$Alati tõsi$et$,
  choice_b_et = $et$Vale — liputamine võib tähendada erutust, ebakindlust või hoiatust$et$,
  choice_c_et = $et$Tõsi ainult kutsikate puhul$et$,
  choice_d_et = $et$Tõsi ainult labradori retriiverite puhul$et$,
  explanation_et = $et$Saba keel oleneb kontekstist. Kange, kõrge, kiire liputus võib öelda „hoia eemale“, mitte „tule lähemale“. Loe kogu koera.$et$
where prompt = $en$A wagging tail always means a dog is happy and wants to be petted. True?$en$;

update public.quiz_questions set
  prompt_et = $et$Koera ninajälg on:$et$,
  choice_a_et = $et$Igal sama tõu koeral ühesugune$et$,
  choice_b_et = $et$Unikaalne, sarnane inimese sõrmejäljega$et$,
  choice_c_et = $et$Ainult märjal ninal$et$,
  choice_d_et = $et$Iga nädal puhtaks pühitav ja uuesti joonistatav$et$,
  explanation_et = $et$Koera nina harjade muster on individuaalne — üks neist „oot, päriselt?“ faktidest, mida treenerid armastavad.$et$
where prompt = $en$A dog’s nose print is:$en$;

update public.quiz_questions set
  prompt_et = $et$Kasse nimetatakse sageli videvikuloomadeks. See tähendab, et nad on kõige aktiivsemad:$et$,
  choice_a_et = $et$Keskpäeval$et$,
  choice_b_et = $et$Koidikul ja ehaajal$et$,
  choice_c_et = $et$Ainult pimedas$et$,
  choice_d_et = $et$Kord nädalas pärastlõunal$et$,
  explanation_et = $et$Koidik ja eha on peamised jahi tunnid. See hommikune kella viie tormamine pole isiklik rünnak — see on esivanemate ajakava.$et$
where prompt = $en$Cats are often described as crepuscular. That means they are most active:$en$;

update public.quiz_questions set
  prompt_et = $et$Võrreldes inimesega kirjeldatakse koera haistmist sageli kui:$et$,
  choice_a_et = $et$Veidi nõrgemat$et$,
  choice_b_et = $et$Umbes sama$et$,
  choice_c_et = $et$Tuhandeid kuni kümneid tuhandeid kordi tundlikumat$et$,
  choice_d_et = $et$Kasulikku ainult toidu leidmiseks$et$,
  explanation_et = $et$Hinnangud jäävad sageli 10 000 kuni 100 000 korda tundlikumaks, olenevalt tõust — piisav, et tabada jälgi, mida meie kunagi ei märkaks.$et$
where prompt = $en$Compared with humans, a dog’s sense of smell is often described as:$en$;

update public.quiz_questions set
  prompt_et = $et$StayWithMyPet on loodud selleks, et:$et$,
  choice_a_et = $et$Ainult loomakliinikud saaksid jalutuskäike broneerida$et$,
  choice_b_et = $et$Lemmikloomaomanikud ja lemmikloomasõbrad saaksid usaldusväärseks seltsiks kokku saada$et$,
  choice_c_et = $et$Lemmikloomi müüa$et$,
  choice_d_et = $et$Liituda saaksid ainult professionaalsed treenerid$et$,
  explanation_et = $et$See on kogukond neile, kellel on lemmikloom, ja neile, kes tahavad nendega aega veeta — jalutuskäigud, külaskäigud ja kodune hooldus, mitte lemmikloomapood.$et$
where prompt = $en$StayWithMyPet is built so that:$en$;

update public.quiz_questions set
  prompt_et = $et$Kui sul on lemmikloom ja tahad usaldusväärset inimest temaga aega veetma, kust StayWithMyPetis alustad?$et$,
  choice_a_et = $et$Leia lemmikloomi$et$,
  choice_b_et = $et$Leia hooldust$et$,
  choice_c_et = $et$Adminiliides$et$,
  choice_d_et = $et$Ainult hinnakiri$et$,
  explanation_et = $et$„Leia hooldust“ on lemmikloomaomaniku tee. „Leia lemmikloomi“ on neile, kes tahavad looma hooldada. Sama kogukond, kaks ust.$et$
where prompt = $en$If you have a pet and want a trusted person to spend time with them, where do you start on StayWithMyPet?$en$;
