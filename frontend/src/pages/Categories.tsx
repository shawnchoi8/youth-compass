import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import {
  getActiveCategories,
  getFaqsByCategory,
  CategoryResponse,
  FaqResponse,
} from "@/lib/api";

// 아이콘 매핑
const categoryIconMap: Record<string, any> = {
  "일자리": Briefcase,
  "주거": Home,
  "교육": GraduationCap,
  "금융": Coins,
  "건강": Heart,
  "문화": Palette,
};

const categoryColorMap: Record<string, string> = {
  "일자리": "text-orange-500",
  "주거": "text-blue-500",
  "교육": "text-green-500",
  "금융": "text-yellow-500",
  "건강": "text-red-500",
  "문화": "text-purple-500",
};

interface CategoryWithFaqs extends CategoryResponse {
  faqs: FaqResponse[];
  icon: any;
  color: string;
}

const Categories = () => {
  const [categories, setCategories] = useState<CategoryWithFaqs[]>([]);
  const [openCategories, setOpenCategories] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const categoriesData = await getActiveCategories();

        // 각 카테고리의 FAQ 로드
        const categoriesWithFaqs = await Promise.all(
          categoriesData.map(async (category) => {
            const faqs = await getFaqsByCategory(category.categoryId);
            return {
              ...category,
              faqs,
              icon: categoryIconMap[category.categoryName] || Briefcase,
              color: categoryColorMap[category.categoryName] || "text-gray-500",
            };
          })
        );

        setCategories(categoriesWithFaqs);
        // 첫 번째 카테고리는 기본으로 열기
        if (categoriesWithFaqs.length > 0) {
          setOpenCategories([categoriesWithFaqs[0].categoryId]);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
        const errorMessage = error instanceof Error ? error.message : "카테고리를 불러오는데 실패했습니다.";
        toast({
          title: "오류",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  const toggleCategory = (categoryId: number) => {
    setOpenCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">카테고리를 불러오는 중...</p>
          </div>
        </main>
      </div>
    );
  }

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
                key={category.categoryId}
                open={openCategories.includes(category.categoryId)}
                onOpenChange={() => toggleCategory(category.categoryId)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-6 h-auto hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <category.icon className={`w-5 h-5 ${category.color}`} />
                        <span className="font-semibold text-lg">{category.categoryName}</span>
                        <span className="text-sm text-muted-foreground">({category.faqs.length})</span>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 transition-transform ${
                          openCategories.includes(category.categoryId) ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-6 pb-6 space-y-3 pt-2">
                      {category.faqs.length > 0 ? (
                        category.faqs.map((faq) => (
                          <PolicyCard
                            key={faq.faqId}
                            id={faq.faqId.toString()}
                            title={faq.faqQuestion}
                            category={faq.categoryName}
                            summary={faq.faqAnswer.substring(0, 100) + "..."}
                          />
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">등록된 FAQ가 없습니다.</p>
                      )}
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
