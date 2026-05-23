import { motorStatusLabel } from "@/lib/status";

export function MotorSummary({
  motorCode,
  model,
  status,
  currentLocation
}: {
  motorCode: string;
  model: string;
  status: string;
  currentLocation: string | null;
}) {
  return (
    <div className="motor-summary">
      <strong>{motorCode}</strong>
      <span>{model}</span>
      <span>{motorStatusLabel(status)}</span>
      <span>{currentLocation ?? "-"}</span>
    </div>
  );
}
