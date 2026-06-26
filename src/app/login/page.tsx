import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/lib/auth/actions";
import { clearLoginCookie } from "@/lib/auth/cookies";
import { defaultLandingPath, getCurrentUser, sanitizeRedirectPath } from "@/lib/auth/index";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; mode?: string; next?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = sanitizeRedirectPath(params.next);
  const mode = params.mode === "admin" || params.mode === "operator" ? params.mode : null;
  const isPermError = params.error === "perm";

  // 权限不足被踢回来时，清除旧 cookie 让用户可以换账号，避免死循环
  if (isPermError) await clearLoginCookie();

  // 有错误时不要自动跳转（否则会死循环）
  const user = !params.error ? await getCurrentUser() : null;
  if (user) redirect(redirectTo ?? defaultLandingPath(user));

  const isOperator = mode === "operator";
  const title = isOperator ? "用户端登录" : "管理端登录";
  const hint = isOperator ? "请使用操作员账号登录" : "请使用管理员账号登录";
  const defaultUsername = isOperator ? "operator" : "admin";
  const operatorNext = redirectTo ?? "/user";
  const adminNext = redirectTo ?? "/admin";

  if (!mode) {
    return (
      <main className="login-page">
        <section className="panel login-card login-choice-card">
          <div className="page-head">
            <div>
              <h1>选择入口</h1>
              <p>电脑浏览器分为管理端和用户端；手机扫码进入手机端，登录后按账号权限解锁功能。</p>
            </div>
          </div>
          <div className="login-choice-grid">
            <Link className="login-choice" href={`/login?mode=operator&next=${encodeURIComponent(operatorNext)}`}>
              <span className="login-choice-kicker">电脑 / 普通用户</span>
              <strong>用户端</strong>
              <span>查看电机列表，执行入库、归还和出库相关操作。</span>
            </Link>
            <Link className="login-choice secondary" href={`/login?mode=admin&next=${encodeURIComponent(adminNext)}`}>
              <span className="login-choice-kicker">电脑 / 管理维护</span>
              <strong>管理端</strong>
              <span>管理员建档、编辑、删除、审批和查看日志。</span>
            </Link>
          </div>
          {params.error === "perm"
            ? <p className="error">权限不足，请使用操作员(operator)或管理员(admin)账号登录。</p>
            : params.error
              ? <p className="error">用户名或密码不正确，请重新选择入口登录。</p>
              : null}
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="panel login-card">
        <div className="page-head">
          <div>
            <h1>{title}</h1>
            <p>{hint}</p>
          </div>
        </div>
        <form className="form" action={loginAction}>
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="redirectTo" value={redirectTo ?? (isOperator ? "/user" : "/admin")} />
          <div className="field">
            <label htmlFor="username">用户名</label>
            <input id="username" name="username" required defaultValue={defaultUsername} />
          </div>
          <div className="field">
            <label htmlFor="password">密码</label>
            <input id="password" name="password" type="password" required />
          </div>
          {isPermError
            ? <p className="error">权限不足，请使用操作员(operator)或管理员(admin)账号登录。</p>
            : params.error
              ? <p className="error">用户名或密码不正确。</p>
              : null}
          <button className="button" type="submit">
            {isOperator ? "进入用户端" : "进入管理端"}
          </button>
          <Link className="button secondary" href="/login">
            返回入口选择
          </Link>
        </form>
      </section>
    </main>
  );
}
