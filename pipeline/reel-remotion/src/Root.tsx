import {Composition, staticFile} from "remotion";
import {loadFont} from "@remotion/fonts";
import {Carousel, Reel, ReelData, totalFrames} from "./Reel";

loadFont({family: "ZSerif", url: staticFile("LiberationSerif-Bold.ttf"), weight: "700"});
loadFont({family: "ZSerif", url: staticFile("LiberationSerif-Italic.ttf"), weight: "400", style: "italic"});
loadFont({family: "ZSans", url: staticFile("DejaVuSans.ttf"), weight: "400"});
loadFont({family: "ZSans", url: staticFile("DejaVuSans-Bold.ttf"), weight: "700"});

export const RemotionRoot = () => (
  <>
  <Composition
    id="Reel"
    component={Reel}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={300}
    defaultProps={{data: null as unknown as ReelData}}
    calculateMetadata={async () => {
      const data: ReelData = await (await fetch(staticFile("reel.json"))).json();
      return {durationInFrames: totalFrames(data), fps: data.fps, props: {data}};
    }}
  />
  <Composition
    id="Carousel"
    component={Carousel}
    width={1080}
    height={1350}
    fps={1}
    durationInFrames={10}
    defaultProps={{data: null as unknown as ReelData}}
    calculateMetadata={async () => {
      const data: ReelData = await (await fetch(staticFile("carousel.json"))).json();
      return {durationInFrames: data.slides.length, props: {data}};
    }}
  />
  </>
);
