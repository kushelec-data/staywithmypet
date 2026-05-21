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

/** Columns loaded for request list/detail UI. */
export const REQUEST_SELECT =
  "id, status, message, care_type, pet_id, pet_parent_id, pet_friend_id, sender_id, receiver_id, date_from, date_to, requested_dates, created_at" as const;

/** Requests with sender/receiver profiles and pet (PostgREST FK hints). */
export const REQUEST_SELECT_WITH_RELATIONS = `${REQUEST_SELECT}, sender:profiles!requests_sender_id_fkey(id, display_name), receiver:profiles!requests_receiver_id_fkey(id, display_name), pet:pets(id, name)` as const;
