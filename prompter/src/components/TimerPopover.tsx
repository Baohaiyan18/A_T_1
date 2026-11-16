import { memo, useState } from "react";
import type { FormEvent, RefObject } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Popover } from "@astryxdesign/core/Popover";
import { TextInput } from "@astryxdesign/core/TextInput";
import { clock, parseClock } from "../lib/timer";
import { activeTab, useStore } from "../state/store";

/** Đặt mốc giờ và đặt lại đồng hồ của tab đang chọn. */
function TimerForm({ onDone }: { onDone: () => void }) {
  const id = useStore((s) => s.activeId);
  const targetSec = useStore((s) => activeTab(s).targetSec);
  const started = useStore((s) => s.timers[s.activeId] !== undefined);
  const setTabTarget = useStore((s) => s.setTabTarget);
  const resetTimer = useStore((s) => s.resetTimer);
  const [value, setValue] = useState(() => clock(targetSec));
  const [invalid, setInvalid] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const sec = parseClock(value);
    if (sec === null) {
      setInvalid(true);
      return;
    }
    setTabTarget(id, sec);
    onDone();
  };

  return (
    <form className="timer-form" onSubmit={submit}>
      <TextInput
        label="Mốc giờ (phút:giây, 0 = tắt đếm ngược)"
        value={value}
        placeholder="10:00"
        status={invalid ? { type: "error", message: "Nhập dạng phút:giây, ví dụ 5:30" } : undefined}
        onChange={(v: string) => {
          setValue(v);
          setInvalid(false);
        }}
      />
      <div className="timer-actions">
        <Button
          type="button"
          variant="secondary"
          label="Đặt lại đồng hồ"
          isDisabled={!started}
          onClick={() => {
            resetTimer(id);
            onDone();
          }}
        />
        <Button type="submit" variant="primary" label="Đặt mốc" />
      </div>
    </form>
  );
}

/** Popover mở khi bấm đồng hồ trên khung xem trước. */
export const TimerPopover = memo(function TimerPopover({
  anchorRef,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      anchorRef={anchorRef as RefObject<HTMLElement>}
      isOpen={open}
      onOpenChange={setOpen}
      placement="below"
      alignment="end"
      width={300}
      label="Đồng hồ đọc"
      content={open && <TimerForm onDone={() => setOpen(false)} />}
    />
  );
});
