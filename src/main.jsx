import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

document.documentElement.lang = "pt"
document.documentElement.setAttribute("translate", "no")
document.documentElement.classList.add("notranslate")

document.body.setAttribute("translate", "no")
document.body.classList.add("notranslate")

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)