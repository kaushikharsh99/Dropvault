import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const AuthModal = ({ isOpen, onClose, defaultTab = "signin" }) => {
  const { loginWithGoogle, signUpWithEmail, signInWithEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    setError("");
    try {
      if (provider === 'google') await loginWithGoogle();
      onClose();
    } catch (err) {
      console.error(`${provider} Login Error:`, err);
      if (err.code === 'auth/operation-not-allowed') {
        setError(`Sign-in with ${provider} is not enabled in Firebase Console.`);
      } else if (err.code === 'auth/popup-blocked') {
        setError("Popup blocked by browser. Please enable popups for this site.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Login popup was closed before completion.");
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError("An account already exists with the same email but different login method.");
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signUpWithEmail(email, password, displayName);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmail(email, password);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-accent/5 p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-center">Welcome to DropVault</DialogTitle>
            <DialogDescription className="text-center">
              Your personal knowledge vault awaits.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <div className="space-y-4">
                <form onSubmit={handleEmailSignIn} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  {error && <p className="text-xs text-destructive text-center">{error}</p>}
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={loading} className="w-full py-6 hover:bg-primary/5 border-primary/10 gap-3">
                  <GoogleIcon />
                  <span className="font-semibold">Continue with Google</span>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4">
                <form onSubmit={handleEmailSignUp} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="John Doe" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email-signup">Email</Label>
                    <Input id="email-signup" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password-signup">Password</Label>
                    <Input id="password-signup" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  {error && <p className="text-xs text-destructive text-center">{error}</p>}
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or create with</span>
                  </div>
                </div>

                <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={loading} className="w-full py-6 hover:bg-primary/5 border-primary/10 gap-3">
                  <GoogleIcon />
                  <span className="font-semibold">Continue with Google</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;