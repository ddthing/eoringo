import { Check } from "lucide-react";
import { DEFAULT_KOREAN_SERVER } from "../../data/servers";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { CharacterAvatar } from "./CharacterAvatar";
import { CharacterMainBadge } from "./CharacterMainBadge";

type CharacterSwitcherProps = {
  compact?: boolean;
  embedded?: boolean;
  layout?: "horizontal" | "stacked";
  showCurrentSummary?: boolean;
  onCharacterSelect?: () => void;
};

export const CharacterSwitcher = ({
  compact = false,
  embedded = false,
  layout = "horizontal",
  showCurrentSummary = true,
  onCharacterSelect,
}: CharacterSwitcherProps) => {
  const characters = useCharacterStore((state) => state.characters);
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const setActiveCharacter = useCharacterStore((state) => state.setActiveCharacter);
  const activeCharacter =
    characters.find((character) => character.id === activeCharacterId) ?? characters[0];

  return (
    <div
      className={
        embedded
          ? "space-y-2"
          : compact
            ? "memo-card space-y-2 p-2.5"
            : "memo-card space-y-2 p-3"
      }
    >
      {showCurrentSummary ? (
        <div className="flex min-w-0 items-center gap-2.5">
          <CharacterAvatar
            imageId={activeCharacter?.profileImageId}
            name={activeCharacter?.name ?? "나의 모험가"}
            size="sm"
          />
          <div className="min-w-0">
            <p className="muted-label">현재</p>
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-bold">
                {activeCharacter?.name ?? "나의 모험가"}
              </h3>
              <CharacterMainBadge isMain={activeCharacter?.isMain} />
            </div>
            <p className="text-xs text-ink-muted">
              {activeCharacter?.server ?? DEFAULT_KOREAN_SERVER}
            </p>
          </div>
        </div>
      ) : null}
      <div className={layout === "stacked" ? "grid gap-2" : "flex gap-1.5 overflow-x-auto pb-1"}>
        {characters.map((character) => {
          const isActive = character.id === activeCharacterId;

          return (
            <button
              key={character.id}
              type="button"
              onClick={() => {
                setActiveCharacter(character.id);
                onCharacterSelect?.();
              }}
              className={[
                "border font-bold transition active:scale-[0.99]",
                layout === "stacked"
                  ? "flex min-h-14 w-full items-center gap-2 rounded-[16px] px-3 py-2 text-left text-sm"
                  : "flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs",
                isActive
                  ? "border-primary/35 bg-primary-soft text-primary"
                  : "border-[rgb(var(--color-line-muted))] bg-card/70 text-ink-muted",
              ].join(" ")}
              aria-pressed={isActive}
            >
              <CharacterAvatar imageId={character.profileImageId} name={character.name} size="sm" />
              <span className="min-w-0 flex-1 truncate">{character.name}</span>
              <CharacterMainBadge isMain={character.isMain} />
              {layout === "stacked" && isActive ? (
                <Check aria-hidden size={16} strokeWidth={3} />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
