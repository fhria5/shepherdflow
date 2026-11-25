import type { Audience, Congregant, GenerateResult, OutputLang, Tone } from "./types";
import { OUTPUT_LANGUAGES } from "./languages";
import { enforceTriage } from "./triage";
import { extractVerses, flagVersesNotInTranscript, quoteExistsInTranscript } from "./validate";

export const SAMPLE_SERMON = `Love That Serves

Good morning, church family. Today I want to talk about something simple, and something hard: love that serves.

Jesus said in John 13:34-35, "A new command I give you: Love one another. As I have loved you, so you must love one another. By this everyone will know that you are my disciples, if you love one another." He does not point to our answers or our building. He points to our love. Love is the mark of a disciple.

But what kind of love is this? It is not a feeling that comes and goes. It is love that serves. In Mark 10:45, Jesus tells us that He "did not come to be served, but to serve, and to give his life as a ransom for many." The King of heaven washed feet. The Lord of all picked up a towel. If Jesus served like that, then serving is not below us. Serving is what love looks like when it puts on work clothes.

The apostle John makes it very practical. In 1 John 3:18 he writes, "Dear children, let us not love with words or speech but with actions and in truth." It is easy to say "I love you" on a Sunday morning. It is harder to love with actions on a Monday afternoon. Real love shows up. It brings a meal. It makes a phone call. It sits beside someone in a hospital waiting room. It remembers a birthday. It notices the person who has not been here for three weeks and asks, "Are you okay?"

Paul says the same thing in Galatians 5:13: "Serve one another humbly in love." Humility is the key. Serving is not about being noticed. It is about quietly doing the next small thing for the person in front of you.

And Jesus gives us a beautiful promise in Matthew 25:40: "Whatever you did for one of the least of these brothers and sisters of mine, you did for me." When you serve the lonely, the sick, the new family who just walked through our doors, you are serving Jesus Himself.

So this week, I want to challenge all of us with one question: who is one person you can serve? Not ten people. Just one. One phone call. One visit. One meal. One prayer. Love that serves does not need a big stage. It needs a willing heart.

Let us be a church that loves like Jesus loved and serves like Jesus served. Amen.`;

export const SAMPLE_CONGREGANTS: Congregant[] = [
  { id: "c1", initials: "AK", category: "new", note: "Joined us for the first time last Sunday and asked about small groups." },
  { id: "c2", initials: "MR", category: "absent", note: "Has not been to church for three Sundays; usually sits near the front." },
  { id: "c3", initials: "SL", category: "sick", note: "Recovering from surgery at home and cannot come to church this month." },
  { id: "c4", initials: "JT", category: "grieving", note: "Lost her husband two weeks ago; the family is grieving together." },
  { id: "c5", initials: "DP", category: "birthday", note: "Turns 70 on Thursday and has served in the kitchen team for years." },
  { id: "c6", initials: "NB", category: "other", note: "Mentioned feeling hopeless and thoughts of self-harm — needs urgent care." },
];

function sentencesOf(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?。！？])\s*/)
    .map((s) => s.trim())
    // Short threshold on purpose: a meaningful sentence in Japanese or
    // Chinese can be under 20 characters.
    .filter((s) => s.length > 4);
}

function shortQuote(sentence: string, maxWords = 25): string {
  // Spaceless scripts (Japanese, Chinese): cap by characters instead.
  if (!sentence.includes(" ")) {
    return sentence.length <= 100 ? sentence : sentence.slice(0, 100) + "…";
  }
  const words = sentence.split(/\s+/);
  if (words.length <= maxWords) return sentence;
  return words.slice(0, maxWords).join(" ") + "…";
}

interface DemoLangContent {
  questions: string[];
  devotion: string; // {verse} is replaced with the reflect sentence, if any verse was found
  reflect: string; // full sentence template, {verse} is the reference
  prayer: string;
  draftNew: string;
  draftAbsent: string;
  draftBirthday: string;
  draftDefault: string;
  suggestionVisit: string;
  suggestionMessage: string;
  suggestionCrisis: string;
}

