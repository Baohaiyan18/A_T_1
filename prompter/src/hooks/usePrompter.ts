import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { controlChannel } from "../bridge/bus";
import type { StageHandle } from "../components/Stage";
import { createEngine, runCmd, secondsLeft, step } from "../engine/engine";
import type { Command } from "../engine/engine";
import { resolveKey } from "../shortcuts";
import { useStore } from "../state/store";

/** Sau khi gửi lệnh, bỏ qua vị trí màn chiếu báo về trong khoảng này để không bị giật ngược. */
const IGNORE_AFTER_CMD_MS = 200;
/** Quá khoảng này không nhận được vị trí thì coi như màn chiếu không hoạt động. */
const CONNECTED_WINDOW_MS = 2000;
/** Gửi kịch bản sang màn chiếu sau khi ngừng gõ một lúc. */
const SCRIPT_DEBOUNCE_MS = 250;

/** Các thao tác điều khiển chạy chữ dùng chung cho mọi component của màn điều khiển. */
export interface Prompter {
  cmd(command: Command): void;
  /** Vị trí cuộn hiện tại (px màn chiếu). */
  pos(): number;
  /** Nhảy tới tỉ lệ 0..1 của kịch bản. */
  seekRatio(ratio: number): void;
  /** Đưa dòng thứ `index` của kịch bản lên vạch đọc. */
  seekLine(index: number): void;
}

/**
 * Chạy vòng lặp hiển thị cho `stage`, gắn phím tắt và đồng bộ với màn chiếu.
 *
 * Khi đang chiếu, màn chiếu là nguồn chuẩn về vị trí: cửa sổ này vẫn tự chạy cho mượt
 * nhưng chỉnh theo vị trí màn chiếu báo về. Khi không chiếu, cửa sổ này tự chạy một mình.
 */
export function usePrompter(stage: RefObject<StageHandle | null>): Prompter {
  const engine = useRef(createEngine());
  const sync = useRef({ lastMsg: -Infinity, ignoreUntil: 0 });

  const prompter = useMemo<Prompter>(() => {
    const max = () => stage.current?.maxPos() ?? 0;
    const cmd = (command: Command) => {
      runCmd(engine.current, command, max(), useStore.getState().settings);
      controlChannel().send({ type: "cmd", cmd: command });
      sync.current.ignoreUntil = performance.now() + IGNORE_AFTER_CMD_MS;
    };
    return {
      cmd,
      pos: () => engine.current.pos,
      seekRatio: (ratio) => cmd({ action: "seek", value: ratio * max() }),
      seekLine: (index) => {
        const st = stage.current;
        if (st) cmd({ action: "seek", value: st.lineTop(index) });
      },
    };
  }, [stage]);

  // Vòng lặp hiển thị.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;
    const loop = (t: number) => {
      const st = stage.current;
      const e = engine.current;
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      if (st) {
        const state = useStore.getState();
        const { settings, playback } = state;
        const max = st.maxPos();
        step(e, dt, max, settings);
        st.render(e.pos);
        st.showCount(e.counting);
        if (t - lastUi > 150) {
          lastUi = t;
          const next = {
            running: e.playing || e.counting > 0,
            progress: max > 0 ? e.pos / max : 0,
            secondsLeft: secondsLeft(e, max, settings),
          };
          if (
            next.running !== playback.running ||
            next.progress !== playback.progress ||
            next.secondsLeft !== playback.secondsLeft
          )
            state.setPlayback(next);
          const connected = performance.now() - sync.current.lastMsg < CONNECTED_WINDOW_MS;
          if (connected !== state.outputConnected) state.setOutputConnected(connected);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  // Nhận tin từ màn chiếu.
  useEffect(() => {
    const channel = controlChannel();
    return channel.listen((msg) => {
      const state = useStore.getState();
      const e = engine.current;
      const now = performance.now();
      sync.current.lastMsg = now;
      switch (msg.type) {
        case "hello":
          channel.send({
            type: "init",
            settings: state.settings,
            text: state.text,
            pos: e.pos,
            playing: e.playing,
          });
          break;
        case "pos":
          if (msg.w > 0 && msg.h > 0 && (msg.w !== state.outSize.w || msg.h !== state.outSize.h))
            state.setOutSize(msg.w, msg.h);
          if (now > sync.current.ignoreUntil) {
            e.pos = msg.pos;
            e.playing = msg.playing;
            e.counting = msg.counting;
          }
          break;
        case "speed":
          state.setSpeed(msg.value);
          break;
      }
    });
  }, []);

  // Gửi cài đặt và kịch bản sang màn chiếu khi chúng thay đổi.
  useEffect(() => {
    const channel = controlChannel();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useStore.subscribe((state, prev) => {
      if (state.settings !== prev.settings)
        channel.send({ type: "settings", settings: state.settings });
      if (state.text !== prev.text) {
        clearTimeout(timer);
        timer = setTimeout(
          () => channel.send({ type: "script", text: useStore.getState().text }),
          SCRIPT_DEBOUNCE_MS,
        );
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // Phím tắt của màn điều khiển.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      // Đang gõ kịch bản hoặc chỉnh ô nhập thì không bắt phím tắt.
      if (ev.target instanceof Element && ev.target.closest("textarea,input,select")) return;
      // Đang mở hộp thoại thì không điều khiển chạy chữ (hộp thoại tự xử lý Esc).
      if (document.querySelector(".modal")) return;
      if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
      const action = resolveKey(ev.key, ev.shiftKey);
      if (!action) return;
      ev.preventDefault();
      const { settings, setSpeed, setFontSize } = useStore.getState();
      if (action.type === "cmd") prompter.cmd(action.cmd);
      else if (action.type === "speed") setSpeed(settings.speed + action.delta);
      else setFontSize(settings.fontSize + action.delta);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prompter]);

  return prompter;
}
