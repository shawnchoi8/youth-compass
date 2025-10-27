import { useState } from "react";
import Header from "@/components/Header";
import PolicyCard from "@/components/PolicyCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, Home, GraduationCap, Coins, Heart, Palette, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Categories = () => {
  const categories = [
    {
      name: "일자리",
      icon: Briefcase,
      color: "text-orange-500",
      policies: [
        {
          id: "3",
          title: "청년일자리도약장려금",
          category: "일자리",
          deadline: "상시모집",
          summary: "중소·중견기업 취업 청년에게 최대 1,200만원 지원",
        },
        {
          id: "4",
          title: "취업성공패키지",
          category: "일자리",
          summary: "취업을 원하는 청년에게 취업상담부터 취업알선까지 지원",
        },
      ],
    },
    {
      name: "주거",
      icon: Home,
      color: "text-blue-500",
      policies: [
        {
          id: "2",
          title: "전세자금대출",
          category: "주거",
          summary: "무주택 청년을 위한 저금리 전세자금대출 지원",
        },
        {
          id: "5",
          title: "청년전용 버팀목전세자금",
          category: "주거",
          deadline: "2025년 12월 31일",
          summary: "만 19~34세 청년 무주택자를 위한 저금리 전세자금대출",
        },
      ],
    },
    {
      name: "교육",
      icon: GraduationCap,
      color: "text-green-500",
      policies: [
        {
          id: "6",
          title: "국가장학금",
          category: "교육",
          deadline: "학기별 신청",
          summary: "소득수준에 연계하여 경제적으로 어려운 학생들에게 보편적으로 지원",
        },
      ],
    },
    {
      name: "금융",
      icon: Coins,
      color: "text-yellow-500",
      policies: [
        {
          id: "1",
          title: "청년도약계좌",
          category: "금융",
          deadline: "2025년 12월 31일",
          summary: "월 최대 70만원 납입 시 정부지원금 + 이자로 5년 후 최대 5,000만원 목돈 마련",
        },
      ],
    },
    {
      name: "건강",
      icon: Heart,
      color: "text-red-500",
      policies: [
        {
          id: "7",
          title: "청년 건강검진",
          category: "건강",
          summary: "만 20세~39세 청년을 위한 무료 건강검진 프로그램",
        },
      ],
    },
    {
      name: "문화",
      icon: Palette,
      color: "text-purple-500",
      policies: [
        {
          id: "8",
          title: "청년문화예술패스",
          category: "문화",
          summary: "문화·예술·체육 활동 지원을 위한 월 5만원 포인트 지급",
        },
      ],
    },
  ];

  const [openCategories, setOpenCategories] = useState<string[]>([categories[0].name]);

  const toggleCategory = (name: string) => {
    setOpenCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-4xl px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">자주 묻는 질문</h1>
            <p className="text-muted-foreground mt-2">
              카테고리별로 청년 정책을 찾아보세요
            </p>
          </div>

          <div className="space-y-3">
            {categories.map((category) => (
              <Collapsible
                key={category.name}
                open={openCategories.includes(category.name)}
                onOpenChange={() => toggleCategory(category.name)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-6 h-auto hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <category.icon className={`w-5 h-5 ${category.color}`} />
                        <span className="font-semibold text-lg">{category.name}</span>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 transition-transform ${
                          openCategories.includes(category.name) ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-6 pb-6 space-y-3 pt-2">
                      {category.policies.map((policy) => (
                        <PolicyCard key={policy.id} {...policy} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Categories;
