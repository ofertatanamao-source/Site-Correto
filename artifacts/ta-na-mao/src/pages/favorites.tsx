import { useListFavorites, getListFavoritesQueryKey, useToggleFavorite, useDeleteHistoryItem, getListHistoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Star, Trash2, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Favorites() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: favorites, isLoading } = useListFavorites({
    query: { queryKey: getListFavoritesQueryKey() }
  });

  const toggleFavorite = useToggleFavorite();
  const deleteItem = useDeleteHistoryItem();

  const handleToggleFav = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await toggleFavorite.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListFavoritesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListHistoryQueryKey() });
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteItem.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListFavoritesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListHistoryQueryKey() });
  };

  const platformColors = {
    amazon: "bg-amber-100 text-amber-800",
    shopee: "bg-orange-100 text-orange-800",
    mercadolivre: "bg-yellow-100 text-blue-800"
  };

  return (
    <div className="p-4 pb-24 min-h-screen">
      <h1 className="text-2xl font-bold text-primary mt-4 mb-6 px-2">Favoritos</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="aspect-square rounded-3xl" />)}
        </div>
      ) : favorites?.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center mt-20 px-6">
          <div className="w-24 h-24 bg-beige rounded-full mb-6 flex items-center justify-center">
            <Heart className="w-10 h-10 text-accent/50" />
          </div>
          <h2 className="text-lg font-bold text-primary mb-2">Sua vitrine está vazia</h2>
          <p className="text-muted-foreground text-sm">Marque com a estrelinha os produtos que você mais gostou para guardá-los aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {favorites?.map(item => (
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
