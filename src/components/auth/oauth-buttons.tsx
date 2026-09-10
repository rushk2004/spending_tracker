"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function OAuthButtons({
  google,
  twitter,
  callbackUrl = "/dashboard",
}: {
  google: boolean;
  twitter: boolean;
  callbackUrl?: string;
}) {
  if (!google && !twitter) {
    return (
      <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-500">
        Social login is optional. Add <code className="text-slate-400">GOOGLE_CLIENT_*</code> /{" "}
        <code className="text-slate-400">TWITTER_CLIENT_*</code> env vars to enable Google and X.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {google ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl })}
        >
          <GoogleIcon />
          Continue with Google
        </Button>
      ) : (
        <Button type="button" variant="secondary" className="w-full" disabled title="Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET">
          <GoogleIcon />
          Google (not configured)
        </Button>
      )}
      {twitter ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => signIn("twitter", { callbackUrl })}
        >
          <XIcon />
          Continue with X
        </Button>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}
