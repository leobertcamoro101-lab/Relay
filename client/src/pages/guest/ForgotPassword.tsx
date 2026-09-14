import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useHttpClient } from "../../hooks/http-hook";
import { forgotPasswordSchema, type ForgotPasswordInfo } from "../../schemas/forgotPassword";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import { inputClass } from "../../components/Formfield/inputClass";

const ForgotPassword = () => {
  const { sendRequest } = useHttpClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInfo>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: ForgotPasswordInfo) => {
    setServerError(null);
    try {
      await sendRequest(
        import.meta.env.VITE_BACKEND_URL + "/users/forgot-password",
        "POST",
        JSON.stringify(data),
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
          <h1 className="text-3xl font-bold text-white mb-2">Forgot password</h1>
          <p className="text-gray-400 text-sm">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <Card>
          {submitted ? (
            <div className="text-center py-2">
              <p className="text-green-400 text-sm">
                If that email exists, a reset link has been sent. Check your inbox.
              </p>
            </div>
          ) : (
            <>
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

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-violet-500 hover:bg-violet-400 disabled:opacity-50
                             text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {isSubmitting ? "Sending..." : "Send reset link →"}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-gray-400 text-sm mt-6">
            Remembered your password?{" "}
            <Link to="/" className="text-violet-400 hover:text-violet-300 font-medium">
              Login
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;