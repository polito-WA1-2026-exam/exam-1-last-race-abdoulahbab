import { useEffect, useState } from "react";

import { getRankings } from "../api/gameApi";
import ErrorMessage from "../components/ErrorMessage";

export default function RankingPage() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRankings() {
      try {
        const result = await getRankings();

        if (active) {
          setRankings(result.rankings);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRankings();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page">
      <div className="card">
        <p className="eyebrow">Best successful score per user</p>
        <h2>General Ranking</h2>
        {loading && <p className="muted">Loading ranking...</p>}
        <ErrorMessage message={error} />
        {!loading && rankings.length === 0 && <p>No successful games yet.</p>}
        {rankings.length > 0 && (
          <table className="ranking-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Best score</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((row, index) => (
                <tr key={row.userId}>
                  <td>{index + 1}</td>
                  <td>{row.name} ({row.username})</td>
                  <td>{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
