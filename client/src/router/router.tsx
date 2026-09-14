import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
} from "react-router-dom";
import RootLayout from "../Navigation/RootLayout";
import RedirectIfAuthenticated from "../Navigation/RedirectIfAuthenticated";
import Login from "../pages/guest/Login";
import Signup from "../pages/guest/Signup";
import ChatInterface from "../Navigation/ChatInterface";
import RequireAuth from "../Navigation/RequireAuth";
import Profile from "../pages/authenticated/Profile";
import EditProfile from "../pages/authenticated/EditProfile";
import ForgotPassword from "../pages/guest/ForgotPassword";
import ResetPassword from "../pages/guest/ResetPassword";
import ChangePassword from "../pages/authenticated/ChangePassword";


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
