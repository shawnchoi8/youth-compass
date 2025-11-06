import { useState, useEffect } from "react";
import Header from "@/components/Header";
import PolicyCard from "@/components/PolicyCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, Home, GraduationCap, Coins, Heart, Palette, LucideIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getActiveCategories,
  getFaqsByCategory,
  CategoryResponse,
  FaqResponse,
} from "@/lib/api";

// 아이콘 매핑
const categoryIconMap: Record<string, LucideIcon> = {
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
  icon: LucideIcon;
  color: string;
}

const Categories = () => {
  const [categories, setCategories] = useState<CategoryWithFaqs[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
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
        // 첫 번째 카테고리를 기본으로 선택
        if (categoriesWithFaqs.length > 0) {
          setSelectedCategoryId(categoriesWithFaqs[0].categoryId);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
        toast({
          title: "오류",
          description: "카테고리를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  const selectedCategory = categories.find(cat => cat.categoryId === selectedCategoryId);

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
              카테고리를 선택하여 청년 정책을 찾아보세요
            </p>
          </div>

          {/* 카테고리 버튼들 */}
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <Button
                key={category.categoryId}
                variant={selectedCategoryId === category.categoryId ? "default" : "outline"}
                onClick={() => setSelectedCategoryId(category.categoryId)}
                className="flex items-center gap-2"
              >
                <category.icon className="w-4 h-4" />
                <span>{category.categoryName}</span>
                <span className="text-xs opacity-70">({category.faqs.length})</span>
              </Button>
            ))}
          </div>

          {/* 선택된 카테고리의 FAQ 목록 */}
          {selectedCategory && (
            <div className="space-y-3">
              {selectedCategory.faqs.length > 0 ? (
                selectedCategory.faqs.map((faq) => (
                  <PolicyCard
                    key={faq.faqId}
                    id={faq.faqId.toString()}
                    title={faq.faqQuestion}
                    category={faq.categoryName}
                    summary={faq.faqAnswer.substring(0, 100) + "..."}
                  />
                ))
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">등록된 FAQ가 없습니다.</p>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Categories;
