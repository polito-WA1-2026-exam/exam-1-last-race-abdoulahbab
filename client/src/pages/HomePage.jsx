import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

export default function HomePage() {
  const { isAuthenticated, status, user } = useAuth();

  return (
    <section className="page hero-page">
      <div className="card hero-card">
        <p className="eyebrow">Plan. Ride. Survive.</p>
        <h2>Cross the metro network before the last ride runs out.</h2>
        <p>
          Last Race is a desktop React and Node.js game where the server controls
          authentication, stations, route validation, random events, scores, and
          rankings.
        </p>
        <div className="actions">
          {status === "loading" && <span className="muted">Checking session...</span>}
          {!isAuthenticated && status !== "loading" && (
            <Link className="button primary" to="/login">
              Login
            </Link>
          )}
          {isAuthenticated && (
            <>
              <Link className="button primary" to="/game">
                Start playing
              </Link>
              <Link className="button secondary" to="/ranking">
                View ranking
              </Link>
            </>
          )}
        </div>
        {isAuthenticated && <p className="muted">Authenticated as {user.name}.</p>}
      </div>
    </section>
  );
}
