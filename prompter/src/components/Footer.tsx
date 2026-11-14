import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { getAppInfo } from "../bridge/appInfo";
import type { AppInfo } from "../bridge/appInfo";
import { openStorage } from "../bridge/storage";
import { noteVersion } from "../state/persist";
import { Icon } from "./Icon";
import { UpdateDialog, updater } from "./UpdateDialog";

const UPDATE_CHECK_INTERVAL_MS = 6 * 3600 * 1000;
const TOAST_MS = 5000;

function AboutDialog({ info, onClose }: { info: AppInfo | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const platform = info
    ? `Windows 64-bit · Tauri ${info.tauri}${info.webview ? ` · WebView2 ${info.webview}` : ""}`
    : "Bản chạy trên trình duyệt";

  return (
    // Nhấp ra ngoài hộp thoại để đóng.
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="about-title">
        <div className="brand">
          <img className="brand-logo" src="/logo.png" alt="Prompter Logo" />
          <div className="brand-text">
            <h2 id="about-title">Prompter</h2>
            <small>Phần mềm máy nhắc chữ chuyên nghiệp</small>
          </div>
        </div>
        <p>
          Phần mềm máy nhắc chữ cho MC: soạn kịch bản, điều khiển tốc độ và chiếu toàn màn hình ra
          màn hình nhắc chữ.
        </p>
        <dl>
          <dt>Phiên bản</dt>
          <dd>{info?.version ?? "dev"}</dd>
          <dt>Nền tảng</dt>
          <dd>{platform}</dd>
        </dl>
        <div className="acts">
          <button
            onClick={() => {
              onClose();
              void updater.getState().check(true);
            }}
          >
            <Icon name="refresh-cw" /> Kiểm tra cập nhật
          </button>
          <button className="primary" autoFocus onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/** Chân màn điều khiển: phiên bản, nhãn báo bản mới, kiểm tra cập nhật và Giới thiệu. */
export function Footer() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [about, setAbout] = useState(false);
  const [toast, setToast] = useState("");
  const update = useStore(updater, (s) => s.info);

  // Phiên bản đang chạy; nếu khác lần chạy trước thì báo vừa cập nhật xong.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      try {
        const appInfo = await getAppInfo();
        setInfo(appInfo);
        if (appInfo && (await noteVersion(await openStorage(), appInfo.version))) {
          setToast(`Đã cập nhật Prompter lên phiên bản ${appInfo.version}`);
          timer = setTimeout(() => setToast(""), TOAST_MS);
        }
      } catch {
        // không lấy được thông tin phiên bản: chân trang hiện "dev"
      }
    })();
    return () => clearTimeout(timer);
  }, []);

  // Tự kiểm tra cập nhật khi mở và định kỳ.
  useEffect(() => {
    void updater.getState().check(false);
    const timer = setInterval(() => void updater.getState().check(false), UPDATE_CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer>
      <span className="fl">
        <b>Prompter</b> v{info?.version ?? "dev"}
        {update && (
          <button
            className="badge"
            title="Có phiên bản mới – bấm để xem"
            onClick={() => updater.getState().show()}
          >
            Có bản mới v{update.version}
          </button>
        )}
      </span>
      <span className="fr">
        <button className="link" onClick={() => void updater.getState().check(true)}>
          <Icon name="refresh-cw" size={14} /> Kiểm tra cập nhật
        </button>
        <button className="link" onClick={() => setAbout(true)}>
          <Icon name="info" size={14} /> Giới thiệu
        </button>
      </span>
      {about && <AboutDialog info={info} onClose={() => setAbout(false)} />}
      <UpdateDialog />
      {toast && (
        <div className="toast" role="status">
          <Icon name="check-circle" size={16} />
          {toast}
        </div>
      )}
    </footer>
  );
}
