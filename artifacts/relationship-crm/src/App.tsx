import { useEffect, useRef, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app-shell";
import { Wordmark } from "@/components/logo";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Contacts from "@/pages/contacts";
import ContactDetail from "@/pages/contact-detail";
import FollowUps from "@/pages/follow-ups";
import Settings from "@/pages/settings";
import DemoWorkspace from "@/demo/demo-workspace";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#1d4944",
    colorForeground: "#15262a",
    colorMutedForeground: "#5a6a6c",
    colorDanger: "#b32d24",
    colorBackground: "#fdfbf7",
    colorInput: "#ffffff",
    colorInputForeground: "#15262a",
    colorNeutral: "#8a8f86",
    fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
    borderRadius: "0.625rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#fdfbf7] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#e4ddd0] shadow-[0_24px_60px_-30px_rgba(29,73,68,0.45)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#15262a] font-medium text-[1.65rem] [font-family:'Fraunces',Georgia,serif]",
    headerSubtitle: "text-[#5a6a6c]",
    socialButtonsBlockButtonText: "text-[#15262a] font-medium",
    formFieldLabel: "text-[#15262a] font-semibold",
    footerActionLink: "text-[#1d4944] font-semibold hover:text-[#e2562f]",
    footerActionText: "text-[#5a6a6c]",
    dividerText: "text-[#5a6a6c]",
    identityPreviewEditButton: "text-[#1d4944]",
    formFieldSuccessText: "text-[#1d4944]",
    alertText: "text-[#15262a]",
    logoBox: "h-11 justify-center",
    logoImage: "h-11 w-11",
    socialButtonsBlockButton: "border border-[#d9d2c3] bg-white hover:bg-[#f4efe5]",
    formButtonPrimary: "bg-[#1d4944] hover:bg-[#143632] text-[#f7f3ec] normal-case font-semibold shadow-none",
    formFieldInput: "border-[#d9d2c3] bg-white",
    footerAction: "bg-transparent",
    dividerLine: "bg-[#e4ddd0]",
    alert: "bg-[#fdece6] border border-[#f2c4b4]",
    otpCodeFieldInput: "border-[#d9d2c3] bg-white",
    formFieldRow: "",
    main: "",
  },
};

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[hsl(14_75%_52%)]/15" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full border-[28px] border-primary/10" />
      <div className="relative z-10 flex w-full flex-col items-center gap-6">
        <a href={`${basePath}/`} aria-label="Home"><Wordmark /></a>
        {children}
      </div>
    </div>
  );
}

function SignInPage() {
  return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthFrame>;
}
function SignUpPage() {
  return <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthFrame>;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out"><Landing /></Show>
    </>
  );
}

function Protected({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in"><AppShell>{children}</AppShell></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== id) qc.clear();
      prev.current = id;
    });
  }, [addListener, qc]);
  return null;
}

function Routes() {
  const [location] = useLocation();
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Full Circle — Keep your relationships moving",
      "/dashboard": "Dashboard | Full Circle",
      "/contacts": "Contacts | Full Circle",
      "/follow-ups": "Follow-ups | Full Circle",
      "/settings": "Settings | Full Circle",
    };
    const title = titles[location] ?? (location.startsWith("/contacts/") ? "Contact profile | Full Circle"
      : location.startsWith("/sign-in") ? "Sign in | Full Circle"
      : location.startsWith("/sign-up") ? "Create an account | Full Circle" : "Page not found | Full Circle");
    document.title = title;
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
  }, [location]);
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/dashboard">{() => <Protected><Dashboard /></Protected>}</Route>
        <Route path="/contacts">{() => <Protected><Contacts /></Protected>}</Route>
        <Route path="/contacts/:id">{() => <Protected><ContactDetail /></Protected>}</Route>
        <Route path="/follow-ups">{() => <Protected><FollowUps /></Protected>}</Route>
        <Route path="/settings">{() => <Protected><Settings /></Protected>}</Route>
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function ClerkProviderWithRoutes() {
  if (!clerkPubKey) {
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
  }
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to see who's next" } },
        signUp: { start: { title: "Start your list", subtitle: "Create your Full Circle account" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Routes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function AppEntry() {
  const [location] = useLocation();
  const isDemo = location === "/demo" || location.startsWith("/demo/");
  const originalDocumentMeta = useRef({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute("content"),
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
  });
  useEffect(() => {
    if (!isDemo) {
      document.title = originalDocumentMeta.current.title;
      const description = document.querySelector('meta[name="description"]');
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (description && originalDocumentMeta.current.description !== null) {
        description.setAttribute("content", originalDocumentMeta.current.description ?? "");
      }
      if (ogTitle && originalDocumentMeta.current.ogTitle !== null) {
        ogTitle.setAttribute("content", originalDocumentMeta.current.ogTitle ?? "");
      }
      return;
    }
    document.title = "Sample workspace | Full Circle";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      "Explore Full Circle with a private, interactive sample workspace.",
    );
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", "Sample workspace | Full Circle");
  }, [isDemo]);
  if (isDemo) return <DemoWorkspace />;
  return <ClerkProviderWithRoutes />;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppEntry />
    </WouterRouter>
  );
}

export default App;
