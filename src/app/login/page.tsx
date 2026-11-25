import AuthForm from "../AuthForm";
import { login } from "../auth-actions";

export const metadata = { title: "ログイン｜古典学習帳" };

export default function LoginPage() {
  return <AuthForm mode="login" action={login} />;
}
