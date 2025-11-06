import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Compass } from "lucide-react";
import { z } from "zod";
import {
  registerUser,
  loginUser,
  type UserRegisterRequest,
  type UserLoginRequest
} from "@/lib/api";

const signupSchema = z.object({
  userLoginId: z.string().min(3, "로그인 ID는 최소 3자 이상이어야 합니다"),
  userPassword: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다"),
  confirmPassword: z.string(),
  userName: z.string().min(1, "이름을 입력해주세요"),
  userAge: z.string().optional(),
  userSalary: z.string().optional(),
}).refine((data) => data.userPassword === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  userLoginId: z.string().min(1, "로그인 ID를 입력해주세요"),
  userPassword: z.string().min(1, "비밀번호를 입력해주세요"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({
    userLoginId: "",
    userPassword: "",
  });

  const [signupForm, setSignupForm] = useState({
    userLoginId: "",
    userPassword: "",
    confirmPassword: "",
    userName: "",
    userAge: "",
    userSalary: "",
  });

  useEffect(() => {
    // localStorage에 userId가 있으면 이미 로그인한 것으로 간주
    const userId = localStorage.getItem("userId");
    if (userId) {
      navigate("/");
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      loginSchema.parse(loginForm);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "입력 오류",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      const request: UserLoginRequest = {
        userLoginId: loginForm.userLoginId,
        userPassword: loginForm.userPassword,
      };

      const response = await loginUser(request);

      // 로그인 성공 시 localStorage에 저장
      localStorage.setItem("userId", response.userId.toString());
      localStorage.setItem("userName", response.userName);

      // 헤더 업데이트를 위한 커스텀 이벤트 발생
      window.dispatchEvent(new Event('loginStatusChanged'));

      toast({
        title: "로그인 성공",
        description: "청년나침반에 오신 것을 환영합니다!",
      });

      navigate("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "로그인 ID 또는 비밀번호가 올바르지 않습니다";
      toast({
        title: "로그인 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      signupSchema.parse(signupForm);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "입력 오류",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      const request: UserRegisterRequest = {
        userLoginId: signupForm.userLoginId,
        userPassword: signupForm.userPassword,
        userName: signupForm.userName,
        userAge: signupForm.userAge ? parseInt(signupForm.userAge) : undefined,
        userSalary: signupForm.userSalary ? parseFloat(signupForm.userSalary) : undefined,
        userAgreePrivacy: true,
      };

      const response = await registerUser(request);

      // 회원가입 성공 시 자동 로그인 (localStorage에 저장)
      localStorage.setItem("userId", response.userId.toString());
      localStorage.setItem("userName", response.userName);

      // 헤더 업데이트를 위한 커스텀 이벤트 발생
      window.dispatchEvent(new Event('loginStatusChanged'));

      toast({
        title: "회원가입이 완료되었습니다",
        description: "이제 청년 정책을 탐색해보세요!",
      });

      navigate("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "회원가입 중 오류가 발생했습니다";
      toast({
        title: "회원가입 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <Compass className="w-10 h-10 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">청년나침반</h1>
            <p className="text-sm text-muted-foreground">모든 청년 정책을 한곳에서</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isLogin ? "로그인" : "회원가입"}</CardTitle>
            <CardDescription>
              {isLogin 
                ? "청년 정책을 탐색하려면 로그인하세요" 
                : "기본 정보를 입력하고 맞춤 정책을 받아보세요"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-id">로그인 ID</Label>
                  <Input
                    id="login-id"
                    name="userLoginId"
                    type="text"
                    placeholder="로그인 ID를 입력하세요"
                    value={loginForm.userLoginId}
                    onChange={(e) => setLoginForm({ ...loginForm, userLoginId: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">비밀번호</Label>
                  <Input
                    id="login-password"
                    name="userPassword"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.userPassword}
                    onChange={(e) => setLoginForm({ ...loginForm, userPassword: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "로그인 중..." : "로그인"}
                </Button>
                <div className="text-center text-sm">
                  <span className="text-muted-foreground">계정이 없으신가요? </span>
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-primary hover:underline"
                  >
                    회원가입
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-id">
                    로그인 ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signup-id"
                    name="userLoginId"
                    type="text"
                    placeholder="로그인 ID (최소 3자 이상)"
                    value={signupForm.userLoginId}
                    onChange={(e) => setSignupForm({ ...signupForm, userLoginId: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">
                    비밀번호 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signup-password"
                    name="userPassword"
                    type="password"
                    placeholder="최소 8자 이상"
                    value={signupForm.userPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, userPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">
                    비밀번호 확인 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signup-confirm"
                    name="confirmPassword"
                    type="password"
                    placeholder="비밀번호 재입력"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">내 정보 입력</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    회원가입 시 입력한 정보는 기본정보 입력 페이지에서 자동으로 채워집니다
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">
                        이름 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="signup-name"
                        name="userName"
                        placeholder="홍길동"
                        value={signupForm.userName}
                        onChange={(e) => setSignupForm({ ...signupForm, userName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-age">나이 (선택)</Label>
                      <Input
                        id="signup-age"
                        name="userAge"
                        type="number"
                        placeholder="27"
                        value={signupForm.userAge}
                        onChange={(e) => setSignupForm({ ...signupForm, userAge: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-salary">월 소득 (선택)</Label>
                      <Input
                        id="signup-salary"
                        name="userSalary"
                        type="number"
                        placeholder="예: 3000000 (단위: 원)"
                        value={signupForm.userSalary}
                        onChange={(e) => setSignupForm({ ...signupForm, userSalary: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "회원가입 중..." : "회원가입"}
                </Button>
                <div className="text-center text-sm">
                  <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-primary hover:underline"
                  >
                    로그인
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
