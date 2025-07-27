import { NextRequest, NextResponse } from "next/server";
import SuperTokens from "supertokens-node";
import "../../../../../lib/supertokens-backend";

export async function GET(request: NextRequest) {
  try {
    const jwks = await SuperTokens.getJWKS();
    return NextResponse.json(jwks);
  } catch (error) {
    console.error("Failed to get JWKS:", error);
    return NextResponse.json({ error: "Failed to get JWKS" }, { status: 500 });
  }
}