const DEFAULT_MAX_IMAGE_SIZE = 768;
const DEFAULT_IMAGE_QUALITY = 0.86;

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

export const resizeImage = async (
  file: File,
  maxSize = DEFAULT_MAX_IMAGE_SIZE,
  quality = DEFAULT_IMAGE_QUALITY,
): Promise<Blob> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  const image = await loadImage(file);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);

  if (longestSide <= maxSize && file.size <= 1_500_000) {
    return file;
  }

  const scale = Math.min(1, maxSize / longestSide);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const webpBlob = await canvasToBlob(canvas, "image/webp", quality);

  if (webpBlob) {
    return webpBlob;
  }

  const jpegBlob = await canvasToBlob(canvas, "image/jpeg", quality);

  return jpegBlob ?? file;
};
