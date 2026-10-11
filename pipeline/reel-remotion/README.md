# Carusel + reel animat cu Remotion

Variantă de reel cu animații mai bogate, făcută cu [Remotion](https://remotion.dev). Generatorul `render.py` rămâne „creierul”: el calculează încadrarea (textul nu acoperă niciodată detaliul), împărțirea textului pe rânduri și durata fiecărui slide. Remotion doar animă.

Ce aduce în plus față de reel-ul din `render.py`:
- evidențiere aurie pe detaliu: colțuri care se desenează singure, cu o strălucire care „respiră”, și restul tabloului ușor întunecat;
- un cerc auriu care pulsează pe detaliile foarte mici (de ex. corabia de la orizont);
- titlul apare cuvânt cu cuvânt, textul rând cu rând; cifrele (147, 13 zile) sunt aurii;
- bară de progres sus, ca la Stories, ca să se vadă cât a mai rămas;
- mini-harta urmărește camera în timp real; tranziții mai line între detalii.

## Cum îl rulezi (în folderul ăsta)

Ai nevoie de Node.js 18+, Python 3 cu Pillow și ffmpeg.

```
npm install                       # o singură dată
./make_post.sh raft-of-the-medusa # carusel + reel în ../works/raft-of-the-medusa/out/
npx remotion studio               # opțional: previzualizare în browser, cadru cu cadru
```

`export_shots.py` scrie în `public/` tabloul, fundalurile, fonturile, `reel.json` și `carousel.json` (camera, textul, timpii). Reel-ul e limitat la 59 de secunde: timpul se împarte între slide-uri după lungimea textului.

Skillurile Remotion pentru Claude Code: `npx skills add remotion-dev/skills`.

Licență: Remotion e gratuit pentru persoane fizice și firme mici (verifică pe remotion.dev/docs/license înainte de monetizare).
