import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AccessibilityProvider } from "./context/AccessibilityContext";

export default function App() {
  return (
    <AccessibilityProvider>
      <RouterProvider router={router} />
    </AccessibilityProvider>
  );
}
