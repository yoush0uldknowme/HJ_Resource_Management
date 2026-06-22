import { createOutboundRequestAction } from "@/lib/request/actions";

type ModelOption = {
  model: string;
  count: number;
};

type Props = {
  models: ModelOption[];
  returnPath: string;
};

export function OutboundRequestForm({ models, returnPath }: Props) {
  return (
    <form className="form mobile-operation-form" action={createOutboundRequestAction}>
      <input type="hidden" name="returnPath" value={returnPath} />
      <div className="field">
        <label htmlFor="model">申请型号</label>
        <select id="model" name="model" required defaultValue="">
          <option value="" disabled>
            {models.length ? "选择有库存的型号" : "暂无可选型号"}
          </option>
          {models.map((item) => (
            <option value={item.model} key={item.model}>
              {item.model}（在库 {item.count} 台）
            </option>
          ))}
        </select>
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
        <textarea id="remark" name="remark" placeholder="用途或其他说明" />
      </div>
      <button className="button mobile-primary-action" type="submit">
        提交申请
      </button>
    </form>
  );
}
