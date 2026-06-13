import { declareComponent } from "@webflow/react";
import App from "./App.jsx";

export default declareComponent(App, {
  name: "Manascience App",
  description: "Auth, profile, subscription, success, and cancel app.",
  group: "Manascience",
  options: {
    ssr: false,
  },
});