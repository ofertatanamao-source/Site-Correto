import type { History } from "@workspace/db";

export interface GeneratedPromotion {
  whatsappText: string;
  instagramCaption: string;
  telegramMessage: string;
  promotionalScript: string;
}

export function generatePromotionTexts(product: History): GeneratedPromotion {
  const { shortTitle, currentPrice, originalPrice, discountPercentage, affiliateLink, productUrl } = product;
  const link = affiliateLink ?? productUrl;

  const discountLine =
    discountPercentage != null
      ? `🔥 ${discountPercentage}% de desconto!\n`
      : "";
  const originalPriceLine =
    originalPrice != null ? `~~De ${originalPrice}~~ por apenas:\n` : "";

  const whatsappText = [
    `🚨 OLHA ESSA OFERTA!`,
    ``,
    `🛍️ ${shortTitle}`,
    ``,
    originalPriceLine ? `${originalPriceLine}💰 ${currentPrice}` : `💰 ${currentPrice}`,
    discountLine ? discountLine : "",
    `👉 Garanta antes que o preço mude.`,
    ``,
    link,
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const instagramCaption = [
    `✨ ${shortTitle}`,
    ``,
    discountPercentage != null ? `${discountPercentage}% OFF — só por tempo limitado!` : "Oferta por tempo limitado!",
    ``,
    `💰 ${currentPrice}`,
    originalPrice != null ? `(era ${originalPrice})` : "",
    ``,
    `👆 Link na bio ou acesse direto:`,
    `${link}`,
    ``,
    `#oferta #promoção #desconto #compraonline #ofertasdodia`,
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  const telegramMessage = [
    `🔔 **OFERTA RELÂMPAGO**`,
    ``,
    `📦 **${shortTitle}**`,
    ``,
    originalPrice != null ? `De *${originalPrice}* por apenas:` : "",
    `💰 **${currentPrice}**`,
    discountPercentage != null ? `🏷️ *${discountPercentage}% de desconto*` : "",
    ``,
    `⚡ Oferta por tempo limitado — não deixe para depois!`,
    ``,
    `🔗 [Comprar agora](${link})`,
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  const promotionalScript = [
    `Olá! Achei uma oferta incrível que você precisa ver!`,
    ``,
    `É o ${shortTitle}.`,
    ``,
    discountPercentage != null
      ? `Está com ${discountPercentage}% de desconto — saindo por apenas ${currentPrice}!`
      : `Por apenas ${currentPrice}!`,
    ``,
    `${originalPrice != null ? `Era ${originalPrice} e agora está por ${currentPrice}. ` : ""}É uma economia real que não pode deixar passar!`,
    ``,
    `Corre lá antes que acabe! O link está aqui na descrição.`,
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  return { whatsappText, instagramCaption, telegramMessage, promotionalScript };
}
