import { useContext, useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { AuthContext } from "../src/context/AuthContexts";

export default function Index() {
  const { tokens, user, lastVisitedPath, loading } = useContext(AuthContext);
  const [finalPath, setFinalPath] = useState(null);

  useEffect(() => {
    if (loading) return;

    let destination = "/auth/signup";

    if (tokens && user) {
      destination = lastVisitedPath && !lastVisitedPath.startsWith("/auth")
        ? lastVisitedPath
        : "/dashboard";
    }

    setFinalPath(destination);
  }, [loading, tokens, user, lastVisitedPath]);

  if (loading || !finalPath) return null;

  return <Redirect href={finalPath} />;
}
