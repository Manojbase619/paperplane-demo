import { Backdrop } from "@/components/Backdrop";
import { ConsoleSidebar } from "@/components/ConsoleSidebar";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Backdrop>
      <div className="flex min-h-dvh w-full min-w-0">
        <ConsoleSidebar />
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col overflow-x-hidden">
          <div className="pointer-events-none sticky top-0 z-10 h-14 shrink-0 border-b border-[color:var(--border)]/60 bg-[color:var(--surface-0)]/70 backdrop-blur-xl" />
          <div className="flex-1 min-h-0 overflow-auto">{children}</div>
        </div>
      </div>
    </Backdrop>
  );
}

