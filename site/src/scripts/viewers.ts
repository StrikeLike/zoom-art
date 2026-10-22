// The viewer and its tiles are loaded only on approach to a painting's story.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let library: Promise<typeof import('openseadragon')> | undefined;
const loadViewer = () => library ??= import('openseadragon').then(module => module.default);
const near = (element: Element, callback: () => void) => {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); callback(); }
  }, { rootMargin: '350px' });
  observer.observe(element);
};
type Focus = [number, number, number, number];
// Exact cubic-bezier(.65,0,.35,1), with interrupted moves starting at the current view.
const cameraFrames = new WeakMap<object, number>();
function moveCamera(viewer: import('openseadragon').Viewer, bounds: import('openseadragon').Rect, OSD: typeof import('openseadragon')) {
  cancelAnimationFrame(cameraFrames.get(viewer) ?? 0);
  if (reduced.matches) { viewer.viewport.fitBounds(bounds,true); return; }
  const from = viewer.viewport.getBounds(true), aspect = viewer.viewport.getAspectRatio();
  const width = Math.max(bounds.width,bounds.height*aspect), height = width/aspect;
  const to = {x:bounds.x+bounds.width/2-width/2,y:bounds.y+bounds.height/2-height/2,width,height};
  const start = performance.now();
  const frame = (time: number) => {
    const progress = Math.min(1,(time-start)/1600);
    let low=0,high=1,t=progress;
    for(let i=0;i<12;i++){ const x=3*(1-t)*(1-t)*t*.65+3*(1-t)*t*t*.35+t*t*t; if(x<progress) low=t; else high=t; t=(low+high)/2; }
    const ease = progress === 1 ? 1 : 3*(1-t)*t*t+t*t*t;
    viewer.viewport.fitBounds(new OSD.Rect(from.x+(to.x-from.x)*ease,from.y+(to.y-from.y)*ease,from.width+(to.width-from.width)*ease,from.height+(to.height-from.height)*ease),true);
    if(progress<1) cameraFrames.set(viewer,requestAnimationFrame(frame));
  };
  cameraFrames.set(viewer,requestAnimationFrame(frame));
}

