import { redirect } from "next/navigation";
import { loginAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const params = await searchParams;

  return (
    <main className="login-page">
      <section className="panel login-card">
        <div className="page-head">
          <div>
            <h1>登录</h1>
            <p>默认管理员：admin / admin123</p>
          </div>
        </div>
        <form className="form" action={loginAction}>
          <div className="field">
            <label htmlFor="username">用户名</label>
            <input id="username" name="username" required defaultValue="admin" />
          </div>
          <div className="field">
            <label htmlFor="password">密码</label>
            <input id="password" name="password" type="password" required defaultValue="admin123" />
          </div>
          {params.error ? <p className="error">用户名或密码不正确。</p> : null}
          <button className="button" type="submit">
            登录系统
          </button>
        </form>
      </section>
    </main>
  );
}
