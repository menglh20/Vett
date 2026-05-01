// Mobile layout: centers a 390×844 phone frame on the screen
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div
        className="w-full bg-white border border-gray-300 overflow-hidden relative"
        style={{ maxWidth: "390px", height: "844px" }}
      >
        {children}
      </div>
    </div>
  );
}
