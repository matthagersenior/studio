"use client";

import { auth } from "@/firebase/client";
import { onAuthStateChanged, type User } from "firebase/auth";
import { type ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/firebase/provider";

const protectedRoutes = ["/", "/gallery"];
const publicRoutes = ["/login", "/signup"];

export default function FirebaseAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;

    const isProtectedRoute = protectedRoutes.includes(pathname);
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!user && isProtectedRoute) {
      router.push("/login");
    } else if (user && isPublicRoute) {
      router.push("/");
    }
  }, [user, isUserLoading, pathname, router]);
  
  // This logic allows rendering children on server during SSR, and then client-side routing kicks in
  const isProtectedRoute = protectedRoutes.includes(pathname);
  if (isUserLoading && isProtectedRoute) {
      return null; // Or a loading spinner
  }

  return <>{children}</>;
}
