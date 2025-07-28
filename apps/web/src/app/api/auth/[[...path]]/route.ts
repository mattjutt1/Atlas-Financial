import { NextRequest, NextResponse } from "next/server";
import { superTokensNextWrapper } from "supertokens-node/nextjs";
import { middleware } from "supertokens-node/framework/express";
import { ensureSuperTokensInit } from "../../../../lib/supertokens-backend";

// Initialize SuperTokens
ensureSuperTokensInit();

const handleAuth = async (request: NextRequest) => {
  return await superTokensNextWrapper(
    async (next) => {
      const res = NextResponse.next();
      await middleware()(request, res, next);
      return res;
    },
    request,
    NextResponse.next()
  );
};

export async function GET(request: NextRequest) {
  return handleAuth(request);
}

export async function POST(request: NextRequest) {
  return handleAuth(request);
}

export async function DELETE(request: NextRequest) {
  return handleAuth(request);
}

export async function PUT(request: NextRequest) {
  return handleAuth(request);
}

export async function PATCH(request: NextRequest) {
  return handleAuth(request);
}

export async function HEAD(request: NextRequest) {
  return handleAuth(request);
}
