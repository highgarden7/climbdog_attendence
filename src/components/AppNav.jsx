import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../config/constants";

export default function AppNav({ isAdmin, upcomingCount }) {
  return (
    <nav className="app-nav">
      {NAV_ITEMS.filter((item) => isAdmin || item.to !== "/members").map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `app-nav__link ${isActive ? "is-active" : ""}`}
        >
          <span>{item.label}</span>
          {item.to === "/events" && upcomingCount > 0 ? <span className="app-nav__badge">{upcomingCount}</span> : null}
        </NavLink>
      ))}
    </nav>
  );
}
