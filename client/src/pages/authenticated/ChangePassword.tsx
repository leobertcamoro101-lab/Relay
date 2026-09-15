import { useContext, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AuthContext } from "../../context/auth-context";
import { useHttpClient } from "../../hooks/http-hook";
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950 pb-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/profile")}
          className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <Card>
          {submitted ? (
            <div className="text-center py-2 space-y-4">
              <p className="text-green-400 text-sm">Password updated successfully.</p>
              <button
                onClick={() => navigate("/profile")}
                className="w-full bg-violet-500 hover:bg-violet-400 text-white
                           font-bold py-3 rounded-xl transition-colors"
              >
                Back to Profile →
              </button>
            </div>
          ) : (
            <>
              {serverError && (
                <p className="text-red-400 text-sm text-center mb-4">{serverError}</p>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <FormField label="Current password" error={errors.currentPassword}>
                  <input
                    {...register("currentPassword")}
                    type="password"
                    placeholder="••••••••"
                    className={inputClass(!!errors.currentPassword)}
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
                  />
                </FormField>

                <FormField label="Confirm new password" error={errors.confirmNewPassword}>
                  <input
                    {...register("confirmNewPassword")}
                    type="password"
                    placeholder="••••••••"
                    className={inputClass(!!errors.confirmNewPassword)}
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-violet-500 hover:bg-violet-400 disabled:opacity-50
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