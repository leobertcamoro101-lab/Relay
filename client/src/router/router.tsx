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
    ],
  },
];

const router = createBrowserRouter(routes);

export default router;
