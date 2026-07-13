import { createGameApplication } from "./app";
import "./styles/main.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Application root was not found.");
}

createGameApplication(root);
