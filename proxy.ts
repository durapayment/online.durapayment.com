// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "./config/site";

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const API_DOMAIN = "https://api.durapayment.com";
  const FRONTEND_DOMAIN = "https://online.durapayment.com";

  const connectSrc = isDev
    ? `connect-src 'self' ${API_DOMAIN} ${FRONTEND_DOMAIN} http://localhost:8000 http://127.0.0.1:8000`
    : `connect-src 'self' ${API_DOMAIN} ${FRONTEND_DOMAIN}`;

  return [
    "default-src 'self'",
    isDev
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline'`,
    "img-src 'self' data: blob: https://img.heroui.chat https://durapayment-documents.s3.eu-north-1.amazonaws.com",
    "font-src 'self' data:",
    connectSrc,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "report-to csp",
  ].join("; ");
}

async function verifySession(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.LARAVEL_API_URL}/api/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Generate fresh nonce
  const nonce = generateNonce();
  const csp = buildCSP(nonce);

  // 2. Protect dashboard routes
  if (pathname.startsWith(siteConfig.pagesPaths.dashboard)) {
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const valid = await verifySession(accessToken);
    if (!valid) {
      const res = NextResponse.redirect(new URL("/", request.url));
      res.cookies.delete("access_token");
      return res;
    }
  }

  // 3. Forward nonce to layout
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // 4. Security Headers
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set(
    "Reporting-Endpoints",
    'csp="https://online.durapayment.com/api/csp-report"',
  );

  return response;
}

// Updated config for Next.js 16
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf)).*)",
  ],
};
