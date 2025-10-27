import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";

const MyPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    income: "",
    assets: "",
    region: "",
    useAsDefault: true,
  });

  useEffect(() => {
    checkUserAndLoadProfile();
  }, []);

  const checkUserAndLoadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);
    await loadProfile(session.user.id);
  };

  const loadProfile = async (uid: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", uid)
      .single();

    setLoading(false);

    if (error) {
      console.error("프로필 로드 오류:", error);
      return;
    }

    if (data) {
      setFormData({
        name: data.name || "",
        age: data.age?.toString() || "",
        income: data.income || "",
        assets: data.assets || "",
        region: data.region || "",
        useAsDefault: true,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast({
        title: "오류",
        description: "로그인이 필요합니다",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : null,
        income: formData.income || null,
        assets: formData.assets || null,
        region: formData.region || null,
      })
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "저장 실패",
        description: "정보 저장 중 오류가 발생했습니다",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "저장 완료",
      description: "내 정보가 성공적으로 저장되었습니다.",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "로그아웃",
      description: "로그아웃되었습니다",
    });
    navigate("/");
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-2xl px-4 py-8">
          <p className="text-center text-muted-foreground">로딩 중...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-2xl px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">내 정보</h1>
              <p className="text-muted-foreground mt-2">
                정확한 정책 추천을 위해 정보를 입력해주세요
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>
                청년 정책 추천에 필요한 정보입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    이름 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="이름을 입력하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">
                    나이 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleChange("age", e.target.value)}
                    placeholder="나이를 입력하세요"
                  />
                  <p className="text-xs text-muted-foreground">
                    청년 정책 추천을 위해 필요합니다
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="income">연봉</Label>
                  <Input
                    id="income"
                    value={formData.income}
                    onChange={(e) => handleChange("income", e.target.value)}
                    placeholder="예: 3200만원"
                  />
                  <p className="text-xs text-muted-foreground">
                    소득 기준 정책 추천에 활용됩니다
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assets">재산</Label>
                  <Input
                    id="assets"
                    value={formData.assets}
                    onChange={(e) => handleChange("assets", e.target.value)}
                    placeholder="예: 4500만원"
                  />
                  <p className="text-xs text-muted-foreground">
                    자산 기준 정책 추천에 활용됩니다
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">
                    거주 지역 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="region"
                    value={formData.region}
                    onChange={(e) => handleChange("region", e.target.value)}
                    placeholder="예: 서울시 마포구"
                  />
                  <p className="text-xs text-muted-foreground">
                    지역별 정책 추천에 활용됩니다
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-4 border-t">
                  <Checkbox
                    id="useAsDefault"
                    checked={formData.useAsDefault}
                    onCheckedChange={(checked) =>
                      handleChange("useAsDefault", checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="useAsDefault"
                    className="text-sm font-normal cursor-pointer"
                  >
                    내 정보 기반으로 대답하기
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  입력한 정보를 바탕으로 맞춤형 정책을 추천받습니다
                </p>

                <Button type="submit" className="w-full" size="lg">
                  저장하기
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-secondary/50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <h3 className="font-medium">💡 왜 이 정보가 필요한가요?</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 청년 정책은 나이, 소득, 재산 등 다양한 조건이 있어요</li>
                  <li>• 내 정보를 입력하면 지원 가능한 정책만 추천받을 수 있어요</li>
                  <li>• 모든 정보는 안전하게 보관되며, 정책 추천 목적으로만 사용돼요</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MyPage;
