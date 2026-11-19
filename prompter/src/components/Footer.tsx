import { memo, useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { useToast } from "@astryxdesign/core/Toast";
import { useStore } from "zustand";
import { getAppInfo } from "../bridge/appInfo";
import type { AppInfo } from "../bridge/appInfo";
import { openStorage } from "../bridge/storage";
import { noteVersion } from "../state/persist";
import { Icon } from "./Icon";
import { UpdateDialog, updater } from "./UpdateDialog";

const UPDATE_CHECK_INTERVAL_MS = 6 * 3600 * 1000;

function AboutDialog({
  info,
  isOpen,
  onOpenChange,
}: {
  info: AppInfo | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const platform = info
    ? `Windows 64-bit · Tauri ${info.tauri}${info.webview ? ` · WebView2 ${info.webview}` : ""}`
    : "Bản chạy trên trình duyệt";

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={480} purpose="info">
      <DialogHeader
        title="Rec Media"
        subtitle="Phần mềm máy nhắc chữ chuyên nghiệp"
        startContent={<img className="brand-logo" src="/logo.png" alt="" />}
        onOpenChange={onOpenChange}
      />
      <div className="dlg-body">
        <p>
          Phần mềm máy nhắc chữ cho MC: soạn kịch bản, điều khiển tốc độ và chiếu toàn màn hình ra
          màn hình nhắc chữ.
        </p>
        <dl className="dlg-meta">
          <dt>Phiên bản</dt>
          <dd>{info?.version ?? "dev"}</dd>
          <dt>Nền tảng</dt>
          <dd>{platform}</dd>
        </dl>
        <div className="dlg-acts">
          <Button
            variant="secondary"
            label="Kiểm tra cập nhật"
            icon={<Icon name="refresh-cw" />}
            onClick={() => {
              onOpenChange(false);
              void updater.getState().check(true);
            }}
          />
          <Button variant="primary" label="Đóng" onClick={() => onOpenChange(false)} />
        </div>
      </div>
    </Dialog>
  );
}

/** Chân màn điều khiển: phiên bản, nhãn báo bản mới, kiểm tra cập nhật và Giới thiệu. */
export const Footer = memo(function Footer() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [about, setAbout] = useState(false);
  const update = useStore(updater, (s) => s.info);
  const toast = useToast();

  // Phiên bản đang chạy; nếu khác lần chạy trước thì báo vừa cập nhật xong.
  useEffect(() => {
    void (async () => {
      try {
        const appInfo = await getAppInfo();
        setInfo(appInfo);
        if (appInfo && (await noteVersion(await openStorage(), appInfo.version))) {
          toast({
            body: `Đã cập nhật Rec Media lên phiên bản ${appInfo.version}`,
            uniqueID: "app-updated",
          });
        }
      } catch {
        // không lấy được thông tin phiên bản: chân trang hiện "dev"
      }
    })();
  }, [toast]);

  // Tự kiểm tra cập nhật khi mở và định kỳ.
  useEffect(() => {
    void updater.getState().check(false);
    const timer = setInterval(() => void updater.getState().check(false), UPDATE_CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer>
      <span className="fl">
        <b>Rec Media</b>
        {update && (
          <Button
            size="sm"
            variant="secondary"
            label={`Có bản mới v${update.version}`}
            tooltip="Có phiên bản mới – bấm để xem"
            icon={<StatusDot variant="accent" label="Có bản mới" isPulsing />}
            onClick={() => updater.getState().show()}
          />
        )}
      </span>
      <span className="fr">
        <Button
          size="sm"
          variant="ghost"
          label="Kiểm tra cập nhật"
          icon={<Icon name="refresh-cw" size={14} />}
          onClick={() => void updater.getState().check(true)}
        />
        <Button
          size="sm"
          variant="ghost"
          label="Giới thiệu"
          icon={<Icon name="info" size={14} />}
          onClick={() => setAbout(true)}
        />
      </span>
      <AboutDialog info={info} isOpen={about} onOpenChange={setAbout} />
      <UpdateDialog />
    </footer>
  );
});
