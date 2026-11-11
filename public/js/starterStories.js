// ============ STARTER STORIES ============
// Short graded readers available to every user from day one.
// Word translations come from the shared dictionary when a story is opened;
// `glossary` covers words where the context needs a specific meaning
// (or the dictionary has no entry). Keys are lowercase, exactly as written.

export const STARTER_STORIES = [
  // ---------- Polish ----------
  {
    lang: 'pl', level: 'A1', title: 'Na targu',
    story: 'W sobotę rano Ola idzie na targ. Targ jest blisko jej domu. Ola kupuje świeży chleb, jajka i masło. Pan przy straganie jest bardzo miły.\n— Dzień dobry! Ile kosztują jabłka? — pyta Ola.\n— Pięć złotych za kilogram — odpowiada pan.\nOla kupuje dwa kilogramy jabłek. Potem wraca do domu i robi śniadanie. Jajecznica i świeży chleb to jej ulubione śniadanie.',
    glossary: { ola: 'Ola (name)', kilogram: 'kilogram', kilogramy: 'kilograms', targ: 'market', straganie: 'stall', ile: 'how much', 'kosztują': 'cost', 'złotych': 'zloty (Polish money)', 'jabłek': 'apples', wraca: 'goes back', jajecznica: 'scrambled eggs', ulubione: 'favourite', 'śniadanie': 'breakfast', jej: 'her' },
  },
  {
    lang: 'pl', level: 'A1', title: 'Moja rodzina',
    story: 'Mam na imię Kasia. Mam dwadzieścia lat i mieszkam w Gdańsku. Moja rodzina jest mała. Mam mamę, tatę i młodszego brata. Mój brat ma na imię Tomek. On ma dziesięć lat i bardzo lubi piłkę nożną. Moja mama jest lekarką, a tata jest nauczycielem. Mamy też kota. Kot nazywa się Filemon i cały dzień śpi na kanapie.',
    glossary: { kasia: 'Kasia (name)', tomek: 'Tomek (name)', filemon: 'Filemon (the cat)', 'imię': 'name', 'młodszego': 'younger', 'lekarką': 'a doctor (woman)', nauczycielem: 'a teacher', nazywa: 'is called', 'piłkę': 'ball', 'nożną': 'foot (piłka nożna = football)', kanapie: 'sofa', 'gdańsku': 'Gdańsk (city)', lat: 'years (old)', 'śpi': 'sleeps', mam: 'I have', mamy: 'we have' },
  },
  {
    lang: 'pl', level: 'A1', title: 'W kawiarni',
    story: 'Jest zimno, więc Marek idzie do kawiarni.\n— Dzień dobry. Poproszę dużą kawę z mlekiem — mówi Marek.\n— Coś jeszcze? — pyta kelnerka.\n— Tak, poproszę też kawałek sernika.\n— Proszę bardzo. Razem dwadzieścia osiem złotych.\nMarek płaci kartą i siada przy oknie. Kawa jest gorąca, a sernik jest pyszny. Marek czyta książkę i patrzy na ludzi na ulicy.',
    glossary: { kawiarni: 'café', 'poproszę': "I'd like (please)", kelnerka: 'waitress', 'kawałek': 'a piece', sernika: 'cheesecake', sernik: 'cheesecake', razem: 'altogether', 'płaci': 'pays', 'kartą': 'by card', siada: 'sits down', pyszny: 'delicious', 'złotych': 'zloty (Polish money)' },
  },
  {
    lang: 'pl', level: 'A2', title: 'Weekend w Krakowie',
    story: 'W piątek wieczorem pojechaliśmy pociągiem do Krakowa. Podróż trwała tylko trzy godziny. W sobotę rano spacerowaliśmy po Rynku Głównym i zwiedzaliśmy Wawel. Było dużo turystów, ale atmosfera była wspaniała. Na obiad zjedliśmy pierogi z mięsem i barszcz. Po południu poszliśmy do muzeum, a wieczorem słuchaliśmy muzyki w małym klubie na Kazimierzu. W niedzielę byliśmy zmęczeni, ale bardzo szczęśliwi. Na pewno wrócimy do Krakowa latem.',
    glossary: { 'pojechaliśmy': 'we went (by vehicle)', 'pociągiem': 'by train', 'podróż': 'journey', 'trwała': 'lasted', 'spacerowaliśmy': 'we walked around', rynku: 'market square', 'głównym': 'main', 'zwiedzaliśmy': 'we visited', wawel: 'Wawel (royal castle)', 'zjedliśmy': 'we ate', pierogi: 'dumplings', barszcz: 'beetroot soup', 'poszliśmy': 'we went (on foot)', 'słuchaliśmy': 'we listened to', kazimierzu: 'Kazimierz (district)', 'byliśmy': 'we were', 'zmęczeni': 'tired', 'szczęśliwi': 'happy', 'wrócimy': 'we will come back', latem: 'in summer', 'krakowa': 'Kraków' },
  },
  {
    lang: 'pl', level: 'A2', title: 'Zimowy poranek',
    story: 'Kiedy obudziłam się w poniedziałek, za oknem wszystko było białe. W nocy padał śnieg. Dzieci z sąsiedztwa już lepiły bałwana przed blokiem. Zrobiłam sobie herbatę z cytryną i miodem i przez chwilę patrzyłam na ulicę. Autobusy jechały bardzo wolno, a ludzie ostrożnie szli po chodniku. Musiałam wyjść wcześniej do pracy, bo drogi były śliskie. Lubię zimę, ale tylko wtedy, kiedy nie muszę nigdzie się spieszyć.',
    glossary: { autobusy: 'buses', 'jechały': 'were moving', 'obudziłam': 'I woke up', 'padał': 'was falling', 'śnieg': 'snow', 'sąsiedztwa': 'the neighbourhood', 'lepiły': 'were making', 'bałwana': 'a snowman', blokiem: 'block of flats', 'cytryną': 'lemon', miodem: 'honey', 'chwilę': 'a moment', 'patrzyłam': 'I was looking', 'ostrożnie': 'carefully', chodniku: 'pavement', 'musiałam': 'I had to', 'śliskie': 'slippery', 'spieszyć': 'to hurry', 'zrobiłam': 'I made' },
  },
  {
    lang: 'pl', level: 'B1', title: 'Spotkanie w lesie',
    story: 'Każdej jesieni Paweł chodzi na grzyby do lasu za wsią. Pewnego ranka, kiedy zbierał borowiki, usłyszał za sobą ciche kroki. Odwrócił się powoli i zobaczył ogromną, włochatą postać. Stworzenie przyglądało mu się z ciekawością, a potem podniosło rękę, jakby chciało się przywitać.\n— Co? — wyszeptał Paweł.\n— Jajco — odpowiedziało stworzenie i zniknęło między drzewami.\nOd tamtej pory Paweł zawsze zostawia na pniu kanapkę z jajkiem. Rano kanapki już nie ma.',
    glossary: { 'paweł': 'Paweł (name)', grzyby: 'mushrooms (na grzyby = mushroom picking)', 'wsią': 'the village', pewnego: 'one (pewnego ranka = one morning)', 'zbierał': 'was picking', borowiki: 'porcini mushrooms', 'usłyszał': 'heard', 'kroki': 'footsteps', 'odwrócił': 'turned around', 'włochatą': 'hairy', 'postać': 'figure', stworzenie: 'creature', 'przyglądało': 'was watching', 'ciekawością': 'curiosity', 'podniosło': 'raised', 'przywitać': 'to say hello', 'wyszeptał': 'whispered', jajco: '"egg" (playful; Co? Jajco! = What? An egg!)', 'zniknęło': 'disappeared', pniu: 'tree stump', kanapkę: 'sandwich', kanapki: 'the sandwich', 'jajkiem': 'egg', 'odpowiedziało': 'answered', 'tamtej': 'that' },
  },

  // ---------- English (for Polish speakers) ----------
  {
    lang: 'en', native: 'pl', level: 'A1', title: 'At the market',
    story: 'On Saturday morning, Tom goes to the market. He buys fresh bread, eggs and apples. The man at the stall is very friendly.\n"How much are the apples?" asks Tom.\n"Two pounds a kilo," says the man.\nTom buys two kilos and goes home. He makes a big breakfast for his family.',
    glossary: { tom: 'Tom (imię)', stall: 'stragan', 'pounds': 'funty (waluta)', kilo: 'kilogram', kilos: 'kilogramy', 'how': 'jak', much: 'dużo (how much = ile)', goes: 'idzie', says: 'mówi', asks: 'pyta', he: 'on', his: 'jego', at: 'przy', on: 'w (on Saturday = w sobotę)', the: '(przedimek określony)', a: '(przedimek nieokreślony)', are: 'są', is: 'jest', to: 'do', for: 'dla', and: 'i', very: 'bardzo', home: 'do domu', makes: 'robi', big: 'duży', two: 'dwa' },
  },
  {
    lang: 'en', native: 'pl', level: 'A2', title: 'A rainy weekend in London',
    story: 'Last weekend it rained all the time, so we stayed inside most of the day. On Saturday we visited the British Museum, which was full of tourists. In the evening we watched an old film and ate fish and chips. On Sunday the sun came out for an hour, and we walked along the river. It was short, but it was the best part of the weekend.',
    glossary: { rained: 'padało', 'british': 'brytyjskie', museum: 'muzeum', which: 'które', 'full': 'pełne', tourists: 'turyści', ate: 'zjedliśmy', 'chips': 'frytki (fish and chips = ryba z frytkami)', fish: 'ryba', came: 'wyszło (came out)', out: 'na zewnątrz', along: 'wzdłuż', best: 'najlepsza', part: 'część', last: 'ostatni', it: 'to', so: 'więc', we: 'my', inside: 'w środku', most: 'większość', of: '(dopełniacz: "z", "czegoś")', was: 'był / była', in: 'w', an: '(przedimek nieokreślony)', old: 'stary', for: 'na', hour: 'godzina', but: 'ale', all: 'cały', time: 'czas', day: 'dzień', london: 'Londyn', evening: 'wieczór' },
  },

  // ---------- Spanish ----------
  {
    lang: 'es', level: 'A1', title: 'En el mercado',
    story: 'El sábado por la mañana, Lucía va al mercado. Compra pan fresco, huevos y fruta. El vendedor es muy amable.\n—¿Cuánto cuestan las manzanas? —pregunta Lucía.\n—Dos euros el kilo —responde él.\nLucía compra un kilo de manzanas y vuelve a casa. Prepara un desayuno grande para toda la familia.',
    glossary: { 'cuánto': 'how much', cuestan: 'cost', vuelve: 'goes back', vendedor: 'seller', al: 'to the' },
  },
  {
    lang: 'es', level: 'A2', title: 'Un fin de semana en Sevilla',
    story: 'El viernes viajamos en tren a Sevilla. Hacía mucho calor, pero la ciudad era preciosa. Visitamos la catedral y paseamos por el barrio de Santa Cruz. Por la noche cenamos tapas en una plaza pequeña y escuchamos música flamenca. El domingo volvimos a casa cansados pero muy contentos.',
    glossary: { sevilla: 'Seville', flamenca: 'flamenco', 'hacía': 'it was (weather)', paseamos: 'we strolled', cenamos: 'we had dinner', volvimos: 'we came back', viajamos: 'we travelled', escuchamos: 'we listened to', visitamos: 'we visited' },
  },

  // ---------- French ----------
  {
    lang: 'fr', level: 'A1', title: 'Au marché',
    story: 'Le samedi matin, Léa va au marché. Elle achète du pain frais, des œufs et du fromage. Le vendeur est très gentil.\n« Combien coûtent les pommes ? » demande Léa.\n« Trois euros le kilo », répond-il.\nLéa achète un kilo de pommes et rentre à la maison. Elle prépare un bon petit-déjeuner.',
    glossary: { 'léa': 'Léa (name)', 'répond-il': 'he answers', combien: 'how much', 'coûtent': 'cost', rentre: 'goes back home', 'petit-déjeuner': 'breakfast', au: 'to the', du: 'some' },
  },
  {
    lang: 'fr', level: 'A2', title: 'Un week-end à Lyon',
    story: 'Vendredi soir, nous avons pris le train pour Lyon. Le samedi, nous avons visité la vieille ville et nous avons mangé dans un bouchon traditionnel. Il faisait beau, alors nous nous sommes promenés au bord de la Saône. Dimanche, nous étions fatigués mais très heureux.',
    glossary: { lyon: 'Lyon', bouchon: 'traditional Lyon restaurant', 'promenés': 'walked', 'étions': 'were', faisait: 'was (weather)', 'saône': 'the Saône (river)', avons: 'have (we)', pris: 'took' },
  },

  // ---------- Italian ----------
  {
    lang: 'it', level: 'A1', title: 'Al mercato',
    story: 'Sabato mattina Giulia va al mercato. Compra pane fresco, uova e formaggio. Il venditore è molto gentile.\n«Quanto costano le mele?» chiede Giulia.\n«Due euro al chilo», risponde lui.\nGiulia compra un chilo di mele e torna a casa. Prepara una colazione per tutta la famiglia.',
    glossary: { giulia: 'Giulia (name)', quanto: 'how much', costano: 'cost', torna: 'goes back', al: 'to the' },
  },
  {
    lang: 'it', level: 'A2', title: 'Un fine settimana a Firenze',
    story: "Venerdì sera siamo partiti in treno per Firenze. Sabato abbiamo visitato il Duomo e abbiamo camminato lungo l'Arno. A pranzo abbiamo mangiato una bistecca enorme. Faceva caldo, quindi abbiamo preso un gelato in piazza. Domenica eravamo stanchi ma molto felici.",
    glossary: { firenze: 'Florence', partiti: 'left', duomo: 'cathedral', camminato: 'walked', "l'arno": 'the Arno (river)', faceva: 'it was (weather)', eravamo: 'we were', abbiamo: 'we have' },
  },
];

/** Every word in a text, as written (letters, inner apostrophes and hyphens kept). */
export const wordsIn = (text) => String(text).match(/[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu) || [];
