import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Check, ImageDown, RefreshCw, ChevronLeft, ArrowLeft } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useListHistory, getListHistoryQueryKey, useGeneratePromotion } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Result() {
  const { historyId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const id = Number(historyId);

  // Use the list history query to find the item. In a real app we'd have a useGetHistoryItem hook.
  const { data: history, isLoading } = useListHistory({
    query: { queryKey: getListHistoryQueryKey() }
  });

  const generatePromotion = useGeneratePromotion();

  const item = history?.find(h => h.id === id);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 1500);
  };

  const handleRegenerate = async () => {
    try {
      await generatePromotion.mutateAsync({ data: { historyItemId: id } });
      toast({ title: "Sucesso", description: "Promoção gerada novamente." });
      queryClient.invalidateQueries({ queryKey: getListHistoryQueryKey() });
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao gerar promoção.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="p-6 space-y-4">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>;
  }

  if (!item) {
    return <div className="p-6 text-center text-muted-foreground mt-12">Produto não encontrado.</div>;
  }

  // Mocking promotion data since API doesn't return it via GET endpoint in this spec.
  // In a real scenario, the result of generatePromotion would be stored or fetched.
  // We'll simulate the generated content based on the item for demonstration.
  const mockPromotion = {
    whatsappText: `Olha essa oferta que eu achei! \n\n*${item.shortTitle}*\nPor apenas ${item.currentPrice}\n\nCompre aqui: ${item.affiliateLink || item.productUrl}`,
    instagramCaption: `Achado imperdível do dia! ✨\n\n${item.shortTitle}\n💵 ${item.currentPrice}\n\nLink na bio ou comenta "QUERO" que eu te mando!`,
    telegramMessage: `🚨 *OFERTA RELÂMPAGO* 🚨\n\n${item.title}\n\n💰 *${item.currentPrice}*\n\n🛒 Link: ${item.affiliateLink || item.productUrl}`,
    promotionalScript: `E aí gente, olha esse achado maravilhoso! É o ${item.shortTitle} que tá com um preço incrível de ${item.currentPrice}. O link tá aqui embaixo, corre que acaba rápido!`,
  };

  const platformColors = {
    amazon: "bg-amber-100 text-amber-800",
    shopee: "bg-orange-100 text-orange-800",
    mercadolivre: "bg-yellow-100 text-blue-800"
  };

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-beige/50 px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="rounded-full">
          <ArrowLeft className="w-5 h-5 text-primary" />
        </Button>
        <h1 className="font-bold text-primary">Resultado</h1>
        <div className="w-9" />
      </header>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-beige flex gap-4">
          <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-background relative">
            <img src={item.imageUrl} alt={item.shortTitle} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md w-fit mb-1 uppercase tracking-wider", platformColors[item.platform])}>
              {item.platform}
            </span>
            <h2 className="font-semibold text-sm line-clamp-2 leading-tight text-primary mb-1">{item.shortTitle}</h2>
            <div className="flex items-center gap-2">
              <span className="font-bold text-accent text-lg">{item.currentPrice}</span>
              {item.discountPercentage && (
                <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold">
                  -{item.discountPercentage}%
                </span>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="whatsapp" className="w-full">
          <TabsList className="w-full bg-white h-auto p-1.5 rounded-2xl flex flex-wrap gap-1 border border-beige shadow-sm">
            {["whatsapp", "instagram", "telegram", "script", "story", "feed"].map(tab => (
              <TabsTrigger 
                key={tab} 
                value={tab}
                className="rounded-xl capitalize text-xs data-[state=active]:bg-primary data-[state=active]:text-white flex-1"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4">
            {Object.entries({
              whatsapp: mockPromotion.whatsappText,
              instagram: mockPromotion.instagramCaption,
              telegram: mockPromotion.telegramMessage,
              script: mockPromotion.promotionalScript,
            }).map(([key, text]) => (
              <TabsContent key={key} value={key} className="focus-visible:outline-none">
                <div className="bg-white border border-beige rounded-3xl p-5 relative group shadow-sm">
                  <p className="text-sm whitespace-pre-wrap text-primary/90 leading-relaxed font-medium">
                    {text}
                  </p>
                  <Button 
                    size="icon" 
                    className="absolute bottom-4 right-4 rounded-full w-10 h-10 shadow-md bg-accent hover:bg-accent/90"
                    onClick={() => handleCopy(text, key)}
                  >
                    {copiedStates[key] ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                  </Button>
                </div>
              </TabsContent>
            ))}

            {["story", "feed"].map(key => (
              <TabsContent key={key} value={key}>
                <div className="aspect-[9/16] bg-white border border-beige rounded-3xl overflow-hidden relative shadow-sm flex items-center justify-center">
                  {/* Placeholder Canvas generated via CSS */}
                  <div className="absolute inset-0 bg-gradient-to-br from-beige to-white opacity-50" />
                  <div className="relative z-10 flex flex-col items-center p-6 text-center gap-4">
                    <div className="w-40 h-40 rounded-3xl overflow-hidden shadow-xl border-4 border-white">
                      <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-white/90 backdrop-blur p-4 rounded-2xl shadow-lg border border-beige/50">
                      <h3 className="font-bold text-primary mb-1">{item.shortTitle}</h3>
                      <p className="text-2xl font-black text-accent">{item.currentPrice}</p>
                    </div>
                  </div>
                  
                  <Button className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full px-6 font-bold shadow-lg">
                    <ImageDown className="w-4 h-4 mr-2" /> Baixar Imagem
                  </Button>
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <Button 
          variant="outline" 
          className="w-full h-14 rounded-2xl text-primary border-beige bg-white shadow-sm hover:bg-beige/50"
          onClick={handleRegenerate}
          disabled={generatePromotion.isPending}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", generatePromotion.isPending && "animate-spin")} />
          Gerar Novamente
        </Button>
      </div>
    </div>
  );
}
