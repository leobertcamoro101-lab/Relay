import { useContext, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AuthContext } from "../../context/auth-context";
import { useHttpClient } from "../../hooks/useHttpClient";
import { changePasswordSchema, type ChangePasswordInfo } from "../../schemas/changePassword";
import FormField from "../../components/FormField";
import { inputClass } from "../../components/Formfield/inputClass";
import Card from "../../components/Card";

const ChangePassword = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const { sendRequest } = useHttpClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInfo>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
  });

  const onSubmit = async (data: ChangePasswordInfo) => {
    setServerError(null);
    try {
      await sendRequest(
        `${import.meta.env.VITE_BACKEND_URL}/users/${auth.userId}/password`,
        "PATCH",
        JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
      );
      setSubmitted(true);
      reset();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not update password.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-relay-bg pb-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/profile")}
          className="inline-flex items-center gap-1 text-relay-ink-subtle hover:text-relay-ink text-sm mb-2 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <Card>
          {submitted ? (
            <div className="text-center py-2 space-y-4">
              <p className="text-relay-online text-sm font-medium">Password updated successfully.</p>
              {/* Changing the password ends every existing session (the server
                  rejects tokens made for the old password), this one included,
                  so send the user back to log in with the new one. */}
              <p className="text-relay-ink-subtle text-sm">
                For your security you've been signed out everywhere. Please log in with your new password.
              </p>
              <button
                onClick={() => auth.logout()}
                className="w-full bg-relay-accent hover:bg-relay-accent-ink text-white
                           font-bold py-3 rounded-xl transition-colors"
              >
                Log in again →
              </button>
            </div>
          ) : (
            <>
              {serverError && (
                <p role="alert" className="text-red-600 text-sm text-center mb-4">{serverError}</p>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <FormField label="Current password" error={errors.currentPassword}>
                  <input
                    {...register("currentPassword")}
                    type="password"
                    placeholder="••••••••"
                    className={inputClass(!!errors.currentPassword)}
                    autoComplete="current-password"
                    autoFocus
                  />
                </FormField>

                <FormField
                  label="New password"
                  error={errors.newPassword}
                  hint="8+ characters, with an uppercase letter, a number, and a special character"
                >
                  <input
                    {...register("newPassword")}
                    type="password"
                    placeholder="••••••••"
                    className={inputClass(!!errors.newPassword)}
                    autoComplete="new-password"
                  />
                </FormField>

                <FormField label="Confirm new password" error={errors.confirmNewPassword}>
                  <input
                    {...register("confirmNewPassword")}
                    type="password"
                    placeholder="••••••••"
                    className={inputClass(!!errors.confirmNewPassword)}
                    autoComplete="new-password"
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-relay-accent hover:bg-relay-accent-ink disabled:opacity-50
                             text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {isSubmitting ? "Updating..." : "Update password →"}
                </button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ChangePassword;