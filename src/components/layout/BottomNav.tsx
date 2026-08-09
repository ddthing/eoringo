import { CalendarDays, CheckSquare, Home, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { bottomNavItems } from "../../app/navigation";

const navIcons = {
  "/": Home,
  "/tasks": CheckSquare,
  "/calendar": CalendarDays,
  "/settings": Settings,
} as const;

export const BottomNav = () => (
  <nav className="fixed inset-x-0 bottom-0 z-30" aria-label="주요 메뉴">
    <div className="mx-auto max-w-3xl px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))]">
      <div className="ui-navigation-shell">
        {bottomNavItems.map((item) => {
          const Icon = navIcons[item.to];

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `ui-nav-item ${isActive ? "is-active" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="ui-nav-icon">
                    <Icon aria-hidden size={17} strokeWidth={isActive ? 2.4 : 2.1} />
                  </span>
                  <span className="ui-nav-label">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  </nav>
);
