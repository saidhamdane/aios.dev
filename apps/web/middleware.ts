import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";

const LOCALES = ["en", "es", "ar"] as const;
const DEFAULT_LOCALE = "en";

const intlMiddleware = createMiddleware({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localeDetection: true,
});

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through API routes (auth handled per-route)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Strip locale prefix to get the real path
  const pathnameWithoutLocale = LOCALES.reduce(
    (path, locale) => path.replace(new RegExp(`^/${locale}`), "") || "/",
    pathname
  );

  const isPublicPath = PUBLIC_PATHS.some((p) =>
    pathnameWithoutLocale.startsWith(p)
  );

  // Supabase session refresh
  let response = intlMiddleware(request);
  if (!(response instanceof NextResponse)) {
    response = NextResponse.next();
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users trying to access dashboard
  if (!user && !isPublicPath && pathnameWithoutLocale !== "/") {
    const locale = LOCALES.find((l) => pathname.startsWith(`/${l}`)) ?? DEFAULT_LOCALE;
    return NextResponse.redirect(
      new URL(`/${locale}/login`, request.url)
    );
  }

  // Redirect authenticated users away from auth pages
  if (user && isPublicPath) {
    const locale = LOCALES.find((l) => pathname.startsWith(`/${l}`)) ?? DEFAULT_LOCALE;
    return NextResponse.redirect(
      new URL(`/${locale}/dashboard`, request.url)
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
