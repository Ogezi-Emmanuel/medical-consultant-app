import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase";

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabaseBrowser.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
        setUser(null);
      } else {
        setUser(data.user);
      }
      setIsLoading(false);
    };

    fetchUser();

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN") {
          setUser(session?.user || null);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading };
};