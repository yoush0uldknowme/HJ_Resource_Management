"use client";

import { useState } from "react";
import { ContinuousScanner } from "@/components/continuous-scanner";

type Props = {
  mode: "inbound" | "outbound" | "request" | "executeApproved";
  /** 出库模式需要 */
  issuedBy?: string;
  vehicle?: string;
  /** 申请模式需要 */
  targetPerson?: string;
  destination?: string;
  remark?: string;
  label?: string;
};

export function ContinuousScanButton({
  mode,
  issuedBy,
  vehicle,
  targetPerson,
  destination,
  remark,
  label = "📷 连续扫码"
}: Props) {
  const [show, setShow] = useState(false);

  // 出库模式需要先填好出库人和车辆
  const outboundReady =
    mode !== "outbound" || (!!issuedBy && !!vehicle);

  // 申请模式需要先填好领用人和车辆
  const requestReady =
    mode !== "request" || (!!targetPerson && !!destination);

  // executeApproved 模式不需要额外信息
  const ready = outboundReady && requestReady;

  return (
    <>
      <button
        className="button mobile-primary-action"
        type="button"
        disabled={!ready}
        onClick={() => setShow(true)}
        style={{
          background: "var(--tech)",
          borderColor: "var(--tech)",
          color: "#08201d",
          fontWeight: 900,
          opacity: ready ? 1 : 0.5,
          cursor: ready ? "pointer" : "not-allowed"
        }}
      >
        {label}
      </button>
      {!ready && mode === "outbound" ? (
        <small className="muted" style={{ fontSize: "12px", marginTop: "-8px" }}>
          请先填写出库人和车辆信息
        </small>
      ) : null}
      {!ready && mode === "request" ? (
        <small className="muted" style={{ fontSize: "12px", marginTop: "-8px" }}>
          请先填写领用人和车辆信息
        </small>
      ) : null}
      {show ? (
        <ContinuousScanner
          mode={mode}
          issuedBy={issuedBy}
          vehicle={vehicle}
          targetPerson={targetPerson}
          destination={destination}
          remark={remark}
          onClose={() => setShow(false)}
        />
      ) : null}
    </>
  );
}
