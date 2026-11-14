import { isOutputWindow } from "./bridge/projection";
import { ControlWindow } from "./windows/ControlWindow";
import { OutputWindow } from "./windows/OutputWindow";
import "./App.css";

function App() {
  return isOutputWindow() ? <OutputWindow /> : <ControlWindow />;
}

export default App;
