import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);

	// Allow access to auth routes and public pages
	const publicPaths = ["/auth/login", "/auth/signup", "/auth/forgetpassword", "/splash"];
	const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));

	if (!sessionCookie && !isPublicPath) {
		return NextResponse.redirect(new URL("/auth/login", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"], // Specify the routes the middleware applies to
};