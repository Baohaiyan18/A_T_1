import { memo, useCallback, useEffect, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
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

const WINDOW_OPTION = { value: "", label: "Cửa sổ riêng" };

/** Chọn màn hình máy nhắc chữ, bật/chuyển/tắt chiếu và hiển thị trạng thái chiếu. */
export const ProjectionBar = memo(function ProjectionBar() {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [error, setError] = useState("");
  const displayKey = useStore((s) => s.displayKey);
  const open = useStore((s) => s.outputOpen);
  const connected = useStore((s) => s.outputConnected);
  const outW = useStore((s) => s.outSize.w);
  const outH = useStore((s) => s.outSize.h);
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

  const live = open && connected && !error;
  const statusText = error
    ? error
    : !open
      ? "Chưa chiếu"
      : connected
        ? `Đang chiếu (${outW}×${outH})`
        : "Đang mở màn chiếu…";

  const options =
    monitors.length === 0
      ? [WINDOW_OPTION]
      : monitors.map((m) => ({ value: m.key, label: monitorLabel(m) }));

  return (
    <>
      <span className="proj-status" role="status" aria-live="polite">
        <Badge
          variant={error ? "error" : live ? "success" : "neutral"}
          label={statusText}
          icon={
            error ? (
              <Icon name="alert-triangle" size={14} />
            ) : (
              <StatusDot
                variant={live ? "success" : open ? "warning" : "neutral"}
                label={statusText}
                isPulsing={live}
              />
            )
          }
        />
      </span>
      <div className="proj">
        <span className="proj-label" aria-hidden="true">
          Chiếu ra
        </span>
        <Selector
          label="Chọn màn hình máy nhắc chữ"
          isLabelHidden
          size="md"
          width={240}
          options={options}
          value={selected?.key ?? ""}
          onChange={(value: string | null) => {
            const key = value ?? "";
            useStore.getState().setDisplayKey(key);
            if (open) void project(key);
          }}
        />
        <IconButton
          label="Quét lại màn hình"
          tooltip="Quét lại màn hình"
          variant="ghost"
          icon={<Icon name="refresh-cw" />}
          clickAction={async () => {
            try {
              await scan();
            } catch (err) {
              setError(String(err));
            }
          }}
        />
        <Button
          variant="primary"
          label={open ? "Chuyển màn" : "Chiếu"}
          icon={<Icon name={open ? "arrow-left-right" : "cast"} />}
          clickAction={async () => {
            if (selected) useStore.getState().setDisplayKey(selected.key);
            await project(selected?.key ?? null);
          }}
        />
        {open && (
          <Button
            variant="destructive"
            label="Tắt chiếu"
            icon={<Icon name="power-off" />}
            clickAction={async () => {
              try {
                await closeOutput();
              } catch (err) {
                setError(String(err));
              }
            }}
          />
        )}
      </div>
    </>
  );
});
