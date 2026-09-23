// ============================================
// React Hook Form + Zod
//
// zodResolver connects Zod schema to RHF.
// Every field is validated by your Zod schema
// automatically on submit and on blur!
// ============================================
import { useContext, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/auth-context";
import { useHttpClient } from "../../hooks/http-hook";
import { personalInfoSchema, type PersonalInfo } from "../../schemas/signup";
import FormField from "../../components/FormField";
import { inputClass } from "../../components/Formfield/inputClass";
import Card from "../../components/Card";


const Signup = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const { sendRequest } = useHttpClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    mode: "onTouched",
  });

  const onSubmit = async (data: PersonalInfo) => {
    setServerError(null);
    try {
      const responseData = await sendRequest(
        import.meta.env.VITE_BACKEND_URL + "/users/signup",
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
      setServerError(err instanceof Error ? err.message : "Signup failed.");
    }
    console.log("Signup data:", data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950 pb-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">💬</p>
          <h1 className="text-3xl font-bold text-white mb-2">Signup</h1>
          <p className="text-gray-400 text-sm">Create your account to get started</p>
        </div>
        <Card>
          {serverError && (
            <p className="text-red-400 text-sm text-center mb-4">
              {serverError}
            </p>
          )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* ...everything else stays exactly the same... */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name" error={errors.firstName}>
              <input
                {...register("firstName")}
                placeholder="John"
                className={inputClass(!!errors.firstName)}
                autoComplete="given-name"
              />
            </FormField>
            <FormField label="Last Name" error={errors.lastName}>
              <input
                {...register("lastName")}
                placeholder="Doe"
                className={inputClass(!!errors.lastName)}
                autoComplete="family-name"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Birthday" error={errors.birthday}>
              <input
                {...register("birthday")}
                type="date"
                className={inputClass(!!errors.birthday)}
                autoComplete="bday"
              />
            </FormField>
            <FormField label="Gender" error={errors.gender}>
              <select
                {...register("gender")}
                defaultValue=""
                className={inputClass(!!errors.gender)}
              >
                <option value="" disabled>Select gender</option>
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
              placeholder="john@example.com"
              className={inputClass(!!errors.email)}
              autoComplete="email"
            />
          </FormField>

          <FormField
            label="Password"
            error={errors.password}
            hint="8+ characters, with an uppercase letter, a number, and a special character"
          >
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              className={inputClass(!!errors.password)}
              autoComplete="new-password"
            />
          </FormField>

          {/* Zod lesson callout */}
          {/* <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3">
            <p className="font-mono text-violet-400 text-xs mb-1">
              // Zod concepts in this step:
            </p>
            <p className="text-gray-400 text-xs font-mono">
              z.string().min().max().transform() • z.number().int().min().max()
              • .optional() • .email()
            </p>
          </div> */}

          <button
            type="submit"
            className="w-full bg-violet-500 hover:bg-violet-400 text-white
                   font-bold py-3 rounded-xl transition-colors"
          >
            Submit
          </button>
        </form>
        
        <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/" className="text-violet-400 hover:text-violet-300 font-medium">
              Login
            </Link> 
          </p>
          </Card>
      </div>
    </div>
  );
};

export default Signup;
