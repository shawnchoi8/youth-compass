import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    // Check current session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserName(session.user.id);
        }
      })
      .catch((error) => {
        console.warn('Supabase auth not available:', error);
      });

    // Listen for auth changes
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserName(session.user.id);
        } else {
          setUserName("");
        }
      });

      return () => subscription.unsubscribe();
    } catch (error) {
      console.warn('Supabase auth listener not available:', error);
    }
  }, []);

  const fetchUserName = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", userId)
        .single();

      if (data) {
        setUserName(data.name);
      }
    } catch (error) {
      console.warn('Could not fetch user name:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Compass className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">청년나침반</span>
            <span className="text-xs text-muted-foreground">모든 청년 정책을 한곳에서</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {userName && (
                <span className="text-sm font-medium text-foreground">
                  {userName}님
                </span>
              )}
              <Link to="/mypage">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="w-5 h-5" />
                </Button>
              </Link>
            </>
          ) : (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => navigate("/auth")}
            >
              로그인
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
