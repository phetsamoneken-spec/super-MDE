import React from 'react';

/** Decorative field-sales artwork; no invented business metrics. */
export function FieldIllustration() {
  return <div className="field-art" aria-hidden="true">
    <div className="field-orbit field-orbit-one" /><div className="field-orbit field-orbit-two" />
    <svg viewBox="0 0 280 210" fill="none" className="field-store">
      <ellipse cx="140" cy="183" rx="94" ry="12" fill="#073e32" opacity=".14" />
      <rect x="64" y="67" width="153" height="111" rx="15" fill="#e4f5ee" />
      <path d="M57 75 77 39h127l20 36H57Z" fill="#fff" />
      <path d="m77 39-20 36h33l12-36H77Zm50 0-4 36h34l-4-36h-26Zm51 0 12 36h34l-20-36h-26Z" fill="#a9e3c7" />
      <path d="M57 75h33v10a16.5 16.5 0 0 1-33 0V75Zm66 0h34v10a17 17 0 0 1-34 0V75Zm67 0h34v10a17 17 0 0 1-34 0V75Z" fill="#42ac83" />
      <path d="M90 75h33v10a16.5 16.5 0 0 1-33 0V75Zm67 0h33v10a16.5 16.5 0 0 1-33 0V75Z" fill="#fff" />
      <rect x="82" y="116" width="64" height="43" rx="8" fill="#9bd6c4" />
      <path d="M114 118v38m-29-19h58" stroke="#eafff6" strokeWidth="4" />
      <path d="M167 178v-54a8 8 0 0 1 8-8h18a8 8 0 0 1 8 8v54" fill="#257d63" />
      <circle cx="191" cy="149" r="2.5" fill="#e6c988" />
      <path d="M53 177h177" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <path d="M40 153c-17-23 0-39 7-43 15 17 20 33 0 43" fill="#9ed6b9" /><path d="M46 141v37" stroke="#e5f7ec" strokeWidth="4" strokeLinecap="round" />
    </svg>
    <div className="field-float field-check"><svg viewBox="0 0 24 24" fill="none"><path d="m6 12 4 4 8-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
    <div className="field-float field-pin"><svg viewBox="0 0 24 24" fill="none"><path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="2.5" fill="currentColor"/></svg></div>
  </div>;
}
