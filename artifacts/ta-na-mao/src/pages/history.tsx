import { useListHistory, getListHistoryQueryKey, useToggleFavorite, useDeleteHistoryItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Star, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function History() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: history, isLoading } = useListHistory({
    query: { queryKey: getListHistoryQueryKey() }
  });

  const toggleFavorite = useToggleFavorite();
  const deleteItem = useDeleteHistoryItem();

  const handleToggleFav = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await toggleFavorite.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListHistoryQueryKey() });
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteItem.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListHistoryQueryKey() });
  };

  const platformColors = {
    amazon: "bg-amber-100 text-amber-800",
    shopee: "bg-orange-100 text-orange-800",
    mercadolivre: "bg-yellow-100 text-blue-800"
  };

  return (
    <div className="p-4 pb-24 min-h-screen">
      <h1 className="text-2xl font-bold text-primary mt-4 mb-6 px-2">Seu Histórico</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-square rounded-3xl" />)}
        </div>
      ) : history?.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center mt-20 px-6">
          <div className="w-24 h-24 bg-beige rounded-full mb-6 flex items-center justify-center">
            <Star className="w-10 h-10 text-accent/50" />
          </div>
          <h2 className="text-lg font-bold text-primary mb-2">Nada por aqui ainda</h2>
          <p className="text-muted-foreground text-sm">Os produtos que você gerar aparecerão aqui para acesso rápido.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {history?.map(item => (
            <div 
              key={item.id}
              onClick={() => setLocation(`/resultado/${item.id}`)}
              className="bg-white rounded-[24px] p-3 border border-beige shadow-sm flex flex-col gap-2 relative group cursor-pointer hover:border-accent/50 transition-colors"
            >
              <div className="aspect-square rounded-2xl overflow-hidden bg-background relative">
                <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded w-fit uppercase", platformColors[item.platform])}>
                    {item.platform}
                  </span>
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-xs line-clamp-2 text-primary leading-tight mb-1">{item.shortTitle}</h3>
                <p className="font-black text-accent text-sm">{item.currentPrice}</p>
              </div>

              <div className="absolute top-4 right-4 flex flex-col gap-1.5">
                <button 
                  onClick={(e) => handleToggleFav(e, item.id)}
                  className="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center hover:bg-white transition-colors"
                >
                  <Star className={cn("w-4 h-4", item.isFavorite ? "fill-accent text-accent" : "text-muted-foreground")} />
                </button>
                <button 
                  onClick={(e) => handleDelete(e, item.id)}
                  className="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
