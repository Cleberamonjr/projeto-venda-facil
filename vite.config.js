import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: "./",
  define: { 
    "import.meta.env.VITE_APP_VERSION": JSON.stringify("26.09.15.0654"),
    "import.meta.env.VITE_SENHA_MESTRE": JSON.stringify("Chelsead10!"),
    "import.meta.env.VITE_BUILD_COUNT": JSON.stringify("2")
  },
  build: { minify:"terser", terserOptions:{compress:{drop_console:true}},
    rollupOptions:{output:{manualChunks:{vendor:["react","react-dom"],supabase:["@supabase/supabase-js"]}}} },
  plugins:[ react(), VitePWA({ registerType:"autoUpdate", injectRegister:null,
    workbox:{ skipWaiting:true,clientsClaim:true,cleanupOutdatedCaches:true,navigateFallback:null,
      globPatterns:["**/*.{js,css,html,svg,woff2,jpg,png}"],
      runtimeCaching:[{urlPattern:({request})=>request.mode==="navigate",handler:"NetworkFirst",options:{cacheName:"paginas",networkTimeoutSeconds:4}}] },
    manifest:{ name:"Luxi — Gestão Leve",short_name:"Luxi",theme_color:"#C48A94",background_color:"#FBF8F9",display:"standalone",orientation:"portrait",start_url:"./",
      icons:[{src:"icone-192.png",sizes:"192x192",type:"image/png"},{src:"icone-512.png",sizes:"512x512",type:"image/png"},{src:"icone-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}] } }) ],
});
