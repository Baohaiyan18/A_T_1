import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { outputChannel } from "../bridge/bus";
import { closeOutput } from "../bridge/projection";
import { Stage } from "../components/Stage";
import type { StageHandle } from "../components/Stage";
import { createEngine, runCmd, step } from "../engine/engine";
import { clamp } from "../lib/clamp";
import { parseScript } from "../script/parse";
import { DEFAULT_SETTINGS, RANGES } from "../settings";
import type { Settings } from "../settings";
import { resolveKey } from "../shortcuts";
import "./OutputWindow.css";

const HELLO_INTERVAL_MS = 500;
const REPORT_INTERVAL_MS = 100;
const HINT_MS = 2500;
const IDLE_MS = 2000;

/**
 * Màn chiếu: chỉ hiển thị chữ, toàn màn hình. Kịch bản và cài đặt do màn điều khiển gửi sang;
 * vị trí cuộn do cửa sổ này tự chạy và báo về 10 lần mỗi giây.
 */
export function OutputWindow() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [text, setText] = useState("");
  const [hint, setHint] = useState(true);
  const [idle, setIdle] = useState(false);
  const lines = useMemo(() => parseScript(text), [text]);

  const stage = useRef<StageHandle>(null);
  const engine = useRef(createEngine());
  const live = useRef(settings);
  // Đã nhận dữ liệu khởi tạo từ màn điều khiển hay chưa.
  const ready = useRef(false);

  // Nhận kịch bản, cài đặt và lệnh từ màn điều khiển.
  useEffect(() => {
    const channel = outputChannel();
    const max = () => stage.current?.maxPos() ?? 0;
    const stop = channel.listen((msg) => {
      switch (msg.type) {
        case "init":
          ready.current = true;
          live.current = msg.settings;
          // Dựng xong chữ rồi mới đặt vị trí, để vị trí không bị kẹp theo kịch bản cũ.
          flushSync(() => {
            setSettings(msg.settings);
            setText(msg.text);
          });
          engine.current.pos = msg.pos;
          engine.current.playing = msg.playing;
          engine.current.counting = 0;
          break;
        case "settings":
          live.current = msg.settings;
          setSettings(msg.settings);
          break;
        case "script":
          setText(msg.text);
          break;
        case "cmd":
          runCmd(engine.current, msg.cmd, max(), live.current);
          break;
      }
    });

    // Chào cho tới khi màn điều khiển trả lời (lời chào đầu có thể đi trước khi bên kia kịp nghe).
    channel.send({ type: "hello" });
    const hello = setInterval(() => {
      if (ready.current) clearInterval(hello);
      else channel.send({ type: "hello" });
    }, HELLO_INTERVAL_MS);

    return () => {
      stop();
      clearInterval(hello);
    };
  }, []);

  // Vòng lặp hiển thị và báo vị trí.
  useEffect(() => {
    const channel = outputChannel();
    let raf = 0;
    let last = performance.now();
    let lastReport = 0;
    const loop = (t: number) => {
      const st = stage.current;
      const e = engine.current;
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      if (st) {
        step(e, dt, st.maxPos(), live.current);
        st.render(e.pos);
        st.showCount(e.counting);
      }
      // Chưa khởi tạo thì không báo vị trí, kẻo màn điều khiển nhận vị trí 0 và mất chỗ đang đọc.
      if (ready.current && t - lastReport > REPORT_INTERVAL_MS) {
        lastReport = t;
        channel.send({
          type: "pos",
          pos: e.pos,
          playing: e.playing,
          counting: e.counting,
          w: window.innerWidth,
          h: window.innerHeight,
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Điều khiển ngay tại màn chiếu: phím tắt và con lăn chuột.
  useEffect(() => {
    const channel = outputChannel();
    const max = () => stage.current?.maxPos() ?? 0;

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        void closeOutput();
        return;
      }
      if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
      const action = resolveKey(ev.key, ev.shiftKey);
      if (!action || action.type === "font") return;
      ev.preventDefault();
      if (action.type === "cmd") {
        runCmd(engine.current, action.cmd, max(), live.current);
      } else {
        const speed = clamp(live.current.speed + action.delta, RANGES.speed.min, RANGES.speed.max);
        live.current = { ...live.current, speed };
        setSettings(live.current);
        channel.send({ type: "speed", value: speed });
      }
    };

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      // Khi lật dọc thì đảo chiều lăn cho khớp chiều nhìn.
      const value = ev.deltaY * (live.current.mirrorV ? -1 : 1);
      runCmd(engine.current, { action: "px", value }, max(), live.current);
      if (ready.current) {
        channel.send({
          type: "pos",
          pos: engine.current.pos,
          playing: engine.current.playing,
          counting: engine.current.counting,
          w: window.innerWidth,
          h: window.innerHeight,
        });
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Gợi ý tự mờ; con trỏ chuột tự ẩn khi không di chuyển.
  useEffect(() => {
    const hintTimer = setTimeout(() => setHint(false), HINT_MS);
    let idleTimer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIdle(true), IDLE_MS);
    };
    document.addEventListener("mousemove", wake);
    wake();
    return () => {
      clearTimeout(hintTimer);
      clearTimeout(idleTimer);
      document.removeEventListener("mousemove", wake);
    };
  }, []);

  return (
    <div className={idle ? "out idle" : "out"}>
      <Stage ref={stage} lines={lines} settings={settings} scale={1} className="out-stage" />
      <div className={hint ? "out-hint" : "out-hint hide"}>
        Màn hình chiếu nhắc chữ · nhấn <b>Esc</b> để tắt chiếu
      </div>
    </div>
  );
}
