# Zoomed Art: instrucțiuni pentru Claude

Claude citește automat fișierul ăsta la începutul fiecărei sesiuni (Claude Code în VS Code, în folderul proiectului). Ține-l scurt și la zi: când se ia o decizie nouă, se adaugă aici. Starea fiecărei opere e în `JURNAL.md`.

## Cine și ce
- Proprietar: Alex (GitHub StrikeLike). **Răspunde-i lui Alex în română.** Textele din postări sunt în **engleză**.
- Scop: venit din pagini de artă care explică și interpretează opere celebre: Instagram, Facebook, TikTok, YouTube.
- Brand: handle **@zoomed.art** peste tot, nume afișat „Zoomed Art | Art History Explained”, domeniu zoomedart.com.

## Reguli de conținut (obligatorii)
- **Doar domeniu public.** Picturi ale artiștilor morți de 70+ ani, fișiere „PD-Art” de pe Wikimedia Commons sau din colecțiile deschise ale muzeelor. Evită sculpturile: fotografia unei sculpturi are drepturi proprii.
- Alege opere cu **impact emoțional mare** și o poveste reală, dramatică (implicare mare).
- **Violența e permisă, dar fără detalii grafice** (Alex, 10 oct 2026, înlocuiește regula „fără violență”): temele violente sunt ok dacă le arăți și le povestești fără detalii explicite: fără zoom pe sânge sau răni, fără insistat pe ele. Exemplu ok dat de Alex: Judith Slaying Holofernes (Artemisia Gentileschi), femeia violată care îi taie capul violatorului: povestea se spune, zoom-urile stau pe fețe, mâini și context, nu pe rană. Preferă opere-joc care țin atenția: detalii ascunse, iluzii, mistere, scene aglomerate cu povești mici, plus o întrebare care aduce comentarii.
- **Cum alegi operele noi** (Alex, 27 oct 2026, înlocuiește regula din 10 oct): ținta e **la mijloc**: opere recognoscibile (oamenii le-au mai văzut pe undeva), dar **nu răsuflate**, și mai ales opere care trezesc curiozitate: mister, intrigă, absurd sau abstract, o poveste de viață sau de istorie în spate, ceva „catchy” care te oprește din scroll. Model: reel-urile de pe instagram.com/paintingsanalyzed. Operele foarte celebre (Mona Lisa etc.) NU sunt excluse: merg când au un unghi cu adevărat surprinzător. Prea necunoscute și fără intrigă (respinse): portrete sau peisaje doar frumoase. Unghiul: sens ascuns, detaliu ratat, mister, controversă; fără detalii sângeroase; doar domeniu public.
  - **Fiecare operă are nevoie de o enigmă care ține privitorul până la final** (Alex, 27 oct): o întrebare la care publicul vrea să afle răspunsul, un puzzle, ceva ce trebuie să descopere singur (să-l „solicite cognitiv”). Exemple NEGATIVE: Unknown Woman (Kramskoi) și The Sea of Ice (Friedrich), frumoase, dar fără intrigă. Test înainte de a propune: poți formula în 8 cuvinte o întrebare care să-l facă pe om să rămână până la ultimul slide? Dacă nu, nu o propune. Lista din 27 oct cu Mona Lisa, Cina cea de Taină, Fata cu cercel de perlă, Crearea lui Adam, Nașterea lui Venus, Marele Val, American Gothic, Van Gogh cu urechea bandajată, Arnolfini și Sărutul lui Klimt e AMÂNATĂ pentru altă dată, nu respinsă.
  - **Exemple POZITIVE** (Alex, 27 oct): The Wounded Angel, Pollice Verso, Stańczyk. Ce au în comun: o singură scenă care te oprește din scroll fiindcă ceva e ciudat sau neexplicat; o poveste de viață sau de istorie în spate; mister, intrigă, absurd sau abstract; recognoscibile, dar nu răsuflate.
