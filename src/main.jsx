import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

/* Deliberately no StrictMode: in development it double-mounts the tree,
   which would build two Tone.js graphs against the one AudioContext and
   leave the first one playing with nothing left holding a reference to
   stop it. The app manages its own audio lifecycle in effects instead. */
createRoot(document.getElementById("root")).render(<App />);
