import { useContext, useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { AuthContext } from "../src/context/AuthContexts";

export default function Index() {
  const { tokens, user, lastVisitedPath, loading, setIsRedirecting } = useContext(AuthContext);
  const [finalPath, setFinalPath] = useState(null);

  useEffect(() => {
    if (loading) return;

    setIsRedirecting(true);
    let destination = "/auth/signup";

    if (tokens && user) {
      if (lastVisitedPath && !lastVisitedPath.startsWith("/auth")) {
        destination = lastVisitedPath;
      } else {
        destination = "/dashboard";
      }
    }

    setFinalPath(destination);
    setIsRedirecting(false);
  }, [loading, tokens, user, lastVisitedPath]);

  if (loading || !finalPath) return null;
  return <Redirect href={finalPath} />;
}
