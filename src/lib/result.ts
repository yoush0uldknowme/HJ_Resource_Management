export type ActionResultType = "success" | "error";

export type ActionResult = {
  type: ActionResultType;
  title: string;
  message: string;
  motorId?: number;
  motorCode?: string;
};

export function encodeActionResult(result: ActionResult): string {
  const params = new URLSearchParams();
  params.set("type", result.type);
  params.set("title", result.title);
  params.set("message", result.message);
  if (result.motorId) params.set("motorId", String(result.motorId));
  if (result.motorCode) params.set("motorCode", result.motorCode);
  return params.toString();
}

export function decodeActionResult(params: URLSearchParams): ActionResult | null {
  const type = params.get("type");
  const title = params.get("title");
  const message = params.get("message");
  if (type !== "success" && type !== "error") return null;
  if (!title || !message) return null;

  const motorIdText = params.get("motorId");
  return {
    type,
    title,
    message,
    motorId: motorIdText ? Number(motorIdText) : undefined,
    motorCode: params.get("motorCode") ?? undefined
  };
}

/** 从 searchParams Record 中解码 ActionResult */
export function decodeFromSearchParams(
  params: Record<string, string | undefined>
): ActionResult | null {
  const sp = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (v ? [[k, v]] : []))
  );
  return decodeActionResult(sp);
}

/** 构建操作结果 URL（用于 redirect） */
export function resultUrl(pathname: string, result: ActionResult): string {
  return `${pathname}?${encodeActionResult(result)}`;
}
