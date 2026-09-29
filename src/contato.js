/* Contato de suporte do beta (WhatsApp). Só números: DDI 55 + DDD 11 + número.
   Fica num arquivo próprio para valer igual no app e na tela de erro. */
export const WHATSAPP_SUPORTE = "5511985821596";

export function linkSuporte(mensagem = "Oi! Preciso de ajuda com o Luxi.") {
  return `https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(mensagem)}`;
}
