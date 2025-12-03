"use client";

import { auth } from "@/firebase";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { type ReactNode, useEffect, useState } from "react";

export default function FirebaseAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return <>{children}</>;
}
