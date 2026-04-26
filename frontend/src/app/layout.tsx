import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedicalImaging — AI Research Portfolio",
  description: "3D Slicer · ITK-SNAP · OsiriX/Horos integration showcase",
};

const NAV = [
  { href: "/", label: "Dashboard", icon: "⬛" },
  { href: "/dicom", label: "DICOM Browser", icon: "🗂" },
  { href: "/segmentation", label: "Segmentation", icon: "🧩" },
  { href: "/mesh", label: "3D Assets", icon: "🔷" },
  { href: "/qa", label: "Annotation QA", icon: "✅" },
  { href: "/tools", label: "Tool Showcase", icon: "🔬" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen">
        <aside
          className="fixed top-0 left-0 h-full bg-slate-900 border-r border-slate-700 flex flex-col"
          style={{ width: "var(--sidebar-width)" }}
        >
          <div className="px-4 py-5 border-b border-slate-700">
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest">
              MedicalImaging
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">AI Research Portfolio</p>
          </div>
          <nav className="flex-1 py-4 space-y-1 px-2">
            {NAV.map(({ href, label, icon }) => (
              <Link key={href} href={href} className="sidebar-link">
                <span>{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="px-4 py-3 border-t border-slate-700 text-[10px] text-slate-600">
            3D Slicer · ITK-SNAP · OsiriX
          </div>
        </aside>
        <main
          className="flex-1 min-h-screen"
          style={{ marginLeft: "var(--sidebar-width)" }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
