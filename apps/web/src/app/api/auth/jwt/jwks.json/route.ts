import { NextRequest, NextResponse } from "next/server";
import SuperTokens from "supertokens-node";
import { ensureSuperTokensInit } from "../../../../../lib/supertokens-backend";

// Initialize SuperTokens
ensureSuperTokensInit();

export async function GET(request: NextRequest) {
  try {
    const jwks = await SuperTokens.getJWKS();
    return NextResponse.json(jwks, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error("Failed to get JWKS:", error);
    return NextResponse.json({ error: "Failed to get JWKS" }, { status: 500 });
  }
}