- **Fără artă rusă și fără istorie rusă** (Alex, 27 oct 2026, regulă fermă): nicio operă a unui pictor rus și nicio temă din istoria Rusiei, deloc. Nu propune și nu produce astfel de opere. Cazurile de graniță (pictori născuți în Ucraina, subiecte ucrainene) se decid doar cu Alex.
- **Doar opera originală** (Alex, 24 oct 2026): imaginea trebuie să fie fotografia/scanarea operei originale din muzeul ei, întreagă. Nu copii, cartoane pregătitoare, gravuri după ea, versiuni colorizate sau refăcute cu AI. Verifică descrierea fișierului de pe Commons și spune ce fișier ai folosit și de ce e originalul.
- **Livrare pe laptop** (28 oct 2026): pe laptop, OneDrive e C:\Users\Isabela\OneDrive\POSTARI ZOOM ART; fiecare lot merge într-un subfolder cu data zilei (YYYY-MM-DD\nume-operă\ cu carusel/01-10.jpg, reel.mp4, texte.md).
- **Sugestiile vin cu poze** (Alex, 11 oct 2026): când Alex cere opere noi, fiecare sugestie are numele în engleză + o miniatură. Caută fișierul pe Commons (`fetch_image.py --search`), scrie lista în JSON (`title`, `artist`, `year`, `file`, `hook` = o frază în română despre ce e interesant) și rulează `python tools/suggest_sheet.py <listă.json>`: planșa (miniatură, titlu, mărime originală, licență, hook) se face în `gata/_sugestii/`. **Arat-o direct în chat** (SendUserFile, display „render”, sau Read ca s-o vadă în conversație): Alex vrea s-o vadă în chat, nu s-o caute în OneDrive. Cardurile cu licența în roșu nu sunt domeniu public: scoate-le.
- **Nicio operă sugerată de două ori** (Alex, 12 oct 2026): toate sugestiile stau în `sugestii_istoric.json` (titlu, artist, dată, stare). Înainte să-i propui ceva lui Alex, verifică lista cu `python tools/suggest_sheet.py <listă.json> --check` (fără descărcări): scriptul elimină tot ce s-a mai sugerat sau e deja în `works/`. Fără `--check`, după ce face planșa, adaugă singur sugestiile noi în istoric. Dacă o sugestie nu trece prin script (de exemplu o dai doar în chat), adaug-o de mână în `sugestii_istoric.json`.
- **Textul curge ca o poveste** (Alex, 10 oct 2026): textele de pe slide-uri se leagă de la un cadru la altul, ca și cum ai spune povestea operei și a ce se întâmplă în ea (legături ca „But…”, „Meanwhile…”, „And then…”), nu fapte separate. Fiecare slide pornește din cel dinainte și împinge spre următorul.
- **Orice fapt neverificat se marchează.** În `script.json` faptele neverificate stau în lista `_verify`. Nu le prezenta ca sigure. Un detaliu „inventat” de upscaling-ul AI nu e fapt despre tablou.
- Numele operelor i le dai lui Alex în engleză, ca să le poată căuta.
- **Hashtag-uri: maxim 5 pe postare** (Alex, 10 oct 2026), la carusel, reel și YouTube, și numai hashtag-uri cu reach mare (folosite pe milioane de postări, de ex. #art, #arthistory, #painting, #history, #oilpainting, #renaissance, #museum; pe TikTok #arttok). Fără hashtag-uri de nișă sau de brand. Textele stau în `postari/<nume>.md` (același nume ca folderul operei din `works/`).

## Povestea completă pe site (Alex, 22 oct 2026)
- **Pe site oamenii văd tot**: reel-ul și caruselul arată ~8 detalii, site-ul arată toate detaliile cunoscute ale operei, cu povestea întreagă. Textul stă în `pipeline/works/<nume>/article.json`, lângă `script.json`: `title` (titlul de pe site, **diferit** de cel din reel/carusel, gândit pentru Google), `question` (întrebarea de pe zidul de pe prima pagină, tot diferită), `seo`, `facts`, `intro`, `sections`, `meaning` (interpretări, marcate ca atare), `details` (toate detaliile, fiecare cu `focus` verificat pe imagine), `whereToSee`, `sources` (cu URL), `_verify`. Model: `works/the-ambassadors/article.json` (22 de detalii).
- Fiecare fapt din articol are sursă; fiecare decupaj trebuie să arate exact ce spune textul. Ce nu se vede pe imagine se spune doar în text sau se scoate.
- **Reel-ul trimite spre site**: când există `article.json` cu mai multe detalii decât reel-ul, ultimul slide devine automat „That was 8 of 22 details.” + „The other 14 are on zoomedart.com” + „Follow @zoomed.art” (`export_shots.py`); altfel rămâne CTA-ul din `render.py`. În `postari/<nume>.md`: un rând spre site în caption și textul pentru **comentariul fixat** (Alex îl pune și îl fixează manual). Se folosesc numai după ce site-ul e publicat.
- Unele opere au `script.json` doar pentru site (o copertă, fără slide-uri cu `focus`): pollice-verso, princess-tarakanova, the-conjurer, vermeer-letter, arcimboldo-gardener. Nu se randează ca reel până nu li se scrie scriptul complet.

## Formatul standard (aprobat de Alex, 9 oct 2026)
Pentru fiecare operă, un singur text → două produse, făcute cu generatorul din `pipeline/` (vezi `pipeline/README.md`):
1. **Carusel**: 10 imagini JPG 1080x1350. Max 9 slide-uri în script; ultimul slide se adaugă automat: „You may never see this page again.” + „The algorithm won't show us twice. Follow @zoomed.art” (ales de Alex pe 10 oct 2026; textul e în `CTA_HEAD` / `CTA_SUB` din `render.py`).
2. **Reel vertical**: MP4 1080x1920, zoom lent pe fiecare detaliu, **fără muzică** (muzica se pune din aplicație).

Reguli care nu se negociază:
- **Textul nu acoperă niciodată detaliul despre care vorbește.** Generatorul încadrează automat; tu doar marchezi corect `focus` = `[cx, cy, lățime, înălțime]` ca fracții. Dă mereu înălțimea la detaliile înalte.
- **Durata reel-ului: maxim 59 de secunde** (Alex, 10 oct 2026). Timpul se împarte între slide-uri după lungimea textului (minim 3 s pe slide, slide-ul final 2,5 s, tranziții 0,75 s); `export_shots.py` face asta automat. Dacă textul nu se mai poate citi în 59 s, scurtează textul, nu depăși durata.
- **Zone sigure în reel** (Alex, 10 oct 2026): același video trebuie să arate bine pe Instagram, Facebook, YouTube Shorts și TikTok, deci nimic important (text, logo, mini-hartă, bară de progres) nu stă sub butoanele aplicațiilor. Pe cadrul de 1080x1920: sus 270 px liberi (antetul aplicației), jos 480 px (nume și descriere), dreapta 200 px (like, comentarii, share), stânga 90 px (telefoanele taie ~47 px pe fiecare parte). Valorile sunt în `REEL_SAFE` din `render.py`; nu le micșora. După fiecare reel nou, verifică un cadru cu zonele marcate.
- **Coperta = thumbnail** (Alex, 10 oct 2026): primul cadru al reel-ului (cel puțin primele 0,3 s) arată coperta completă, cu același titlu și aceeași imagine ca slide-ul 1 din carusel, fără animație de intrare, ca platformele s-o ia automat ca thumbnail. Coperta respectă și ea zonele sigure. Generatorul face asta singur.
- Aspect: fundal închis, titluri serif albe, accente aurii (rgb 214,178,110), „ZOOMED ART” sus, mini-hartă în dreapta sus, cu chenarul zonei mărite **roșu deschis** (rgb 255,99,99; Alex, 11 oct 2026) (în reel, sub antetul aplicației).

## Pașii pentru o operă nouă
1. Imaginea mare (ideal 4000+ px): `python tools/fetch_image.py --search "<artist> <titlu>"` listează fișierele de pe Wikimedia Commons (cel mai mare primul), apoi `python tools/fetch_image.py <nume> --file "<fișier>"` îl descarcă în `works/<nume>/image.jpg` (doar Public domain/CC0, micșorat la 8000 px). Caută întâi originalul mare: o imagine de 1280 px mărită cu AI arată artefacte.
2. Scrie `script.json` (copiază structura din `works/raft-of-the-medusa/`): titlu, artist, an, sursa imaginii, `caption` cu cel mult 5 hashtag-uri cu reach mare, `_verify`, slide-uri.
3. Pune `focus` pe imaginea reală: `python tools/inspect_focus.py <nume>` (grilă + decupaje numerotate în `out/inspect/`; cu `x0 y0 x1 y1` mărește o zonă), corectezi cu `python tools/set_focus.py <nume> '{"2": [cx, cy, w, h]}'`. Fiecare decupaj trebuie să arate exact ce spune textul slide-ului; ce nu se vede pe imagine trece în `_verify` sau se scoate. Apoi `python3 render.py works/<nume> --debug` → `out/debug_focus.jpg`.
4. `python3 render.py works/<nume> --preview` → verifică `out/reel_preview.jpg` (câteva secunde) înainte de randarea lungă.
5. `pipeline/reel-remotion/make_post.sh <nume>` (pe Windows: `python make_post.py <nume>`) → carusel + reel (stilul nou) în `works/<nume>/out/` și postarea gata în `gata/<nume>/`. Verifică `out/carousel_preview.jpg` și câteva cadre din reel.
6. Actualizează `JURNAL.md` (stare, ce e de verificat, când s-a postat).
7. Site: adaugă numele operei în `site/src/data/published.json`, rulează `.venv\Scripts\python.exe site\scripts\prepare-images.py <nume>`, apoi în `site/` `npm run build` și `npm run verify` (vezi `site/README.md`). Pagina, zidul de pe prima pagină și jocul Daily Detail se fac singure din `script.json`.

Imaginile mici se măresc automat cu Real-ESRGAN (`models/realesrgan_x4plus.onnx`, rezultat în `.cache/`).

## Stilul nou: Remotion (din 10 oct 2026)
Caruselul și reel-ul se fac acum cu `pipeline/reel-remotion/` (vezi README-ul de acolo): colțuri aurii și lumină pe fiecare detaliu, cerc auriu pe detaliile foarte mici, titlu cuvânt cu cuvânt, cifre aurii, bară de progres. `render.py` rămâne cel care calculează încadrarea; `export_shots.py` o trimite la Remotion. Rezultatele vechi stau în `out/v1_vechi/`.

## Planul de postare
- **1-2 opere noi pe zi** pe rețele (Alex, 22 oct 2026, înlocuiește „3 postări pe zi”), opere diferite, plus 2-3 pagini de operă pe săptămână pe site.
- Ordinea și starea fiecărei opere: `JURNAL.md`.

## Website zoomedart.com (decis de Alex pe 22 oct 2026)
- Strategia completă (conținut, SEO, comunitate, viitorul marketplace): https://claude.ai/artifact/T7Kj4rTjQqAgQmcXzeiZtu
- Site static **Astro pe Cloudflare Pages**, generat din repo; fiecare operă are o singură pagină `/works/<slug>/` (articol + imagine explorabilă prin zoom, cu detaliile din `focus`). Site-ul e în engleză.
- Primul grup de opere: **Bruegel** (Children's Games, Netherlandish Proverbs, Peasant Wedding, Fall of Icarus) + pagina artistului.
- Paginile sunt semnate **„Zoomed Art”** (fără nume de persoană); credibilitatea vine din pagina de politică editorială și din sursele fiecărui fapt.
- Newsletterul se amână până după primele pagini.
- Domeniul: cumpărat prin Hostico (expiră 8 oct 2027, reînnoire automată), DNS pe Cloudflare din 22 oct 2026, verificat în Google Search Console. Transferul înregistrării la Cloudflare se poate face de pe 7 dec 2026. Nu adăuga de mână înregistrări A/CNAME: le pune Cloudflare Pages.
- Marketplace-ul nu se începe înainte de porțile din strategie; plățile doar prin furnizor autorizat.

## Lucrul local pe Windows (VS Code + Claude Code)
- Folderul proiectului: `D:\Munca\Zoom Art\zoom-art` (clona repo-ului). Tot ce e în proiect (scripturi, imagini, texte de postare, brand) stă aici; codul e în `pipeline/`.
- Instalare o singură dată: Python 3, Node.js 18+, ffmpeg (în PATH), Git cu Git LFS. Apoi `pip install -r pipeline/requirements.txt` și, în `pipeline/reel-remotion/`, `npm install`.
- Pe Windows comanda e `python`, nu `python3`. În loc de `make_post.sh` folosește `python make_post.py <nume>` (din `pipeline/reel-remotion/`); face exact același lucru.
- Fonturile sunt incluse în `pipeline/fonts/`, deci randarea arată la fel ca în cloud.
- Prima randare cu Remotion descarcă automat un Chrome headless (~100 MB).
- Rezultatele apar în `pipeline/works/<nume>/out/` și nu intră în git. Fă commit doar pentru scripturi, imagini sursă, texte și cod.
- **Lucrul de pe telefon** (ales de Alex pe 11 oct 2026, varianta gratuită): Remote Control. În VS Code, Alex scrie `/remote-control` (sau `/rc`) și continuă sesiunea din aplicația Claude de pe telefon; totul rulează tot pe PC (desktop, la priză nu intră în sleep). Rezultatele ajung pe telefon prin OneDrive (`gata/`). Postarea pe rețele o face Alex manual, cu muzica din aplicație. Serverul cu n8n (planul din 11 oct) a rămas deoparte; se reia doar dacă Alex o cere.

## Unde stau lucrurile
- **Ce s-a postat: profilul TikTok https://www.tiktok.com/@zoomed.art** (Alex, 12 oct 2026). E sursa de adevăr pentru postări; `JURNAL.md` (coloana „Postat”) se aliniază după el. Pe 12 oct: 6 video-uri. Claude poate citi singur numerele (video-uri, like-uri, urmăritori) din HTML-ul paginii (`curl` cu user-agent de browser, JSON-ul `__UNIVERSAL_DATA_FOR_REHYDRATION__` → `webapp.user-detail.userInfo.stats`), dar **lista video-urilor e blocată de captcha** pentru browserele automate. Dacă `videoCount` nu se potrivește cu jurnalul, îi cere lui Alex un screenshot al profilului sau titlurile ultimelor postări.
- **Postările gata de pus: `gata/<nume>/`**, câte un folder pe operă: `carusel/01.jpg`…`10.jpg`, `reel.mp4`, `texte.md` (caption carusel, reel, YouTube). `make_post` îl reface automat; nu intră în git. `gata/` e un junction spre `D:\OneDrive\Postari zoom art`, deci postările apar singure în aplicația OneDrive de pe telefonul lui Alex, de unde le pune pe rețele (11 oct 2026).
- Cod: repo GitHub `StrikeLike/zoom-art`, clonat local în `D:\Munca\Zoom Art\zoom-art`.
- Rezultatele (`out/`, `.cache/`, mp4, zip) nu intră în git.
- Alex descarcă imagini în `C:\Users\badu5\Downloads`.