const DEMO_CONTENT: Record<OutputLang, DemoLangContent> = {
  en: {
    questions: [
      "What does love that serves look like in your everyday life this week?",
      "Jesus washed feet and picked up a towel. What is one small act of service you can do for someone near you?",
      "Why do you think Jesus said people will know we are His disciples by our love, not by our words?",
      "Who is one person in our church or neighborhood who may feel unseen right now, and how could we reach out?",
      "What holds you back from serving humbly, and what would help you take one small step this week?",
    ],
    devotion:
      "Love that serves does not wait for a big moment. Today, notice one person near you and do one small thing for them. {verse}Humble service is how love becomes visible.",
    reflect: "Reflect on {verse}.",
    prayer: "Lord, open my eyes to see who I can serve today. Amen.",
    draftNew:
      "Hi, it was so good to meet you last Sunday. If you would like to know more about our small groups, we would love to help you find one that fits. Love that serves starts with getting to know one another.",
    draftAbsent:
      "Hi, we have missed you at church these past few weeks. We hope you are doing well. If there is anything we can help with or pray about, please let us know.",
    draftBirthday:
      "Hi, happy 70th birthday. Thank you for all your years of service on the kitchen team. We are grateful for you and we are praying for you on your special day.",
    draftDefault:
      "Hi, we have been thinking of you this week. Sunday's sermon reminded us that love serves in small, practical ways. If there is anything we can help with, please let us know.",
    suggestionVisit: "Call today, listen first, and offer a visit this week.",
    suggestionMessage: "Send a warm, short message this week.",
    suggestionCrisis: "Contact today. Listen first, do not counsel alone — involve the pastor and, if needed, a professional.",
  },
  es: {
    questions: [
      "¿Cómo se ve el amor que sirve en tu vida diaria esta semana?",
      "Jesús lavó los pies y tomó una toalla. ¿Qué pequeño acto de servicio puedes hacer por alguien cercano?",
      "¿Por qué crees que Jesús dijo que la gente sabrá que somos sus discípulos por nuestro amor, no por nuestras palabras?",
      "¿Quién es una persona de nuestra iglesia o vecindario que puede sentirse invisible ahora, y cómo podemos acercarnos?",
      "¿Qué te impide servir con humildad, y qué te ayudaría a dar un pequeño paso esta semana?",
    ],
    devotion:
      "El amor que sirve no espera un gran momento. Hoy, fíjate en una persona cercana y haz algo pequeño por ella. {verse}El servicio humilde es como el amor se hace visible.",
    reflect: "Reflexiona sobre {verse}.",
    prayer: "Señor, abre mis ojos para ver a quién puedo servir hoy. Amén.",
    draftNew:
      "Hola, fue un gusto conocerte el domingo pasado. Si quieres saber más sobre nuestros grupos pequeños, nos encantaría ayudarte a encontrar uno. El amor que sirve comienza con conocernos.",
    draftAbsent:
      "Hola, te hemos echado de menos en la iglesia estas últimas semanas. Esperamos que estés bien. Si hay algo en lo que podamos ayudarte o por lo que podamos orar, dínoslo.",
    draftBirthday:
      "Hola, feliz cumpleaños número 70. Gracias por tus años de servicio en el equipo de cocina. Estamos agradecidos por ti y oramos por ti en tu día especial.",
    draftDefault:
      "Hola, hemos estado pensando en ti esta semana. El sermón del domingo nos recordó que el amor sirve con gestos pequeños y prácticos. Si hay algo en lo que podamos ayudarte, dínoslo.",
    suggestionVisit: "Llama hoy, escucha primero y ofrece una visita esta semana.",
    suggestionMessage: "Envía un mensaje cálido y breve esta semana.",
    suggestionCrisis: "Contacta hoy. Escucha primero, no aconsejes solo: involucra al pastor y, si hace falta, a un profesional.",
  },
  pt: {
    questions: [
      "Como é o amor que serve na sua vida diária esta semana?",
      "Jesus lavou os pés e pegou uma toalha. Qual é um pequeno ato de serviço que você pode fazer por alguém próximo?",
      "Por que você acha que Jesus disse que as pessoas saberão que somos discípulos dele pelo nosso amor, e não pelas nossas palavras?",
      "Quem é uma pessoa da nossa igreja ou vizinhança que pode se sentir invisível agora, e como podemos nos aproximar dela?",
      "O que impede você de servir com humildade, e o que ajudaria você a dar um pequeno passo esta semana?",
    ],
    devotion:
      "O amor que serve não espera um grande momento. Hoje, note uma pessoa próxima e faça algo pequeno por ela. {verse}O serviço humilde é como o amor se torna visível.",
    reflect: "Reflita sobre {verse}.",
    prayer: "Senhor, abre os meus olhos para ver quem eu posso servir hoje. Amém.",
    draftNew:
      "Olá, foi muito bom conhecer você no domingo passado. Se quiser saber mais sobre nossos grupos pequenos, teremos prazer em ajudar você a encontrar um. O amor que serve começa com nos conhecermos.",
    draftAbsent:
      "Olá, sentimos sua falta na igreja nestas últimas semanas. Esperamos que você esteja bem. Se houver algo com que possamos ajudar ou pelo que orar, avise-nos.",
    draftBirthday:
      "Olá, feliz aniversário de 70 anos. Obrigado por todos os seus anos de serviço na equipe da cozinha. Somos gratos por você e oramos por você neste dia especial.",
    draftDefault:
      "Olá, temos pensado em você esta semana. O sermão de domingo nos lembrou que o amor serve com gestos pequenos e práticos. Se houver algo com que possamos ajudar, avise-nos.",
    suggestionVisit: "Ligue hoje, ouça primeiro e ofereça uma visita esta semana.",
    suggestionMessage: "Envie uma mensagem calorosa e breve esta semana.",
    suggestionCrisis: "Entre em contato hoje. Ouça primeiro, não aconselhe sozinho: envolva o pastor e, se necessário, um profissional.",
  },
  fr: {
    questions: [
      "À quoi ressemble l'amour qui sert dans ta vie quotidienne cette semaine ?",
      "Jésus a lavé les pieds et pris une serviette. Quel petit acte de service peux-tu faire pour quelqu'un de proche ?",
      "Pourquoi penses-tu que Jésus a dit que les gens sauront que nous sommes ses disciples par notre amour, et non par nos paroles ?",
      "Qui est une personne de notre église ou de notre voisinage qui se sent peut-être invisible en ce moment, et comment pouvons-nous l'approcher ?",
      "Qu'est-ce qui t'empêche de servir avec humilité, et qu'est-ce qui t'aiderait à faire un petit pas cette semaine ?",
    ],
    devotion:
      "L'amour qui sert n'attend pas un grand moment. Aujourd'hui, remarque une personne proche et fais une petite chose pour elle. {verse}Le service humble rend l'amour visible.",
    reflect: "Médite sur {verse}.",
    prayer: "Seigneur, ouvre mes yeux pour voir qui je peux servir aujourd'hui. Amen.",
    draftNew:
      "Bonjour, c'était un plaisir de te rencontrer dimanche dernier. Si tu veux en savoir plus sur nos petits groupes, nous serions ravis de t'aider à en trouver un. L'amour qui sert commence par apprendre à se connaître.",
    draftAbsent:
      "Bonjour, tu nous as manqué à l'église ces dernières semaines. Nous espérons que tu vas bien. S'il y a quelque chose pour lequel nous pouvons aider ou prier, dis-le-nous.",
    draftBirthday:
      "Bonjour, joyeux 70e anniversaire. Merci pour toutes tes années de service dans l'équipe de cuisine. Nous sommes reconnaissants pour toi et nous prions pour toi en ce jour spécial.",
    draftDefault:
      "Bonjour, nous avons pensé à toi cette semaine. Le sermon de dimanche nous a rappelé que l'amour sert par de petits gestes concrets. S'il y a quelque chose pour lequel nous pouvons aider, dis-le-nous.",
    suggestionVisit: "Appelle aujourd'hui, écoute d'abord et propose une visite cette semaine.",
    suggestionMessage: "Envoie un message chaleureux et bref cette semaine.",
    suggestionCrisis: "Contacte aujourd'hui. Écoute d'abord, ne conseille pas seul : implique le pasteur et, si besoin, un professionnel.",
  },
  ko: {
    questions: [
      "이번 주 일상생활에서 섬기는 사랑은 어떤 모습인가요?",
      "예수님은 발을 씻기시고 수건을 드셨습니다. 가까운 사람을 위해 할 수 있는 작은 섬김은 무엇인가요?",
      "예수님은 왜 우리의 말이 아니라 우리의 사랑으로 제자인 줄 알 것이라고 말씀하셨을까요?",
      "지금 우리 교회나 이웃 가운데 보이지 않는다고 느끼는 사람은 누구이며, 어떻게 다가갈 수 있을까요?",
      "겸손히 섬기는 것을 막는 것은 무엇이며, 이번 주 작은 한 걸음을 내딛는 데 무엇이 도움이 될까요?",
    ],
    devotion:
      "섬기는 사랑은 큰 순간을 기다리지 않습니다. 오늘 가까운 사람 한 명을 돌아보고 작은 일을 해 주세요. {verse}겸손한 섬김은 사랑이 보이는 방법입니다.",
    reflect: "{verse} 말씀을 묵상하세요.",
    prayer: "주님, 오늘 제가 섬길 수 있는 사람을 볼 수 있도록 눈을 열어 주세요. 아멘.",
    draftNew:
      "안녕하세요, 지난 주일에 만나서 반가웠습니다. 소그룹에 대해 더 알고 싶으시면 맞는 그룹을 찾도록 도와드리겠습니다. 섬기는 사랑은 서로 알아가는 것에서 시작합니다.",
    draftAbsent:
      "안녕하세요, 지난 몇 주 동안 교회에서 뵙지 못해 그리웠습니다. 잘 지내시길 바랍니다. 도와드릴 일이나 기도할 일이 있으시면 알려 주세요.",
    draftBirthday:
      "안녕하세요, 70번째 생일을 축하합니다. 주방 팀에서 오랜 세월 섬겨 주셔서 감사합니다. 특별한 날에 당신을 위해 감사하며 기도합니다.",
    draftDefault:
      "안녕하세요, 이번 주에 당신을 생각했습니다. 주일 설교는 사랑이 작고 실제적인 방법으로 섬긴다는 것을 일깨워 주었습니다. 도와드릴 일이 있으시면 알려 주세요.",
    suggestionVisit: "오늘 전화하고, 먼저 듣고, 이번 주 방문을 제안하세요.",
    suggestionMessage: "이번 주에 따뜻하고 짧은 메시지를 보내세요.",
    suggestionCrisis: "오늘 연락하세요. 먼저 듣고, 혼자 상담하지 말고 목회자와 필요하면 전문가를 참여시키세요.",
  },
  id: {
    questions: [
      "Seperti apa kasih yang melayani dalam kehidupanmu sehari-hari minggu ini?",
      "Yesus membasuh kaki dan mengambil handuk. Apa satu tindakan pelayanan kecil yang bisa kamu lakukan untuk orang di dekatmu?",
      "Menurutmu mengapa Yesus berkata orang akan tahu kita murid-Nya dari kasih kita, bukan dari kata-kata kita?",
      "Siapa satu orang di gereja atau lingkungan kita yang mungkin merasa tidak diperhatikan saat ini, dan bagaimana kita bisa menjangkaunya?",
      "Apa yang menahanmu untuk melayani dengan rendah hati, dan apa yang bisa membantumu mengambil satu langkah kecil minggu ini?",
    ],
    devotion:
      "Kasih yang melayani tidak menunggu momen besar. Hari ini, perhatikan satu orang di sekitarmu dan lakukan satu hal kecil untuknya. {verse}Pelayanan yang rendah hati adalah cara kasih menjadi nyata.",
    reflect: "Renungkan {verse}.",
    prayer: "Tuhan, bukalah mataku untuk melihat siapa yang perlu kulayani hari ini. Amin.",
    draftNew:
      "Hai, senang sekali kamu datang hari Minggu lalu. Kalau kamu mau tahu tentang small group, kami dengan senang hati membantumu menemukan yang cocok. Kasih yang melayani dimulai dari saling mengenal.",
    draftAbsent:
      "Hai, kami merindukanmu di gereja beberapa minggu ini. Semoga kamu baik-baik saja. Kalau ada yang bisa kami bantu atau doakan, kabari kami ya.",
    draftBirthday:
      "Hai, selamat ulang tahun yang ke-70. Terima kasih atas pelayananmu selama ini di tim dapur. Kami bersyukur atas hidupmu dan mendoakanmu di hari istimewamu.",
    draftDefault:
      "Hai, kami memikirkanmu minggu ini. Khotbah hari Minggu mengingatkan kami bahwa kasih itu melayani dengan tindakan kecil. Kalau ada yang bisa kami bantu, beri tahu kami ya.",
    suggestionVisit: "Telepon hari ini, dengarkan lebih dulu, dan tawarkan kunjungan minggu ini.",
    suggestionMessage: "Kirim pesan hangat minggu ini.",
    suggestionCrisis: "Hubungi hari ini. Dengarkan lebih dulu, jangan menasihati sendiri — libatkan pastor dan, bila perlu, seorang profesional.",
  },
  sw: {
    questions: [
      "Upendo unaotumikia unaonekanaje katika maisha yako ya kila siku wiki hii?",
      "Yesu aliwaosha miguu na kuchukua taulo. Ni kitendo gani kidogo cha huduma unachoweza kumfanyia mtu aliye karibu nawe?",
      "Kwa nini unadhani Yesu alisema watu watajua kuwa sisi ni wanafunzi wake kwa upendo wetu, si kwa maneno yetu?",
      "Ni nani mtu mmoja katika kanisa letu au jirani ambaye anaweza kujisikia asiyeonekana sasa, na tunawezaje kumfikia?",
      "Ni nini kinachokuzuia kutumikia kwa unyenyekevu, na ni nini kingekusaidia kuchukua hatua ndogo wiki hii?",
    ],
    devotion:
      "Upendo unaotumikia hausubiri wakati mkubwa. Leo, mwangalie mtu mmoja aliye karibu nawe na umfanyie jambo dogo. {verse}Huduma ya unyenyekevu ndiyo njia upendo unavyoonekana.",
    reflect: "Tafakari {verse}.",
    prayer: "Bwana, nifumbue macho nione ninayemweweza kumtumikia leo. Amina.",
    draftNew:
      "Habari, ilikuwa vizuri kukutana nawe Jumapili iliyopita. Ukitaka kujua zaidi kuhusu vikundi vyetu vidogo, tutafurahi kukusaidia kupata kinachokufaa. Upendo unaotumikia huanza kwa kufahamiana.",
    draftAbsent:
      "Habari, tumekukosa kanisani katika wiki hizi zilizopita. Tunatumaini uko vizuri. Kama kuna jambo tunaloweza kukusaidia au kuombea, tafadhali tuambie.",
    draftBirthday:
      "Habari, heri ya siku ya kuzaliwa ya miaka 70. Asante kwa miaka yako mingi ya huduma katika timu ya jikoni. Tunashukuru kwa ajili yako na tunakuombea katika siku yako maalum.",
    draftDefault:
      "Habari, tumekuwa tukikufikiria wiki hii. Mahubiri ya Jumapili yalitukumbusha kuwa upendo hutumikia kwa matendo madogo na ya vitendo. Kama kuna jambo tunaloweza kukusaidia, tafadhali tuambie.",
    suggestionVisit: "Piga simu leo, sikiliza kwanza, na toa ziara wiki hii.",
    suggestionMessage: "Tuma ujumbe mfupi na wa joto wiki hii.",
    suggestionCrisis: "Wasiliana leo. Sikiliza kwanza, usishauri peke yako — mhusishe mchungaji na, ikihitajika, mtaalamu.",
  },
  tl: {
    questions: [
      "Ano ang hitsura ng pag-ibig na naglilingkod sa iyong pang-araw-araw na buhay ngayong linggo?",
      "Hinugasan ni Jesus ang mga paa at kumuha ng tuwalya. Ano ang isang maliit na gawa ng paglilingkod na magagawa mo para sa isang taong malapit sa iyo?",
      "Bakit sa palagay mo sinabi ni Jesus na malalaman ng mga tao na tayo ay Kanyang mga disipulo sa pamamagitan ng ating pag-ibig, hindi sa ating mga salita?",
      "Sino ang isang tao sa ating simbahan o kapitbahayan na maaaring nakadarama na hindi siya napapansin ngayon, at paano natin siya maaabot?",
      "Ano ang humahadlang sa iyo na maglingkod nang may kababaang-loob, at ano ang makatutulong sa iyo na gumawa ng isang maliit na hakbang ngayong linggo?",
    ],
    devotion:
      "Ang pag-ibig na naglilingkod ay hindi naghihintay ng malaking sandali. Ngayon, pansinin ang isang taong malapit sa iyo at gumawa ng isang maliit na bagay para sa kanya. {verse}Ang mapagpakumbabang paglilingkod ang paraan upang makita ang pag-ibig.",
    reflect: "Pagnilayan ang {verse}.",
    prayer: "Panginoon, buksan Mo ang aking mga mata upang makita kung sino ang maaari kong paglingkuran ngayon. Amen.",
    draftNew:
      "Kumusta, napakasarap na makilala ka noong nakaraang Linggo. Kung nais mong malaman ang higit pa tungkol sa aming maliliit na grupo, ikalulugod naming tulungan kang makahanap ng bagay sa iyo. Ang pag-ibig na naglilingkod ay nagsisimula sa pagkakilala sa isa't isa.",
    draftAbsent:
      "Kumusta, hinahanap ka namin sa simbahan nitong mga nakaraang linggo. Umaasa kaming maayos ka. Kung may anumang maitutulong namin o maipapanalangin, mangyaring ipaalam sa amin.",
    draftBirthday:
      "Kumusta, maligayang ika-70 kaarawan. Salamat sa iyong maraming taon ng paglilingkod sa pangkat ng kusina. Nagpapasalamat kami sa iyo at ipinapanalangin ka namin sa iyong natatanging araw.",
    draftDefault:
      "Kumusta, iniisip ka namin ngayong linggo. Ipinaalala sa amin ng sermon noong Linggo na ang pag-ibig ay naglilingkod sa maliliit at praktikal na paraan. Kung may anumang maitutulong namin, mangyaring ipaalam sa amin.",
    suggestionVisit: "Tumawag ngayon, makinig muna, at mag-alok ng pagbisita ngayong linggo.",
    suggestionMessage: "Magpadala ng mainit at maikling mensahe ngayong linggo.",
    suggestionCrisis: "Makipag-ugnayan ngayon. Makinig muna, huwag magpayo nang mag-isa — isali ang pastor at, kung kailangan, isang propesyonal.",
  },
  it: {
    questions: [
      "Che aspetto ha l'amore che serve nella tua vita quotidiana questa settimana?",
      "Gesù ha lavato i piedi e ha preso un asciugamano. Quale piccolo atto di servizio puoi fare per qualcuno vicino a te?",
      "Perché pensi che Gesù abbia detto che le persone sapranno che siamo suoi discepoli dal nostro amore, non dalle nostre parole?",
      "Chi è una persona della nostra chiesa o del nostro quartiere che potrebbe sentirsi invisibile in questo momento, e come possiamo raggiungerla?",
      "Che cosa ti trattiene dal servire con umiltà, e che cosa ti aiuterebbe a fare un piccolo passo questa settimana?",
    ],
    devotion:
      "L'amore che serve non aspetta un grande momento. Oggi, nota una persona vicina a te e fai una piccola cosa per lei. {verse}Il servizio umile è il modo in cui l'amore diventa visibile.",
    reflect: "Rifletti su {verse}.",
    prayer: "Signore, apri i miei occhi per vedere chi posso servire oggi. Amen.",
    draftNew:
      "Ciao, è stato un piacere conoscerti domenica scorsa. Se vuoi saperne di più sui nostri piccoli gruppi, saremo felici di aiutarti a trovarne uno adatto. L'amore che serve inizia con il conoscersi.",
    draftAbsent:
      "Ciao, ci sei mancato in chiesa in queste ultime settimane. Speriamo che tu stia bene. Se c'è qualcosa per cui possiamo aiutarti o pregare, faccelo sapere.",
    draftBirthday:
      "Ciao, buon settantesimo compleanno. Grazie per i tuoi anni di servizio nel gruppo cucina. Siamo grati per te e preghiamo per te in questo giorno speciale.",
    draftDefault:
      "Ciao, abbiamo pensato a te questa settimana. Il sermone di domenica ci ha ricordato che l'amore serve con piccoli gesti concreti. Se c'è qualcosa per cui possiamo aiutarti, faccelo sapere.",
    suggestionVisit: "Chiama oggi, ascolta prima e offri una visita questa settimana.",
    suggestionMessage: "Invia un messaggio caldo e breve questa settimana.",
    suggestionCrisis: "Contatta oggi. Ascolta prima, non consigliare da solo: coinvolgi il pastore e, se necessario, un professionista.",
  },
  ru: {
    questions: [
      "Как выглядит любовь, которая служит, в вашей повседневной жизни на этой неделе?",
      "Иисус омыл ноги и взял полотенце. Какое небольшое дело служения вы можете сделать для человека рядом с вами?",
      "Почему, по-вашему, Иисус сказал, что люди узнают, что мы Его ученики, по нашей любви, а не по нашим словам?",
      "Кто в нашей церкви или среди соседей сейчас может чувствовать себя незамеченным, и как мы можем протянуть ему руку?",
      "Что мешает вам служить со смирением, и что помогло бы вам сделать один маленький шаг на этой неделе?",
    ],
    devotion:
      "Любовь, которая служит, не ждёт большого момента. Сегодня заметьте человека рядом с вами и сделайте для него что-нибудь небольшое. {verse}Смиренное служение — вот как любовь становится видимой.",
    reflect: "Поразмышляйте над {verse}.",
    prayer: "Господи, открой мои глаза, чтобы увидеть, кому я могу послужить сегодня. Аминь.",
    draftNew:
      "Здравствуйте, было очень приятно познакомиться с вами в прошлое воскресенье. Если хотите узнать больше о наших малых группах, мы с радостью поможем вам найти подходящую. Любовь, которая служит, начинается со знакомства.",
    draftAbsent:
      "Здравствуйте, нам вас не хватало в церкви последние несколько недель. Надеемся, у вас всё хорошо. Если мы можем чем-то помочь или о чём-то помолиться, пожалуйста, сообщите нам.",
    draftBirthday:
      "Здравствуйте, с 70-летием. Спасибо за долгие годы служения в команде кухни. Мы благодарны за вас и молимся о вас в этот особенный день.",
    draftDefault:
      "Здравствуйте, мы думали о вас на этой неделе. Воскресная проповедь напомнила нам, что любовь служит малыми практическими делами. Если мы можем чем-то помочь, пожалуйста, сообщите нам.",
    suggestionVisit: "Позвоните сегодня, сначала выслушайте и предложите визит на этой неделе.",
    suggestionMessage: "Отправьте тёплое короткое сообщение на этой неделе.",
    suggestionCrisis: "Свяжитесь сегодня. Сначала выслушайте, не советуйте в одиночку — привлеките пастора и, при необходимости, специалиста.",
  },
  ja: {
    questions: [
      "今週の日常生活の中で、仕える愛はどのような姿をしていますか。",
      "イエス様は足を洗い、手ぬぐいを取られました。近くの人のためにできる小さな奉仕は何ですか。",
      "イエス様はなぜ、言葉ではなく愛によって私たちが弟子だと人々が知ると言われたのだと思いますか。",
      "今、私たちの教会や近所で、見過ごされていると感じている人は誰ですか。どうすれば手を差し伸べられますか。",
      "へりくだって仕えることを妨げているものは何ですか。今週小さな一歩を踏み出すのに何が助けになりますか。",
    ],
    devotion:
      "仕える愛は大きな瞬間を待ちません。今日、近くの人一人に気づき、小さなことをしてあげてください。{verse}へりくだった奉仕は、愛が見えるようになる方法です。",
    reflect: "{verse}を思い巡らしてください。",
    prayer: "主よ、今日私が仕えることのできる人を見ることができるよう、私の目を開いてください。アーメン。",
    draftNew:
      "こんにちは、先週の日曜日に会えてうれしかったです。スモールグループについてもっと知りたい場合は、合うグループを見つけるお手伝いをします。仕える愛は、お互いを知ることから始まります。",
    draftAbsent:
      "こんにちは、ここ数週間、教会でお会いできず寂しく思っていました。お元気でお過ごしのことと思います。お手伝いやお祈りできることがあれば、どうぞお知らせください。",
    draftBirthday:
      "こんにちは、70歳のお誕生日おめでとうございます。キッチンチームで長年奉仕してくださり、ありがとうございます。特別な日に、あなたに感謝し、あなたのために祈っています。",
    draftDefault:
      "こんにちは、今週あなたのことを考えていました。日曜日の説教は、愛が小さく実際的な方法で仕えることを思い出させてくれました。お手伝いできることがあれば、どうぞお知らせください。",
    suggestionVisit: "今日電話して、まず耳を傾け、今週の訪問を提案してください。",
    suggestionMessage: "今週、温かく短いメッセージを送ってください。",
    suggestionCrisis: "今日連絡してください。まず耳を傾け、一人で助言せず、牧師と、必要であれば専門家を巻き込んでください。",
  },
  zh: {
    questions: [
      "这周在你的日常生活中,服侍的爱是什么样子?",
      "耶稣洗了门徒的脚,拿起了毛巾。你能为身边的人做一件什么样的服侍小事?",
      "你认为耶稣为什么说,人们会凭着我们的爱而不是我们的话认出我们是他的门徒?",
      "我们教会或邻里中,现在有谁可能感到被忽视?我们怎样才能去关心他?",
      "是什么阻碍你谦卑地服侍?什么能帮助你这周迈出一小步?",
    ],
    devotion:
      "服侍的爱不等待重大的时刻。今天,留意你身边的一个人,为他做一件小事。{verse}谦卑的服侍是爱得以显明的方式。",
    reflect: "默想{verse}。",
    prayer: "主啊,求你开我的眼睛,让我看见今天我可以服侍谁。阿们。",
    draftNew:
      "你好,很高兴上个主日认识你。如果你想更多了解我们的小组,我们很乐意帮助你找到合适的小组。服侍的爱从彼此认识开始。",
    draftAbsent:
      "你好,过去几周在教会没有见到你,我们很想念你。希望你一切都好。如果有什么我们可以帮忙或代祷的事,请告诉我们。",
    draftBirthday:
      "你好,祝你70岁生日快乐。感谢你在厨房团队多年的服侍。我们为你感恩,并在这个特别的日子为你祷告。",
    draftDefault:
      "你好,这周我们一直在想念你。主日的讲道提醒我们,爱通过实际的小行动来服侍。如果有什么我们可以帮忙的,请告诉我们。",
    suggestionVisit: "今天打电话,先倾听,并提议这周去探访。",
    suggestionMessage: "这周发一条温暖简短的信息。",
    suggestionCrisis: "今天联系。先倾听,不要独自劝告——请牧师参与,必要时请专业人士参与.",
  },
};

