"use client";

import { useState } from "react";
import { batchCreateOutboundRequestAction } from "@/lib/request/actions";

type ModelInfo = {
  model: string;
  stock: number;
};

export function BatchRequestForm({ models }: { models: ModelInfo[] }) {
  const [rows, setRows] = useState([{ id: 0 }]);

  const addRow = () => setRows((prev) => [...prev, { id: Date.now() }]);
  const removeRow = (id: number) => setRows((prev) => prev.filter((r) => r.id !== id));

  return (
    <form className="panel form mobile-operation-form" action={batchCreateOutboundRequestAction}>
      <input type="hidden" name="returnPath" value="/mobile/outbound/batch-request" />

      <div className="field">
        <label>需要的电机型号和数量</label>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "8px",
              alignItems: "end"
            }}
          >
            <div style={{ flex: 2 }}>
              <select
                name="models[]"
                required
                defaultValue=""
                style={{ width: "100%", minHeight: "48px" }}
              >
                <option value="" disabled>选择型号</option>
                {models.map((m) => (
                  <option value={m.model} key={m.model}>
                    {m.model}（在库 {m.stock}）
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <input
                name="quantities[]"
                type="number"
                min="1"
                max="99"
                defaultValue="1"
                required
                style={{ width: "100%", minHeight: "48px" }}
              />
            </div>
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                style={{
                  flex: "0 0 auto",
                  minHeight: "48px",
                  padding: "0 12px",
                  border: "1px solid var(--danger)",
                  borderRadius: "8px",
                  background: "#fff",
                  color: "var(--danger)",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={addRow}
          style={{
            minHeight: "42px",
            padding: "0 16px",
            border: "1px dashed var(--primary)",
            borderRadius: "8px",
            background: "transparent",
            color: "var(--primary)",
            fontWeight: 700,
            cursor: "pointer",
            width: "100%"
          }}
        >
          + 添加另一种型号
        </button>
      </div>

      <div className="field">
        <label htmlFor="targetPerson">领用人</label>
        <input id="targetPerson" name="targetPerson" required placeholder="请输入姓名" />
      </div>
      <div className="field">
        <label htmlFor="destination">车辆 / 去向</label>
        <input id="destination" name="destination" required placeholder="例如：英雄车" />
      </div>
      <div className="field">
        <label htmlFor="remark">备注（选填）</label>
        <textarea id="remark" name="remark" placeholder="用途或其他说明" rows={2} />
      </div>
      <button className="button mobile-primary-action" type="submit">
        批量提交申请
      </button>
    </form>
  );
}
