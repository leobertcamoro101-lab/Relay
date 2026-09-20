import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
} from "react-router-dom";
import RootLayout from "../Navigation/RootLayout";
import RedirectIfAuthenticated from "../Navigation/RedirectIfAuthenticated";
import RequireAuth from "../Navigation/RequireAuth";
import { Login, Signup, ChatInterface, Profile, EditProfile, ForgotPassword, ResetPassword, ChangePassword } from "./routes-config";


const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <RedirectIfAuthenticated>
            <Login />
          </RedirectIfAuthenticated>
        ),
      },
      {
        path: "relay",
        element: (
          <RequireAuth>
            <ChatInterface />
          </RequireAuth>
        ),
      },
      { path: "*", element: <Navigate to="/" replace /> },
      { path: "signup", element: <Signup /> },
      { path: "forgot-password", element: <ForgotPassword /> },   // NEW
      { path: "reset-password/:token", element: <ResetPassword /> },   // NEW
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
