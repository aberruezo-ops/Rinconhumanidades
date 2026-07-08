"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildWhatsappLink } from "@/lib/domain/whatsapp";
import { formatDateEs } from "@/lib/domain/dates";
import { REMINDER_URGENCY_STYLES, type ReminderUrgency } from "@/lib/domain/agendas";

export function WhatsappButton({
  phone,
  message,
  sentAt,
  onMarkSent,
  urgency,
}: {
  phone: string;
  message: string;
  sentAt: string | null;
  onMarkSent: () => Promise<unknown>;
  urgency?: ReminderUrgency;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const colorClasses = urgency ? REMINDER_URGENCY_STYLES[urgency] : "bg-[#25D366]/15 text-[#0b6e4f] hover:bg-[#25D366]/25";

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          window.open(buildWhatsappLink(phone, message), "_blank", "noopener,noreferrer");
          startTransition(async () => {
            await onMarkSent();
            router.refresh();
          });
        }}
        className={`rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${colorClasses}`}
      >
        💬 {sentAt ? "Reavisar" : "Avisar"}
      </button>
      {sentAt && <span className="text-[10px] text-slate-400">Avisado {formatDateEs(sentAt.slice(0, 10))}</span>}
    </div>
  );
}
