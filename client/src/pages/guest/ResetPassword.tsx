import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useHttpClient } from "../../hooks/http-hook";
import { resetPasswordSchema, type ResetPasswordInfo } from "../../schemas/resetPassword";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import { inputClass } from "../../components/Formfield/inputClass";

const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { sendRequest } = useHttpClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInfo>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
  });

  const onSubmit = async (data: ResetPasswordInfo) => {
    setServerError(null);
    try {
      await sendRequest(
        import.meta.env.VITE_BACKEND_URL + "/users/reset-password",
        "POST",
        JSON.stringify({ token, password: data.password }),
        { "Content-Type": "application/json" },
      );
      setSubmitted(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">💬</p>
          <h1 className="text-3xl font-bold text-white mb-2">Reset password</h1>
          <p className="text-gray-400 text-sm">Choose a new password for your account</p>
        </div>

        <Card>
          {submitted ? (
            <div className="text-center py-2 space-y-4">
              <p className="text-green-400 text-sm">
                Your password has been reset successfully.
              </p>
              <button
                onClick={() => navigate("/")}
                className="w-full bg-violet-500 hover:bg-violet-400 text-white
                           font-bold py-3 rounded-xl transition-colors"
              >
                Go to Login →
              </button>
            </div>
          ) : (
            <>
              {serverError && (
                <p className="text-red-400 text-sm text-center mb-4">
                  {serverError}
                </p>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  label="New password"
                  error={errors.password}
                  hint="8+ characters, with an uppercase letter, a number, and a special character"
                >
                  <input
                    {...register("password")}
                    type="password"
                    placeholder="••••••••"
                    className={inputClass(!!errors.password)}
                    autoFocus
                  />
                </FormField>

                <FormField label="Confirm new password" error={errors.confirmPassword}>
                  <input
                    {...register("confirmPassword")}
                    type="password"
                    placeholder="••••••••"
                    className={inputClass(!!errors.confirmPassword)}
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-violet-500 hover:bg-violet-400 disabled:opacity-50
                             text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {isSubmitting ? "Resetting..." : "Reset password →"}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-gray-400 text-sm mt-6">
            <Link to="/" className="text-violet-400 hover:text-violet-300 font-medium">
              Back to Login
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;