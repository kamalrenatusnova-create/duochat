import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/hooks/useTheme";
import { router } from "@/router";
import { RouterProvider } from "@tanstack/react-router";

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  );
}
