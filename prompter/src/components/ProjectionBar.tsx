import { useCallback, useEffect, useState } from "react";
import {
  closeOutput,
  listMonitors,
  monitorLabel,
  onMonitorsChanged,
  onOutputClosed,
  openOutput,
  pickMonitor,
  shouldAutoProject,
} from "../bridge/projection";
import type { MonitorInfo } from "../bridge/projection";
import { useStore } from "../state/store";
import { Icon } from "./Icon";

// Chỉ tự chiếu một lần cho mỗi lần mở ứng dụng (StrictMode gắn component hai lần khi dev).
let autoProjected = false;

/** Chọn màn hình máy nhắc chữ, bật/chuyển/tắt chiếu và hiển thị trạng thái chiếu. */
export function ProjectionBar() {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [error, setError] = useState("");
  const displayKey = useStore((s) => s.displayKey);
  const open = useStore((s) => s.outputOpen);
  const connected = useStore((s) => s.outputConnected);
  const outSize = useStore((s) => s.outSize);
  const selected = pickMonitor(monitors, displayKey);

  const project = useCallback(async (key: string | null) => {
    setError("");
    try {
      await openOutput(key);
      useStore.getState().setOutputOpen(true);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const scan = useCallback(async () => {
    const list = await listMonitors();
    setMonitors(list);
    return list;
  }, []);

  useEffect(() => {
    const refresh = () => void scan().catch((err) => setError(String(err)));
    const stopMonitors = onMonitorsChanged(refresh);
    const stopClosed = onOutputClosed(() => {
      const state = useStore.getState();
      state.setOutputOpen(false);
      state.setOutputConnected(false);
    });

    void (async () => {
      try {
        const list = await scan();
        if (autoProjected) return;
        autoProjected = true;
        if (await shouldAutoProject())
          await project(pickMonitor(list, useStore.getState().displayKey)?.key ?? null);
      } catch (err) {
        setError(String(err));
      }
    })();

    return () => {
      stopMonitors();
      stopClosed();
    };
  }, [scan, project]);

  const statusText = error
    ? error
    : !open
      ? "Chưa chiếu"
      : connected
        ? `Đang chiếu (${outSize.w}×${outSize.h})`
        : "Đang mở màn chiếu…";

  return (
    <>
      <span className={open && connected && !error ? "pill on" : error ? "pill err-pill" : "pill"}>
        {error ? <Icon name="alert-triangle" size={14} /> : <span className="status-dot" />}
        {statusText}
      </span>
      <div className="proj">
        <span>Chiếu ra</span>
        <select
          title="Chọn màn hình máy nhắc chữ"
          value={selected?.key ?? ""}
          onChange={(e) => {
            useStore.getState().setDisplayKey(e.target.value);
            if (open) void project(e.target.value);
          }}
        >
          {monitors.length === 0 && <option value="">Cửa sổ riêng</option>}
          {monitors.map((m) => (
            <option key={m.key} value={m.key}>
              {monitorLabel(m)}
            </option>
          ))}
        </select>
        <button className="icon-btn" title="Quét lại màn hình" onClick={() => void scan()}>
          <Icon name="refresh-cw" />
        </button>
        <button
          className="primary"
          onClick={() => {
            if (selected) useStore.getState().setDisplayKey(selected.key);
            void project(selected?.key ?? null);
          }}
        >
          <Icon name={open ? "arrow-left-right" : "cast"} />
          {open ? "Chuyển màn" : "Chiếu"}
        </button>
        {open && (
          <button className="stop" onClick={() => void closeOutput()}>
            <Icon name="power-off" /> Tắt chiếu
          </button>
        )}
      </div>
    </>
  );
}
