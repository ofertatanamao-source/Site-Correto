import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Result from "@/pages/result";
import History from "@/pages/history";
import Favorites from "@/pages/favorites";
import Templates from "@/pages/templates";
import BottomNav from "@/components/layout/bottom-nav";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <div className="flex flex-col min-h-[100dvh] w-full max-w-md mx-auto relative bg-background shadow-xl">
      <main className="flex-1 overflow-y-auto pb-20 w-full">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/resultado/:historyId" component={Result} />
          <Route path="/historico" component={History} />
          <Route path="/favoritos" component={Favorites} />
          <Route path="/templates" component={Templates} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="min-h-[100dvh] bg-stone-100 flex justify-center">
            <Router />
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
