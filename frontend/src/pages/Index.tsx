import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import PolicyCard from "@/components/PolicyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Briefcase, Home, GraduationCap, Coins, Heart, Palette } from "lucide-react";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { name: "일자리", icon: Briefcase, color: "text-orange-500" },
    { name: "주거", icon: Home, color: "text-blue-500" },
    { name: "교육", icon: GraduationCap, color: "text-green-500" },
    { name: "금융", icon: Coins, color: "text-yellow-500" },
    { name: "건강", icon: Heart, color: "text-red-500" },
    { name: "문화", icon: Palette, color: "text-purple-500" },
  ];

  const recommendedPolicies = [
    {
      id: "1",
      title: "청년도약계좌",
      category: "금융",
      deadline: "2025년 12월 31일",
      summary: "월 최대 70만원 납입 시 정부지원금 + 이자로 5년 후 최대 5,000만원 목돈 마련",
    },
    {
      id: "2",
      title: "전세자금대출",
      category: "주거",
      summary: "무주택 청년을 위한 저금리 전세자금대출 지원",
    },
    {
      id: "3",
      title: "청년일자리도약장려금",
      category: "일자리",
      deadline: "상시모집",
      summary: "중소·중견기업 취업 청년에게 최대 1,200만원 지원",
    },
  ];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Navigate to chat with search query
      window.location.href = `/chat?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background">
      <Header />

      <main className="container px-4 py-8 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-6 py-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            청년을 위한 정책,
            <br />
            <span className="text-primary">쉽고 빠르게 찾아보세요</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            복잡한 청년 정책 정보를 AI가 쉽게 설명해드립니다
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <Card className="p-2">
              <div className="flex gap-2">
                <Input
                  placeholder="궁금한 청년 정책을 물어보세요... (예: 전세자금대출 조건은?)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="border-0 focus-visible:ring-0"
                />
                <Button onClick={handleSearch} size="icon" className="shrink-0">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>

          <Link to="/chat">
            <Button size="lg" className="mt-4">
              챗봇과 대화 시작하기
            </Button>
          </Link>
        </section>

        {/* Categories */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">카테고리별 탐색</h2>
            <Link to="/categories">
              <Button variant="ghost" size="sm">
                전체보기
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link key={category.name} to={`/categories#${category.name}`}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer text-center">
                  <category.icon className={`w-8 h-8 mx-auto mb-2 ${category.color}`} />
                  <p className="text-sm font-medium">{category.name}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Recommended Policies */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">추천 정책</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedPolicies.map((policy) => (
              <PolicyCard key={policy.id} {...policy} />
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center py-12 space-y-4">
          <h2 className="text-2xl font-bold text-foreground">내 맞춤 정책 추천받기</h2>
          <p className="text-muted-foreground">
            내 정보를 입력하면 더 정확한 정책을 추천해드려요
          </p>
          <Link to="/mypage">
            <Button variant="outline" size="lg">
              내 정보 입력하기
            </Button>
          </Link>
        </section>
      </main>
    </div>
  );
};

export default Index;
