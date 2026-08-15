'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VolumeBlock, Vec3 } from '../utils/volumeBlocks';
import { SLICE_COLORS } from '../utils/volumeBreakdown';

interface Props {
  blocks: VolumeBlock[];
  suitcaseSize: Vec3;
}

const MIN_RENDER_HEIGHT_PX = 220;

/**
 * Create the WebGL renderer, returning null when a WebGL context cannot be
 * created. Three.js throws on a missing context (no GPU, a GPU-disabled or
 * restricted WebView, a GPU-less CI container), and an uncaught throw in the
 * mount effect would take the whole Knapsack Engine panel down with it —
 * including the text breakdown that is the accessible representation. The
 * caller degrades to that breakdown instead.
 */
function createRenderer(): THREE.WebGLRenderer | null {
  try {
    return new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
}

// The actual WebGL canvas. Loaded exclusively via next/dynamic({ ssr: false })
// from Volume3DPanel -- this app is a Next.js static export (output:
// 'export'), and Three.js touches `window`/WebGL at module scope, which
// fails `next build` if it's ever reachable from server-rendered code. See
// the "Next.js Static Export Server Action Scoping" lesson in
// .agents/AGENTS.md §6.
export default function Volume3DScene({ blocks, suitcaseSize }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Rebuilding the WebGL scene is comparatively expensive (creates a new
  // GL context) and browsers cap how many contexts can be live at once, so
  // the effect below must only re-run when the *content* actually changed,
  // not merely because the parent re-rendered with structurally-identical
  // but reference-new props (computeVolumeBlocks returns a fresh array on
  // every call). A cheap content signature gates the expensive rebuild.
  const signature = useMemo(
    () =>
      JSON.stringify({
        suitcaseSize,
        blocks: blocks.map((b) => ({
          c: b.category,
          ci: b.colorIndex,
          s: b.size,
          p: b.position,
        })),
      }),
    [blocks, suitcaseSize]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = createRenderer();
    if (!renderer) {
      // No WebGL: leave the canvas out entirely. The panel's text breakdown
      // (the aria-describedby target) is always rendered by the parent, so
      // the view degrades to text instead of crashing the whole panel. The
      // attribute is set directly on the DOM node (an external system) rather
      // than through setState, which would cascade a render for no benefit.
      container.dataset.webgl = 'unavailable';
      return;
    }
    container.dataset.webgl = 'active';

    const scene = new THREE.Scene();
    const width = container.clientWidth || 1;
    const height = container.clientHeight || MIN_RENDER_HEIGHT_PX;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 4000);

    const maxDim = Math.max(suitcaseSize.x, suitcaseSize.y, suitcaseSize.z, 1);
    camera.position.set(maxDim * 1.3, maxDim * 1.05, maxDim * 1.5);
    camera.lookAt(0, 0, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // updateStyle defaults to true here deliberately: it sets the canvas's
    // CSS width/height to match the container while the drawing buffer
    // itself is still scaled up by pixelRatio for sharpness. Passing
    // `false` (as this used to) leaves the canvas with no CSS size at all,
    // so the browser falls back to its `width`/`height` attributes -- which
    // setSize sets to width*pixelRatio/height*pixelRatio -- as the layout
    // box. On a common phone (devicePixelRatio 2-3) that renders the canvas
    // up to 2x too large and the container's `overflow: hidden` crops it to
    // a zoomed-in corner instead of the whole suitcase.
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const directional = new THREE.DirectionalLight(0xffffff, 0.9);
    directional.position.set(maxDim, maxDim * 1.5, maxDim);
    scene.add(directional);

    const disposables: { dispose: () => void }[] = [];

    // The suitcase's own bounding box, drawn as a wireframe outline.
    const suitcaseGeometry = new THREE.BoxGeometry(suitcaseSize.x, suitcaseSize.y, suitcaseSize.z);
    const suitcaseEdges = new THREE.EdgesGeometry(suitcaseGeometry);
    const suitcaseMaterial = new THREE.LineBasicMaterial({ color: 0x94a3b8 });
    const suitcaseOutline = new THREE.LineSegments(suitcaseEdges, suitcaseMaterial);
    scene.add(suitcaseOutline);
    disposables.push(suitcaseGeometry, suitcaseEdges, suitcaseMaterial);

    // One box per packed category, sized/positioned by computeVolumeBlocks.
    blocks.forEach((block) => {
      const geometry = new THREE.BoxGeometry(
        Math.max(block.size.x, 0.001),
        Math.max(block.size.y, 0.001),
        Math.max(block.size.z, 0.001)
      );
      const material = new THREE.MeshStandardMaterial({
        color: SLICE_COLORS[block.colorIndex % SLICE_COLORS.length],
        transparent: true,
        opacity: 0.88,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(block.position.x, block.position.y, block.position.z);
      scene.add(mesh);
      disposables.push(geometry, material);
    });

    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      disposables.forEach((d) => d.dispose());
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // Intentionally keyed on `signature` alone (a content hash of blocks +
    // suitcaseSize), not on blocks/suitcaseSize themselves -- see the
    // comment above computing `signature` for why re-running this on every
    // reference-new-but-content-identical prop would thrash WebGL contexts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ width: '100%', height: `${MIN_RENDER_HEIGHT_PX}px`, borderRadius: '8px', overflow: 'hidden', touchAction: 'none' }}
    />
  );
}
