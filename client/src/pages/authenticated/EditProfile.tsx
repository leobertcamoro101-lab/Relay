import { useContext, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AuthContext } from "../../context/auth-context";
import { useHttpClient } from "../../hooks/http-hook";
import { editProfileSchema, type EditProfileInfo } from "../../schemas/editProfile";
import FormField from "../../components/FormField";
import { inputClass } from "../../components/Formfield/inputClass";
import Card from "../../components/Card";
import Avatar from "../../components/Avatar";
import LoadingSpinner from "../../components/LoadingSpinner";

const EditProfile = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const { isLoading, error, sendRequest } = useHttpClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditProfileInfo>({ resolver: zodResolver(editProfileSchema) });

  // Pre-fill the form with the current profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const responseData = await sendRequest(
          `${import.meta.env.VITE_BACKEND_URL}/users/${auth.userId}`,
          "GET",
          null,
          { Authorization: `Bearer ${auth.token}` }
        );
        reset({
          firstName: responseData.user.firstName,
          lastName: responseData.user.lastName,
          birthday: responseData.user.birthday.slice(0, 10), // ISO string → YYYY-MM-DD for the date input
          gender: responseData.user.gender,
          email: responseData.user.email,
        });
        setCurrentImage(responseData.user.image);
      } catch {
        // error already captured by useHttpClient's error state
      }
    };
    if (auth.userId && auth.token) fetchProfile();
  }, [auth.userId, auth.token, sendRequest, reset]);

  const onSubmit = async (data: EditProfileInfo) => {
    setServerError(null);

    const formData = new FormData();
    formData.append("firstName", data.firstName);
    formData.append("lastName", data.lastName);
    formData.append("birthday", data.birthday);
    formData.append("gender", data.gender);
    formData.append("email", data.email);

    const file = fileInputRef.current?.files?.[0];
    if (file) formData.append("image", file);

    try {
      const responseData = await sendRequest(
        `${import.meta.env.VITE_BACKEND_URL}/users/${auth.userId}`,
        "PATCH",
        formData,
        { Authorization: `Bearer ${auth.token}` } // no Content-Type — see note below
      );
      auth.updateUserInfo(responseData.user.name, responseData.user.image);
      navigate("/profile");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Update failed.");
    }
  };

  if (isLoading && !currentImage)
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        {" "}
        <LoadingSpinner />{" "}
      </div>
    );

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
          {(serverError || error) && (
            <p className="text-red-400 text-sm text-center mb-4">
              {serverError ?? error}
            </p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <Avatar image={currentImage} alt="Current avatar" width="96px" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg"
                className="text-xs text-gray-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="First Name" error={errors.firstName}>
                <input
                  {...register("firstName")}
                  className={inputClass(!!errors.firstName)}
                />
              </FormField>
              <FormField label="Last Name" error={errors.lastName}>
                <input
                  {...register("lastName")}
                  className={inputClass(!!errors.lastName)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Birthday" error={errors.birthday}>
                <input
                  {...register("birthday")}
                  type="date"
                  className={inputClass(!!errors.birthday)}
                />
              </FormField>
              <FormField label="Gender" error={errors.gender}>
                <select
                  {...register("gender")}
                  className={inputClass(!!errors.gender)}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="custom">Custom</option>
                </select>
              </FormField>
            </div>

            <FormField label="Email" error={errors.email}>
              <input
                {...register("email")}
                type="email"
                className={inputClass(!!errors.email)}
              />
            </FormField>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default EditProfile;