'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Pause, Play, RotateCcw, Route, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

import 'leaflet/dist/leaflet.css';

const SPOTS = [
  { id: 1, name: 'スポット 01', lat: 34.663508, lng: 135.57423 },
  { id: 2, name: 'スポット 02', lat: 34.659074, lng: 135.52643 },
  { id: 3, name: 'スポット 03', lat: 34.681879, lng: 135.533178 },
] as const;

const PIN_RED = '#e00010';
const PIN_HEAD_OFFSET_Y = -31;
const PIN_LAYER_VERSION = 'pin-stack-v5';

type PaperBrowser = typeof import('paper');

declare global {
  interface Window {
    paper?: PaperBrowser;
  }
}

let paperBrowserPromise: Promise<PaperBrowser> | undefined;

function loadPaperBrowser() {
  if (window.paper) return Promise.resolve(window.paper);
  if (paperBrowserPromise) return paperBrowserPromise;

  paperBrowserPromise = new Promise<PaperBrowser>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/paper-core.min.js';
    script.async = true;
    script.onload = () => {
      if (window.paper) resolve(window.paper);
      else reject(new Error('Paper.js did not expose the browser API.'));
    };
    script.onerror = () => reject(new Error('Paper.js failed to load.'));
    document.head.appendChild(script);
  });

  return paperBrowserPromise;
}

type RenderSettings = {
  motion: boolean;
  neckWidth: number;
  replayStartedAt: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeOutBack(value: number) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}

