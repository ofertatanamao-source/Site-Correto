import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "lucide-react";
import { useExtractProduct, useGeneratePromotion } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [url, setUrl] = useState("");

  const extractProduct = useExtractProduct();
  const generatePromotion = useGeneratePromotion();

  const handleGenerate = async () => {
    if (!url) {
      toast({
        title: "Ops!",
        description: "Cole um link primeiro para gerar a promoção.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Extract product
      const product = await extractProduct.mutateAsync({ data: { url } });
      
      // 2. We actually need historyItemId. The API creates a history item internally during extraction if we assume that,
      // but wait: the API spec says extractProduct returns Product.
      // Wait, let's look at what useExtractProduct actually returns. It returns a Product. Product has an `id` field which is the historyItemId!
      // In the spec: Product has `id?: number | null`.
      if (!product.id) {
        throw new Error("Não foi possível salvar o histórico do produto.");
      }

      // 3. Generate promotion
      await generatePromotion.mutateAsync({
        data: { historyItemId: product.id }
      });

      // 4. Navigate
      setLocation(`/resultado/${product.id}`);
    } catch (err) {
      toast({
        title: "Erro ao gerar",
        description: "Verifique se o link é válido (Amazon, Shopee, Mercado Livre).",
        variant: "destructive",
      });
    }
  };

  const isPending = extractProduct.isPending || generatePromotion.isPending;

  const detectPlatform = (url: string) => {
    if (url.includes("amazon.com") || url.includes("amzn.to")) return { name: "Amazon", color: "bg-amber-100 text-amber-800 border-amber-200" };
    if (url.includes("shopee.com") || url.includes("shp.ee")) return { name: "Shopee", color: "bg-orange-100 text-orange-800 border-orange-200" };
    if (url.includes("mercadolivre.com") || url.includes("ml.com")) return { name: "Mercado Livre", color: "bg-yellow-100 text-blue-800 border-yellow-200" };
    return null;
  };

  const platform = url ? detectPlatform(url) : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 py-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm flex flex-col items-center gap-8 relative z-10">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary tracking-tight">Tá na Mão</h1>
          <p className="text-muted-foreground font-medium">Sua amiga para vendas rápidas</p>
        </div>

        <div className="w-full space-y-4 bg-white p-6 rounded-3xl shadow-xl shadow-primary/5 border border-beige">
          <div className="space-y-2 relative">
            <div className="relative">
              <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Cole o link do produto aqui..."
                className="pl-12 pr-4 h-14 bg-background border-none rounded-2xl text-base focus-visible:ring-accent shadow-inner"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isPending}
              />
            </div>
            
            <div className="h-6 flex items-center justify-center transition-all duration-300">
              {platform && (
                <span className={cn("text-xs px-3 py-1 rounded-full font-semibold border animate-in slide-in-from-bottom-2", platform.color)}>
                  {platform.name}
                </span>
              )}
            </div>
          </div>

          <Button 
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
            onClick={handleGenerate}
            disabled={isPending || !url}
          >
            {isPending ? "Processando..." : "Gerar Promoção"}
          </Button>
        </div>
      </div>
    </div>
  );
}
