
import Sidebar from "../sidebar";
import Skeleton from "./Skeleton";
import "./Skeleton.css";

export default function HomeSkeleton() {
  return (
    <div
      className="dashboard-layout home-skeleton"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      {/* Existing VAULTIX Sidebar */}
      <Sidebar />

      <main className="dashboard-main">
        <div className="dashboard-content">

          {/* Welcome Section */}
          <section className="welcome-section">
            <div className="welcome-content">
              <span className="welcome-label">
                <Skeleton width="130px" height="11px" />
              </span>

              <h1>
                <Skeleton width="min(340px, 90%)" height="34px" />
              </h1>

              <p className="welcome-description">
                <Skeleton width="min(420px, 95%)" height="13px" />
              </p>
            </div>

            <div className="dashboard-date">
              <strong>
                <Skeleton width="145px" height="15px" />
              </strong>
            </div>
          </section>

          {/* Dashboard Statistics */}
          <section
            className="stats-grid"
            aria-label="Loading statistics"
          >
            <article className="stat-card stat-documents home-skeleton-stat">
              <div className="stat-info">
                <span>
                  <Skeleton width="110px" height="13px" />
                </span>

                <h2>
                  <Skeleton width="55px" height="29px" />
                </h2>

                <p>
                  <Skeleton width="150px" height="11px" />
                </p>
              </div>

              <div className="stat-icon" aria-hidden="true">
                <Skeleton width="45px" height="45px" />
              </div>
            </article>

            <article className="stat-card stat-notes home-skeleton-stat">
              <div className="stat-info">
                <span>
                  <Skeleton width="100px" height="13px" />
                </span>

                <h2>
                  <Skeleton width="55px" height="29px" />
                </h2>

                <p>
                  <Skeleton width="125px" height="11px" />
                </p>
              </div>

              <div className="stat-icon" aria-hidden="true">
                <Skeleton width="45px" height="45px" />
              </div>
            </article>

            <article className="stat-card stat-uploaded home-skeleton-stat">
              <div className="stat-info">
                <span>
                  <Skeleton width="105px" height="13px" />
                </span>

                <h2>
                  <Skeleton width="55px" height="29px" />
                </h2>

                <p>
                  <Skeleton width="170px" height="11px" />
                </p>
              </div>

              <div className="stat-icon" aria-hidden="true">
                <Skeleton width="45px" height="45px" />
              </div>
            </article>
          </section>

          {/* Quick Actions */}
          <section className="quick-actions-section">
            <div className="quick-actions-heading">
              <div>
                <span className="section-eyebrow">
                  <Skeleton width="95px" height="11px" />
                </span>

                <h2>
                  <Skeleton width="155px" height="22px" />
                </h2>

                <p>
                  <Skeleton width="220px" height="12px" />
                </p>
              </div>
            </div>

            <div className="quick-actions-grid">

              {/* Upload Document */}
              <button
                type="button"
                className="quick-action-card action-upload"
                disabled
                aria-hidden="true"
                tabIndex={-1}
              >
                <span className="quick-action-icon">
                  <Skeleton width="43px" height="43px" />
                </span>

                <span className="quick-action-text">
                  <strong>
                    <Skeleton width="115px" height="13px" />
                  </strong>

                  <small>
                    <Skeleton width="145px" height="11px" />
                  </small>
                </span>

                <span className="quick-action-arrow">
                  <Skeleton width="12px" height="15px" />
                </span>
              </button>

              {/* Create Note */}
              <button
                type="button"
                className="quick-action-card action-note"
                disabled
                aria-hidden="true"
                tabIndex={-1}
              >
                <span className="quick-action-icon">
                  <Skeleton width="43px" height="43px" />
                </span>

                <span className="quick-action-text">
                  <strong>
                    <Skeleton width="100px" height="13px" />
                  </strong>

                  <small>
                    <Skeleton width="145px" height="11px" />
                  </small>
                </span>

                <span className="quick-action-arrow">
                  <Skeleton width="12px" height="15px" />
                </span>
              </button>

              {/* My Profile */}
              <button
                type="button"
                className="quick-action-card action-profile"
                disabled
                aria-hidden="true"
                tabIndex={-1}
              >
                <span className="quick-action-icon">
                  <Skeleton width="43px" height="43px" />
                </span>

                <span className="quick-action-text">
                  <strong>
                    <Skeleton width="90px" height="13px" />
                  </strong>

                  <small>
                    <Skeleton width="160px" height="11px" />
                  </small>
                </span>

                <span className="quick-action-arrow">
                  <Skeleton width="12px" height="15px" />
                </span>
              </button>

            </div>
          </section>

          {/* Recent Documents and Notes */}
          <section className="dashboard-bottom-grid">

            {/* Recent Documents */}
            <article className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    <Skeleton width="145px" height="19px" />
                  </h2>

                  <p>
                    <Skeleton width="190px" height="11px" />
                  </p>
                </div>
              </div>

              <div className="recent-documents-list">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    className="recent-document-item home-skeleton-item"
                    key={item}
                  >
                    <div className="recent-document-icon">
                      <Skeleton width="42px" height="42px" />
                    </div>

                    <div className="recent-document-info">
                      <strong>
                        <Skeleton width="170px" height="12px" />
                      </strong>

                      <span>
                        <Skeleton width="90px" height="10px" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {/* Recent Notes */}
            <article className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    <Skeleton width="115px" height="19px" />
                  </h2>

                  <p>
                    <Skeleton width="185px" height="11px" />
                  </p>
                </div>
              </div>

              <div className="recent-notes-list">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    className="recent-note-item home-skeleton-item"
                    key={item}
                  >
                    <div className="recent-note-info">
                      <strong>
                        <Skeleton width="170px" height="12px" />
                      </strong>

                      <span>
                        <Skeleton width="90px" height="10px" />
                      </span>
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
