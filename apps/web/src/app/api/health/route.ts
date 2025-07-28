import { NextRequest, NextResponse } from "next/server";
import { ensureSuperTokensInit } from "../../../lib/supertokens-backend";

// Initialize SuperTokens
ensureSuperTokensInit();

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "Atlas Financial Frontend",
      version: "1.1.0",
      supertokens: {
        connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "http://supertokens:3567",
        apiDomain: process.env.NEXT_PUBLIC_SUPERTOKENS_API_DOMAIN || "http://localhost:3000",
        websiteDomain: process.env.NEXT_PUBLIC_SUPERTOKENS_WEBSITE_DOMAIN || "http://localhost:3000"
      }
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
