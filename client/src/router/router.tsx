import {
  createBrowserRouter,
  // Navigate,
  type RouteObject,
} from "react-router-dom";
import RootLayout from "../Navigation/RootLayout";
import RedirectIfAuthenticated from "../Navigation/RedirectIfAuthenticated";
import RequireAuth from "../Navigation/RequireAuth";
import { Login, Signup, ChatInterface, Profile, EditProfile, ForgotPassword, ResetPassword, ChangePassword } from "./routes-config";
import RouteErrorBoundary from "../components/RouteErrorBoundary";


const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary/>,
    children: [
      {
        index: true,
        element: (
          <RedirectIfAuthenticated>
            <Login />
          </RedirectIfAuthenticated>
        ),
      },
      { path: "signup", element: <Signup /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "reset-password/:token", element: <ResetPassword /> },
      {
        path: "relay",
        element: (
          <RequireAuth>
            <ChatInterface />
          </RequireAuth>
        ),
      },
      // { path: "*", element: <Navigate to="/" replace /> }, // commented to take effect RouteError
      {
        path: "profile",
        element: (
          <RequireAuth>
            <Profile />
          </RequireAuth>
        ),
      },
      {
        path: "profile/edit",
        element: (
          <RequireAuth>
            <EditProfile />
          </RequireAuth>
        ),
      },
      {
        path: "profile/change-password",
        element: (
          <RequireAuth>
            <ChangePassword />
          </RequireAuth>
        ),
      }
    ],
  },
];

const router = createBrowserRouter(routes);

export default router;
