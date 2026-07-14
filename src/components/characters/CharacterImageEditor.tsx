import { ImageIcon, Minus, Move, Plus, RotateCcw, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

const PREVIEW_SIZE = 260;
const OUTPUT_SIZE = 768;
const MIN_ZOOM = 1;
const MAX_ZOOM = 2.6;
const ZOOM_STEP = 0.01;

type Offset = {
  x: number;
  y: number;
};

type NaturalSize = {
  width: number;
  height: number;
};

type CharacterImageEditorProps = {
  file: File;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (blob: Blob) => Promise<void>;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getDisplaySize = (naturalSize: NaturalSize, zoom: number) => {
  const baseScale = PREVIEW_SIZE / Math.min(naturalSize.width, naturalSize.height);

  return {
    width: naturalSize.width * baseScale * zoom,
    height: naturalSize.height * baseScale * zoom,
    baseScale,
  };
};

const clampOffset = (offset: Offset, naturalSize: NaturalSize | null, zoom: number): Offset => {
  if (!naturalSize) {
    return { x: 0, y: 0 };
  }

  const displaySize = getDisplaySize(naturalSize, zoom);
  const maxX = Math.max(0, (displaySize.width - PREVIEW_SIZE) / 2);
  const maxY = Math.max(0, (displaySize.height - PREVIEW_SIZE) / 2);

  return {
    x: clamp(offset.x, -maxX, maxX),
    y: clamp(offset.y, -maxY, maxY),
  };
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export const CharacterImageEditor = ({
  file,
  isSaving,
  onCancel,
  onSave,
}: CharacterImageEditorProps) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; offset: Offset } | null>(
    null,
  );
  const [imageUrl, setImageUrl] = useState("");
  const [naturalSize, setNaturalSize] = useState<NaturalSize | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const nextImageUrl = URL.createObjectURL(file);
    setImageUrl(nextImageUrl);
    setNaturalSize(null);
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    setErrorMessage("");

    return () => URL.revokeObjectURL(nextImageUrl);
  }, [file]);

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      previouslyFocusedElement?.focus();
    };
  }, []);

  const displaySize = useMemo(() => {
    if (!naturalSize) {
      return null;
    }

    return getDisplaySize(naturalSize, zoom);
  }, [naturalSize, zoom]);

  const handleImageLoad = () => {
    const image = imageRef.current;

    if (!image) {
      return;
    }

    setNaturalSize({
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
  };

  const updateZoom = (nextZoom: number) => {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    setZoom(clampedZoom);
    setOffset((currentOffset) => clampOffset(currentOffset, naturalSize, clampedZoom));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!naturalSize || isSaving) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offset,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || !naturalSize) {
      return;
    }

    const nextOffset = {
      x: dragStartRef.current.offset.x + event.clientX - dragStartRef.current.pointerX,
      y: dragStartRef.current.offset.y + event.clientY - dragStartRef.current.pointerY,
    };

    setOffset(clampOffset(nextOffset, naturalSize, zoom));
  };

  const stopDragging = () => {
    dragStartRef.current = null;
    setIsDragging(false);
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !isSaving) {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );

    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const createCroppedImage = useCallback(async () => {
    const image = imageRef.current;

    if (!image || !naturalSize) {
      throw new Error("이미지를 불러오는 중입니다.");
    }

    const { baseScale } = getDisplaySize(naturalSize, zoom);
    const visibleScale = baseScale * zoom;
    const sourceSize = PREVIEW_SIZE / visibleScale;
    const maxSourceX = Math.max(0, naturalSize.width - sourceSize);
    const maxSourceY = Math.max(0, naturalSize.height - sourceSize);
    const sourceX = clamp(
      naturalSize.width / 2 - offset.x / visibleScale - sourceSize / 2,
      0,
      maxSourceX,
    );
    const sourceY = clamp(
      naturalSize.height / 2 - offset.y / visibleScale - sourceSize / 2,
      0,
      maxSourceY,
    );

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("이미지를 편집할 수 없습니다.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );

    const webpBlob = await canvasToBlob(canvas, "image/webp", 0.88);

    if (webpBlob) {
      return webpBlob;
    }

    const jpegBlob = await canvasToBlob(canvas, "image/jpeg", 0.9);

    if (!jpegBlob) {
      throw new Error("이미지를 저장할 수 없습니다.");
    }

    return jpegBlob;
  }, [naturalSize, offset.x, offset.y, zoom]);

  const handleSave = async () => {
    setErrorMessage("");

    try {
      const croppedImage = await createCroppedImage();
      await onSave(croppedImage);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "이미지를 저장할 수 없습니다.",
      );
    }
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 grid place-items-end overflow-y-auto overscroll-contain bg-[rgb(var(--color-overlay)/0.58)] p-3 backdrop-blur-[2px] sm:place-items-center"
      role="dialog"
      aria-modal="true"
      aria-label="캐릭터 사진 편집"
      tabIndex={-1}
      onKeyDown={handleDialogKeyDown}
    >
      <div className="w-full max-w-[360px] rounded-[22px] border border-[rgb(var(--color-line-soft))] bg-card/95 p-3 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-primary">
              profile
            </p>
            <h2 className="text-sm font-black text-ink">사진 위치 조정</h2>
          </div>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[rgb(var(--color-line-muted))] bg-card text-ink-muted transition active:scale-95"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="닫기"
          >
            <X aria-hidden size={15} />
          </button>
        </div>

        <div
          className={[
            "relative mx-auto overflow-hidden rounded-[24px] border border-[rgb(var(--color-line-soft))] bg-card-soft touch-none",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          ].join(" ")}
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
          {imageUrl ? (
            <img
              ref={imageRef}
              src={imageUrl}
              alt=""
              className="absolute left-1/2 top-1/2 max-w-none select-none"
              draggable={false}
              onLoad={handleImageLoad}
              style={{
                width: displaySize?.width ?? PREVIEW_SIZE,
                height: displaySize?.height ?? PREVIEW_SIZE,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-primary">
              <ImageIcon aria-hidden size={24} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-white/70" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-white/45" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-white/45" />
        </div>

        <div className="mt-3 rounded-[16px] border border-[rgb(var(--color-line-muted))] bg-card-soft/80 px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Move aria-hidden size={13} />
              드래그해서 위치 조정
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-primary transition active:scale-95"
              onClick={() => {
                setZoom(MIN_ZOOM);
                setOffset({ x: 0, y: 0 });
              }}
              disabled={isSaving}
            >
              <RotateCcw aria-hidden size={12} />
              초기화
            </button>
          </div>
          <div className="flex items-center gap-2 text-ink-muted">
            <Minus aria-hidden size={14} />
            <input
              type="range"
              className="range-field"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              value={zoom}
              onChange={(event) => updateZoom(Number(event.target.value))}
              aria-label="사진 확대"
              disabled={isSaving}
            />
            <Plus aria-hidden size={14} />
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-2 text-[11px] font-bold text-[rgb(var(--color-danger))]" aria-live="polite">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={isSaving}
          >
            취소
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleSave}
            disabled={isSaving || !naturalSize}
          >
            {isSaving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
};
