import { memo } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Spinner } from "@astryxdesign/core/Spinner";
import { useStore } from "zustand";
import { updateApi } from "../bridge/update";
import { createUpdaterStore } from "../state/updater";
import { Icon } from "./Icon";

/** Trạng thái cập nhật dùng chung cho chân trang và hộp thoại. */
export const updater = createUpdaterStore(updateApi);

const mb = (bytes: number) => (bytes / 1048576).toFixed(1);

export const UpdateDialog = memo(function UpdateDialog() {
  const { phase, info, error, progress, dialogOpen, check, dismiss, install } = useStore(updater);

  const percent = progress.total ? Math.min(100, (progress.done / progress.total) * 100) : null;
  const locked =
    phase === "checking" ||
    phase === "downloading" ||
    (phase === "available" && Boolean(info?.mandatory));

  return (
    <Dialog
      isOpen={dialogOpen}
      onOpenChange={(open) => {
        if (!open && !locked) dismiss();
      }}
      width={500}
      purpose={locked ? "required" : "info"}
    >
      <DialogHeader
        title="Cập nhật phần mềm"
        onOpenChange={locked ? undefined : (open) => !open && dismiss()}
      />
      <div className="dlg-body">
        {phase === "checking" && (
          <div className="dlg-status">
            <Spinner size="md" aria-label="Đang kiểm tra cập nhật" />
            <span>Đang kiểm tra cập nhật…</span>
          </div>
        )}

        {phase === "uptodate" && (
          <p className="dlg-ok">
            <Icon name="check-circle" size={16} /> Bạn đang dùng phiên bản mới nhất.
          </p>
        )}

        {phase === "error" && (
          <div role="alert">
            <Banner status="error" title="Không thể cập nhật" description={error} />
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
            {info.mandatory && <Banner status="warning" title="Đây là bản bắt buộc cập nhật." />}
            {info.notes && (
              <>
                <p className="dlg-sub">Có gì mới</p>
                <pre className="dlg-notes">{info.notes}</pre>
              </>
            )}
          </>
        )}

        {phase === "downloading" && (
          <div className="dlg-download" role="status" aria-live="polite">
            <p>
              Đang tải bản cập nhật… {mb(progress.done)} MB
              {progress.total ? ` / ${mb(progress.total)} MB` : ""}
            </p>
            <ProgressBar
              label="Tiến độ tải bản cập nhật"
              isLabelHidden
              value={percent ?? 0}
              max={100}
              isIndeterminate={percent === null}
              hasValueLabel={percent !== null}
            />
            <p>Phần mềm sẽ tự khởi động lại sau khi cài xong.</p>
          </div>
        )}

        <div className="dlg-acts">
          {phase === "error" && (
            <Button variant="secondary" label="Thử lại" onClick={() => void check(true)} />
          )}
          {phase === "available" && !info?.mandatory && (
            <Button variant="secondary" label="Để sau" onClick={dismiss} />
          )}
          {phase === "available" && (
            <Button variant="primary" label="Cập nhật ngay" onClick={() => void install()} />
          )}
          {(phase === "uptodate" || phase === "error") && (
            <Button variant="primary" label="Đóng" onClick={dismiss} />
          )}
        </div>
      </div>
    </Dialog>
  );
});