/**
 * Audience-specific question sets. Demo mode uses these for English and
 * Indonesian (the two UI languages); for other output languages the
 * live AI adapts the base questions through the audience instruction
 * in the system prompt, and demo mode falls back to the base set.
 */
const AUDIENCE_QUESTIONS: Partial<Record<OutputLang, Partial<Record<Audience, string[]>>>> = {
  en: {
    teens: [
      "Where in your normal week — school, home, online — could love that serves show up?",
      "Jesus washed feet, the job nobody wanted. What is one small thing you could do for someone this week that nobody would notice?",
      "Why do you think Jesus said people will know we follow him by how we love, not by what we say?",
      "Who at school or church might feel left out right now, and what is one simple way to include them?",
      "What makes it hard to serve others, and what is one small step you could try this week?",
    ],
    children: [
      "What is one kind thing you can do for someone at home or at school this week?",
      "Jesus washed his friends' feet. What is one way you can help someone today?",
      "How can people tell that we love Jesus? What do they see us do?",
      "Is there someone who looks sad or alone? What could you do to be their friend?",
      "What is one small job you can do to help your family this week?",
    ],
  },
  id: {
    teens: [
      "Di mana dalam minggumu yang biasa — sekolah, rumah, online — kasih yang melayani bisa muncul?",
      "Yesus membasuh kaki, pekerjaan yang tidak diinginkan siapa pun. Apa satu hal kecil yang bisa kamu lakukan untuk seseorang minggu ini tanpa ada yang tahu?",
      "Menurutmu mengapa Yesus berkata orang akan tahu kita mengikuti-Nya dari cara kita mengasihi, bukan dari kata-kata kita?",
      "Siapa di sekolah atau gereja yang mungkin merasa ditinggalkan saat ini, dan apa satu cara sederhana untuk merangkulnya?",
      "Apa yang membuatmu sulit melayani orang lain, dan apa satu langkah kecil yang bisa kamu coba minggu ini?",
    ],
    children: [
      "Apa satu hal baik yang bisa kamu lakukan untuk seseorang di rumah atau di sekolah minggu ini?",
      "Yesus membasuh kaki teman-teman-Nya. Apa satu cara kamu bisa menolong seseorang hari ini?",
      "Bagaimana orang bisa tahu bahwa kita mengasihi Yesus? Apa yang mereka lihat kita lakukan?",
      "Apakah ada seseorang yang tampak sedih atau sendiri? Apa yang bisa kamu lakukan untuk menjadi temannya?",
      "Apa satu pekerjaan kecil yang bisa kamu lakukan untuk membantu keluargamu minggu ini?",
    ],
  },
};

