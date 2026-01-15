'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/clients/supabase';
import Link from 'next/link';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [trialPlan, setTrialPlan] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createBrowserClient();
  }, []);

  useEffect(() => {
    const trial = searchParams.get('trial');
    if (trial) {
      setTrialPlan(trial);
      setIsSignUp(true); // Auto-set to sign up mode for trial
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        // Always show success message for signup, even if there's an error
        // (Supabase may return user data even with some errors)
        if (data?.user) {
          // Check if email confirmation is required
          if (data.user.email_confirmed_at === null) {
            // Email confirmation required - show success message
            setSuccess(
              `Account created successfully! Please check your email (${email}) to confirm your account. Once you've confirmed your email, you can sign in.`
            );
            // Clear the form
            setEmail('');
            setPassword('');
            setIsSignUp(false);
            setLoading(false);
            return;
          } else {
            // Email already confirmed, try to sign in automatically
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

            if (signInError) {
              // If auto sign-in fails, still show success message about email confirmation
              setSuccess(
                `Account created successfully! Please check your email (${email}) to confirm your account before signing in.`
              );
              setEmail('');
              setPassword('');
              setIsSignUp(false);
              setLoading(false);
              return;
            }
          }
        } else if (signUpError) {
          // If signup fails but we don't have user data, check if it's a known error
          // Some Supabase errors might still mean the account was created
          if (signUpError.message.includes('already registered') || 
              signUpError.message.includes('User already registered')) {
            setSuccess(
              `An account with this email already exists. Please check your email (${email}) for a confirmation link, or try signing in instead.`
            );
            setEmail('');
            setPassword('');
            setIsSignUp(false);
            setLoading(false);
            return;
          }
          throw signUpError;
        } else {
          // No user data and no error - show generic success message
          setSuccess(
            `Account creation initiated! Please check your email (${email}) to confirm your account before signing in.`
          );
          setEmail('');
          setPassword('');
          setIsSignUp(false);
          setLoading(false);
          return;
        }
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error('Sign in error:', signInError);
          // Check if it's an email confirmation error
          if (signInError.message.includes('email') && signInError.message.includes('confirm')) {
            throw new Error('Please check your email and confirm your account before signing in.');
      }
          // Check for invalid credentials
          if (signInError.message.includes('Invalid login credentials') || 
              signInError.message.includes('invalid') ||
              signInError.message.includes('Invalid')) {
            throw new Error('Invalid email or password. Please check your credentials and try again.');
          }
          throw signInError;
        }

        // Verify we have a session
        if (!signInData.session) {
          console.error('No session in signInData');
          throw new Error('Sign in failed. Please try again.');
        }

        console.log('Session created:', signInData.session.user.email);
        console.log('Access token:', signInData.session.access_token.substring(0, 20) + '...');
        console.log('All cookies:', document.cookie);

        // Wait a bit for session to be persisted to cookies
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify session is actually set
        const { data: { session: verifiedSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session verification error:', sessionError);
        }
        if (!verifiedSession) {
          console.error('Session not found after sign in');
          throw new Error('Session not established. Please try again.');
        }

        console.log('Session verified:', verifiedSession.user.email);
      }

      // Verify session exists (for both sign up and sign in)
      const { data: { session: finalSession } } = await supabase.auth.getSession();
      if (!finalSession) {
        throw new Error('Session not established. Please try again.');
      }

      // If user came from trial flow, redirect to checkout
      if (trialPlan) {
        try {
          const response = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: trialPlan, trial: true }),
          });
          const data = await response.json();
          if (data.url) {
            window.location.href = data.url;
            return;
          }
        } catch (error) {
          console.error('Error starting trial:', error);
          // Fall through to dashboard redirect
        }
      }

      // Use window.location for a hard redirect to ensure session is read
      // This forces a full page reload which ensures cookies are properly set
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FFF8DC 0%, #ffffff 50%, #FFF8DC 100%)',
        position: 'relative'
      }}
    >
      {/* Legal-themed background pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, #8B4513 0px, #8B4513 1px, transparent 1px, transparent 20px),
            repeating-linear-gradient(-45deg, #8B4513 0px, #8B4513 1px, transparent 1px, transparent 20px),
            radial-gradient(circle at 20% 50%, rgba(201, 162, 77, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(201, 162, 77, 0.1) 0%, transparent 50%)
          `,
          backgroundSize: '40px 40px, 40px 40px, 200px 200px, 200px 200px',
          backgroundPosition: '0 0, 0 0, 0 0, 100% 0'
        }}
      />
      
      {/* Subtle overlay pattern */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230B1F3B' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          opacity: 0.4
        }}
      />

      <div className="max-w-md w-full space-y-8 p-8 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl relative z-10 border" style={{ borderColor: 'rgba(11, 31, 59, 0.1)' }}>
        <div className="flex flex-col items-center">
          <img 
            src="/full-logo.png" 
            alt="DineLine" 
            className="h-24 w-auto mb-0"
          />
          <p className="mt-0 text-center text-sm" style={{ color: '#A0522D' }}>
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">Check your email!</p>
                  <p className="text-sm mt-1">{success}</p>
                </div>
              </div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border rounded-t-md focus:outline-none focus:z-10 sm:text-sm"
                style={{ 
                  borderColor: '#DEB887',
                  color: '#654321',
                  backgroundColor: '#FFFDF7',
                  '--tw-ring-color': '#8B4513',
                  '--tw-border-opacity': '1',
                  '--tw-placeholder-opacity': '0.6',
                } as React.CSSProperties & { '--tw-ring-color': string; '--tw-border-opacity': string; '--tw-placeholder-opacity': string }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8B4513'; e.currentTarget.style.boxShadow = '0 0 0 1px #8B4513'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border rounded-b-md focus:outline-none focus:z-10 sm:text-sm"
                style={{ 
                  borderColor: '#DEB887',
                  color: '#654321',
                  backgroundColor: '#FFFDF7',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8B4513'; e.currentTarget.style.boxShadow = '0 0 0 1px #8B4513'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{ backgroundColor: '#8B4513', '--tw-ring-color': '#8B4513' } as React.CSSProperties & { '--tw-ring-color': string }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#654321'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#8B4513'; }}
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
              }}
              className="text-sm transition-colors cursor-pointer"
              style={{ color: '#8B4513' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#FF8C42'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#8B4513'}
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p style={{ color: '#A0522D' }}>Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

