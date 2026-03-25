import { TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

const maxSwipeOffset = 112;
const deleteThreshold = 82;

export const SwipeableNotificationCard = ({
  badge,
  deleting = false,
  message,
  onDelete,
  timestamp,
  title,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const offsetRef = useRef(0);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef(null);
  const startXRef = useRef(0);

  const updateOffset = (value) => {
    offsetRef.current = value;
    setOffsetX(value);
  };

  const finishSwipe = async () => {
    draggingRef.current = false;

    if (offsetRef.current <= -deleteThreshold) {
      updateOffset(-maxSwipeOffset);
      await onDelete?.();
      return;
    }

    updateOffset(0);
  };

  const handlePointerDown = (event) => {
    if (deleting) {
      return;
    }

    draggingRef.current = true;
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!draggingRef.current || pointerIdRef.current !== event.pointerId) {
      return;
    }

    const delta = event.clientX - startXRef.current;
    if (delta < 0) {
      updateOffset(Math.max(delta, -maxSwipeOffset));
      return;
    }

    updateOffset(0);
  };

  const handlePointerUp = async (event) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    pointerIdRef.current = null;
    await finishSwipe();
  };

  const handlePointerCancel = () => {
    draggingRef.current = false;
    pointerIdRef.current = null;
    updateOffset(0);
  };

  useEffect(() => {
    if (!deleting) {
      updateOffset(0);
    }
  }, [deleting]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center gap-2 rounded-2xl bg-[#ff5a67] text-xs font-semibold uppercase tracking-[0.16em] text-white">
        <TrashIcon className="h-4 w-4" />
        <span>{deleting ? "Wait" : "Delete"}</span>
      </div>

      <div
        className={`relative rounded-2xl bg-staps-mist p-4 transition-transform duration-200 ${
          deleting ? "opacity-70" : ""
        }`}
        style={{ transform: `translateX(${offsetX}px)`, touchAction: "pan-y" }}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">{title}</p>
          {badge ? (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#5a49d6]">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-staps-ink/65">{message}</p>
        {timestamp ? (
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-staps-ink/45">
            {timestamp}
          </p>
        ) : null}
      </div>
    </div>
  );
};
