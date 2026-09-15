import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
if ("serviceWorker" in navigator) { window.addEventListener("load", async () => { try {
  const reg = await navigator.serviceWorker.register("./sw.js");
  const c=()=>reg.update().catch(()=>{}); c(); setInterval(c,30000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")c();});
  reg.addEventListener("updatefound",()=>{const n=reg.installing;if(!n)return;n.addEventListener("statechange",()=>{if(n.state==="installed"&&navigator.serviceWorker.controller){n.postMessage({type:"SKIP_WAITING"});}});});
  let r=false; navigator.serviceWorker.addEventListener("controllerchange",()=>{if(r)return;r=true;window.location.reload();});
} catch(e){} }); }
createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
