import AuthForm from "../AuthForm";
import { signup } from "../auth-actions";

export const metadata = { title: "アカウント作成｜古文単語400" };

export default function SignupPage() {
  return <AuthForm mode="signup" action={signup} />;
}