export function initGuided() {
  const root = document.querySelector<HTMLElement>('[data-guided]');
  if (!root) return;
  near(root, async () => {
    try {
      const OSD = await loadViewer();
      const canvas = root.querySelector<HTMLElement>('#guided-canvas')!;
      const viewer = OSD({ element: canvas, tileSources: root.dataset.dzi,
        showNavigationControl: false, showNavigator: false, mouseNavEnabled: false,
        animationTime: 1.6, springStiffness: 5, blendTime: 0.15,
        maxZoomPixelRatio: 1.5, minZoomImageRatio: 0.6, visibilityRatio: 0.5,
        gestureSettingsMouse: { scrollToZoom: false, clickToZoom: false },
        gestureSettingsTouch: { pinchToZoom: false, dragToPan: false },
      });
      const steps = [...root.querySelectorAll<HTMLElement>('[data-step]')];
      const corner = root.querySelector<HTMLElement>('.guide-focus')!;
      const map = root.querySelector<HTMLElement>('.map-window')!;
      const progress = root.querySelector<HTMLElement>('[data-progress]')!;
      let active = -1, open = false, scheduled = false;
      const positions: number[] = [];
      function measure() { steps.forEach((step, i) => {
        positions[i] = step.getBoundingClientRect().top + window.scrollY + step.offsetHeight * (window.innerWidth<761 ? .18 : .36);
        const words = [...step.querySelectorAll<HTMLElement>('.story-copy .story-word')];
        const tops = words.map(word => word.offsetTop);
        const lines = [...new Set(tops)];
        words.forEach((word,index) => word.style.setProperty('--line',String(lines.indexOf(tops[index]))));
      }); }
      function select(index: number) {
        if (index === active || !open) return;
        active = index;
        const [cx,cy,w,h] = JSON.parse(steps[index].dataset.focus!) as Focus;
        const item = viewer.world.getItemAt(0);
        const iw = Number(root!.dataset.width), ih = Number(root!.dataset.height);
        const focus = item.imageToViewportRectangle((cx-w/2)*iw,(cy-h/2)*ih,w*iw,h*ih);
        const breathingRoom = index === 0 ? 1.04 : 1.55;
        const bw = Math.min(1, w*breathingRoom), bh = Math.min(1, h*breathingRoom);
        const bounds = item.imageToViewportRectangle((cx-bw/2)*iw,(cy-bh/2)*ih,bw*iw,bh*ih);
        moveCamera(viewer,bounds,OSD);
        viewer.updateOverlay(corner, focus);
        if (reduced.matches) canvas.animate([{opacity:0.25},{opacity:1}], {duration:200});
        corner.classList.remove('focus-arrive'); void corner.offsetWidth; corner.classList.add('focus-arrive');
        corner.classList.toggle('small-focus',w<=.1 && h<=.13);
        map.style.cssText = `left:${(cx-w/2)*100}%;top:${(cy-h/2)*100}%;width:${w*100}%;height:${h*100}%`;
        progress.textContent = String(index+1).padStart(2,'0');
        steps.forEach((step,i) => step.classList.toggle('is-active',i === index));
      }
      function update() {
        scheduled = false;
        const line = window.scrollY + window.innerHeight * (window.innerWidth < 761 ? 0.73 : 0.55);
        let index = 0;
        positions.forEach((position,i) => { if (position <= line) index = i; });
        select(index);
      }
      const scroll = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } };
      viewer.addOnceHandler('open', () => {
        open = true;
        viewer.addOverlay({element:corner,location:new OSD.Rect(0,0,1,1),checkResize:false});
        const updateMap = () => {
          const bounds = viewer.world.getItemAt(0).viewportToImageRectangle(viewer.viewport.getBounds(true));
          const iw = Number(root.dataset.width), ih = Number(root.dataset.height);
          const x = Math.max(0,bounds.x/iw), y = Math.max(0,bounds.y/ih);
          const right = Math.min(1,(bounds.x+bounds.width)/iw), bottom = Math.min(1,(bounds.y+bounds.height)/ih);
          map.style.cssText = `left:${x*100}%;top:${y*100}%;width:${Math.max(0,right-x)*100}%;height:${Math.max(0,bottom-y)*100}%`;
        };
        viewer.addHandler('viewport-change',updateMap);
        root.classList.add('is-enhanced');
        canvas.querySelectorAll<HTMLElement>('[tabindex]').forEach(el => el.tabIndex = -1);
        measure(); update();
        window.addEventListener('scroll',scroll,{passive:true});
        window.addEventListener('resize',() => { measure(); active=-1; update(); },{passive:true});
        new ResizeObserver(() => { measure(); scroll(); }).observe(root);
        document.fonts.ready.then(() => { measure(); scroll(); });
      });
      viewer.addHandler('open-failed', () => { root.classList.remove('is-enhanced'); root.classList.add('viewer-failed'); });
      window.addEventListener('pagehide',event => { if (!event.persisted) viewer.destroy(); });
    } catch { root.classList.add('viewer-failed'); }
  });
}

