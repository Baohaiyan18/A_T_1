import { useEffect } from "react";
import { useStore } from "zustand";
import { updateApi } from "../bridge/update";
import { createUpdaterStore } from "../state/updater";

/** Trạng thái cập nhật dùng chung cho chân trang và hộp thoại. */
export const updater = createUpdaterStore(updateApi);

const mb = (bytes: number) => (bytes / 1048576).toFixed(1);

export function UpdateDialog() {
  const { phase, info, error, progress, dialogOpen, check, dismiss, install } = useStore(updater);

  useEffect(() => {
    if (!dialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialogOpen, dismiss]);

  if (!dialogOpen) return null;

  const percent = progress.total ? Math.min(100, (progress.done / progress.total) * 100) : null;

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && dismiss()}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="update-title">
        <h2 id="update-title">Cập nhật phần mềm</h2>

        {phase === "checking" && (
          <p>
            <span className="spin" />
            Đang kiểm tra cập nhật…
          </p>
        )}

        {phase === "uptodate" && <p className="ok">✔ Bạn đang dùng phiên bản mới nhất.</p>}

        {phase === "error" && (
          <div className="dlg-err" role="alert">
            {error}
          </div>
        )}

        {phase === "available" && info && (
          <>
            <div className="vrow">
              <div className="vbox">
                <small>Đang dùng</small>
                <b>{info.current_version}</b>
              </div>
              <div className="vbox new">
                <small>Bản mới</small>
                <b>{info.version}</b>
              </div>
            </div>
            {info.mandatory && <p>Đây là bản bắt buộc cập nhật.</p>}
            {info.notes && (
              <>
                <p>Có gì mới</p>
                <pre className="notes">{info.notes}</pre>
              </>
            )}
          </>
        )}

        {phase === "downloading" && (
          <>
            <p>
              Đang tải bản cập nhật… {mb(progress.done)} MB
              {progress.total ? ` / ${mb(progress.total)} MB` : ""}
            </p>
            <div className="track">
              <div style={{ width: `${percent ?? 100}%`, opacity: percent === null ? 0.4 : 1 }} />
            </div>
            <p>Phần mềm sẽ tự khởi động lại sau khi cài xong.</p>
          </>
        )}

        <div className="acts">
          {phase === "error" && <button onClick={() => void check(true)}>Thử lại</button>}
          {phase === "available" && !info?.mandatory && <button onClick={dismiss}>Để sau</button>}
          {phase === "available" && (
            <button className="primary" autoFocus onClick={() => void install()}>
              Cập nhật ngay
            </button>
          )}
          {(phase === "uptodate" || phase === "error") && (
            <button className="primary" autoFocus onClick={dismiss}>
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
