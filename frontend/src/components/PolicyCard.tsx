import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface PolicyCardProps {
  id: string;
  title: string;
  category: string;
  deadline?: string;
  summary: string;
}

const PolicyCard = ({ id, title, category, deadline, summary }: PolicyCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold line-clamp-2">{title}</CardTitle>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{summary}</p>
        {deadline && (
          <p className="text-xs text-destructive mt-2">신청마감: {deadline}</p>
        )}
      </CardContent>
      <CardFooter>
        <Link to={`/policy/${id}`} className="w-full">
          <Button variant="ghost" className="w-full justify-between">
            자세히 보기
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default PolicyCard;
