import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, ArrowLeft, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAllFaqs, FaqResponse } from "@/lib/api";

const PolicyDetail = () => {
  const { id } = useParams();
  const [policy, setPolicy] = useState<FaqResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadPolicy = async () => {
      try {
        setLoading(true);
        // 모든 FAQ를 가져와서 해당 ID의 FAQ를 찾음
        const allFaqs = await getAllFaqs();
        const foundPolicy = allFaqs.find(
          (faq) => faq.faqId.toString() === id
        );

        if (foundPolicy) {
          setPolicy(foundPolicy);
        } else {
          toast({
            title: "오류",
            description: "정책을 찾을 수 없습니다.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to load policy:", error);
        toast({
          title: "오류",
          description: "정책을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadPolicy();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">정책 정보를 불러오는 중...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <p className="text-muted-foreground">정책을 찾을 수 없습니다.</p>
            <Link to="/categories">
              <Button>카테고리로 돌아가기</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-4xl px-4 py-8 space-y-6">
        <Link to="/categories">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
        </Link>

        <div className="space-y-2">
          <Badge variant="secondary" className="mb-2">
            {policy.categoryName}
          </Badge>
          <h1 className="text-3xl font-bold text-foreground">{policy.faqQuestion}</h1>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              정책 상세 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-muted-foreground">
                {policy.faqAnswer}
              </div>
            </div>
          </CardContent>
        </Card>

        {policy.faqDetailUrl && (
          <Card>
            <CardHeader>
              <CardTitle>추가 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                자세한 내용은 공식 사이트에서 확인하세요.
              </p>
              <Button className="w-full" asChild>
                <a href={policy.faqDetailUrl} target="_blank" rel="noopener noreferrer">
                  공식 사이트 바로가기
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              이 정보는 {new Date(policy.faqCreatedAt).toLocaleDateString("ko-KR")} 기준입니다.
              <br />
              최신 정보는 공식 사이트에서 확인해주세요.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PolicyDetail;
