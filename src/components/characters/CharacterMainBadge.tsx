import { Star } from "lucide-react";

type CharacterMainBadgeProps = {
  isMain?: boolean;
};

export const CharacterMainBadge = ({ isMain = false }: CharacterMainBadgeProps) => {
  if (!isMain) {
    return null;
  }

  return (
    <span
      className="inline-flex shrink-0 items-center text-primary"
      title="대표 캐릭터"
      aria-label="대표 캐릭터"
    >
      <Star aria-hidden size={13} fill="currentColor" />
    </span>
  );
};
