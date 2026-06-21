import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

export default function AppLayout() {
  const { isAuthenticated, logoutUser, status, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logoutUser();
    navigate("/");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WA1 Exam Project</p>
          <h1>Last Race</h1>
        </div>
        <nav className="nav">
          <NavLink to="/">Home</NavLink>
          {isAuthenticated && <NavLink to="/game">Game</NavLink>}
          {isAuthenticated && <NavLink to="/ranking">Ranking</NavLink>}
          {!isAuthenticated && status !== "loading" && <NavLink to="/login">Login</NavLink>}
          {isAuthenticated && (
            <button type="button" className="link-button" onClick={handleLogout}>
              Logout {user.username}
            </button>
          )}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
