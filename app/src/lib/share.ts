// «Сподели»: список покупок текстом — для Viber, WhatsApp, SMS (системное окно «Поделиться»).

import { Share } from "react-native";
import { track } from "./analytics";
import type { ShoppingList } from "./store";

type Money = (n: number) => string;

export function shoppingText(
  list: Omit<ShoppingList, "checked" | "startedAt">,
  title: string,
  totalLabel: (amount: string) => string,
  m: Money,
) {
  const out: string[] = [`🧺 ${title}`];
  for (const st of list.stores) {
    out.push("");
    out.push(st.subtotal > 0 ? `${st.chain} · ${m(st.subtotal)}` : st.chain);
    if (st.label) out.push(`📍 ${st.label}`);
    for (const l of st.lines)
      out.push(
        `☐ ${l.name}${l.detail ? ` — ${l.detail}` : ""}${l.cost > 0 ? ` · ${m(l.cost)}` : ""}`,
      );
  }
  if (list.total > 0) {
    out.push("");
    out.push(totalLabel(m(list.total)));
  }
  return out.join("\n");
}

export async function shareText(message: string, from: string) {
  try {
    const r = await Share.share({ message });
    if (r.action === Share.sharedAction) track("list_shared", { from });
  } catch {
    // окно «Поделиться» закрыто или недоступно — ничего не делаем
  }
}
