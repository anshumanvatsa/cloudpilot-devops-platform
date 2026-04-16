import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
server: {
host: true,
port: 8080,
hmr: {
overlay: false,
},
proxy: {
"/api": {
target: "http://localhost:8000",
changeOrigin: true,
},
"/ws": {
target: "ws://localhost:8000",
ws: true,
},
},
},

// 🔥 THIS IS THE IMPORTANT FIX
preview: {
host: true,
port: 3000,
allowedHosts: ["frontend", "13.60.57.168"],
},

plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

resolve: {
alias: {
"@": path.resolve(__dirname, "./src"),
},
dedupe: [
"react",
"react-dom",
"react/jsx-runtime",
"react/jsx-dev-runtime",
"@tanstack/react-query",
"@tanstack/query-core",
],
},
}));
