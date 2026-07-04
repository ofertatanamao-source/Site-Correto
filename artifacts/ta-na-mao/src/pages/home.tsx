import { useState } from "react";
import { useLocation } from "wouter";
import { Link, CheckCircle, Loader2 } from "lucide-react";
import { useExtractProduct, useGeneratePromotion } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Step = "detecting" | "extracting" | "generating" | null;

const STEPS: { id: Step; label: string }[] = [
  { id: "detecting",  label: "Detectando plataforma…"       },
  { id: "extracting", label: "Extraindo dados do produto…"  },
  { id: "generating", label: "Gerando imagens e textos…"    },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [currentStep, setCurrentStep] = useState<Step>(null);
  const [completedSteps, setCompletedSteps] = useState<Step[]>([]);

  const extractProduct = useExtractProduct();
  const generatePromotion = useGeneratePromotion();

  const advance = (step: Step) => {
    setCurrentStep(step);
    if (step !== null) {
      setCompletedSteps((prev) => [...prev.filter((s) => s !== step), step]);
    }
  };

  const reset = () => {
    setCurrentStep(null);
    setCompletedSteps([]);
  };

  const handleGenerate = async () => {
    if (!url.trim()) {
      toast({
        title: "Ops!",
        description: "Cole um link primeiro para gerar a promoção.",
        variant: "destructive",
      });
      return;
    }

    reset();

    try {
      // Step 1 — detect
      advance("detecting");
      await new Promise((r) => setTimeout(r, 400));

      // Step 2 — extract
      advance("extracting");
      const product = await extractProduct.mutateAsync({ data: { url: url.trim() } });

      if (!product.id) {
        throw new Error("Não foi possível salvar o histórico do produto.");
      }

      // Step 3 — generate
      advance("generating");
      await generatePromotion.mutateAsync({ data: { historyItemId: product.id } });

      // Navigate to result
      reset();
      setLocation(`/resultado/${product.id}`);
    } catch (err) {
      reset();
      const msg = err instanceof Error ? err.message : "";
      toast({
        title: "Erro ao gerar",
        description: msg || "Verifique se o link é válido (Amazon, Shopee, Mercado Livre).",
        variant: "destructive",
      });
    }
  };

  const isPending = currentStep !== null;

  const detectPlatform = (u: string) => {
    if (u.includes("amazon.com") || u.includes("amzn.to") || u.includes("amzn.com"))
      return { name: "Amazon", color: "bg-amber-100 text-amber-800 border-amber-200" };
    if (u.includes("shopee.com") || u.includes("shp.ee") || u.includes("shopee.link"))
      return { name: "Shopee", color: "bg-orange-100 text-orange-800 border-orange-200" };
    if (u.includes("mercadolivre.com") || u.includes("mercadolibre.com") || u.includes("meli.com"))
      return { name: "Mercado Livre", color: "bg-yellow-100 text-blue-800 border-yellow-200" };
    return null;
  };

  const platform = url && !isPending ? detectPlatform(url) : null;

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

            {/* Platform badge OR step indicator */}
            <div className="h-6 flex items-center justify-center transition-all duration-300">
              <AnimatePresence mode="wait">
                {isPending ? (
                  <motion.div
                    key="steps"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1.5"
                  >
                    <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                    <span className="text-xs text-accent font-semibold">
                      {STEPS.find((s) => s.id === currentStep)?.label}
                    </span>
                  </motion.div>
                ) : platform ? (
                  <motion.span
                    key="platform"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "text-xs px-3 py-1 rounded-full font-semibold border animate-in slide-in-from-bottom-2",
                      platform.color
                    )}
                  >
                    {platform.name}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          {/* Step progress (visible only while loading) */}
          <AnimatePresence>
            {isPending && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-2 pt-1 pb-1">
                  {STEPS.map((step, i) => {
                    const isActive = currentStep === step.id;
                    const isDone =
                      completedSteps.includes(step.id) && currentStep !== step.id;
                    const isWaiting = !isActive && !isDone;

                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.2 }}
                        className="flex items-center gap-2.5"
                      >
                        {/* Icon */}
                        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                          {isDone ? (
                            <CheckCircle className="w-4.5 h-4.5 text-green-500" />
                          ) : isActive ? (
                            <Loader2 className="w-4 h-4 text-accent animate-spin" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </div>

                        {/* Label */}
                        <span
                          className={cn(
                            "text-sm transition-colors duration-300",
                            isDone && "text-green-600 font-medium",
                            isActive && "text-accent font-semibold",
                            isWaiting && "text-muted-foreground/50"
                          )}
                        >
                          {step.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
            onClick={handleGenerate}
            disabled={isPending || !url.trim()}
          >
            {isPending ? "Processando…" : "Gerar Promoção"}
          </Button>
        </div>
      </div>
    </div>
  );
}
