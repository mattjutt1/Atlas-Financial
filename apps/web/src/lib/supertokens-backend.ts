import SuperTokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import Dashboard from "supertokens-node/recipe/dashboard";

export const backendConfig = () => {
  return {
    framework: "express",
    supertokens: {
      connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "http://supertokens:3567",
      apiKey: process.env.SUPERTOKENS_API_KEY
    },
    appInfo: {
      appName: "Atlas Financial",
      apiDomain: process.env.NEXT_PUBLIC_SUPERTOKENS_API_DOMAIN || "http://localhost:3000",
      websiteDomain: process.env.NEXT_PUBLIC_SUPERTOKENS_WEBSITE_DOMAIN || "http://localhost:3000",
      apiBasePath: "/api/auth",
      websiteBasePath: "/auth"
    },
    recipeList: [
      EmailPassword.init(),
      Session.init({
        jwt: {
          enable: true,
          issuer: "http://supertokens:3567",
          audience: "atlas-financial"
        },
        override: {
          functions: (originalImplementation) => {
            return {
              ...originalImplementation,
              createNewSession: async (input) => {
                // Add custom Hasura JWT claims
                input.accessTokenPayload = {
                  ...input.accessTokenPayload,
                  "https://hasura.io/jwt/claims": {
                    "x-hasura-user-id": input.userId,
                    "x-hasura-default-role": "user",
                    "x-hasura-allowed-roles": ["user", "anonymous"]
                  }
                };
                return originalImplementation.createNewSession(input);
              }
            };
          }
        }
      }),
      Dashboard.init({
        apiKey: process.env.SUPERTOKENS_API_KEY
      })
    ],
    isInServerlessEnv: false
  };
};

let initialized = false;

export const ensureSuperTokensInit = () => {
  if (!initialized) {
    SuperTokens.init(backendConfig());
    initialized = true;
  }
};

// Auto-initialize for backwards compatibility
ensureSuperTokensInit();