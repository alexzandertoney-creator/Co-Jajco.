// ============ CASE ENDINGS CHART ============
// "7 przypadków — przymiotnik i rzeczownik": adjective and noun endings for every case,
// singular and plural, by gender. Transcribed from the project's own chart
// (public/files/7-przypadkow.pdf), with a few typos fixed.
// Cell markup: **-ending** is highlighted, (examples) are set in italics, \n breaks a line.

export const CASE_CHART = [
  {
    pl: 'Mianownik', en: 'Nominative', q: 'Kto? Co? • Jaki? Jaka? Jakie? • Jacy? Jakie?', preps: '',
    sg: { cols: ['Rodzaj męski (ten)', 'Rodzaj żeński (ta)', 'Rodzaj nijaki (to)'],
      adj: ['**-y** (nowy, dobry)\n(k, g) **-i** (polski, drogi)', '**-a** (nowa, polska, droga)', '**-e** (nowe, dobre)\n(k, g) **-ie** (polskie, drogie)'],
      noun: ['spółgłoska **-Ø** (stół, brat, pies)\nale zawody / osoby na **-a** (kolega, dentysta)', '**-a** (kawa, książka, mama)\n**-i** (pani, gospodyni)\nspółgłoska **-Ø** (noc, rzecz, sól)', '**-o** (okno, piwo)\n**-e** (morze, słońce, zdjęcie)\n**-ę** (imię, zwierzę)\n**-um** (muzeum)'] },
    plural: { cols: ['Męskoosobowy (ci — mężczyźni)', 'Niemęskoosobowy (te — reszta)'],
      adj: ['**-i / -y** + wymiana spółgłoski (nowi, polscy, drodzy, dobrzy, duzi)', '**-e** (nowe, dobre)\n(k, g) **-ie** (polskie, drogie)'],
      noun: ['**-i / -y** (studenci, Polacy, koledzy)\n**-owie** (panowie, synowie, profesorowie)\n**-e** (lekarze, nauczyciele)', '**-y** (kobiety, koty, domy)\n(k, g) **-i** (książki, banki, drogi)\n**-e** (kawiarnie, noce, hotele)\n**-a** (okna, morza, muzea, imiona)'] },
    examples: 'To jest **nowy polski** film. • **Dobra** kawa stoi na stole. • **Polscy** studenci i **polskie** studentki uczą się razem.',
  },
  {
    pl: 'Dopełniacz', en: 'Genitive', q: 'Kogo? Czego? • Jakiego? Jakiej? • Jakich?', preps: 'od, do, z, bez, dla, u, obok, koło',
    sg: { cols: ['Rodzaj męski', 'Rodzaj żeński', 'Rodzaj nijaki'],
      adj: ['**-ego** (nowego, dobrego)\n(k, g) **-iego** (polskiego, drogiego)', '**-ej** (nowej, dobrej)\n(k, g) **-iej** (polskiej, drogiej)', '**-ego** (nowego, dobrego)\n(k, g) **-iego** (polskiego, drogiego)'],
      noun: ['żywotne (ludzie, zwierzęta): **-a** (brata, psa, kota)\nnieżywotne: **-u** (domu, sklepu, parku)\nale owoce, narzędzia, miesiące: **-a** (banana, noża, lipca)', '**-y** (kawy, pracy, kobiety)\n(k, g) **-i** (książki, Polski, drogi)\nmiękkie i spółgłoska: **-i** (pani, kuchni, nocy, rzeczy)', '**-a** (okna, piwa, morza, słońca, zdjęcia)\n**-enia / -ęcia** (imienia, zwierzęcia)\n**-um** = Mianownik (muzeum)'] },
    plural: { cols: ['Rodzaj męski', 'Rodzaj żeński', 'Rodzaj nijaki'],
      adj: ['**-ych** (nowych, dobrych) • (k, g) **-ich** (polskich, drogich)'],
      noun: ['**-ów** (studentów, domów, psów)\npo miękkich **-i** (hoteli, ludzi)\npo stwardniałych **-y** (lekarzy)', 'końcówka zerowa **-Ø** (kobiet, szkół, rąk)\n-ka → **-ek** (książka → książek)\npo spółgłosce i w obcych: **-i / -y** (nocy, rzeczy, restauracji)', 'końcówka zerowa **-Ø** (okien, jabłek, miejsc, zdjęć)\n-ło → **-eł** (hasło → haseł)\nale **-ów** (muzeów), **-i** (narzędzi)'] },
    note: 'Dopełniacz po zaprzeczeniu (Nie mam nowego telefonu), przy ilości (dużo polskich książek) i w datach (pierwszego maja).',
    examples: 'Szukam **dobrego** lekarza. • Wracam z **ciekawej** podróży. • W mieście jest dużo **starych** kościołów i **małych** kawiarni.',
  },
  {
    pl: 'Celownik', en: 'Dative', q: 'Komu? Czemu? • Jakiemu? Jakiej? • Jakim?', preps: 'dzięki, przeciwko, ku',
    sg: { cols: ['Rodzaj męski', 'Rodzaj żeński', 'Rodzaj nijaki'],
      adj: ['**-emu** (nowemu, dobremu)\n(k, g) **-iemu** (polskiemu, drogiemu)', '**-ej** (nowej, dobrej)\n(k, g) **-iej** (polskiej, drogiej)', '**-emu** (nowemu, dobremu)\n(k, g) **-iemu** (polskiemu, drogiemu)'],
      noun: ['**-owi** (studentowi, dyrektorowi)\nkrótkie słowa: **-u** (panu, bratu, ojcu, psu, kotu, Bogu, światu)', 'jak Miejscownik!\n**-e** + wymiana (mamie, kobiecie, Polsce, drodze)\n**-i / -y** (pani, cioci, nocy, rzeczy)', '**-u** (dziecku, oknu, morzu, słońcu, imieniu)\n**-um** = Mianownik (muzeum)'] },
    plural: { cols: ['Wszystkie rodzaje'],
      adj: ['**-ym** (nowym) • (k, g) **-im** (polskim, drogim)'],
      noun: ['**-om** (studentom, kobietom, dzieciom)'] },
    examples: 'Pomagam **młodszemu** bratu i **starszej** siostrze. • Dzięki **polskim** przyjaciołom szybko mówię po polsku. • Przyglądam się **małemu** dziecku.',
  },
  {
    pl: 'Biernik', en: 'Accusative', q: 'Kogo? Co? • Jakiego? Jaki? Jaką? Jakie? • Jakich? Jakie?', preps: 'przez, na, w, za, o',
    sg: { cols: ['Rodzaj męski', 'Rodzaj żeński', 'Rodzaj nijaki'],
      adj: ['żywotny: = Dopełniacz **-ego / -iego** (nowego, polskiego)\nnieżywotny: = Mianownik **-y / -i** (nowy, polski)', '**-ą** (nową, polską, drogą)', '= Mianownik **-e** (nowe, dobre)\n(k, g) **-ie** (polskie, drogie)'],
      noun: ['żywotny: = Dopełniacz **-a** (brata, psa, kota)\nnieżywotny: = Mianownik **-Ø** (dom, stół, film)', '**-ę** (kawę, książkę, mamę)\n**-ą** (panią)\nspółgłoska = Mianownik **-Ø** (noc, rzecz, sól)', '= Mianownik **-o / -e / -ę / -um** (okno, morze, imię, muzeum)'] },
    plural: { cols: ['Męskoosobowy (= Dopełniacz)', 'Niemęskoosobowy (= Mianownik)'],
      adj: ['**-ych / -ich** (nowych, polskich)', '**-e / -ie** (nowe, polskie)'],
      noun: ['**-ów / -y / -i** (studentów, lekarzy, ludzi)', '**-y / -i / -e / -a** (kobiety, psy, książki, okna)'] },
    note: 'W Bierniku nazwy tańców, gier, papierosów, grzybów i marek aut zachowują się jak żywotne (tańczyć walca, grać w tenisa, kupić forda).',
    examples: 'Mam **czarnego** kota i **nowy** rower. • Piję **czarną** kawę i czytam **ciekawą** książkę. • Znam **tych polskich** aktorów.',
  },
  {
    pl: 'Narzędnik', en: 'Instrumental', q: 'Kim? Czym? • Jakim? Jaką? • Jakimi?', preps: 'z, przed, nad, pod, za, między',
    sg: { cols: ['Rodzaj męski', 'Rodzaj żeński', 'Rodzaj nijaki'],
      adj: ['**-ym** (nowym, dobrym)\n(k, g) **-im** (polskim, drogim)', '**-ą** (nową, polską, drogą)', '**-ym** (nowym, dobrym)\n(k, g) **-im** (polskim, drogim)'],
      noun: ['**-em** (bratem, psem, samochodem)\n(k, g) **-iem** (Polakiem, pociągiem)\nzawody na -a: **-ą** (dentystą)', '**-ą** (kawą, książką, panią, nocą, rzeczą)', '**-em** (oknem, morzem, imieniem)\n(k, g) **-iem** (jabłkiem, dzieckiem)\n**-um** = Mianownik (muzeum)'] },
    plural: { cols: ['Wszystkie rodzaje'],
      adj: ['**-ymi** (nowymi) • (k, g) **-imi** (polskimi, drogimi)'],
      noun: ['**-ami** (studentami, kobietami, oknami)\nale **-mi** (ludźmi, dziećmi, przyjaciółmi, braćmi, końmi)'] },
    examples: 'Jestem **dobrym** architektem. • Jadę nad morze **szybkim** pociągiem. • Spaceruję z **polskimi** przyjaciółmi i **małymi** dziećmi.',
  },
  {
    pl: 'Miejscownik', en: 'Locative', q: 'O kim? O czym? • Jakim? Jakiej? • Jakich?', preps: 'w, na, przy, po, o',
    sg: { cols: ['Rodzaj męski i nijaki', 'Rodzaj żeński'],
      adj: ['**-ym** (nowym, dobrym) • (k, g) **-im** (polskim, długim)', '**-ej** (nowej, dobrej) • (k, g) **-iej** (polskiej, długiej)'],
      noun: ['1. twarde (p, b, m, n, f, w, s, z): **-ie** + wymiana (w sklepie, w kinie, w mieście)\n2. twarde wyjątki: **-e** (t → cie, st → ście, d → dzie, zd → ździe, ł → le, sł → śle, r → rze)\n3. k, g, ch / h oraz miękkie i stwardniałe: **-u** (w parku, na rogu, na dachu, w hotelu, na koniu, w garażu)\n4. **-um** = Mianownik (w muzeum) • ale: w domu, o panu, o synu',
        '1. twarde = jak męski (w Warszawie, w grupie, w szkole)\n2. k, g, ch / h: **-e** (k → ce, g → dze, ch → sze: w Polsce, na drodze)\n3. miękkie (ś, ź, ć, dź, ń, l, j, i): **-i** (w kuchni, na sali, w restauracji, na wsi)\n4. stwardniałe (c, cz, dz, sz, rz, ż): **-y** (w pracy, o rzeczy)'] },
    plural: { cols: ['Wszystkie rodzaje'],
      adj: ['**-ych** (nowych) • (k, g) **-ich** (polskich)'],
      noun: ['**-ach** (sklepach, szkołach, kinach)\nale: w Niemczech, we Włoszech, na Węgrzech'] },
    note: 'Wymiany samogłosek: ó → o / e (stół – na stole, kościół – w kościele) • a → e (miasto – w mieście, las – w lesie).',
    examples: 'Mieszkam w **nowym** domu przy ulicy **Długiej**. • Byliśmy na wakacjach w **polskich** górach.',
  },
  {
    pl: 'Wołacz', en: 'Vocative', q: 'O! Zwrot bezpośredni do osoby lub rzeczy', preps: '',
    sg: { cols: ['Rodzaj męski', 'Rodzaj żeński', 'Rodzaj nijaki i l. mnoga'],
      adj: ['= Mianownik **-y / -i** (Drogi Panie!)', '= Mianownik **-a** (Droga Pani!)', '= Mianownik **-e / -ie / -i / -y** (Drodzy Państwo! Drogie dzieci!)'],
      noun: ['twarde: **-e** + wymiana (Panie! Piotrze! Bracie! Boże!)\nmiękkie i k, g, ch: **-u** (Jasiu! Człowieku! Przyjacielu!)\nzdrobnienia na -a: **-o** (Tato! Kubo!)', 'na -a: **-o** (Mamo! Anno! Polsko!)\nale pani → Pani! (bez zmiany)\nzdrobnienia (ć, ś, ź, ń + a): **-u** (Kasiu! Basiu! Ciociu!)', '= Mianownik (Dziecko! Słońce! Studenci! Koledzy!)'] },
    examples: '**Drogi Panie Profesorze**, dziękuję za pomoc! • **Kochana Mamo** i **Kochany Tato**! • Cześć **Kasiu**, jak się masz?',
  },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Chart cell markup -> HTML: **-ending** highlighted, (examples) in italics, line breaks. */
export function chartCell(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b class="cc-end">$1</b>')
    .replace(/\(([^()]+)\)/g, '<i>($1)</i>')
    .replace(/\n/g, '<br>');
}
