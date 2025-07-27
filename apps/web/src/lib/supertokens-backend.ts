import SuperTokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import Dashboard from "supertokens-node/recipe/dashboard";

export const backendConfig = () => {
  return {
    framework: "express",
    supertokens: {
      connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "http://localhost:3567",
      apiKey: process.env.SUPERTOKENS_API_KEY
    },
    appInfo: {
      appName: "Atlas Financial",
      apiDomain: process.env.API_DOMAIN || "http://localhost:3000",
      websiteDomain: process.env.WEBSITE_DOMAIN || "http://localhost:3000",
      apiBasePath: "/api/auth",
      websiteBasePath: "/auth"
    },
    recipeList: [
      EmailPassword.init(),
      Session.init({
        jwt: {
          enable: true,
          issuer: "https://api.supertokens.io/auth",
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

SuperTokens.init(backendConfig());