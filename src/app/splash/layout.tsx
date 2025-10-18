"use client";

export default function SplashLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Hide header and footer on splash screen */}
      <style jsx global>{`
        .splash-page header,
        .splash-page footer,
        .splash-page .github-header,
        .splash-page .github-footer {
          display: none !important;
        }
        .splash-page main {
          padding: 0 !important;
        }
      `}</style>
      <div className="splash-page">{children}</div>
    </>
  );
}
