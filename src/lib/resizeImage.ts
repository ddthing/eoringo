export const maxCharacterImageDimension = 768;
export const maxCharacterImageBytes = 512 * 1024;
const maxInputImageBytes = 20 * 1024 * 1024;
const minimumQuality = 0.5;
const initialQuality = 0.86;
const allowedInputTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지를 불러올 수 없습니다."));
    };
    image.src = objectUrl;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export const calculateContainDimensions = (
  width: number,
  height: number,
  maxDimension: number,
) => {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(maxDimension) ||
    width <= 0 ||
    height <= 0 ||
    maxDimension <= 0
  ) {
    throw new Error("이미지 크기가 올바르지 않습니다.");
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

export const getCompressionAttempts = () =>
  Array.from({ length: 8 }, (_, index) => ({
    maxDimension: Math.max(320, Math.round(maxCharacterImageDimension * 0.86 ** index)),
    quality: Math.max(minimumQuality, initialQuality - index * 0.06),
  }));

export const resizeImage = async (file: File): Promise<Blob> => {
  if (!allowedInputTypes.has(file.type) || file.size <= 0 || file.size > maxInputImageBytes) {
    throw new Error("지원하는 20MB 이하의 이미지 파일만 사용할 수 있습니다.");
  }

  const image = await loadImage(file);

  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    throw new Error("이미지 크기를 확인할 수 없습니다.");
  }

  if (
    Math.max(image.naturalWidth, image.naturalHeight) <= maxCharacterImageDimension &&
    file.size <= maxCharacterImageBytes &&
    file.type !== "image/gif"
  ) {
    return file;
  }

  let smallest: Blob | null = null;

  for (const attempt of getCompressionAttempts()) {
    const dimensions = calculateContainDimensions(
      image.naturalWidth,
      image.naturalHeight,
      attempt.maxDimension,
    );
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("이미지를 안전하게 변환할 수 없습니다.");
    }

    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    const candidate =
      (await canvasToBlob(canvas, "image/webp", attempt.quality)) ??
      (await canvasToBlob(canvas, "image/jpeg", attempt.quality));

    if (!candidate || candidate.size <= 0) {
      continue;
    }

    if (!smallest || candidate.size < smallest.size) {
      smallest = candidate;
    }

    if (candidate.size <= maxCharacterImageBytes) {
      return candidate;
    }
  }

  if (smallest && smallest.size <= maxCharacterImageBytes) {
    return smallest;
  }

  throw new Error("이미지를 512KB 이하로 줄일 수 없습니다. 다른 이미지를 선택해 주세요.");
};
