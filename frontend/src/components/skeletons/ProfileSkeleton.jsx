import Skeleton from "./Skeleton";
import "./Skeleton.css";

function ProfileSkeletonSection({ security = false }) {
  return (
    <section className="profile-skeleton-section">
      <div className="profile-skeleton-section-heading">
        <div>
          <Skeleton width="105px" height="10px" />
          <Skeleton width="210px" height="23px" />
          <Skeleton width="min(350px, 90%)" height="12px" />
        </div>

        <Skeleton width="40px" height="40px" />
      </div>

      {security ? (
        <div className="profile-skeleton-security-list">
          <Skeleton width="145px" height="10px" />

          {[1, 2].map((item) => (
            <div className="profile-skeleton-security-card" key={item}>
              <Skeleton width="43px" height="43px" />
              <div className="profile-skeleton-security-info">
                <Skeleton width="145px" height="14px" />
                <Skeleton width="min(270px, 90%)" height="10px" />
                {item === 2 && (
                  <Skeleton width="180px" height="11px" />
                )}
              </div>
              <Skeleton width="65px" height="32px" />
            </div>
          ))}
        </div>
      ) : (
        <div className="profile-skeleton-fields">
          {[1, 2, 3, 4, 5].map((item) => (
            <div className="profile-skeleton-field" key={item}>
              <Skeleton width="105px" height="11px" />
              <Skeleton
                width="100%"
                height="43px"
                className="profile-skeleton-input"
              />
              {item === 2 && (
                <Skeleton width="190px" height="9px" />
              )}
            </div>
          ))}
        </div>
      )}

      {!security && (
        <div className="profile-skeleton-actions">
          <Skeleton width="125px" height="38px" />
          <Skeleton width="125px" height="38px" />
        </div>
      )}
    </section>
  );
}

export default function ProfileSkeleton() {
  return (
    <main
      className="profile-content profile-skeleton"
      aria-label="Loading profile"
      aria-busy="true"
      role="status"
    >
      {/* PAGE HEADING */}
      <div className="profile-page-heading">
        <div>
          <Skeleton width="145px" height="10px" />
          <Skeleton width="185px" height="35px" />
        </div>
      </div>

      {/* HERO BANNER */}
      <section className="profile-hero-banner profile-skeleton-banner">
        <div className="profile-hero-copy">
          <Skeleton width="105px" height="10px" />
          <Skeleton width="min(330px, 85%)" height="28px" />
          <Skeleton width="min(440px, 95%)" height="12px" />
          <Skeleton width="min(300px, 75%)" height="12px" />
        </div>

        <div className="profile-skeleton-banner-art">
          <Skeleton width="76px" height="94px" />
          <Skeleton width="43px" height="47px" />
        </div>
      </section>

      {/* ACCOUNT SUMMARY */}
      <section className="profile-header profile-skeleton-header">
        <Skeleton width="58px" height="58px" isCircle />

        <div className="profile-skeleton-user-info">
          <Skeleton width="175px" height="20px" />
          <Skeleton width="210px" height="12px" />

          <div className="profile-skeleton-meta">
            <Skeleton width="100px" height="11px" />
            <Skeleton width="145px" height="11px" />
          </div>
        </div>

        <Skeleton width="125px" height="39px" />
      </section>

      {/* PERSONAL INFORMATION */}
      <div className="profile-skeleton-sections">
        <ProfileSkeletonSection />

        {/* ACCOUNT SECURITY */}
        <ProfileSkeletonSection security />
      </div>
    </main>
  );
}

