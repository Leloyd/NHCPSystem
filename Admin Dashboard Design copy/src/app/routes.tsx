import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { Posts } from "./components/Posts";
import { PostEditor } from "./components/PostEditor";
import { Media } from "./components/Media";
import { Settings } from "./components/Settings";
import { Login } from "./components/Login";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "posts", Component: Posts },
      { path: "posts/new", Component: PostEditor },
      { path: "posts/edit/:id", Component: PostEditor },
      { path: "media", Component: Media },
      { path: "settings", Component: Settings },
    ],
  },
]);
