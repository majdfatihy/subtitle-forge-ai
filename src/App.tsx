import { LocaleProvider } from "@/i18n/LocaleContext";
import { useRouter } from "@/router/useRouter";
import { Header } from "@/components/Header";
import { Home } from "@/pages/Home";
import { About } from "@/pages/static/About";
import { HowToUse } from "@/pages/static/HowToUse";
import { Contact } from "@/pages/static/Contact";
import { Privacy } from "@/pages/static/Privacy";
import { Terms } from "@/pages/static/Terms";

function Router() {
  const { path } = useRouter();
  switch (path) {
    case "/about":
      return <About />;
    case "/how-to-use":
      return <HowToUse />;
    case "/contact":
      return <Contact />;
    case "/privacy":
      return <Privacy />;
    case "/terms":
      return <Terms />;
    default:
      return <Home />;
  }
}

export default function App() {
  return (
    <LocaleProvider>
      <Header />
      <Router />
    </LocaleProvider>
  );
}
