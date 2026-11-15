import { Suspense, lazy } from "react";
import { isOutputWindow } from "./bridge/projection";
import "./App.css";

// Tách mã: màn chiếu không phải tải giao diện điều khiển (Astryx, bảng màu, hộp thoại…) và ngược lại.
const ControlWindow = lazy(() =>
  import("./windows/ControlWindow").then((m) => ({ default: m.ControlWindow })),
);
const OutputWindow = lazy(() =>
  import("./windows/OutputWindow").then((m) => ({ default: m.OutputWindow })),
);

function App() {
  return (
    <Suspense fallback={null}>{isOutputWindow() ? <OutputWindow /> : <ControlWindow />}</Suspense>
  );
}

export default App;
