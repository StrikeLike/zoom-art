# Generator Zoomed Art: carusel + reel

Dintr-un singur fișier `script.json` per operă ies automat:
- **carusel**: max 10 imagini JPG 1080x1350 (4:5, formatul care ocupă cel mai mult ecran în feed-ul Instagram);
- **reel**: video MP4 vertical 1080x1920, cu zoom lent pe fiecare detaliu și text care apare treptat. Fiecare slide stă pe ecran cât e nevoie ca textul să fie citit (~3 cuvinte/secundă + 1,5 s pentru imagine), deci un reel are de obicei 60-90 de secunde. Pentru un slide anume poți forța durata cu `"hold": 6` (secunde) în `script.json`.

Ultimul slide („Follow @zoomed.art for more hidden details”) se adaugă automat, deci în script pui maxim 9 slide-uri.

## Cum adaugi o operă nouă

1. Creează un folder `works/<nume>/` cu imaginea la rezoluție mare (minim ~2500 px pe latura mică) și un `script.json` (copiază-l pe cel din `works/arnolfini/`).
2. Pentru fiecare detaliu, `focus` este dreptunghiul care trebuie să se vadă **întreg**: `[x, y, lățime, înălțime]`, ca fracții din tablou (0 = stânga/sus, 1 = dreapta/jos), cu `x, y` = centrul detaliului. Dacă lipsește înălțimea, se folosește un dreptunghi culcat (înălțime = 0,62 × lățime, în pixeli).
3. **Textul nu acoperă niciodată detaliul:** generatorul calculează unde stă textul pe fiecare slide (și mini-harta din dreapta sus) și încadrează camera astfel încât tot dreptunghiul `focus` să fie în zona liberă de deasupra textului, atât în carusel, cât și în reel (inclusiv în timpul zoom-ului lent). Tu doar marchezi corect detaliul.
4. Verifică dreptunghiurile: `python3 render.py works/<nume> --debug` (verde = detaliul, roșu = ce se vede în carusel, albastru = ce se vede în reel).
5. Verifică reel-ul în câteva secunde, fără să aștepți video-ul: `python3 render.py works/<nume> --preview` scrie `out/reel_preview.jpg`, cu un cadru din fiecare slide. Caruselul scrie automat `out/carousel_preview.jpg`.
6. Generează: `python3 render.py works/<nume>` (sau `--only carousel` / `--only reel`). Reel-ul durează ~25 de minute pentru ~90 de secunde de video.

Rezultatele apar în `works/<nume>/out/`. Reel-ul nu are muzică: o adaugi din aplicație (Instagram/TikTok), ca să folosești sunete licențiate de platformă.

## Upscaling automat

Dacă imaginea găsită e prea mică pentru cel mai adânc zoom din script, generatorul o mărește singur înainte de randare, cu **Real-ESRGAN** (model AI open-source, licență BSD, rulează local pe procesor, fără cont sau abonament). Exemplu: un zoom cu `lățime` 0.22 are nevoie de un tablou de ~5300 px lățime; o imagine de 1500 px e mărită automat.

- Rezultatul se păstrează în `works/<nume>/.cache/`, deci upscaling-ul rulează o singură dată pe imagine.
- Durează câteva minute pe procesor, în funcție de cât de mică e imaginea.
- Poți mări și o imagine separat: `python3 upscale.py mica.jpg mare.png --width 5000`.
- Dacă vrei imaginea exact cum e: `python3 render.py works/<nume> --no-upscale`.
- Dacă `onnxruntime` nu e instalat, face o mărire simplă (Lanczos) și scrie asta în terminal.

**Limita, sincer:** AI-ul face marginile și textura să arate clare, dar nu poate recupera tușe de pensulă care nu există în fișierul original; „inventează” detalii plauzibile. Pentru zoom-uri foarte adânci (craquelura, semnături mici), caută totuși sursa mare: Wikimedia Commons, Google Arts & Culture sau colecțiile deschise ale muzeelor (National Gallery, Met, Rijksmuseum) au de obicei fișiere de 4000-10000 px. Pentru postări, un detaliu „ghicit” de AI nu trebuie prezentat ca fapt despre tablou.

Cerințe: Python 3, ffmpeg, apoi `pip install -r requirements.txt` (Pillow, numpy, onnxruntime). Modelul AI e în `models/` (păstrat cu Git LFS; dacă după clonare are doar câțiva KB, rulează `git lfs pull`). Fonturile sunt în `fonts/`. Pe Windows scrie `python` în loc de `python3`.
