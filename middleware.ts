import { NextResponse, type NextRequest } from "next/server";
import { verifyStaffToken, SESSION_COOKIE } from "@/lib/auth/session-token";

/**
 * Route protection.
 *
 * The staff pages used to be protected by a React component (RoleGuard)
 * that read the role out of localStorage. That is a convenience check, not
 * a security boundary — the data was already public, so hiding a page does
 * not protect anything.
 *
 * Now that staff writes go through the server and the database enforces RLS,
 * the middleware's job is to send signed-out staff to the login screen
 * instead of showing them an empty dashboard.
 *
 * The token is signed, so we can check it here without a database round
 * trip. The authoritative check — which also catches revocation — happens in
 * lib/supabase/server-auth.ts.
 */

/** Staff areas and the roles that may reach them. */
const PROTECTED_ROUTES: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/kitchen", roles: ["kitchen", "admin"] },
  { prefix: "/server", roles: ["server", "admin"] },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rule = PROTECTED_ROUTES.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const parsed = await verifyStaffToken(token);

  // Signed in, and this role may reach this area.
  if (parsed && rule.roles.includes(parsed.role)) {
    return NextResponse.next();
  }

  // Not signed in (or signed in with the wrong role) — send them to the
  // login screen and remember where they were going.
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/";
  loginUrl.search = "";
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/kitchen/:path*",
    "/server/:path*",
  ],
};