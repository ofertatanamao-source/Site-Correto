import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Plus } from "lucide-react";
import { useListTemplates, getListTemplatesQueryKey, useCreateTemplate, useDeleteTemplate } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Templates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: templates, isLoading } = useListTemplates({
    query: { queryKey: getListTemplatesQueryKey() }
  });

  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const handleCreate = async () => {
    if (!name || !imageUrl) return;
    try {
      await createTemplate.mutateAsync({ data: { name, imageUrl } });
      toast({ title: "Pronto!", description: "Template salvo com sucesso." });
      setName("");
      setImageUrl("");
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
    } catch (e) {
      toast({ title: "Ops!", description: "Não foi possível salvar.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTemplate.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
    } catch (e) {
      toast({ title: "Ops!", description: "Não foi possível excluir.", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 pb-24 min-h-screen">
      <div className="flex items-center justify-between mt-4 mb-6 px-2">
        <h1 className="text-2xl font-bold text-primary">Seus Templates</h1>
        <Button size="icon" className="rounded-full h-10 w-10 bg-accent text-white" onClick={() => setIsFormOpen(!isFormOpen)}>
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-beige mb-6 space-y-4 animate-in slide-in-from-top-4">
          <h2 className="font-bold text-primary">Novo Template</h2>
          <Input 
            placeholder="Nome do template" 
            value={name} 
            onChange={e => setName(e.target.value)}
            className="h-12 rounded-xl bg-background border-none"
          />
          <Input 
            placeholder="URL da imagem de fundo" 
            value={imageUrl} 
            onChange={e => setImageUrl(e.target.value)}
            className="h-12 rounded-xl bg-background border-none"
          />
          <Button 
            className="w-full h-12 rounded-xl font-bold" 
            onClick={handleCreate}
            disabled={createTemplate.isPending || !name || !imageUrl}
          >
            {createTemplate.isPending ? "Salvando..." : "Salvar Template"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : templates?.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center mt-20 px-6">
          <div className="w-24 h-24 bg-beige rounded-full mb-6 flex items-center justify-center">
            <Upload className="w-10 h-10 text-accent/50" />
          </div>
          <h2 className="text-lg font-bold text-primary mb-2">Sem templates personalizados</h2>
          <p className="text-muted-foreground text-sm">Adicione fundos para usar nas suas postagens do Instagram.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {templates?.map(template => (
            <div key={template.id} className="bg-white p-3 rounded-[20px] shadow-sm border border-beige flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-background overflow-hidden shrink-0">
                {template.imageUrl ? (
                  <img src={template.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-beige" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-primary text-sm">{template.name}</h3>
                {template.isDefault && (
                  <span className="text-[10px] uppercase font-bold text-accent tracking-wider">Padrão</span>
                )}
              </div>
              {!template.isDefault && (
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