export function initExplorer() {
  const root = document.querySelector<HTMLElement>('[data-explorer]');
  if (!root) return;
  near(root, async () => {
    const status = root.querySelector<HTMLElement>('.viewer-status')!;
    status.textContent = status.dataset.loading!;
    try {
      const OSD = await loadViewer();
      const canvas = root.querySelector<HTMLElement>('#free-canvas')!;
      const viewer = OSD({element:canvas,tileSources:root.dataset.dzi,
        showNavigationControl:false,showNavigator:false,
        animationTime:reduced.matches ? 0 : 1.5,blendTime:0.15,
        maxZoomPixelRatio:2,visibilityRatio:0.7,constrainDuringPan:true,
        gestureSettingsMouse:{scrollToZoom:false,clickToZoom:false,dblClickToZoom:true},
        gestureSettingsTouch:{pinchToZoom:true,dragToPan:true,clickToZoom:false},
      });
      const links = [...root.querySelectorAll<HTMLAnchorElement>('[data-hotspot]')];
      const copies = [...root.querySelectorAll<HTMLElement>('[data-hotspot-copy] span')];
      const iw = Number(root.dataset.width), ih = Number(root.dataset.height);
      const markers: HTMLButtonElement[] = [];
      function select(i: number) {
        const [cx,cy,w,h] = JSON.parse(links[i].dataset.focus!) as Focus;
        const item = viewer.world.getItemAt(0);
        const bw = Math.min(1,w*1.6), bh = Math.min(1,h*1.6);
        moveCamera(viewer,item.imageToViewportRectangle((cx-bw/2)*iw,(cy-bh/2)*ih,bw*iw,bh*ih),OSD);
        root!.querySelector('[data-active-number]')!.textContent = String(i+1).padStart(2,'0');
        root!.querySelector('[data-active-title]')!.textContent = copies[i].dataset.title!;
        root!.querySelector('[data-active-text]')!.textContent = copies[i].dataset.text!;
        links.forEach((link,index) => { if(index === i) link.setAttribute('aria-current','true'); else link.removeAttribute('aria-current'); });
        if (markers.includes(document.activeElement as HTMLButtonElement)) links[i].focus({preventScroll:true});
        markers.forEach((marker,index) => { marker.setAttribute('aria-pressed',String(index === i)); marker.hidden = i !== 0; });
      }
      viewer.addOnceHandler('open',() => {
        root.classList.add('is-enhanced');
        root.querySelector<HTMLElement>('.explorer-controls')!.hidden = false;
        status.textContent = '';
        const inner = canvas.querySelector<HTMLElement>('.openseadragon-canvas');
        if (inner) { inner.setAttribute('aria-label',canvas.getAttribute('aria-label')!); inner.setAttribute('aria-describedby','viewer-instructions'); }
        links.forEach((link,i) => {
          link.addEventListener('click',event => {
            event.preventDefault(); select(i);
            root.querySelector('.explorer-frame')!.scrollIntoView({behavior:reduced.matches ? 'instant' : 'smooth',block:'start'});
          });
          // The full-frame overview has a list entry, but no central marker obscuring the canvas.
          if(i === 0) return;
          const [cx,cy] = JSON.parse(link.dataset.focus!) as Focus;
          const marker = document.createElement('button');
          marker.className = 'hotspot-marker'; marker.textContent = String(i+1);
          marker.setAttribute('aria-label',`${String(i+1).padStart(2,'0')}: ${copies[i].dataset.title}`);
          marker.setAttribute('aria-pressed','false'); marker.addEventListener('click',() => select(i));
          viewer.addOverlay({element:marker,location:viewer.world.getItemAt(0).imageToViewportCoordinates(cx*iw,cy*ih),placement:OSD.Placement.CENTER,checkResize:false});
          markers[i] = marker;
        });
        root.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(button => button.addEventListener('click',() => {
          if(button.dataset.zoom === 'home') { select(0); }
          else { cancelAnimationFrame(cameraFrames.get(viewer) ?? 0); viewer.viewport.zoomBy(button.dataset.zoom === 'in' ? 1.5 : 1/1.5); }
          viewer.viewport.applyConstraints();
        }));
        canvas.addEventListener('keydown',event => {
          if((event.target as HTMLElement).tagName === 'BUTTON') return;
          cancelAnimationFrame(cameraFrames.get(viewer) ?? 0);
          const step = viewer.viewport.getBounds().width * 0.12;
          const direction: Record<string,[number,number]> = {ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
          if(direction[event.key]) { event.preventDefault(); event.stopPropagation(); viewer.viewport.panBy(new OSD.Point(...direction[event.key]),reduced.matches); }
          else if(['+','=','-','Home'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); event.key === 'Home' ? viewer.viewport.goHome(reduced.matches) : viewer.viewport.zoomBy(event.key === '-' ? 1/1.4 : 1.4); }
          viewer.viewport.applyConstraints();
        },true);
      });
      viewer.addHandler('open-failed',() => {status.textContent = status.dataset.error!;root.classList.remove('is-enhanced');});
      window.addEventListener('pagehide',event => { if (!event.persisted) viewer.destroy(); });
    } catch {status.textContent = status.dataset.error!;}
  });
}
