import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, ArrowLeft, Users, Calendar, DollarSign, FileText } from "lucide-react";

const PolicyDetail = () => {
  const { id } = useParams();

  // Mock data
  const policy = {
    id: "2",
    title: "전세자금대출",
    category: "주거",
    summary: "무주택 청년을 위한 저금리 전세자금대출 지원",
    description:
      "주택도시기금을 재원으로 하여 무주택 세대주의 주거안정을 위해 전세자금을 저리로 지원하는 상품입니다.",
    target: ["무주택 세대주", "연소득 5천만원 이하", "부부합산 순자산 3.45억원 이하"],
    period: "상시 신청 가능",
    amount: "수도권: 최대 3억원\n지방: 최대 2억원",
    rate: "연 1.2% ~ 2.7%",
    application: "주택도시기금 포털 또는 취급은행 방문 신청",
    externalLink: "https://nhuf.molit.go.kr",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-4xl px-4 py-8 space-y-6">
        <Link to="/chat">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
        </Link>

        <div className="space-y-2">
          <Badge variant="secondary" className="mb-2">
            {policy.category}
          </Badge>
          <h1 className="text-3xl font-bold text-foreground">{policy.title}</h1>
          <p className="text-lg text-muted-foreground">{policy.summary}</p>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              정책 개요
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{policy.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              지원 대상
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {policy.target.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              신청 기간
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{policy.period}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              지원 내용
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">대출 한도</p>
              <p className="text-muted-foreground whitespace-pre-line">{policy.amount}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">대출 금리</p>
              <p className="text-muted-foreground">{policy.rate}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>신청 방법</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{policy.application}</p>
            <Button className="w-full" asChild>
              <a href={policy.externalLink} target="_blank" rel="noopener noreferrer">
                신청 사이트 바로가기
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PolicyDetail;
