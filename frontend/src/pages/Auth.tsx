import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Compass } from "lucide-react";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  confirmPassword: z.string(),
  name: z.string().min(1, "이름을 입력해주세요"),
  age: z.string().min(1, "나이를 입력해주세요"),
  income: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [signupForm, setSignupForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    age: "",
    income: "",
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "로그인 실패",
        description: error.message === "Invalid login credentials" 
          ? "이메일 또는 비밀번호가 올바르지 않습니다"
          : error.message,
        variant: "destructive",
      });
      return;
    }

    if (data.session) {
      toast({
        title: "로그인 성공",
        description: "청년나침반에 오신 것을 환영합니다!",
      });
      navigate("/");
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
    
    const { data, error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
    });

    if (error) {
      setLoading(false);
      toast({
        title: "회원가입 실패",
        description: error.message === "User already registered"
          ? "이미 가입된 이메일입니다"
          : error.message,
        variant: "destructive",
      });
      return;
    }

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: data.user.id,
          name: signupForm.name,
          age: parseInt(signupForm.age),
          income: signupForm.income || null,
        });

      setLoading(false);

      if (profileError) {
        toast({
          title: "프로필 생성 실패",
          description: "회원가입은 완료되었으나 프로필 정보 저장에 실패했습니다",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "회원가입이 완료되었습니다",
        description: "이제 청년 정책을 탐색해보세요!",
      });
      navigate("/");
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
                  <Label htmlFor="login-email">이메일</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="example@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">비밀번호</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
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
                  <Label htmlFor="signup-email">
                    아이디 (이메일) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="example@email.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">
                    비밀번호 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="최소 6자 이상"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">
                    비밀번호 확인 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signup-confirm"
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
                        placeholder="홍길동"
                        value={signupForm.name}
                        onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-age">
                        나이 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="signup-age"
                        type="number"
                        placeholder="27"
                        value={signupForm.age}
                        onChange={(e) => setSignupForm({ ...signupForm, age: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-income">월 소득 (선택)</Label>
                      <Input
                        id="signup-income"
                        placeholder="예: 300만원"
                        value={signupForm.income}
                        onChange={(e) => setSignupForm({ ...signupForm, income: e.target.value })}
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
