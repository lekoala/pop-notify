import "./src/PopNotify.js";
import styles from "./pop-notify.min.css";

if (!document.head.querySelector(`#pop-notify-style`)) {
  const style = document.createElement("style");
  style.id = `pop-notify-style`;
  style.innerText = styles;
  document.head.append(style);
}
