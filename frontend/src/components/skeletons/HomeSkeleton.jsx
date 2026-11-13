
import Sidebar from "../sidebar";
import Skeleton from "./Skeleton";
import "./Skeleton.css";

export default function HomeSkeleton() {
  return (
    <div
      className="dashboard-layout home-skeleton"
      aria-busy="true"
      aria-label="Loading VAULTIX dashboard"
    >
      <main className="dashboard-main">
        <div className="dashboard-content">

          {/* Header */}
          <header className="header home-skeleton-header">
            <div className="home-skeleton-search">
              <Skeleton width="20px" height="20px" />
              <Skeleton width="min(230px, 65%)" height="13px" />
            </div>
            <Skeleton width="40px" height="40px" isCircle />
          </header>

          {/* Welcome Section */}
          <section className="welcome-section">
            <div className="welcome-content">
              <span className="welcome-label">
                <Skeleton width="130px" height="11px" />
              </span>
              <h1>
                <Skeleton width="min(340px, 90%)" height="32px" />
              </h1>
            </div>
            <div className="dashboard-date">
              <Skeleton width="145px" height="15px" />
            </div>
          </section>

          {/* Statistics */}
          <section className="stats-grid" aria-label="Loading statistics">
            {[1, 2, 3].map((item) => (
              <article className="stat-card home-skeleton-stat" key={item}>
                <div className="stat-info">
                  <Skeleton width="115px" height="13px" />
                  <Skeleton width="55px" height="29px" />
                </div>
                <Skeleton width="45px" height="45px" />
              </article>
            ))}
          </section>

          {/* Quick Actions */}
          <section className="quick-actions-section">
            <div className="quick-actions-heading">
              <div>
                <span className="section-eyebrow">
                  <Skeleton width="100px" height="11px" />
                </span>
                <h2>
                  <Skeleton width="155px" height="21px" />
                </h2>
              </div>
            </div>

            <div className="quick-actions-grid">
              {[1, 2, 3].map((item) => (
                <div className="quick-action-card home-skeleton-action" key={item}>
                  <Skeleton width="43px" height="43px" />
                  <div className="home-skeleton-action-text">
                    <Skeleton width="105px" height="13px" />
                    <Skeleton width="145px" height="10px" />
                  </div>
                  <Skeleton width="12px" height="15px" />
                </div>
              ))}
            </div>
          </section>

          {/* Recent Documents and Notes */}
          <section className="dashboard-bottom-grid">

            <article className="dashboard-panel">
              <div className="panel-heading">
                <h2>
                  <Skeleton width="145px" height="19px" />
                </h2>
              </div>

              <div className="recent-documents-list">
                {[1, 2, 3, 4].map((item) => (
                  <div className="recent-document-item" key={item}>
                    <Skeleton width="42px" height="45px" />
                    <div className="home-skeleton-row-text">
                      <Skeleton width="min(170px, 75%)" height="12px" />
                      <Skeleton width="90px" height="10px" />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-panel">
              <div className="panel-heading">
                <h2>
                  <Skeleton width="115px" height="19px" />
                </h2>
              </div>

              <div className="recent-notes-list">
                {[1, 2, 3, 4].map((item) => (
                  <div className="recent-note-item" key={item}>
                    <div className="home-skeleton-row-text">
                      <Skeleton width="min(170px, 75%)" height="12px" />
                      <Skeleton width="90px" height="10px" />
                    </div>
                  </div>
                ))}
              </div>
            </article>

          </section>
        </div>
      </main>
    </div>
  );
}
