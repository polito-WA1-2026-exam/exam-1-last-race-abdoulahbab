import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

export default function HomePage() {
  const { isAuthenticated, status } = useAuth();

  return (
    <section className="page hero-page">
      <div className="hero-panel">
        <p className="eyebrow">Plan. Ride. Survive.</p>
        <h2>Cross the metro network before the last ride runs out.</h2>
        <p>
          Start with 20 coins, plan a route from the assigned start station to the
          assigned destination, then submit before the 90-second deadline. A valid
          route runs segment by segment and each segment receives an event that
          changes the coin total.
        </p>
        <ul className="rule-list">
          <li>Each segment can be used once.</li>
          <li>Line changes are allowed only at interchange stations.</li>
          <li>Invalid, incomplete, or late routes score zero.</li>
          <li>Rankings use each player's best successful score.</li>
        </ul>
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
      </div>
    </section>
  );
}
