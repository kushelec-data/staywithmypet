/**
 * Supabase public schema types (requests-focused).
 * Regenerate when the DB changes: `npm run gen:types` (requires `supabase link`).
 */

export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "completed";

export type BookingStatus = "upcoming" | "active" | "completed" | "cancelled";

export type ReviewType = "pet_parent_reviews_pet_friend" | "pet_friend_reviews_pet";

export type Database = {
  public: {
    Tables: {
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          request_id: string | null;
          reviewer_id: string;
          reviewee_id: string;
          pet_id: string;
          rating: number;
          text: string | null;
          tags: string[] | null;
          review_type: ReviewType;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          request_id?: string | null;
          reviewer_id: string;
          reviewee_id: string;
          pet_id: string;
          rating: number;
          text?: string | null;
          tags?: string[] | null;
          review_type: ReviewType;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      email_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_type: string;
          related_request_id: string | null;
          related_booking_id: string | null;
          sent_at: string | null;
          scheduled_for: string | null;
          created_at: string;
          unique_key: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_type: string;
          related_request_id?: string | null;
          related_booking_id?: string | null;
          sent_at?: string | null;
          scheduled_for?: string | null;
          created_at?: string;
          unique_key?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          request_id: string;
          pet_id: string;
          pet_parent_id: string;
          pet_friend_id: string;
          status: BookingStatus;
          start_date: string;
          end_date: string;
          created_at: string;
          completed_at: string | null;
          cancelled_at: string | null;
          cancelled_reason: string | null;
        };
        Insert: Record<string, never>;
        Update: {
          status?: BookingStatus;
          completed_at?: string | null;
          cancelled_at?: string | null;
          cancelled_reason?: string | null;
        };
        Relationships: [];
      };
      requests: {
        Row: {
          id: string;
          pet_id: string;
          pet_parent_id: string;
          pet_friend_id: string;
          sender_id: string;
          receiver_id: string;
          status: RequestStatus;
          care_type: string | null;
          message: string | null;
          date_from: string | null;
          date_to: string | null;
          requested_dates: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          pet_parent_id: string;
          pet_friend_id: string;
          sender_id: string;
          receiver_id: string;
          status?: RequestStatus;
          care_type?: string | null;
          message?: string | null;
          date_from?: string | null;
          date_to?: string | null;
          requested_dates?: string[] | null;
        };
        Update: {
          status?: RequestStatus;
          responded_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          request_id: string;
          pet_parent_id: string | null;
          pet_friend_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          pet_parent_id?: string | null;
          pet_friend_id?: string | null;
          created_at?: string;
        };
        Update: {
          pet_parent_id?: string | null;
          pet_friend_id?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          read_at: string | null;
          created_at: string;
          storage_path: string | null;
          media_type: string | null;
          file_name: string | null;
          file_size: number | null;
          mime_type: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body?: string;
          read_at?: string | null;
          created_at?: string;
          storage_path?: string | null;
          media_type?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
        };
        Update: {
          body?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string | null };
        Returns: undefined;
      };
      complete_booking: {
        Args: { p_booking_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      request_status: RequestStatus;
      booking_status: BookingStatus;
      review_type: ReviewType;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type RequestRow = Database["public"]["Tables"]["requests"]["Row"];

export type RequestInsert = Database["public"]["Tables"]["requests"]["Insert"];

export type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export type MessageInboxPreviewRow = Pick<
  MessageRow,
  "conversation_id" | "body" | "created_at" | "media_type"
>;

/** Latest message fields used for conversation inbox previews. */
export const MESSAGE_INBOX_PREVIEW_SELECT =
  "conversation_id, body, created_at, media_type" as const;

export const MESSAGE_INBOX_PREVIEW_LEGACY_SELECT =
  "conversation_id, body, created_at" as const;

/** Columns loaded for request list/detail UI. */
export const REQUEST_SELECT =
  "id, status, message, care_type, pet_id, pet_parent_id, pet_friend_id, sender_id, receiver_id, date_from, date_to, requested_dates, created_at" as const;

/** Requests with sender/receiver profiles and pet (PostgREST FK hints). */
export const REQUEST_SELECT_WITH_RELATIONS = `${REQUEST_SELECT}, sender:profiles!requests_sender_id_fkey(id, display_name), receiver:profiles!requests_receiver_id_fkey(id, display_name), pet:pets(id, name, species, breed)` as const;
