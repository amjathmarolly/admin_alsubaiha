import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { withCors } from "@/lib/cors";

const loginIdentifierHandler = async (req: NextRequest) => {
  try {
    const { identifier } = await req.json();

    if (!identifier) {
      return NextResponse.json({ error: "Identifier is required" }, { status: 400 });
    }

    // Check if it's an email
    if (identifier.includes("@")) {
      return NextResponse.json({ email: identifier });
    }

    // Otherwise, assume it's a phone number and try to find user
    try {
      const userRecord = await adminAuth.getUserByPhoneNumber(identifier);
      if (userRecord.email) {
        return NextResponse.json({ email: userRecord.email });
      }
    } catch (error) {
      console.error("User not found by phone:", identifier);
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withCors(loginIdentifierHandler)

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}
