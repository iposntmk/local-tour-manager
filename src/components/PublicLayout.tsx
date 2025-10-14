interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simple header without navigation */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="mx-auto flex items-center justify-center px-4 py-3 max-w-7xl">
          <h1 className="text-lg font-semibold">Tour Manager</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Simple footer */}
      <footer className="border-t bg-card py-4">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          <p>Shared from Tour Manager</p>
        </div>
      </footer>
    </div>
  );
}
