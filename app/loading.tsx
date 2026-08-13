export default function GlobalLoading() {
  return (
    <div className="route-loader" aria-hidden="true">
      <div className="route-loader-bar" />
      <div className="route-loader-stage" role="status" aria-label="Loading">
        <div className="route-loader-ringwrap">
          <svg className="route-loader-ring" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="80" stroke="#AC3438" strokeWidth="0.6" opacity="0.25" />
            <circle cx="100" cy="100" r="58" stroke="#AC3438" strokeWidth="0.8" opacity="0.4" />
            <circle cx="100" cy="100" r="36" stroke="#AC3438" strokeWidth="1" opacity="0.6" />
            <path d="M100 42 Q130 70 100 100 Q70 130 100 158" stroke="#AC3438" strokeWidth="0.8" fill="none" opacity="0.5" />
            <path d="M42 100 Q70 70 100 100 Q130 130 158 100" stroke="#AC3438" strokeWidth="0.8" fill="none" opacity="0.5" />
            <circle cx="100" cy="58" r="5" fill="#AC3438" opacity="0.7" />
            <circle cx="100" cy="142" r="3" fill="#AC3438" opacity="0.4" />
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="route-loader-mark" src="/danhov-mark.png" alt="" width={643} height={824} />
        </div>
      </div>
    </div>
  );
}
