import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { GalleryPage } from "./pages/GalleryPage";
import { ArtifactDetailPage } from "./pages/ArtifactDetailPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { AccessibilityPage } from "./pages/AccessibilityPage";
import { SupportPage } from "./pages/SupportPage";

function NotFound() {
  return (
    <main
      id="main-content"
      className="min-h-[60vh] flex items-center justify-center px-4"
      tabIndex={-1}
    >
      <div className="text-center">
        <p className="text-[#B8945A] text-sm font-semibold uppercase tracking-widest mb-3">
          404
        </p>
        <h1 className="text-[#1C1917] mb-3">Page Not Found</h1>
        <p className="text-[#6B6560] text-sm mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 rounded-xl bg-[#B8945A] text-white text-sm font-medium hover:bg-[#A07D47] transition-colors"
        >
          Go Home
        </a>
      </div>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "gallery", Component: GalleryPage },
      { path: "artifact/:id", Component: ArtifactDetailPage },
      { path: "categories", Component: CategoriesPage },
      { path: "accessibility", Component: AccessibilityPage },
      { path: "support", Component: SupportPage },
      { path: "*", Component: NotFound },
    ],
  },
]);
