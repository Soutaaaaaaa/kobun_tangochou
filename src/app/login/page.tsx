import AuthForm from "../AuthForm";
import { login } from "../auth-actions";

export const metadata = { title: "ログイン｜古文単語400" };

export default function LoginPage() {
  return <AuthForm mode="login" action={login} />;
}
