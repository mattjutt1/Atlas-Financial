// SuperTokens Frontend Configuration
import SuperTokens from "supertokens-auth-react";
import EmailPassword from "supertokens-auth-react/recipe/emailpassword";
import Session from "supertokens-auth-react/recipe/session";

export const superTokensConfig = {
  appInfo: {
    appName: "Atlas Financial",
    apiDomain: process.env.NEXT_PUBLIC_API_DOMAIN || "http://localhost:3000",
    websiteDomain: process.env.NEXT_PUBLIC_WEBSITE_DOMAIN || "http://localhost:3000",
    apiBasePath: "/api/auth",
    websiteBasePath: "/auth"
  },
  recipeList: [
    EmailPassword.init({
      signInAndUpFeature: {
        disableDefaultUI: false,
        signUpForm: {
          formFields: [
            {
              id: "email",
              label: "Email Address",
              placeholder: "Enter your email"
            },
            {
              id: "password",
              label: "Password",
              placeholder: "Enter your password"
            }
          ]
        }
      }
    }),
    Session.init({
      tokenTransferMethod: "cookie",
      cookieSecure: process.env.NODE_ENV === "production",
      cookieSameSite: "lax"
    })
  ]
};

// Initialize SuperTokens only in browser
if (typeof window !== 'undefined') {
  SuperTokens.init(superTokensConfig);
}

export default superTokensConfig;