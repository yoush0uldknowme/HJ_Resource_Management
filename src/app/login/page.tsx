import { redirect } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { defaultLandingPath, getCurrentUser, sanitizeRedirectPath } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; mode?: string; next?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = sanitizeRedirectPath(params.next);
  const mode = params.mode === "admin" || params.mode === "operator" ? params.mode : null;
  const user = await getCurrentUser();
  if (user) redirect(redirectTo ?? defaultLandingPath(user));

  const operatorNext = redirectTo ?? "/motors";
  const isOperator = mode === "operator";
  const title = isOperator ? "现场端登录" : "管理端登录";
  const hint = isOperator ? "默认现场账号：viewer / viewer123" : "默认管理员：admin / admin123";
  const defaultUsername = isOperator ? "viewer" : "admin";
  const defaultPassword = isOperator ? "viewer123" : "admin123";

  if (!mode) {
    return (
      <main className="login-page">
        <section className="panel login-card login-choice-card">
          <div className="page-head">
            <div>
              <h1>选择入口</h1>
              <p>管理端用于建档和维护；现场端用于查看列表、入库和出库。</p>
            </div>
          </div>
          <div className="login-choice-grid">
            <Link className="login-choice" href="/login?mode=admin&next=/">
              <strong>管理端</strong>
              <span>管理员登录，进入后台管理。</span>
            </Link>
            <Link className="login-choice" href={`/login?mode=operator&next=${encodeURIComponent(operatorNext)}`}>
              <strong>现场端</strong>
              <span>用户登录，进入电机列表或手机现场入口。</span>
            </Link>
          </div>
          {params.error ? <p className="error">用户名或密码不正确，请重新选择入口登录。</p> : null}
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
          <input type="hidden" name="redirectTo" value={redirectTo ?? (isOperator ? "/motors" : "/")} />
          <div className="field">
            <label htmlFor="username">用户名</label>
            <input id="username" name="username" required defaultValue={defaultUsername} />
          </div>
          <div className="field">
            <label htmlFor="password">密码</label>
            <input id="password" name="password" type="password" required defaultValue={defaultPassword} />
          </div>
          {params.error ? <p className="error">用户名或密码不正确。</p> : null}
          <button className="button" type="submit">
            {isOperator ? "进入现场端" : "进入管理端"}
          </button>
          <Link className="button secondary" href="/login">
            返回入口选择
          </Link>
        </form>
      </section>
    </main>
  );
}
