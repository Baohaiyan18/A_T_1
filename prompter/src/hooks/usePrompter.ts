import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { controlChannel } from "../bridge/bus";
import type { StageHandle } from "../components/Stage";
import { createEngine, runCmd, secondsLeft, step } from "../engine/engine";
import type { Command } from "../engine/engine";
import { clamp } from "../lib/clamp";
import { resolveKey } from "../shortcuts";
import { activeTab, neighborId, useStore } from "../state/store";

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
  /** Chuyển sang tab `id`: dừng chạy, nhớ vị trí tab cũ, mở tab mới ở vị trí đã nhớ. */
  selectTab(id: string): void;
  /** Đóng tab `id` (đang chọn thì chuyển sang tab kề bên trước). */
  closeTab(id: string): void;
  /** Khung xem trước báo đã dựng xong chữ của `text`. */
  linesRendered(text: string): void;
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

  // Chữ khung xem trước đã dựng, và vị trí của tab vừa chọn đang chờ chữ đó dựng xong.
  // Đặt vị trí sớm hơn thì bị kẹp theo chiều dài kịch bản cũ.
  const rendered = useRef<string | null>(null);
  const pending = useRef<{ text: string; pos: number } | null>(null);

  const prompter = useMemo<Prompter>(() => {
    const max = () => stage.current?.maxPos() ?? 0;
    const cmd = (command: Command) => {
      runCmd(engine.current, command, max(), useStore.getState().settings);
      controlChannel().send({ type: "cmd", cmd: command });
      sync.current.ignoreUntil = performance.now() + IGNORE_AFTER_CMD_MS;
    };
    const place = (pos: number) => {
      engine.current.pos = clamp(pos, 0, max());
    };
    const selectTab = (id: string) => {
      const state = useStore.getState();
      if (id === state.activeId || !state.tabs.some((t) => t.id === id)) return;
      cmd({ action: "pause" });
      // Vị trí tab hiện tại còn chờ đặt (chuyển tab nhanh) thì `engine.pos` chưa phải của nó: giữ vị trí đã lưu.
      if (!pending.current) state.setTabPos(state.activeId, engine.current.pos);
      state.selectTab(id);
      const tab = activeTab(useStore.getState());
      controlChannel().send({ type: "load", text: tab.text, pos: tab.pos });
      if (tab.text === rendered.current) {
        pending.current = null;
        place(tab.pos);
      } else {
        pending.current = { text: tab.text, pos: tab.pos };
      }
    };
    return {
      cmd,
      pos: () => engine.current.pos,
      seekRatio: (ratio) => cmd({ action: "seek", value: ratio * max() }),
      seekLine: (index) => {
        const st = stage.current;
        if (st) cmd({ action: "seek", value: st.lineTop(index) });
      },
      selectTab,
      closeTab: (id) => {
        const { tabs, activeId } = useStore.getState();
        if (tabs.length <= 1) return;
        if (id === activeId) selectTab(neighborId(tabs, id));
        useStore.getState().closeTab(id);
      },
      linesRendered: (text) => {
        rendered.current = text;
        const p = pending.current;
        if (p && p.text === text) {
          pending.current = null;
          place(p.pos);
        }
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
            text: activeTab(state).text,
            pos: e.pos,
            playing: e.playing,
            tickers: state.tickers,
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

  // Gửi cài đặt, chữ chạy và kịch bản sang màn chiếu khi chúng thay đổi.
  useEffect(() => {
    const channel = controlChannel();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useStore.subscribe((state, prev) => {
      if (state.settings !== prev.settings)
        channel.send({ type: "settings", settings: state.settings });
      if (state.tickers !== prev.tickers) channel.send({ type: "tickers", tickers: state.tickers });
      // Chuyển tab thì `selectTab` đã gửi tin `load`; ở đây chỉ gửi khi gõ trong cùng một tab.
      if (state.activeId === prev.activeId && activeTab(state).text !== activeTab(prev).text) {
        clearTimeout(timer);
        timer = setTimeout(
          () => channel.send({ type: "script", text: activeTab(useStore.getState()).text }),
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
      if (ev.defaultPrevented) return;
      // Đang gõ kịch bản hoặc chỉnh ô nhập / bộ chọn / thanh trượt thì không bắt phím tắt.
      if (
        ev.target instanceof Element &&
        ev.target.closest(
          "textarea,input,select,[contenteditable],[role='combobox'],[role='listbox'],[role='slider'],[role='radiogroup'],[role='dialog']",
        )
      )
        return;
      // Đang mở hộp thoại hoặc popover thì không điều khiển chạy chữ (hộp thoại tự xử lý Esc).
      if (document.querySelector(".modal, dialog[open], [role='dialog']")) return;
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
