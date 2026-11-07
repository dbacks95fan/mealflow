// ABOUTME: App shell and client routes.
import { Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { HouseholdProvider } from "./components/HouseholdProvider";
import { NavBar } from "./components/NavBar";
import { SelectionsProvider } from "./components/SelectionsProvider";
import { useHousehold } from "./lib/useHousehold";
import { FrysReview } from "./pages/FrysReview";
import { Groceries } from "./pages/Groceries";
import { ImportRecipe } from "./pages/ImportRecipe";
import { RecipeDetail } from "./pages/RecipeDetail";
import { RecipeForm } from "./pages/RecipeForm";
import { RecipeLibrary } from "./pages/RecipeLibrary";
import { Settings } from "./pages/Settings";
import { ThisWeek } from "./pages/ThisWeek";

function AppHeader() {
  const household = useHousehold();
  return (
    <header className="app-header">
      <div className="app-title">
        <h1>MealFlow</h1>
        {household?.name && <span className="household-name">{household.name}</span>}
      </div>
      <NavBar />
    </header>
  );
}

// The recipe form keeps its own Cancel / Save bar, so phones hide the tab bar
// there (INT-MF-0009).
function isFormScreen(pathname: string): boolean {
  return pathname === "/recipes/new" || /^\/recipes\/[^/]+\/edit$/.test(pathname);
}

function App() {
  const { pathname } = useLocation();
  return (
    <HouseholdProvider>
      <SelectionsProvider>
        <div className={isFormScreen(pathname) ? "app-shell form-screen" : "app-shell"}>
          <AppHeader />
          <main>
            <Routes>
              <Route path="/" element={<RecipeLibrary />} />
              <Route path="/recipes/new" element={<RecipeForm />} />
              <Route path="/recipes/import" element={<ImportRecipe />} />
              <Route path="/recipes/:id" element={<RecipeDetail />} />
              <Route path="/recipes/:id/edit" element={<RecipeForm />} />
              <Route path="/this-week" element={<ThisWeek />} />
              <Route path="/groceries" element={<Groceries />} />
              <Route path="/frys" element={<FrysReview />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </SelectionsProvider>
    </HouseholdProvider>
  );
}

export default App;
