"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { toast as sonnerToast } from "sonner";

import { cn } from "@/lib/utils";

const iconsByType: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4" />,
  error: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

export function toast(props: Omit<ToastProps, "id">) {
  return sonnerToast.custom((id) => (
    <Toast description={props.description} id={id} type={props.type} />
  ));
}

function Toast(props: ToastProps) {
  const { id, type, description } = props;

  const descriptionRef = useRef<HTMLDivElement>(null);
  const [multiLine, setMultiLine] = useState(false);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) {
      return;
    }

    const update = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight);
      const lines = Math.round(el.scrollHeight / lineHeight);
      setMultiLine(lines > 1);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex w-full justify-center">
      <div
        className={cn(
          "flex w-full max-w-md flex-row gap-3 rounded-lg bg-zinc-100 p-3 text-zinc-950 shadow-lg",
          multiLine ? "items-start" : "items-center"
        )}
        data-testid="toast"
        key={id}
      >
        <div
          className={cn(
            "rounded-full bg-white/80 p-1",
            type === "error"
              ? "text-red-600"
              : type === "success"
                ? "text-green-600"
                : "text-blue-600",
            { "mt-1": multiLine }
          )}
        >
          {iconsByType[type]}
        </div>
        <div className="text-sm" ref={descriptionRef}>
          {description}
        </div>
      </div>
    </div>
  );
}

type ToastType = "success" | "error" | "info";

type ToastProps = {
  id: string | number;
  type: ToastType;
  description: string;
};