const CHILDREN_DEVOTION: Partial<Record<OutputLang, { devotion: string; reflect: string; prayer: string }>> = {
  en: {
    devotion:
      "Love that serves starts small. Today, look for one person near you and do one kind thing for them. {verse}Humble service is how love shows.",
    reflect: "Reflect on {verse}.",
    prayer: "Lord, help me see who I can help today. Amen.",
  },
  id: {
    devotion:
      "Kasih yang melayani dimulai dari hal kecil. Hari ini, perhatikan satu orang di sekitarmu dan lakukan satu hal baik untuknya. {verse}Pelayanan yang rendah hati adalah cara kasih terlihat.",
    reflect: "Renungkan {verse}.",
    prayer: "Tuhan, tolong aku melihat siapa yang bisa kubantu hari ini. Amin.",
  },
};

function draftFor(person: Congregant, lang: OutputLang): string {
  const c = DEMO_CONTENT[lang];
  if (person.category === "new") return c.draftNew;
  if (person.category === "absent") return c.draftAbsent;
  if (person.category === "birthday") return c.draftBirthday;
  return c.draftDefault;
}

function suggestionFor(person: Congregant, lang: OutputLang, crisis: boolean): string {
  const c = DEMO_CONTENT[lang];
  if (crisis) return c.suggestionCrisis;
  if (person.category === "sick" || person.category === "grieving") return c.suggestionVisit;
  return c.suggestionMessage;
}

