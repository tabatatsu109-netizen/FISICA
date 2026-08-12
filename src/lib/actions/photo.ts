"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

const MAX_DATA_URL_LENGTH = 900_000; // 約650KB(クライアント側で縮小済み想定)

export async function savePhoto(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("unauthorized");

  const photoData = String(formData.get("photoData") ?? "");
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(photoData)) throw new Error("invalid image");
  if (photoData.length > MAX_DATA_URL_LENGTH) throw new Error("image too large");

  // 選手は自分の写真のみ、監督は任意の選手の写真を設定できる
  let targetUserId = session.userId;
  if (session.role === "COACH") {
    const requested = String(formData.get("userId") ?? "");
    if (requested) targetUserId = requested;
  }

  await prisma.playerProfile.update({
    where: { userId: targetUserId },
    data: { photoData },
  });

  revalidatePath("/player");
  revalidatePath("/coach");
}
