"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markWhatsappSentAction } from "@/lib/actions/appointments";
import { buildWhatsappLink } from "@/lib/domain/whatsapp";
import { formatDateEs } from "@/lib/domain/dates";

export function WhatsappButton({
  appointmentId,
  phone,
  message,
  sentAt,
}: {
  appointmentId: string;
  phone: string;
  message: string;
  sentAt: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          window.open(buildWhatsappLink(phone, message), "_blank", "noopener,noreferrer");
          startTransition(async () => {
            await markWhatsappSentAction(appointmentId);
            router.refresh();
          });
        }}
        className="rounded-full bg-[#25D366]/15 px-2.5 py-1 text-xs font-medium text-[#0b6e4f] hover:bg-[#25D366]/25 disabled:opacity-60"
      >
        💬 {sentAt ? "Reavisar" : "Avisar"}
      </button>
      {sentAt && <span className="text-[10px] text-slate-400">Avisado {formatDateEs(sentAt.slice(0, 10))}</span>}
    </div>
  );
}
