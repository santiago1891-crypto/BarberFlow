import AuthPanel from "./components/AuthPanel.jsx";

export default function App() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden bg-neutral">
      {/* Fondo punteado de marca */}
      <div
        className="absolute inset-0 bg-[radial-gradient(#2C2C2C_1px,transparent_1px)] [background-size:22px_22px] [background-position:-8px_-8px]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_28%,rgba(212,175,55,0.10)_0%,rgba(18,18,18,0)_70%)]" />

      <AuthPanel />
    </div>
  );
}
