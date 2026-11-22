import "./Skeleton.css";


export default function Skeleton({
  width,
  height = "16px",
  isCircle = false,
  className = "",
}) {
  const size = width ?? height;

  return (
    <span
      className={`skeleton-block ${isCircle ? "skeleton-circle" : ""} ${className}`}
      style={{
        width: isCircle ? size : width,
        height: isCircle ? size : height,
      }}
      aria-hidden="true"
    />
  );
}