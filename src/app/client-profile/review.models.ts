/**
 * Modelos para las reseñas de clientes
 */

export interface ClientReview {
  id: string;
  professionalKey: string;
  conversationId: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}
