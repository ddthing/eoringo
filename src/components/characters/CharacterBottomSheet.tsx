import {
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { Settings, UserPlus, X } from "lucide-react";
import { charactersSettingsTarget } from "../../app/navigation";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { CharacterForm, type CharacterFormValues } from "./CharacterForm";
import { CharacterSwitcher } from "./CharacterSwitcher";

type CharacterBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

const getFocusableElements = (root: HTMLElement) =>
  Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  );

export const CharacterBottomSheet = ({ isOpen, onClose }: CharacterBottomSheetProps) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const charactersCount = useCharacterStore((state) => state.characters.length);
  const addCharacter = useCharacterStore((state) => state.addCharacter);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsAdding(false);
      return undefined;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimerId = window.setTimeout(() => {
      getFocusableElements(dialogRef.current ?? document.body)[0]?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimerId);
      document.body.style.overflow = originalOverflow;
      previouslyFocusedElement?.focus();
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleAddCharacter = (values: CharacterFormValues) => {
    addCharacter({
      ...values,
      isMain: charactersCount === 0,
    });
    setIsAdding(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getFocusableElements(event.currentTarget);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) {
      return;
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div
      ref={dialogRef}
      className="character-sheet-backdrop fixed inset-0 z-[60] flex items-end overscroll-contain bg-[rgb(var(--color-overlay)/0.58)] backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-sheet-title"
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="character-sheet-panel mx-auto max-h-[min(82vh,680px)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-t-[28px] border border-b-0 border-[rgb(var(--color-line-soft))] bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_48px_rgb(30_35_40/0.16)] min-[420px]:px-[18px]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[rgb(var(--color-line-soft))]" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="muted-label">quick switch</p>
            <h2 id="character-sheet-title" className="text-lg font-black text-ink">
              캐릭터 전환
            </h2>
          </div>
          <button
            type="button"
            className="home-icon-button text-ink-muted"
            onClick={onClose}
            aria-label="닫기"
          >
            <X aria-hidden size={17} />
          </button>
        </div>

        <div className="mt-3">
          <CharacterSwitcher
            embedded
            layout="stacked"
            showCurrentSummary={false}
            onCharacterSelect={onClose}
          />
        </div>

        {isAdding ? (
          <div className="mt-3">
            <CharacterForm
              showMainOption={false}
              submitLabel="캐릭터 추가"
              onSubmit={handleAddCharacter}
              onCancel={() => setIsAdding(false)}
            />
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            className="secondary-button home-touch-target gap-1.5"
            onClick={() => setIsAdding((value) => !value)}
          >
            <UserPlus aria-hidden size={15} />
            {isAdding ? "추가 닫기" : "캐릭터 추가"}
          </button>
          <Link
            to={charactersSettingsTarget}
            replace={false}
            className="secondary-button home-touch-target gap-1.5"
            onClick={onClose}
          >
            <Settings aria-hidden size={15} />
            캐릭터 관리
          </Link>
        </div>
      </div>
    </div>
  );
};
