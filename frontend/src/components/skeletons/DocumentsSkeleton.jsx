import React from "react";
import "./Skeleton.css";

function DocumentSkeletonCard() {
  return (
    <article
      className="document-card document-skeleton-card"
      aria-hidden="true"
    >
      {/* File icon and type */}
      <div className="document-card-top">
        <div className="document-file-icon skeleton-block document-skeleton-icon" />

        <span className="document-file-type">
          <span className="skeleton-block document-type-placeholder" />
        </span>
      </div>

      {/* File name */}
      <h3 className="document-file-name">
        <span className="skeleton-block document-name-placeholder" />
      </h3>

      {/* File size and uploaded date */}
      <div className="document-file-details document-skeleton-details">
        <span className="skeleton-block document-size-placeholder" />
        <span className="skeleton-block document-date-placeholder" />
      </div>

      {/* Preview, Download and Delete */}
      <div className="document-card-actions">
        <span className="skeleton-block document-action-placeholder" />
        <span className="skeleton-block document-action-placeholder" />
        <span className="skeleton-block document-action-placeholder" />
      </div>
    </article>
  );
}

export default function DocumentsSkeleton({ count = 3 }) {
  return (
    <section
      className="documents-grid"
      aria-label="Loading documents"
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <DocumentSkeletonCard key={index} />
      ))}
    </section>
  );
}