/**
 * Demo-mode generator: fully local, extractive, deterministic.
 * Summary points and questions quote VERBATIM sentences from the transcript,
 * so sermon-trace validation always passes. Care triage goes through the
 * same hard-rule enforcement as the live AI path.
 */
export function generateDemoResult(
  transcript: string,
  tone: Tone,
  outputLang: OutputLang,
  audience: Audience,
  congregants: Congregant[]
): GenerateResult {
  const lang = outputLang;
  const content = DEMO_CONTENT[lang];
  const found = sentencesOf(transcript);
  const sentences = found.length > 0 ? found : [transcript.trim()];
  const picks = [0, 1, 2, 3].map((i) => sentences[Math.min(i, sentences.length - 1)]).filter(Boolean);
  const summary = picks.slice(0, 4).map((s) => ({
    text: s,
    quote: shortQuote(s),
    quoteVerified: quoteExistsInTranscript(shortQuote(s), transcript),
  }));

  const questionTexts =
    AUDIENCE_QUESTIONS[lang]?.[audience] ?? content.questions;
  const questions = questionTexts.map((q, i) => {
    const quoteSrc = sentences[(i * 2 + 1) % sentences.length] || sentences[0];
    const quote = shortQuote(quoteSrc);
    return { text: q, quote, quoteVerified: quoteExistsInTranscript(quote, transcript) };
  });

  const days = OUTPUT_LANGUAGES[lang].days;
  const verses = extractVerses(transcript);
  const verseLine = verses.length > 0 ? verses[0] : "";
  const devotionSet =
    audience === "children" ? (CHILDREN_DEVOTION[lang] ?? content) : content;
  const devotions = days.map((day) => {
    const reflectText = verseLine
      ? content.reflect.replace("{verse}", verseLine) + " "
      : "";
    const text = devotionSet.devotion.replace("{verse}", reflectText);
    return { day, text, prayer: devotionSet.prayer };
  });

  const aiCare = congregants.map((p) => ({
    initials: p.initials,
    action: "message" as const,
    suggestion: suggestionFor(p, lang, false),
    draft: draftFor(p, lang),
  }));
  const enforced = enforceTriage(congregants, aiCare);
  const care = enforced.map((c, i) => {
    const person = congregants[i];
    return {
      ...c,
      category: person.category,
      note: person.note,
      suggestion: c.crisis ? suggestionFor(person, lang, true) : c.suggestion,
      draftApproved: false,
      draftEdited: false,
    };
  });

  const outputText = [
    ...summary.map((s) => s.text),
    ...questions.map((q) => q.text),
    ...devotions.map((d) => `${d.text} ${d.prayer}`),
  ].join("\n");
  const versesFlagged = flagVersesNotInTranscript(outputText, transcript);

  return {
    summary,
    questions,
    devotions,
    care,
    versesInTranscript: verses,
    versesFlagged,
    demoMode: true,
    generatedAt: new Date().toISOString(),
    outputLang: lang,
    audience,
  };
}
