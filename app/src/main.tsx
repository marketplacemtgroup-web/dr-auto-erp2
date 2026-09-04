import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import "./index.css";
import App from "./App.tsx";
import { setupChunkReloadHandlers } from "./lib/lazyWithRetry";
import {
  QUERY_PERSIST_BUSTER,
  QUERY_PERSIST_MAX_AGE_MS,
  createAppQueryClient,
  createQueryPersister,
} from "./lib/query-cache";
import { setupPwa } from "./pwa/register";

setupChunkReloadHandlers();
setupPwa();

const queryClient = createAppQueryClient();
const persister = createQueryPersister();

createRoot(document.getElementById("root")!).render(
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: QUERY_PERSIST_MAX_AGE_MS,
      buster: QUERY_PERSIST_BUSTER,
      dehydrateOptions: {
        shouldDehydrateQuery: (query) =>
          query.state.status === "success" && query.state.fetchStatus !== "fetching",
      },
    }}
  >
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </PersistQueryClientProvider>,
);

