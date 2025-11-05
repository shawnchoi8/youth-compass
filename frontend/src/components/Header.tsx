import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, User } from "lucide-react";
import { useEffect, useState } from "react";

const Header = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  // localStorage에서 로그인 정보 읽기
  const checkLoginStatus = () => {
    const storedUserId = localStorage.getItem("userId");
    const storedUserName = localStorage.getItem("userName");

    setUserId(storedUserId);
    setUserName(storedUserName || "");
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 로그인 상태 확인
    checkLoginStatus();

    // storage 이벤트 리스너 (다른 탭에서 로그인/로그아웃 시 동기화)
    const handleStorageChange = () => {
      checkLoginStatus();
    };

    window.addEventListener('storage', handleStorageChange);

    // 같은 탭에서의 변경을 감지하기 위한 커스텀 이벤트
    const handleLoginChange = () => {
      checkLoginStatus();
    };

    window.addEventListener('loginStatusChanged', handleLoginChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('loginStatusChanged', handleLoginChange);
    };
  }, []);

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
          {userId ? (
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
