
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import {
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '' },
  });

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    // If user is logged in (and not anonymous), redirect to home
    if (!isUserLoading && user) {
        router.push('/');
    }
    // If no user and not loading, try to sign in anonymously
    else if (!isUserLoading && !user && auth) {
        signInAnonymously(auth).catch((err) => {
            console.error("Anonymous sign-in failed", err);
            setError("Could not start a guest session. Please try again.");
        });
    }
  }, [user, isUserLoading, auth, router]);

  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
    if (!auth) return;
    setLoading(true);
    setError(null);

    const currentUser = auth.currentUser;
    const credential = EmailAuthProvider.credential(values.email, values.password);

    try {
        if (currentUser && currentUser.isAnonymous) {
            // Link anonymous account to the new email/password account
            await linkWithCredential(currentUser, credential);
        } else {
            // Or create a new user if there's no session
            await createUserWithEmailAndPassword(auth, values.email, values.password);
        }
        router.push('/'); // Redirect on successful sign-up/link
    } catch (err: any) {
        setError(getFriendlyErrorMessage(err.code));
    } finally {
        setLoading(false);
    }
  };

  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push('/');
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.code));
    } finally {
        setLoading(false);
    }
  };
  
  const getFriendlyErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email address is already in use by another account.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password. Please try again.';
      case 'auth/weak-password':
        return 'The password is too weak. Please use at least 6 characters.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };


  if (isUserLoading || user) {
      return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-black">
      <Card className="w-full max-w-sm bg-white/90">
        <CardHeader className="text-center">
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in or create an account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" placeholder="m@example.com" {...signInForm.register('email')} />
                   {signInForm.formState.errors.email && <p className="text-xs text-red-600">{signInForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input id="signin-password" type="password" {...signInForm.register('password')} />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="m@example.com" {...signUpForm.register('email')} />
                   {signUpForm.formState.errors.email && <p className="text-xs text-red-600">{signUpForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" {...signUpForm.register('password')} />
                   {signUpForm.formState.errors.password && <p className="text-xs text-red-600">{signUpForm.formState.errors.password.message}</p>}
                </div>
                 {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating Account...' : 'Create Account'}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
