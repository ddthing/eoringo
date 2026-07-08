import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { getCharacterImage } from "../../lib/imageStorage";

type CharacterAvatarProps = {
  imageId?: string;
  name: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-9 w-9 rounded-[14px]",
  md: "h-12 w-12 rounded-[16px]",
  lg: "h-[72px] w-[72px] rounded-[20px]",
};

export const CharacterAvatar = ({ imageId, name, size = "md" }: CharacterAvatarProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let mounted = true;

    if (!imageId) {
      setImageUrl(null);
      return undefined;
    }

    getCharacterImage(imageId).then((blob) => {
      if (!mounted || !blob) {
        return;
      }

      objectUrl = URL.createObjectURL(blob);
      setImageUrl(objectUrl);
    });

    return () => {
      mounted = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageId]);

  return (
    <div
      className={[
        "grid shrink-0 place-items-center overflow-hidden border border-[rgb(var(--color-line-soft))] bg-peach text-center",
        sizeClasses[size],
      ].join(" ")}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={`${name} 프로필`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-bold text-ink-muted">
          <ImagePlus aria-hidden size={size === "lg" ? 18 : 14} />
          <span className={size === "sm" ? "sr-only" : ""}>나의 모험가</span>
        </div>
      )}
    </div>
  );
};
