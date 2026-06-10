import { requireCurrentUser } from "@/lib/auth";

export default async function FeedbackPage() {
  await requireCurrentUser();

  return (
    <>
      <div className="page-head page-head-immersive">
        <div>
          <h1>意见反馈</h1>
          <p>记录现场试用中遇到的问题、流程建议和后续想扩展的资源模块。</p>
        </div>
      </div>

      <section className="panel feedback-panel">
        <h2>反馈入口预留</h2>
        <p className="muted">
          当前版本先保留反馈分类入口，后续可以接入问题记录、处理状态和管理员通知。
        </p>
      </section>
    </>
  );
}
