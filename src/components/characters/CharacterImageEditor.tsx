import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ImageIcon,
  Minus,
  Move,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
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
const PAN_STEP = 16;

export const IMAGE_LOAD_ERROR_MESSAGE =
  "이미지를 불러오지 못했습니다. 다른 사진을 선택해 주세요.";

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
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let nextImageUrl = "";

    try {
      nextImageUrl = URL.createObjectURL(file);
    } catch {
      setImageUrl("");
      setNaturalSize(null);
      setIsImageLoading(false);
      setImageLoadFailed(true);
      setErrorMessage(IMAGE_LOAD_ERROR_MESSAGE);
      return undefined;
    }

    setImageUrl(nextImageUrl);
    setNaturalSize(null);
    setIsImageLoading(true);
    setImageLoadFailed(false);
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

    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      setNaturalSize(null);
      setIsImageLoading(false);
      setImageLoadFailed(true);
      setErrorMessage(IMAGE_LOAD_ERROR_MESSAGE);
      return;
    }

    setNaturalSize({
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
    setIsImageLoading(false);
  };

  const handleImageError = () => {
    setNaturalSize(null);
    setIsImageLoading(false);
    setImageLoadFailed(true);
    setErrorMessage(IMAGE_LOAD_ERROR_MESSAGE);
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

  const moveImage = (x: number, y: number) => {
    if (!naturalSize || isSaving) {
      return;
    }

    setOffset((currentOffset) =>
      clampOffset(
        { x: currentOffset.x + x, y: currentOffset.y + y },
        naturalSize,
        zoom,
      ),
    );
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

  const editorContent = (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto overscroll-contain bg-[rgb(var(--color-overlay)/0.58)] p-3 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-busy={isImageLoading}
      aria-label="캐릭터 사진 편집"
      tabIndex={-1}
      onKeyDown={handleDialogKeyDown}
    >
      <div className="w-full max-w-[360px] rounded-ui-xl border border-[rgb(var(--color-line-soft))] bg-card/95 p-3 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              profile
            </p>
            <h2 className="text-sm font-bold text-ink">사진 위치 조정</h2>
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
            "relative mx-auto overflow-hidden rounded-ui-xl border border-[rgb(var(--color-line-soft))] bg-card-soft touch-none",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          ].join(" ")}
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
          {imageUrl && !imageLoadFailed ? (
            <img
              ref={imageRef}
              src={imageUrl}
              alt=""
              className="absolute left-1/2 top-1/2 max-w-none select-none"
              draggable={false}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                width: displaySize?.width ?? PREVIEW_SIZE,
                height: displaySize?.height ?? PREVIEW_SIZE,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center gap-1.5 px-4 text-center text-primary">
              <ImageIcon aria-hidden size={24} />
              {imageLoadFailed ? (
                <span className="text-[11px] font-bold text-ink-muted">
                  {IMAGE_LOAD_ERROR_MESSAGE}
                </span>
              ) : null}
            </div>
          )}
          {isImageLoading ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-card-soft/55 text-primary">
              <ImageIcon aria-hidden size={24} className="animate-pulse" />
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-0 rounded-ui-xl ring-1 ring-inset ring-white/70" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-white/45" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-white/45" />
        </div>

        <div className="mt-3 rounded-ui-md border border-[rgb(var(--color-line-muted))] bg-card-soft/80 px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Move aria-hidden size={13} />
              드래그하거나 버튼으로 위치 조정
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-primary transition active:scale-95"
              onClick={() => {
                setZoom(MIN_ZOOM);
                setOffset({ x: 0, y: 0 });
              }}
              disabled={isSaving || isImageLoading || imageLoadFailed}
            >
              <RotateCcw aria-hidden size={12} />
              초기화
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 justify-items-center gap-1" role="group" aria-label="사진 위치 조정">
            <span aria-hidden />
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-ui-sm border border-[rgb(var(--color-line-muted))] bg-card text-ink-muted"
              onClick={() => moveImage(0, -PAN_STEP)}
              disabled={isSaving || isImageLoading || imageLoadFailed}
              aria-label="사진 위로 이동"
            >
              <ChevronUp aria-hidden size={16} />
            </button>
            <span aria-hidden />
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-ui-sm border border-[rgb(var(--color-line-muted))] bg-card text-ink-muted"
              onClick={() => moveImage(-PAN_STEP, 0)}
              disabled={isSaving || isImageLoading || imageLoadFailed}
              aria-label="사진 왼쪽으로 이동"
            >
              <ChevronLeft aria-hidden size={16} />
            </button>
            <span className="sr-only">방향 버튼으로 사진 위치를 조정할 수 있습니다.</span>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-ui-sm border border-[rgb(var(--color-line-muted))] bg-card text-ink-muted"
              onClick={() => moveImage(PAN_STEP, 0)}
              disabled={isSaving || isImageLoading || imageLoadFailed}
              aria-label="사진 오른쪽으로 이동"
            >
              <ChevronRight aria-hidden size={16} />
            </button>
            <span aria-hidden />
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-ui-sm border border-[rgb(var(--color-line-muted))] bg-card text-ink-muted"
              onClick={() => moveImage(0, PAN_STEP)}
              disabled={isSaving || isImageLoading || imageLoadFailed}
              aria-label="사진 아래로 이동"
            >
              <ChevronDown aria-hidden size={16} />
            </button>
            <span aria-hidden />
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
              disabled={isSaving || isImageLoading || imageLoadFailed}
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
            disabled={isSaving || isImageLoading || imageLoadFailed || !naturalSize}
          >
            {isSaving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );

  const portalTarget = typeof document === "undefined" ? null : document.body;

  return portalTarget ? createPortal(editorContent, portalTarget) : editorContent;
};
