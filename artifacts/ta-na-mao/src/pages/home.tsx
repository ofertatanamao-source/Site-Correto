import { useState } from "react";
import { useLocation } from "wouter";
import {
  Link,
  CheckCircle,
  Loader2,
  AlertCircle,
  RefreshCcw,
  ExternalLink,
} from "lucide-react";
import { useExtractProduct, useGeneratePromotion } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────

type Step = "detecting" | "extracting" | "generating" | null;
type View  = "input" | "loading" | "error";

interface ErrorState {
  message: string;
  failedStep: Step;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: "detecting",  label: "Detectando plataforma…"      },
  { id: "extracting", label: "Extraindo dados do produto…" },
  { id: "generating", label: "Gerando imagens e textos…"   },
];

const CREDENTIAL_GUIDES = [
  {
    match: (msg: string) =>
      /amazon/i.test(msg) && (/bloqueou|PA API|AWS_/i.test(msg)),
    platform: "Amazon",
    color: "bg-amber-50 border-amber-200",
    labelColor: "text-amber-800",
    steps: [
      { text: "Crie uma conta Amazon Associates", url: "https://associados.amazon.com.br/" },
      { text: "Solicite acesso à Product Advertising API 5.0", url: "https://webservices.amazon.com/paapi5/documentation/" },
      {
        text: "Adicione as variáveis de ambiente:",
        code: "AWS_ACCESS_KEY_ID\nAWS_SECRET_ACCESS_KEY\nAMAZON_ASSOCIATE_TAG",
      },
    ],
  },
  {
    match: (msg: string) =>
      /mercado livre|ML_APP/i.test(msg) && (/bloqueou|OAuth|ML_APP_/i.test(msg)),
    platform: "Mercado Livre",
    color: "bg-yellow-50 border-yellow-200",
    labelColor: "text-yellow-800",
    steps: [
      {
        text: "Crie um app GRÁTIS de desenvolvedor",
        url: "https://developers.mercadolivre.com.br/",
      },
      {
        text: "Adicione as variáveis de ambiente:",
        code: "ML_APP_ID\nML_APP_SECRET",
      },
    ],
  },
  {
    match: (msg: string) =>
      /shopee/i.test(msg) && (/bloqueou|partner|SHOPEE_/i.test(msg)),
    platform: "Shopee",
    color: "bg-orange-50 border-orange-200",
    labelColor: "text-orange-800",
    steps: [
      {
        text: "Registre-se como parceiro Shopee Open Platform",
        url: "https://open.shopee.com/",
      },
      {
        text: "Adicione as variáveis de ambiente:",
        code: "SHOPEE_PARTNER_ID\nSHOPEE_PARTNER_KEY",
      },
    ],
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function Home() {
  const [, setLocation] = useLocation();
  const [url, setUrl] = useState("");
  const [view, setView] = useState<View>("input");
  const [currentStep, setCurrentStep] = useState<Step>(null);
  const [completedSteps, setCompletedSteps] = useState<Step[]>([]);
  const [error, setError] = useState<ErrorState | null>(null);

  const extractProduct  = useExtractProduct();
  const generatePromotion = useGeneratePromotion();

  // ── Step helpers ────────────────────────────────────────────────────────────

  const advance = (step: Step) => {
    setCurrentStep(step);
    if (step !== null) {
      setCompletedSteps((prev) => [...prev.filter((s) => s !== step), step]);
    }
  };

  const resetLoading = () => {
    setCurrentStep(null);
    setCompletedSteps([]);
  };

  // ── Primary action ──────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!url.trim()) return;

    setError(null);
    setView("loading");
    resetLoading();

    let failedStep: Step = null;

    try {
      advance("detecting");
      await new Promise((r) => setTimeout(r, 400));

      advance("extracting");
      failedStep = "extracting";
      const product = await extractProduct.mutateAsync({ data: { url: url.trim() } });

      if (!product.id) {
        throw new Error("Não foi possível salvar o histórico do produto.");
      }

      advance("generating");
      failedStep = "generating";
      await generatePromotion.mutateAsync({ data: { historyItemId: product.id } });

      resetLoading();
      setView("input");
      setLocation(`/resultado/${product.id}`);
    } catch (err) {
      resetLoading();
      const message =
        err instanceof Error
          ? err.message
          : "Verifique se o link é válido (Amazon, Shopee, Mercado Livre).";
      setError({ message, failedStep });
      setView("error");
    }
  };

  const handleRetry = () => {
    setError(null);
    setView("input");
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const isPending = view === "loading";

  const detectPlatform = (u: string) => {
    if (u.includes("amazon.com") || u.includes("amzn.to") || u.includes("amzn.com"))
      return { name: "Amazon", color: "bg-amber-100 text-amber-800 border-amber-200" };
    if (u.includes("shopee.com") || u.includes("shp.ee") || u.includes("shopee.link"))
      return { name: "Shopee", color: "bg-orange-100 text-orange-800 border-orange-200" };
    if (u.includes("mercadolivre.com") || u.includes("mercadolibre.com") || u.includes("meli.com"))
      return { name: "Mercado Livre", color: "bg-yellow-100 text-blue-800 border-yellow-200" };
    return null;
  };

  const platform = url && view === "input" ? detectPlatform(url) : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 py-12 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm flex flex-col items-center gap-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary tracking-tight">Tá na Mão</h1>
          <p className="text-muted-foreground font-medium">Sua amiga para vendas rápidas</p>
        </div>

        {/* Card — switches between input / loading / error */}
        <AnimatePresence mode="wait">
          {view === "error" && error ? (
            <ErrorCard
              key="error"
              error={error}
              url={url}
              onRetry={handleRetry}
            />
          ) : (
            <InputCard
              key="input"
              url={url}
              setUrl={setUrl}
              isPending={isPending}
              currentStep={currentStep}
              completedSteps={completedSteps}
              platform={platform}
              onGenerate={handleGenerate}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── InputCard ────────────────────────────────────────────────────────────────

interface InputCardProps {
  url: string;
  setUrl: (v: string) => void;
  isPending: boolean;
  currentStep: Step;
  completedSteps: Step[];
  platform: { name: string; color: string } | null;
  onGenerate: () => void;
}

function InputCard({
  url, setUrl, isPending, currentStep, completedSteps, platform, onGenerate,
}: InputCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
      className="w-full space-y-4 bg-white p-6 rounded-3xl shadow-xl shadow-primary/5 border border-beige"
    >
      <div className="space-y-2">
        <div className="relative">
          <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Cole o link do produto aqui..."
            className="pl-12 pr-4 h-14 bg-background border-none rounded-2xl text-base focus-visible:ring-accent shadow-inner"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isPending}
            onKeyDown={(e) => e.key === "Enter" && !isPending && url.trim() && onGenerate()}
          />
        </div>

        {/* Platform badge OR active-step label */}
        <div className="h-6 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isPending ? (
              <motion.div
                key="step-label"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-1.5"
              >
                <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                <span className="text-xs text-accent font-semibold">
                  {STEPS.find((s) => s.id === currentStep)?.label}
                </span>
              </motion.div>
            ) : platform ? (
              <motion.span
                key="platform-badge"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  "text-xs px-3 py-1 rounded-full font-semibold border",
                  platform.color
                )}
              >
                {platform.name}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Step progress list */}
      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 pt-1 pb-1">
              {STEPS.map((step, i) => {
                const isActive  = currentStep === step.id;
                const isDone    = completedSteps.includes(step.id) && !isActive;
                const isWaiting = !isActive && !isDone;
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.18 }}
                    className="flex items-center gap-2.5"
                  >
                    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                      {isDone    && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {isActive  && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
                      {isWaiting && <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />}
                    </div>
                    <span className={cn(
                      "text-sm transition-colors duration-300",
                      isDone    && "text-green-600 font-medium",
                      isActive  && "text-accent font-semibold",
                      isWaiting && "text-muted-foreground/40",
                    )}>
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
        onClick={onGenerate}
        disabled={isPending || !url.trim()}
      >
        {isPending ? "Processando…" : "Gerar Promoção"}
      </Button>
    </motion.div>
  );
}

// ─── ErrorCard ────────────────────────────────────────────────────────────────

interface ErrorCardProps {
  error: ErrorState;
  url: string;
  onRetry: () => void;
}

function ErrorCard({ error, url, onRetry }: ErrorCardProps) {
  const guide = CREDENTIAL_GUIDES.find((g) => g.match(error.message));
  const failedLabel = STEPS.find((s) => s.id === error.failedStep)?.label;

  // Render the raw message: split on blank lines → paragraphs
  const paragraphs = error.message
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
      className="w-full bg-white rounded-3xl shadow-xl shadow-primary/5 border border-beige overflow-hidden"
    >
      {/* Red header band */}
      <div className="bg-red-50 border-b border-red-100 px-6 py-5 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-red-700 text-sm leading-tight">
            Não foi possível gerar a promoção
          </p>
          {failedLabel && (
            <p className="text-xs text-red-500 mt-0.5">
              Falhou em: {failedLabel}
            </p>
          )}
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Error message paragraphs */}
        <div className="space-y-2">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
              {para}
            </p>
          ))}
        </div>

        {/* Credential guide block (when applicable) */}
        {guide && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.2 }}
            className={cn("rounded-2xl border p-4 space-y-3", guide.color)}
          >
            <p className={cn("text-xs font-bold uppercase tracking-wide", guide.labelColor)}>
              Como ativar — {guide.platform}
            </p>
            <ol className="space-y-2">
              {guide.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/80">
                  <span className={cn("font-bold flex-shrink-0", guide.labelColor)}>
                    {i + 1}.
                  </span>
                  <span className="leading-snug">
                    {step.url ? (
                      <>
                        {step.text}{" "}
                        <a
                          href={step.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "inline-flex items-center gap-0.5 underline underline-offset-2 font-medium",
                            guide.labelColor
                          )}
                        >
                          Acessar <ExternalLink className="w-3 h-3" />
                        </a>
                      </>
                    ) : (
                      step.text
                    )}
                    {"code" in step && step.code && (
                      <code className="block mt-1 text-xs bg-white/70 border border-current/10 rounded-lg px-3 py-2 font-mono whitespace-pre leading-relaxed">
                        {step.code}
                      </code>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </motion.div>
        )}

        {/* URL that failed */}
        {url && (
          <div className="bg-muted/40 rounded-xl px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5 font-medium">Link usado:</p>
            <p className="text-xs text-foreground/70 break-all font-mono leading-relaxed">
              {url}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            className="w-full h-12 rounded-2xl font-bold shadow-md shadow-accent/20"
            onClick={onRetry}
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
          <Button
            variant="ghost"
            className="w-full h-10 rounded-2xl text-sm text-muted-foreground"
            onClick={() => {
              onRetry();
            }}
          >
            Usar outro link
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
