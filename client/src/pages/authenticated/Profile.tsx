import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/auth-context";
import { useHttpClient } from "../../hooks/http-hook";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Avatar from "../../components/Avatar";
import Card from "../../components/Card";
import LoadingSpinner from "../../components/LoadingSpinner";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  birthday: string;
  gender: string;
  email: string;
  image: string;
}

const Profile = () => {
  const auth = useContext(AuthContext);
  const { isLoading, error, sendRequest } = useHttpClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const responseData = await sendRequest(
          `${import.meta.env.VITE_BACKEND_URL}/users/${auth.userId}`,
          "GET",
          null,
          { Authorization: `Bearer ${auth.token}` },
        );
        setProfile(responseData.user);
      } catch {
        // error already captured by useHttpClient's error state
      }
    };
    if (auth.userId && auth.token) fetchProfile();
  }, [auth.userId, auth.token, sendRequest]);

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        {" "}
        <LoadingSpinner />{" "}
      </div>
    );
  if (error) return <p className="text-red-400 text-center">{error}</p>;
  if (!profile) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-md">
      <Link
        to="/relay"
        className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4"
      >
        <ArrowLeft size={16} /> Back
      </Link>
      <Card>
        <div className="flex flex-col items-center gap-4">
          <Avatar image={profile.image} alt={profile.firstName} width="96px" />
          <h1 className="text-2xl font-bold text-white">
            {profile.firstName} {profile.lastName}
          </h1>
          <div className="w-full text-gray-300 text-sm space-y-2">
            <p>
              <span className="text-gray-500">Email:</span> {profile.email}
            </p>
            <p>
              <span className="text-gray-500">Birthday:</span>{" "}
              {new Date(profile.birthday).toLocaleDateString()}
            </p>
            <p>
              <span className="text-gray-500">Gender:</span> {profile.gender}
            </p>
          </div>
          <Link
            to="/profile/edit"
            className="w-full text-center bg-violet-500 hover:bg-violet-400 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Edit Profile
          </Link>
          <Link
            to="/profile/change-password"
            className="w-full text-center bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Change Password
          </Link>
        </div>
      </Card>
      </div>
    </div>
  );
};

export default Profile;