export default function ElasticMap() {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<RenderSettings>({
    motion: true,
    neckWidth: 6,
    replayStartedAt: 0,
  });
  const [motion, setMotion] = useState(true);
  const [neckWidth, setNeckWidth] = useState(6);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    settingsRef.current.motion = motion;
    settingsRef.current.neckWidth = neckWidth;
  }, [motion, neckWidth]);

  const replay = useCallback(() => {
    settingsRef.current.replayStartedAt = performance.now();
  }, []);

  useEffect(() => {
    const mapNode = mapNodeRef.current;
    if (!mapNode) return;

    let cancelled = false;
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | undefined;
    let leafletMap: import('leaflet').Map | undefined;
    let paperScope: import('paper').PaperScope | undefined;
    let canvas: HTMLCanvasElement | undefined;

    async function mountMap() {
      const L = await import('leaflet');
      const paperModule = await loadPaperBrowser();
      if (cancelled || !mapNodeRef.current) return;

      leafletMap = L.map(mapNodeRef.current, {
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 20,
          subdomains: 'abcd',
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        },
      ).addTo(leafletMap);

      L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);

      const bounds = L.latLngBounds(SPOTS.map((spot) => [spot.lat, spot.lng]));
      leafletMap.fitBounds(bounds, {
        paddingTopLeft: [80, 120],
        paddingBottomRight: [80, 80],
        maxZoom: 13,
      });

      const layerPanes = [
        { name: 'elasticPane', zIndex: 450, pointerEvents: 'none' },
        { name: 'pinPane', zIndex: 610, pointerEvents: 'auto' },
        { name: 'spotBadgePane', zIndex: 640, pointerEvents: 'none' },
      ] as const;

      layerPanes.forEach(({ name, zIndex, pointerEvents }) => {
        const pane = leafletMap!.createPane(name);
        pane.style.zIndex = String(zIndex);
        pane.style.pointerEvents = pointerEvents;
      });

      const pinIcon = L.divIcon({
        className: 'wayfarer-pin-layer',
        html: [
          '<img class="pin-red-layer" src="/myakupin_red.webp" width="29" height="45" alt="" aria-hidden="true" draggable="false" />',
          '<span class="pin-white-layer" aria-hidden="true" style="position:absolute;top:4px;left:7px;z-index:2;display:block;width:18px;height:18px;border-radius:999px;background:#fff"></span>',
          '<span class="pin-blue-layer" aria-hidden="true" style="position:absolute;top:6px;left:14px;z-index:3;display:block;width:8px;height:8px;border-radius:999px;background:#087fae"></span>',
        ].join(''),
        iconSize: [29, 45],
        iconAnchor: [14.5, 44],
      });

      SPOTS.forEach((spot) => {
        const marker = L.marker([spot.lat, spot.lng], {
          icon: pinIcon,
          pane: 'pinPane',
          title: `${spot.name}: ${spot.lat}, ${spot.lng}`,
          keyboard: true,
        }).addTo(leafletMap!);

        marker.bindTooltip(
          `<strong>${spot.name}</strong><br><span>${spot.lat.toFixed(6)}, ${spot.lng.toFixed(6)}</span>`,
          { direction: 'top', offset: [0, -38], className: 'wayfarer-tooltip' },
        );

        const badge = L.divIcon({
          className: 'spot-number-shell',
          html: `<span>${spot.id}</span>`,
          iconSize: [24, 24],
          iconAnchor: [-8, 40],
        });
        L.marker([spot.lat, spot.lng], {
          icon: badge,
          pane: 'spotBadgePane',
          interactive: false,
          keyboard: false,
        }).addTo(leafletMap!);
      });

      canvas = document.createElement('canvas');
      canvas.className = 'elastic-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      leafletMap.getPane('elasticPane')?.appendChild(canvas);

      paperScope = new paperModule.PaperScope();
      paperScope.setup(canvas);

      const positionCanvas = () => {
        if (!canvas || !leafletMap) return;
        const topLeft = leafletMap.containerPointToLayerPoint(L.point(0, 0));
        L.DomUtil.setPosition(canvas, topLeft);
      };

      const resizeCanvas = () => {
        if (!canvas || !paperScope || !mapNodeRef.current) return;
        const width = Math.max(1, mapNodeRef.current.clientWidth);
        const height = Math.max(1, mapNodeRef.current.clientHeight);
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        paperScope.view.viewSize = new paperScope.Size(width, height);
        positionCanvas();
      };

      resizeCanvas();
      resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
        leafletMap?.invalidateSize({ pan: false });
      });
      resizeObserver.observe(mapNodeRef.current);

      settingsRef.current.replayStartedAt = performance.now();

      const drawTendon = (
        start: import('paper').Point,
        destination: import('paper').Point,
        progress: number,
        index: number,
        time: number,
      ) => {
        if (!paperScope) return;
        const eased = easeOutBack(progress);
        const end = start.add(destination.subtract(start).multiply(eased));
        const delta = end.subtract(start);
        const distance = Math.max(delta.length, 1);
        const direction = delta.normalize();
        const normal = new paperScope.Point(-direction.y, direction.x);
        const midpoint = start.add(delta.multiply(0.5));
        const breathing = settingsRef.current.motion
          ? Math.sin(time * 0.0024 + index * 1.9)
          : 0;
        const wobble = breathing * Math.min(22, distance * 0.045);
        const center = midpoint.add(normal.multiply(wobble));
        const neck = Math.max(
          2,
          settingsRef.current.neckWidth * (1 + breathing * 0.11),
        );
        const flare = 10.8;
        const lead = Math.min(88, distance * 0.22);
        const middleLead = Math.min(112, distance * 0.16);

        const path = new paperScope.Path({ fillColor: PIN_RED, closed: true });
        const startTop = start.add(normal.multiply(flare));
        const endTop = end.add(normal.multiply(flare));
        const endBottom = end.subtract(normal.multiply(flare));
        const startBottom = start.subtract(normal.multiply(flare));
        const centerTop = center.add(normal.multiply(neck));
        const centerBottom = center.subtract(normal.multiply(neck));

        path.moveTo(startTop);
        path.cubicCurveTo(
          startTop.add(direction.multiply(lead)),
          centerTop.subtract(direction.multiply(middleLead)),
          centerTop,
        );
        path.cubicCurveTo(
          centerTop.add(direction.multiply(middleLead)),
          endTop.subtract(direction.multiply(lead)),
          endTop,
        );
        path.lineTo(endBottom);
        path.cubicCurveTo(
          endBottom.subtract(direction.multiply(lead)),
          centerBottom.add(direction.multiply(middleLead)),
          centerBottom,
        );
        path.cubicCurveTo(
          centerBottom.subtract(direction.multiply(middleLead)),
          startBottom.add(direction.multiply(lead)),
          startBottom,
        );
        path.closePath();

        if (progress < 1) {
          new paperScope.Path.Circle({
            center: end,
            radius: 7 + 4 * clamp(progress, 0, 1),
            fillColor: PIN_RED,
          });
        }
      };

      const drawFrame = (time: number) => {
        if (cancelled || !leafletMap || !paperScope) return;
        positionCanvas();
        paperScope.project.activeLayer.removeChildren();

        const points = SPOTS.map((spot) => {
          const point = leafletMap!.latLngToContainerPoint([spot.lat, spot.lng]);
          return new paperScope!.Point(point.x, point.y + PIN_HEAD_OFFSET_Y);
        });

        const elapsed = time - settingsRef.current.replayStartedAt;
        const durations = [
          { delay: 0, duration: 1750 },
          { delay: 850, duration: 1750 },
        ];

        durations.forEach((timing, index) => {
          const progress = clamp(
            (elapsed - timing.delay) / timing.duration,
            0,
            1,
          );
          if (progress > 0) {
            drawTendon(points[index], points[index + 1], progress, index, time);
          }
        });

        points.forEach((point, index) => {
          const pulse = settingsRef.current.motion
            ? Math.sin(time * 0.003 + index * 1.7) * 0.7
            : 0;
          new paperScope!.Path.Circle({
            center: point,
            radius: 11.4 + pulse,
            fillColor: PIN_RED,
          });
        });

        paperScope.view.update();
        animationFrame = requestAnimationFrame(drawFrame);
      };

      setReady(true);
      animationFrame = requestAnimationFrame(drawFrame);
    }

    void mountMap();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      paperScope?.remove();
      leafletMap?.remove();
      canvas?.remove();
    };
  }, [PIN_LAYER_VERSION]);

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <p className="eyebrow">WAYFARER LAB / EXPERIMENT 02</p>
            <h1>弾性腱マップ</h1>
          </div>
        </div>
        <div className="route-summary" aria-label="訪問ルートの概要">
          <Route aria-hidden="true" />
          <span>訪問順</span>
          <strong>1 → 2 → 3</strong>
          <i />
          <span>約 7.0 km</span>
        </div>
      </header>

      <section className="map-stage" aria-label="3地点を弾性腱でつないだ地図">
        <div ref={mapNodeRef} className="map-root" />

        <aside className="control-card" aria-label="弾性腱の操作パネル">
          <div className="control-heading">
            <span className="control-icon"><Sparkles aria-hidden="true" /></span>
            <div>
              <p className="eyebrow">LIVE MATERIAL</p>
              <h2>ゴムの生命感を調整</h2>
            </div>
            <span className={`live-dot ${ready ? 'is-ready' : ''}`}>
              {ready ? 'LIVE' : 'LOAD'}
            </span>
          </div>

          <div className="slider-row">
            <div className="slider-copy">
              <span>中央の腱幅</span>
              <strong>{neckWidth}px</strong>
            </div>
            <Slider
              aria-label="中央の腱幅"
              min={3}
              max={14}
              step={1}
              value={[neckWidth]}
              onValueChange={(value) => setNeckWidth(value[0] ?? 6)}
              className="elastic-slider"
            />
          </div>

          <div className="control-actions">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setMotion((value) => !value)}
              aria-pressed={motion}
              className="motion-button"
            >
              {motion ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              {motion ? '揺れを止める' : '揺れを再開'}
            </Button>
            <Button type="button" size="lg" onClick={replay} className="replay-button">
              <RotateCcw aria-hidden="true" />
              もう一度伸ばす
            </Button>
          </div>
        </aside>

        <aside className="spot-card" aria-label="訪問スポット一覧">
          <div className="spot-card-title">
            <MapPin aria-hidden="true" />
            <div>
              <p className="eyebrow">VISITED CELLS</p>
              <h2>3つの訪問細胞</h2>
            </div>
          </div>
          <ol>
            {SPOTS.map((spot) => (
              <li key={spot.id}>
                <span>{spot.id}</span>
                <div>
                  <strong>{spot.name}</strong>
                  <small>{spot.lat.toFixed(6)}, {spot.lng.toFixed(6)}</small>
                </div>
              </li>
            ))}
          </ol>
          <p className="spot-note">
            赤い腱は実際の道路ではなく、訪問順に育った生命的なつながりです。
          </p>
        </aside>

        <div className="map-caption" aria-hidden="true">
          <span />
          PAPER.JS ELASTIC PATH
        </div>
      </section>
    </main>
  );
}
