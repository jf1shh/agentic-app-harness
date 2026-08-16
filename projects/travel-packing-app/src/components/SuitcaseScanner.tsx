'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Point,
  MeasurementResult,
  measureFromTaps,
  formatDimensions,
  calibrateScale,
  pixelDistance,
  pixelsToCm,
  REFERENCE_CARD_MM,
} from '../utils/measurement';
import { SuitcaseModel, searchByBrand, lookupByBarcode } from '../utils/suitcaseDatabase';
import { getBarcodeDetector, DetectedBarcode } from '../utils/barcodeDetector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDimensionsReady: (dims: { length: string; width: string; height: string; preset: string; model: string | null }) => void;
}

type ScannerMode = 'barcode' | 'measure';
type Phase = 'setup' | 'capturing' | 'calibrate' | 'measureL' | 'measureW' | 'result' | 'error';

// `focusMode` and `torch` are real, Chromium-supported camera constraints
// that TypeScript's DOM lib does not yet type on `MediaTrackConstraintSet`.
interface ExtendedConstraintSet extends MediaTrackConstraintSet {
  focusMode?: string;
  torch?: boolean;
}

const BARCODE_DETECT_INTERVAL_MS = 200;
const HIT_RADIUS_PX = 28;

export default function SuitcaseScanner({ isOpen, onClose, onDimensionsReady }: Props) {
  const [scannerMode, setScannerMode] = useState<ScannerMode>('barcode');
  const [phase, setPhase] = useState<Phase>('setup');
  const [errorMsg, setErrorMsg] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [measurements, setMeasurements] = useState<MeasurementResult | null>(null);
  const [scannedModel, setScannedModel] = useState<SuitcaseModel | null>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [tapPoints, setTapPoints] = useState<Point[]>([]);
  // Read during render by `liveSegmentCm` below, so it must be real state
  // rather than a ref (react-hooks/refs) -- `measureL`/`measureW` stay in
  // `allPointsRef` since they're only ever read inside `confirmStep`, an
  // event handler.
  const [calibratePoints, setCalibratePoints] = useState<Point[] | null>(null);

  const [detectedBarcodes, setDetectedBarcodes] = useState<DetectedBarcode[]>([]);
  const [barcodeValue, setBarcodeValue] = useState<string | null>(null);
  const [brandQuery, setBrandQuery] = useState('');
  const [brandResults, setBrandResults] = useState<SuitcaseModel[]>([]);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [barcodeSupported, setBarcodeSupported] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<Awaited<ReturnType<typeof getBarcodeDetector>>>(null);
  const lastDetectionRef = useRef(0);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const allPointsRef = useRef<{ measureL: Point[] | null; measureW: Point[] | null }>({
    measureL: null,
    measureW: null,
  });
  const stillImageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ active: boolean; index: number }>({ active: false, index: -1 });
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const isLiveCamera = (scannerMode === 'measure' && phase === 'capturing') || scannerMode === 'barcode';
  const isMeasuring = phase === 'calibrate' || phase === 'measureL' || phase === 'measureW';

  useEffect(() => {
    if (!isOpen || barcodeDetectorRef.current) return;
    let cancelled = false;
    getBarcodeDetector().then((detector) => {
      if (cancelled) return;
      barcodeDetectorRef.current = detector;
      setBarcodeSupported(!!detector);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Move focus into the dialog on open and return it to the trigger on close.
  useEffect(() => {
    if (!isOpen) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => {
      restoreFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = 'environment') => {
      stopCamera();
      setErrorMsg('');
      if (scannerMode === 'measure') setPhase('setup');

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg('Camera requires HTTPS or the installed app. You can still enter dimensions manually.');
        if (scannerMode === 'measure') setPhase('error');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        try {
          await stream.getVideoTracks()[0]?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as ExtendedConstraintSet] });
        } catch {
          // focusMode not supported — camera default applies
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setFacingMode(mode);
        setTorchOn(false);
        if (scannerMode === 'measure') setPhase('capturing');
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setErrorMsg('Camera permission was denied. Allow camera access in your browser settings and try again.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorMsg('No camera found on this device. You can still enter dimensions manually.');
        } else {
          setErrorMsg(`Camera error: ${err instanceof Error ? err.message : 'unknown error'}. You can close this and enter dimensions manually.`);
        }
        if (scannerMode === 'measure') setPhase('error');
      }
    },
    [stopCamera, scannerMode]
  );

  useEffect(() => {
    // Camera start/stop are inherently side-effecting (permission prompt,
    // hardware access) and set several pieces of state along the way —
    // wrapped in an async IIFE rather than called directly, so the setState
    // calls happen after a microtask tick rather than synchronously within
    // the effect body itself (react-hooks/set-state-in-effect).
    if (isOpen) {
      (async () => {
        await startCamera(facingMode);
      })();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scannerMode]);

  const detectBarcodes = useCallback(async () => {
    const detector = barcodeDetectorRef.current;
    const video = videoRef.current;
    if (!detector || !video || video.readyState < 2) return;

    const now = Date.now();
    if (now - lastDetectionRef.current < BARCODE_DETECT_INTERVAL_MS) return;
    lastDetectionRef.current = now;

    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const scanW = Math.min(vw, vh) * 0.8;
      const scanH = scanW * 0.35;
      const sx = (vw - scanW) / 2;
      const sy = (vh - scanH) / 2;
      let crop = cropCanvasRef.current;
      if (!crop) {
        crop = document.createElement('canvas');
        cropCanvasRef.current = crop;
      }
      if (crop.width !== Math.round(scanW) || crop.height !== Math.round(scanH)) {
        crop.width = Math.round(scanW);
        crop.height = Math.round(scanH);
      }
      crop.getContext('2d')?.drawImage(video, sx, sy, scanW, scanH, 0, 0, crop.width, crop.height);
      const raw = await detector.detect(crop);
      const barcodes: DetectedBarcode[] = raw.map((b) => ({
        rawValue: b.rawValue,
        format: b.format,
        boundingBox: {
          x: b.boundingBox.x + sx,
          y: b.boundingBox.y + sy,
          width: b.boundingBox.width,
          height: b.boundingBox.height,
        },
      }));

      if (barcodes.length > 0) {
        setDetectedBarcodes(barcodes);
        const first = barcodes[0];
        setBarcodeValue(first.rawValue);

        const match = lookupByBarcode(first.rawValue);
        if (match) {
          setScannedModel(match);
          setMeasurements({ lengthCm: match.l, widthCm: match.w, heightCm: match.h, scaleMmPerPx: 0 });
          stopCamera();
        }
      }
    } catch {
      // Detection can transiently fail on some frames — ignore
    }
  }, [stopCamera]);

  const drawMeasureOverlay = useCallback((ctx: CanvasRenderingContext2D, cw: number, ch: number, dw: number, dh: number) => {
    const cardW = Math.min(dw, dh) * 0.7;
    const cardH = cardW * (REFERENCE_CARD_MM.height / REFERENCE_CARD_MM.width);
    const cx = cw / 2;
    const cy = ch / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.clearRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH);

    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '500 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Place a credit card here', cx, cy - cardH / 2 - 16);
  }, []);

  const drawBarcodeOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, cw: number, ch: number, dw: number, dh: number, dx: number, dy: number) => {
      const scanW = Math.min(dw, dh) * 0.8;
      const scanH = scanW * 0.35;
      const sx = cw / 2 - scanW / 2;
      const sy = ch / 2 - scanH / 2;

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.clearRect(sx, sy, scanW, scanH);

      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(sx, sy, scanW, scanH);
      ctx.setLineDash([]);

      const video = videoRef.current;
      detectedBarcodes.forEach((barcode) => {
        const { x, y, width, height } = barcode.boundingBox;
        const scaleX = dw / (video?.videoWidth || 1);
        const scaleY = dh / (video?.videoHeight || 1);
        const bx = facingMode === 'user' ? cw - (x + width) * scaleX - dx : x * scaleX + dx;
        const by = y * scaleY + dy;
        const bw = width * scaleX;
        const bh = height * scaleY;

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);
      });

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '500 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Point camera at suitcase barcode', cw / 2, sy + scanH + 28);
    },
    [detectedBarcodes, facingMode]
  );

  const drawTapPoints = useCallback((ctx: CanvasRenderingContext2D, points: Point[]) => {
    if (!points || points.length === 0) return;
    if (points.length >= 2) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
    }
    points.forEach((p, i) => {
      ctx.fillStyle = i === 0 ? '#2563eb' : '#ef4444';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, []);

  // Live camera overlay render loop
  useEffect(() => {
    if (!isLiveCamera || !isOpen) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawFrame = () => {
      if (!video || video.readyState < 2 || !video.videoWidth) {
        animationRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const cw = canvas.parentElement?.clientWidth || canvas.width;
      const ch = canvas.parentElement?.clientHeight || canvas.height;
      const scale = Math.min(cw / vw, ch / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      ctx.clearRect(0, 0, cw, ch);

      if (scannerMode === 'measure') {
        drawMeasureOverlay(ctx, cw, ch, dw, dh);
      } else {
        drawBarcodeOverlay(ctx, cw, ch, dw, dh, dx, dy);
      }

      if (scannerMode === 'barcode') {
        detectBarcodes();
      }

      animationRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isOpen, isLiveCamera, scannerMode, detectBarcodes, drawMeasureOverlay, drawBarcodeOverlay]);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as ExtendedConstraintSet] });
      setTorchOn((prev) => !prev);
    } catch {
      // torch not supported
    }
  }, [torchOn]);

  const switchCamera = useCallback(() => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(next);
  }, [facingMode, startCamera]);

  const switchMode = useCallback((mode: ScannerMode) => {
    setScannerMode(mode);
    setMeasurements(null);
    setScannedModel(null);
    setDetectedBarcodes([]);
    setBarcodeValue(null);
    setBrandQuery('');
    setBrandResults([]);
    setShowBrandPicker(false);
    setCapturedImage(null);
    setTapPoints([]);
    setCalibratePoints(null);
    allPointsRef.current = { measureL: null, measureW: null };
    setPhase('setup');
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const offscreen = document.createElement('canvas');
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(offscreen.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

    setCapturedImage(offscreen.toDataURL('image/jpeg', 0.92));
    setTapPoints([]);
    setPhase('calibrate');
    stopCamera();
  }, [facingMode, stopCamera]);

  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const handleCanvasDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isMeasuring) return;
      const coords = getCanvasCoords(e);
      if (!coords) return;
      setTapPoints((prev) => {
        const hit = prev.findIndex((p) => pixelDistance(p, coords) <= HIT_RADIUS_PX);
        if (hit >= 0) {
          dragRef.current = { active: true, index: hit };
          return prev;
        }
        if (prev.length >= 2) return prev;
        dragRef.current = { active: true, index: prev.length };
        return [...prev, coords];
      });
    },
    [isMeasuring, getCanvasCoords]
  );

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!dragRef.current.active) return;
      e.preventDefault();
      const coords = getCanvasCoords(e);
      if (!coords) return;
      const idx = dragRef.current.index;
      setTapPoints((prev) => prev.map((p, i) => (i === idx ? coords : p)));
    },
    [getCanvasCoords]
  );

  const handleCanvasUp = useCallback(() => {
    dragRef.current = { active: false, index: -1 };
  }, []);

  useEffect(() => {
    if (!capturedImage) {
      stillImageRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      stillImageRef.current = img;
      setTapPoints((p) => [...p]);
    };
    img.src = capturedImage;
  }, [capturedImage]);

  useEffect(() => {
    if (!capturedImage || scannerMode !== 'measure' || phase === 'capturing' || phase === 'setup' || phase === 'error') return;

    const canvas = canvasRef.current;
    const img = stillImageRef.current;
    if (!canvas || !img) return;

    const cw = canvas.parentElement?.clientWidth || canvas.width;
    const ch = canvas.parentElement?.clientHeight || canvas.height;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    const scale = Math.min(cw / img.width, ch / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
    drawTapPoints(ctx, tapPoints);
  }, [capturedImage, phase, tapPoints, scannerMode, drawTapPoints]);

  const confirmStep = useCallback(() => {
    if (tapPoints.length !== 2) return;
    if (phase === 'calibrate') {
      setCalibratePoints(tapPoints);
      setTapPoints([]);
      setPhase('measureL');
    } else if (phase === 'measureL') {
      allPointsRef.current.measureL = tapPoints;
      setTapPoints([]);
      setPhase('measureW');
    } else if (phase === 'measureW') {
      const measureL = allPointsRef.current.measureL;
      if (calibratePoints && measureL) {
        const result = measureFromTaps(calibratePoints[0], calibratePoints[1], measureL[0], measureL[1], tapPoints[0], tapPoints[1], REFERENCE_CARD_MM.width);
        allPointsRef.current.measureW = tapPoints;
        setMeasurements(result);
        setPhase('result');
      }
    }
  }, [phase, tapPoints, calibratePoints]);

  const liveSegmentCm = (() => {
    if (tapPoints.length !== 2) return null;
    if (phase !== 'measureL' && phase !== 'measureW') return null;
    const cal = calibratePoints;
    if (!cal) return null;
    const scale = calibrateScale(pixelDistance(cal[0], cal[1]), REFERENCE_CARD_MM.width);
    return pixelsToCm(pixelDistance(tapPoints[0], tapPoints[1]), scale);
  })();

  const handleBrandSearch = useCallback((query: string) => {
    setBrandQuery(query);
    if (query.trim().length >= 2) {
      setBrandResults(searchByBrand(query));
      setShowBrandPicker(true);
    } else {
      setBrandResults([]);
      setShowBrandPicker(false);
    }
  }, []);

  const handleSelectModel = useCallback(
    (model: SuitcaseModel) => {
      setScannedModel(model);
      setMeasurements({ lengthCm: model.l, widthCm: model.w, heightCm: model.h, scaleMmPerPx: 0 });
      setShowBrandPicker(false);
      setBrandQuery(`${model.brand} — ${model.model}`);
      setBrandResults([]);
      stopCamera();
    },
    [stopCamera]
  );

  const resetScanState = useCallback(() => {
    allPointsRef.current = { measureL: null, measureW: null };
    dragRef.current = { active: false, index: -1 };
    setTapPoints([]);
    setCalibratePoints(null);
    setCapturedImage(null);
    setMeasurements(null);
    setScannedModel(null);
    setDetectedBarcodes([]);
    setBarcodeValue(null);
    setBrandQuery('');
    setBrandResults([]);
    setShowBrandPicker(false);
  }, []);

  const handleRetake = () => {
    resetScanState();
    startCamera(facingMode);
  };

  const handleUseDimensions = () => {
    if (measurements) {
      onDimensionsReady({
        ...formatDimensions(measurements),
        preset: scannedModel?.preset || 'custom',
        model: scannedModel ? `${scannedModel.brand} ${scannedModel.model}` : null,
      });
    }
    onClose();
  };

  const handleClose = () => {
    stopCamera();
    resetScanState();
    onClose();
  };

  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const container = dialogRef.current;
    if (!container) return;
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute('disabled'));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) return null;

  const showBarcodeScanning = scannerMode === 'barcode' && !measurements && !scannedModel;
  const showResult = !!measurements && (phase === 'result' || !!scannedModel);
  const showError = phase === 'error' || (scannerMode === 'barcode' && !!errorMsg);

  const instructionText =
    phase === 'capturing'
      ? 'Hold a credit card flat against the suitcase face you’re measuring, camera square-on, then capture'
      : phase === 'calibrate'
        ? 'Tap each end of the credit card’s long edge'
        : phase === 'measureL'
          ? 'Tap each end of the suitcase — the longer side'
          : phase === 'measureW'
            ? 'Tap each end of the suitcase — the shorter side'
            : '';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Suitcase camera scanner"
      ref={dialogRef}
      onKeyDown={handleDialogKeyDown}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: 'rgba(0,0,0,0.85)',
          color: 'white',
        }}
      >
        <button onClick={handleClose} aria-label="Close scanner" ref={closeButtonRef} style={{ background: 'none', border: 'none', color: 'white', fontSize: 16, padding: '8px 12px', cursor: 'pointer' }}>
          ✕ Close
        </button>

        <div role="tablist" aria-label="Scanner mode" style={{ display: 'flex', gap: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 3 }}>
          <button
            role="tab"
            aria-selected={scannerMode === 'barcode'}
            onClick={() => switchMode('barcode')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: scannerMode === 'barcode' ? '#1d4ed8' : 'transparent',
              color: 'white',
            }}
          >
            📷 Scan
          </button>
          <button
            role="tab"
            aria-selected={scannerMode === 'measure'}
            onClick={() => switchMode('measure')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: scannerMode === 'measure' ? '#1d4ed8' : 'transparent',
              color: 'white',
            }}
          >
            📏 Measure
          </button>
        </div>

        <div style={{ width: 60 }} />
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#111' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            display: isLiveCamera && !errorMsg ? 'block' : 'none',
          }}
        />

        <canvas
          ref={canvasRef}
          role={isMeasuring ? 'application' : undefined}
          aria-label={isMeasuring ? instructionText : undefined}
          onMouseDown={isMeasuring ? handleCanvasDown : undefined}
          onMouseMove={isMeasuring ? handleCanvasMove : undefined}
          onMouseUp={isMeasuring ? handleCanvasUp : undefined}
          onMouseLeave={isMeasuring ? handleCanvasUp : undefined}
          onTouchStart={isMeasuring ? handleCanvasDown : undefined}
          onTouchMove={isMeasuring ? handleCanvasMove : undefined}
          onTouchEnd={isMeasuring ? handleCanvasUp : undefined}
          onTouchCancel={isMeasuring ? handleCanvasUp : undefined}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: isMeasuring ? 'crosshair' : 'default',
            touchAction: isMeasuring ? 'none' : 'auto',
          }}
        />

        <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          {(phase === 'capturing' || isMeasuring) && scannerMode === 'measure' ? instructionText : ''}
        </div>

        {(phase === 'capturing' || isMeasuring) && scannerMode === 'measure' && (
          <div
            style={{
              position: 'absolute',
              bottom: 100,
              left: 16,
              right: 16,
              backgroundColor: 'rgba(0,0,0,0.75)',
              borderRadius: 12,
              padding: '12px 16px',
              color: 'white',
              textAlign: 'center',
              fontSize: 15,
              fontWeight: 500,
              pointerEvents: 'none',
            }}
          >
            {instructionText}
            {isMeasuring && (
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
                {liveSegmentCm != null ? `≈ ${liveSegmentCm} cm` : `${tapPoints.length}/2`}
                {tapPoints.length > 0 && ' — drag a dot to fine-tune'}
              </div>
            )}
          </div>
        )}

        {showBarcodeScanning && barcodeValue && (
          <div
            style={{
              position: 'absolute',
              bottom: 100,
              left: 16,
              right: 16,
              backgroundColor: 'rgba(34,197,94,0.15)',
              borderRadius: 12,
              padding: '10px 16px',
              color: '#22c55e',
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 600,
              border: '1px solid rgba(34,197,94,0.3)',
            }}
          >
            Barcode detected: {barcodeValue}
            <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.7, marginTop: 4 }}>
              Not in our model database — search your brand below to pick the model
            </div>
          </div>
        )}

        {isMeasuring && tapPoints.length > 0 && (
          <button
            onClick={() => setTapPoints((prev) => prev.slice(0, -1))}
            aria-label="Undo last tap"
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            ↩ Undo
          </button>
        )}
      </div>

      <div
        style={{
          padding: 16,
          backgroundColor: 'rgba(0,0,0,0.9)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          alignItems: 'center',
        }}
      >
        {showError && (
          <div style={{ color: '#ef4444', textAlign: 'center', padding: 8 }}>
            <p style={{ margin: '0 0 12px', fontSize: 14 }}>{errorMsg}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => startCamera(facingMode)}
                style={{ padding: '10px 24px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}
              >
                Try Again
              </button>
              <button onClick={handleClose} style={{ padding: '10px 24px', backgroundColor: '#1d4ed8', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                OK
              </button>
            </div>
          </div>
        )}

        {scannerMode === 'measure' && phase === 'capturing' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
            <CameraSideBtn onClick={switchCamera} label="Switch camera" icon="🔄" />
            <button
              onClick={capturePhoto}
              aria-label="Capture photo"
              style={{ width: 72, height: 72, borderRadius: '50%', backgroundColor: 'white', border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer', boxShadow: '0 0 0 4px rgba(59,130,246,0.3)' }}
            />
            <CameraSideBtn onClick={toggleTorch} label="Toggle flashlight" icon={torchOn ? '🔦' : '💡'} active={torchOn} />
          </div>
        )}

        {showBarcodeScanning && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!errorMsg && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
                <CameraSideBtn onClick={switchCamera} label="Switch camera" icon="🔄" />
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    border: `3px solid ${barcodeValue ? '#22c55e' : 'rgba(255,255,255,0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: barcodeValue ? '#22c55e' : 'rgba(255,255,255,0.2)' }} />
                </div>
                <CameraSideBtn onClick={toggleTorch} label="Toggle flashlight" icon={torchOn ? '🔦' : '💡'} active={torchOn} />
              </div>
            )}

            <div style={{ position: 'relative', width: '100%', maxWidth: 360, margin: '0 auto' }}>
              <label htmlFor="scanner-brand-search" className="label" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Search brand instead
              </label>
              <input
                id="scanner-brand-search"
                type="text"
                value={brandQuery}
                onChange={(e) => handleBrandSearch(e.target.value)}
                placeholder={barcodeValue && !scannedModel ? `Barcode ${barcodeValue.slice(0, 12)}...` : 'Search brand...'}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 14 }}
                onFocus={() => brandQuery.trim().length >= 2 && setShowBrandPicker(true)}
              />

              {showBrandPicker && brandResults.length === 0 && brandQuery.trim().length >= 2 && (
                <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4, backgroundColor: 'rgba(15,23,42,0.97)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', padding: '12px 14px', color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center' }}>
                  No matches for &quot;{brandQuery}&quot; — this bag isn&apos;t in our database yet.
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>Use the 📏 Measure tab, or close and enter dimensions manually.</div>
                </div>
              )}

              {showBrandPicker && brandResults.length > 0 && (
                <ul style={{ listStyle: 'none', margin: 0, position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4, backgroundColor: 'rgba(15,23,42,0.97)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', maxHeight: 200, overflowY: 'auto', padding: 0 }}>
                  {brandResults.map((m, i) => (
                    <li key={`${m.brand}-${m.model}-${i}`}>
                      <button
                        type="button"
                        onClick={() => handleSelectModel(m)}
                        style={{ width: '100%', textAlign: 'left', padding: '10px 14px', cursor: 'pointer', color: 'white', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 8 }}
                      >
                        <span style={{ fontWeight: 500 }}>
                          {m.brand} — {m.model}
                        </span>
                        <span style={{ opacity: 0.6, fontSize: 12 }}>
                          {m.l}×{m.w}×{m.h} cm
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {barcodeSupported === null && !errorMsg && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Preparing barcode scanner…</div>}
            {barcodeSupported === false && !barcodeValue && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Barcode scanning unavailable on this device — use brand search above</div>
            )}
          </div>
        )}

        {isMeasuring && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleRetake} style={{ padding: '10px 24px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
              Retake
            </button>
            <button
              onClick={confirmStep}
              disabled={tapPoints.length !== 2}
              style={{
                padding: '10px 32px',
                backgroundColor: tapPoints.length === 2 ? '#1d4ed8' : 'rgba(59,130,246,0.25)',
                color: tapPoints.length === 2 ? 'white' : 'rgba(255,255,255,0.4)',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: tapPoints.length === 2 ? 'pointer' : 'default',
              }}
            >
              {phase === 'measureW' ? '✓ Done' : 'Confirm →'}
            </button>
          </div>
        )}

        {showResult && measurements && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
            {scannedModel && (
              <div style={{ backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 8, padding: '6px 16px', color: '#22c55e', fontSize: 13, fontWeight: 500, border: '1px solid rgba(34,197,94,0.2)' }}>
                {scannedModel.brand} — {scannedModel.model}
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', color: 'white', fontSize: 14 }}>
              <DimDisplay label="Length" value={measurements.lengthCm} color="#3b82f6" />
              <DimDisplay label="Width" value={measurements.widthCm} color="#3b82f6" />
              <DimDisplay label={scannedModel ? 'Height' : 'Height (est.)'} value={scannedModel ? measurements.heightCm : `~${measurements.heightCm}`} color={scannedModel ? '#22c55e' : '#8b5cf6'} />
            </div>
            {!scannedModel && (
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, textAlign: 'center', maxWidth: 320 }}>
                Depth can&apos;t be measured from a straight-on photo — it&apos;s estimated from typical suitcase proportions. Adjust it in the form if you know it.
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleRetake} style={{ padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
                Retake
              </button>
              <button onClick={handleUseDimensions} style={{ padding: '10px 32px', backgroundColor: '#1d4ed8', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                ✓ Use
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function CameraSideBtn({ onClick, label, icon, active }: { onClick: () => void; label: string; icon: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        backgroundColor: active ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.15)',
        border: 'none',
        color: 'white',
        fontSize: 20,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </button>
  );
}

function DimDisplay({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ opacity: 0.6, fontSize: 12 }}>{label}</div>
    </div>
  );
}
