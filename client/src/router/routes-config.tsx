import { lazy } from 'react';

export const Login = lazy(()=> import('../pages/guest/Login'));
export const Signup = lazy(()=> import('../pages/guest/Signup'));
export const ChatInterface = lazy(()=> import('../pages/authenticated/ChatInterface'));
export const Profile = lazy(()=> import('../pages/authenticated/Profile'));
export const EditProfile = lazy(()=> import('../pages/authenticated/EditProfile'));
export const ForgotPassword = lazy(()=> import('../pages/guest/ForgotPassword'));
export const ResetPassword = lazy(()=> import('../pages/guest/ResetPassword'));
export const ChangePassword = lazy(()=> import('../pages/authenticated/ChangePassword'));
