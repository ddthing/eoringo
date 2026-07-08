import { CalendarDays, CheckSquare, Home, Settings, UsersRound } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "오늘", icon: Home },
  { to: "/tasks", label: "숙제", icon: CheckSquare },
  { to: "/calendar", label: "일정", icon: CalendarDays },
  { to: "/characters", label: "캐릭터", icon: UsersRound },
  { to: "/settings", label: "설정", icon: Settings },
];

export const BottomNav = () => (
  <nav className="fixed inset-x-0 bottom-0 z-30">
    <div className="mx-auto max-w-3xl px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-5 rounded-[18px] border border-[rgb(var(--color-line-soft))] bg-card/92 p-1.5 shadow-soft backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[13px] text-[11px] font-bold transition",
                  isActive ? "bg-primary text-white shadow-soft" : "text-ink-muted",
                ].join(" ")
              }
            >
              <Icon aria-hidden size={17} strokeWidth={2.1} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  </nav>
);
