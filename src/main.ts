import { createGameApplication } from "./app";
import { applyVisualCssVariables } from "./game/theme";
import "./styles/main.css";

applyVisualCssVariables(document.documentElement.style);

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Application root was not found.");
}

createGameApplication(root);
