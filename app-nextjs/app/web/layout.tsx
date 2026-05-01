// Web layout: full-width responsive, no phone frame constraint
export default function WebLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF" }}>{children}</div>;
}
