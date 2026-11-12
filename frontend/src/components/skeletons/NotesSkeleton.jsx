
import React from "react";
import "./Skeleton.css";

function NoteSkeletonCard() {
  return (
    <article
      className="note-card note-skeleton-card"
      aria-hidden="true"
    >
      {/* Updated date and edit icon */}
      <div className="note-card-top">
        <span className="notes-skeleton-block skeleton-date" />
        <span className="notes-skeleton-block skeleton-icon" />
      </div>

      {/* Note title */}
      <div className="notes-skeleton-block skeleton-title" />

      {/* Note content: matches the four-line preview */}
      <div className="skeleton-content">
        <span className="notes-skeleton-block" />
        <span className="notes-skeleton-block" />
        <span className="notes-skeleton-block" />
        <span className="notes-skeleton-block" />
      </div>

      {/* Created date and actions */}
      <div className="note-card-bottom">
        <span className="notes-skeleton-block skeleton-created" />

        <div className="skeleton-actions">
          <span className="notes-skeleton-block skeleton-action" />
          <span className="notes-skeleton-block skeleton-action" />
        </div>
      </div>
    </article>
  );
}

export default function NotesSkeleton({ count = 3 }) {
  return (
    <section
      className="notes-grid"
      aria-label="Loading notes"
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <NoteSkeletonCard key={index} />
      ))}
    </section>
  );
}
