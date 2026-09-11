// ============================================
// React Hook Form + Zod — same pattern as Signup.tsx:
// zodResolver connects the Zod schema to RHF, so every
// field validates automatically on blur/submit.
// ============================================
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/auth-context";
import { useHttpClient } from "../../hooks/http-hook";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { loginSchema, type LoginInfo } from "../../schemas/login";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import { inputClass } from "../../components/Formfield/inputClass";

const Login = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const { sendRequest } = useHttpClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInfo>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: LoginInfo) => {
    // TODO: wire this up to POST /api/users/login
    setServerError(null);
    try {
      const responseData = await sendRequest(
        import.meta.env.VITE_BACKEND_URL + "/users/login",
        "POST",
        JSON.stringify(data),
        { "Content-Type": "application/json" },
      );
      auth.login(
        responseData.userId,
        responseData.token,
        undefined,
        responseData.name,
        responseData.image,
      );
      navigate("/relay");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed.");
    }
    console.log(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">💬</p>
          <h1 className="text-3xl font-bold text-white mb-2">Login</h1>
          <p className="text-gray-400 text-sm">Welcome back to ChatFlow</p>
        </div>

        <Card>
          {serverError && (
            <p className="text-red-400 text-sm text-center mb-4">
              {serverError}
            </p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Email" error={errors.email}>
              <input
                {...register("email")}
                type="email"
                placeholder="john@example.com"
                className={inputClass(!!errors.email)}
                autoFocus
              />
            </FormField>

            <FormField label="Password" error={errors.password}>
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className={inputClass(!!errors.password)}
              />
            </FormField>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-violet-500 hover:bg-violet-400 disabled:opacity-50
                         text-white font-bold py-3 rounded-xl transition-colors"
            >
              {isSubmitting ? "Logging in..." : "Login →"}
            </button>
          </form>
          <div className="text-center my-4">
            <Link
              to="/forgot-password"
              className="text-blue-600 text-sm hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <p className="text-center text-gray-400 text-sm mt-6">
            No Account?{" "}
            <Link
              to="/signup"
              className="text-violet-400 hover:text-violet-300 font-medium"
            >
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Login;
