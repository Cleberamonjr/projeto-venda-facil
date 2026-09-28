import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
const TS = Date.now();
export default defineConfig({
  base: "./",
  define: { "import.meta.env.VITE_APP_VERSION": JSON.stringify("2.7.1-estavel"), "import.meta.env.VITE_BUILD_COUNT": JSON.stringify("7") },
  build: { minify:"terser", terserOptions:{compress:{drop_console:true}},
    rollupOptions:{output:{ entryFileNames:`assets/[name]-[hash]-${TS}.js`, chunkFileNames:`assets/[name]-[hash]-${TS}.js`, assetFileNames:`assets/[name]-[hash]-${TS}.[ext]` }}},
  plugins:[react(),VitePWA({registerType:"autoUpdate",injectRegister:null,
    workbox:{skipWaiting:true,clientsClaim:true,cleanupOutdatedCaches:true,navigateFallback:null,cacheId:`luxi-v271-${TS}`,globPatterns:["**/*.{js,css,html,svg,woff2,jpg,png}"]},
    manifest:{name:"Luxi — Gestão Leve",short_name:"Luxi",theme_color:"#C48A94",background_color:"#FBF8F9",display:"standalone",orientation:"portrait",start_url:"./",icons:[{src:"icone-192.png",sizes:"192x192",type:"image/png"},{src:"icone-512.png",sizes:"512x512",type:"image/png"},{src:"icone-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}]}})],
});
