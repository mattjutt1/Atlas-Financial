import { NextRequest, NextResponse } from "next/server";
import { superTokensNextWrapper } from "supertokens-node/nextjs";
import { middleware } from "supertokens-node/framework/express";
import "../../../../lib/supertokens-backend";

const handleAuth = async (request: NextRequest) => {
  const response = NextResponse.next();
  
  await superTokensNextWrapper(
    async (next) => {
      await middleware()(request, response, next);
    },
    request,
    response
  );
  
  return response;
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